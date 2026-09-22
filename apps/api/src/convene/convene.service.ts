import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConveneContributionType,
  ConveneParticipantRole,
  ConveneStatus,
  Prisma,
  TaskStatus,
  WorkspaceRole,
} from '@crewspace/database';
import { AgentId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  AddConveneParticipantDto,
  CompleteConveneDto,
  CreateConveneContributionDto,
  CreateConveneDto,
} from './convene.dto';

@Injectable()
export class ConveneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.prisma.convene.findMany({
      where: { workspaceId },
      include: { participants: true, decision: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(userId: string, workspaceId: string, conveneId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.requireConvene(workspaceId, conveneId);
  }

  async create(userId: string, workspaceId: string, input: CreateConveneDto) {
    await this.requireEditor(userId, workspaceId);
    if (input.projectId)
      await this.requireProjectMember(userId, workspaceId, input.projectId);
    const convene = await this.prisma.convene.create({
      data: {
        workspaceId,
        projectId: input.projectId,
        createdById: userId,
        title: input.title.trim(),
        topic: input.topic.trim(),
        participants: {
          create: {
            userId,
            role: ConveneParticipantRole.FACILITATOR,
          },
        },
      },
      include: { participants: true },
    });
    await this.audit(workspaceId, userId, 'CONVENE_CREATED', convene.id);
    this.publish(convene.id, workspaceId, ConveneStatus.DRAFT, 'CREATED');
    return convene;
  }

  async addParticipant(
    userId: string,
    workspaceId: string,
    conveneId: string,
    input: AddConveneParticipantDto,
  ) {
    await this.requireEditor(userId, workspaceId);
    const convene = await this.requireConvene(workspaceId, conveneId);
    this.requireEditableStatus(convene.status);
    if ((input.userId ? 1 : 0) + (input.agentId ? 1 : 0) !== 1) {
      throw new ConflictException('Provide exactly one Convene participant');
    }
    if (input.userId)
      await this.workspaces.requireMembership(input.userId, workspaceId);
    if (input.agentId) await this.requireAgent(workspaceId, input.agentId);
    return this.prisma.conveneParticipant.create({
      data: {
        conveneId,
        userId: input.userId,
        agentId: input.agentId,
        role: input.role ?? ConveneParticipantRole.PARTICIPANT,
      },
    });
  }

  async start(userId: string, workspaceId: string, conveneId: string) {
    await this.requireEditor(userId, workspaceId);
    const convene = await this.requireConvene(workspaceId, conveneId);
    if (convene.status !== ConveneStatus.DRAFT) {
      throw new ConflictException('Only a draft Convene can start');
    }
    const participantCount = await this.prisma.conveneParticipant.count({
      where: { conveneId },
    });
    if (participantCount < 2) {
      throw new ConflictException(
        'A Convene requires at least two participants',
      );
    }
    const updated = await this.prisma.convene.update({
      where: { id: conveneId },
      data: { status: ConveneStatus.RUNNING, startedAt: new Date() },
    });
    await this.audit(workspaceId, userId, 'CONVENE_STARTED', conveneId);
    this.publish(conveneId, workspaceId, updated.status, 'STARTED');
    return updated;
  }

  async pause(userId: string, workspaceId: string, conveneId: string) {
    return this.transition(
      userId,
      workspaceId,
      conveneId,
      ConveneStatus.RUNNING,
      ConveneStatus.PAUSED,
      'PAUSED',
    );
  }

  async resume(userId: string, workspaceId: string, conveneId: string) {
    return this.transition(
      userId,
      workspaceId,
      conveneId,
      ConveneStatus.PAUSED,
      ConveneStatus.RUNNING,
      'RESUMED',
    );
  }

  async cancel(userId: string, workspaceId: string, conveneId: string) {
    await this.requireEditor(userId, workspaceId);
    const convene = await this.requireConvene(workspaceId, conveneId);
    if (
      convene.status === ConveneStatus.COMPLETED ||
      convene.status === ConveneStatus.CANCELLED
    ) {
      throw new ConflictException('Convene is already terminal');
    }
    const updated = await this.prisma.convene.update({
      where: { id: conveneId },
      data: { status: ConveneStatus.CANCELLED },
    });
    await this.audit(workspaceId, userId, 'CONVENE_CANCELLED', conveneId);
    this.publish(conveneId, workspaceId, updated.status, 'CANCELLED');
    return updated;
  }

  async addContribution(
    userId: string,
    workspaceId: string,
    conveneId: string,
    input: CreateConveneContributionDto,
  ) {
    const convene = await this.requireConvene(workspaceId, conveneId);
    if (
      convene.status !== ConveneStatus.RUNNING &&
      convene.status !== ConveneStatus.PAUSED
    ) {
      throw new ConflictException('Contributions require an active Convene');
    }
    const participant = await this.prisma.conveneParticipant.findFirst({
      where: { conveneId, userId },
    });
    if (!participant)
      throw new ForbiddenException('Convene participation required');
    const contribution = await this.prisma.conveneContribution.create({
      data: {
        conveneId,
        authorUserId: userId,
        type: input.type,
        content: input.content.trim(),
      },
    });
    await this.audit(
      workspaceId,
      userId,
      'CONVENE_CONTRIBUTION_ADDED',
      contribution.id,
    );
    return contribution;
  }

  async complete(
    userId: string,
    workspaceId: string,
    conveneId: string,
    input: CompleteConveneDto,
  ) {
    await this.requireEditor(userId, workspaceId);
    const convene = await this.requireConvene(workspaceId, conveneId);
    if (
      convene.status !== ConveneStatus.RUNNING &&
      convene.status !== ConveneStatus.PAUSED
    ) {
      throw new ConflictException('Only an active Convene can complete');
    }
    if (!convene.projectId && input.actionItems.length > 0) {
      throw new ConflictException(
        'Action items require a Project-backed Convene',
      );
    }
    if (convene.projectId)
      await this.requireProjectMember(userId, workspaceId, convene.projectId);

    const result = await this.prisma.$transaction(async (transaction) => {
      const decision = await transaction.decision.create({
        data: {
          workspaceId,
          projectId: convene.projectId,
          createdById: userId,
          conveneId,
          title: convene.title,
          context: convene.topic,
          alternatives: input.alternatives as Prisma.InputJsonValue,
          conclusion: input.conclusion.trim(),
          provenance: input.provenance?.trim(),
        },
      });
      const tasks = [];
      for (const item of input.actionItems) {
        await this.validateAssignee(
          transaction,
          convene.projectId!,
          item.assigneeUserId,
          item.assigneeAgentId,
        );
        tasks.push(
          await transaction.task.create({
            data: {
              workspaceId,
              projectId: convene.projectId!,
              createdById: userId,
              decisionId: decision.id,
              title: item.title.trim(),
              description: item.description?.trim(),
              status: TaskStatus.TODO,
              assigneeUserId: item.assigneeUserId,
              assigneeAgentId: item.assigneeAgentId,
            },
          }),
        );
      }
      await transaction.conveneContribution.create({
        data: {
          conveneId,
          authorUserId: userId,
          type: ConveneContributionType.SYNTHESIS,
          content: input.conclusion.trim(),
        },
      });
      const completed = await transaction.convene.update({
        where: { id: conveneId },
        data: { status: ConveneStatus.COMPLETED, completedAt: new Date() },
        include: { participants: true, decision: true },
      });
      return { convene: completed, decision, tasks };
    });
    await this.audit(workspaceId, userId, 'CONVENE_COMPLETED', conveneId);
    this.publish(conveneId, workspaceId, ConveneStatus.COMPLETED, 'COMPLETED');
    return result;
  }

  private async transition(
    userId: string,
    workspaceId: string,
    conveneId: string,
    from: ConveneStatus,
    to: ConveneStatus,
    action: string,
  ) {
    await this.requireEditor(userId, workspaceId);
    const convene = await this.requireConvene(workspaceId, conveneId);
    if (convene.status !== from)
      throw new ConflictException(`Convene must be ${from}`);
    const updated = await this.prisma.convene.update({
      where: { id: conveneId },
      data: {
        status: to,
        pausedAt: to === ConveneStatus.PAUSED ? new Date() : undefined,
      },
    });
    await this.audit(workspaceId, userId, `CONVENE_${action}`, conveneId);
    this.publish(conveneId, workspaceId, to, action);
    return updated;
  }

  private async requireConvene(workspaceId: string, conveneId: string) {
    const convene = await this.prisma.convene.findFirst({
      where: { id: conveneId, workspaceId },
      include: { participants: true, contributions: true, decision: true },
    });
    if (!convene) throw new NotFoundException('Convene not found');
    return convene;
  }

  private async requireEditor(userId: string, workspaceId: string) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
  }

  private async requireProjectMember(
    userId: string,
    workspaceId: string,
    projectId: string,
  ) {
    await this.requireEditor(userId, workspaceId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId, members: { some: { userId } } },
    });
    if (!project) throw new ForbiddenException('Project membership required');
  }

  private async requireAgent(workspaceId: string, agentId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });
    if (!agent) throw new NotFoundException('Agent not found');
  }

  private requireEditableStatus(status: ConveneStatus) {
    if (
      status !== ConveneStatus.DRAFT &&
      status !== ConveneStatus.RUNNING &&
      status !== ConveneStatus.PAUSED
    ) {
      throw new ConflictException('Convene is no longer editable');
    }
  }

  private async validateAssignee(
    transaction: Prisma.TransactionClient,
    projectId: string,
    userId?: string,
    agentId?: string,
  ) {
    if ((userId ? 1 : 0) + (agentId ? 1 : 0) > 1) {
      throw new ConflictException('An action item can have only one assignee');
    }
    if (userId || agentId) {
      const member = await transaction.projectMember.findFirst({
        where: { projectId, userId, agentId },
      });
      if (!member)
        throw new ForbiddenException(
          'Action item assignee must be a Project member',
        );
    }
  }

  private publish(
    conveneId: string,
    workspaceId: string,
    status: ConveneStatus,
    action: string,
  ) {
    this.events.publish({
      id: randomUUID(),
      type: 'ConveneUpdated',
      aggregateId: conveneId,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: { conveneId, status, action },
    });
  }

  private audit(
    workspaceId: string,
    actorUserId: string,
    action: string,
    entityId: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        action,
        entityType: 'Convene',
        entityId,
      },
    });
  }
}
