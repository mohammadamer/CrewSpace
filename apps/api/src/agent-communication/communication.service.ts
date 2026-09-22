import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgentCommunicationStatus, WorkspaceRole } from '@crewspace/database';
import { AgentId, ConversationId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { AgentCommunicationPolicy } from './communication.policy';
import { CreateAgentMessageDto } from './communication.dto';

@Injectable()
export class AgentCommunicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
    private readonly policy: AgentCommunicationPolicy,
  ) {}

  async sendMessage(
    userId: string,
    workspaceId: string,
    conversationId: string,
    sourceAgentId: string,
    input: CreateAgentMessageDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );

    const [sourceAgent, targetAgent, conversation] = await Promise.all([
      this.prisma.agent.findFirst({
        where: { id: sourceAgentId, workspaceId },
      }),
      this.prisma.agent.findFirst({
        where: { id: input.targetAgentId, workspaceId },
      }),
      this.prisma.conversation.findFirst({
        where: {
          id: conversationId,
          workspaceId,
          members: {
            some: { agentId: sourceAgentId },
          },
        },
      }),
    ]);
    if (!sourceAgent || !targetAgent) {
      throw new NotFoundException('Agent not found');
    }
    if (!conversation) {
      throw new ForbiddenException('Agent conversation membership required');
    }
    const targetMembership = await this.prisma.conversationMember.findFirst({
      where: { conversationId, agentId: targetAgent.id },
    });
    if (!targetMembership) {
      throw new ForbiddenException(
        'Target Agent conversation membership required',
      );
    }

    const [recent, usage] = await Promise.all([
      this.prisma.agentCommunication.findMany({
        where: {
          conversationId,
          sourceAgentId,
          targetAgentId: targetAgent.id,
          status: AgentCommunicationStatus.ALLOWED,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { message: true },
      }),
      this.prisma.agentCommunication.aggregate({
        where: {
          conversationId,
          sourceAgentId,
          targetAgentId: targetAgent.id,
          status: AgentCommunicationStatus.ALLOWED,
        },
        _sum: { tokenCount: true },
      }),
    ]);
    const decision = this.policy.evaluate({
      sourceAgentId,
      targetAgentId: targetAgent.id,
      content: input.content,
      depth: input.depth,
      tokenBudget: input.tokenBudget,
      usedTokens: usage._sum.tokenCount ?? 0,
      lastSentAt: recent[0]?.createdAt,
      recentContents: recent.flatMap((item) =>
        item.message ? [item.message.content] : [],
      ),
      targetTerms: [targetAgent.name, targetAgent.role],
    });

    if (!decision.allowed) {
      await this.recordAttempt(
        workspaceId,
        conversationId,
        sourceAgentId,
        targetAgent.id,
        input.depth,
        decision.tokenCount,
        AgentCommunicationStatus.BLOCKED,
        decision.reason,
      );
      await this.prisma.agentActivity.create({
        data: {
          agentId: sourceAgentId,
          type: 'COMMUNICATION_BLOCKED',
          summary: decision.reason ?? 'Agent communication blocked',
        },
      });
      throw new ConflictException(decision.reason);
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const message = await transaction.message.create({
        data: {
          conversationId,
          authorAgentId: sourceAgentId,
          content: input.content.trim(),
        },
      });
      const communication = await transaction.agentCommunication.create({
        data: {
          workspaceId,
          conversationId,
          sourceAgentId,
          targetAgentId: targetAgent.id,
          messageId: message.id,
          depth: input.depth,
          tokenCount: decision.tokenCount,
          status: AgentCommunicationStatus.ALLOWED,
        },
      });
      await transaction.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      await transaction.agentActivity.create({
        data: {
          agentId: sourceAgentId,
          type: 'AGENT_MESSAGE_SENT',
          summary: `Message sent to ${targetAgent.name}`,
        },
      });
      return { message, communication };
    });

    this.events.publish({
      id: randomUUID(),
      type: 'MessageCreated',
      aggregateId: result.message.id,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: {
        conversationId: conversationId as ConversationId,
        messageId: result.message.id,
        authorAgentId: sourceAgentId as AgentId,
        content: result.message.content,
      },
    });
    return result;
  }

  private recordAttempt(
    workspaceId: string,
    conversationId: string,
    sourceAgentId: string,
    targetAgentId: string,
    depth: number,
    tokenCount: number,
    status: AgentCommunicationStatus,
    reason?: string,
  ) {
    return this.prisma.agentCommunication.create({
      data: {
        workspaceId,
        conversationId,
        sourceAgentId,
        targetAgentId,
        depth,
        tokenCount,
        status,
        reason,
      },
    });
  }
}
