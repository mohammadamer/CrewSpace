import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalRisk,
  ApprovalStatus,
  Prisma,
  WorkspaceRole,
} from '@crewspace/database';
import { AgentId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  CreateApprovalRequestDto,
  UpdateToolPermissionDto,
} from './approval.dto';

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    await this.expirePending(workspaceId);
    return this.prisma.approvalRequest.findMany({
      where: { workspaceId },
      include: { agent: true, reviewedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async request(
    userId: string,
    workspaceId: string,
    agentId: string,
    input: CreateApprovalRequestDto,
  ) {
    await this.requireMember(userId, workspaceId);
    await this.requireAgent(workspaceId, agentId);
    const approval = await this.prisma.approvalRequest.create({
      data: {
        workspaceId,
        agentId,
        capability: input.capability.trim(),
        action: input.action.trim(),
        risk: input.risk,
        payload: input.payload as Prisma.InputJsonValue,
        reason: input.reason.trim(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
    });
    await this.audit(workspaceId, userId, 'APPROVAL_REQUESTED', approval.id);
    this.publish(
      approval.id,
      agentId,
      workspaceId,
      ApprovalStatus.PENDING,
      'REQUESTED',
    );
    return approval;
  }

  async approve(userId: string, workspaceId: string, approvalId: string) {
    await this.requireMember(userId, workspaceId);
    const approval = await this.requirePending(workspaceId, approvalId);
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.approvalRequest.update({
        where: { id: approval.id },
        data: {
          status: ApprovalStatus.APPROVED,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
        },
      });
      await transaction.agentToolPermission.upsert({
        where: {
          agentId_capability: {
            agentId: approval.agentId,
            capability: approval.capability,
          },
        },
        create: {
          workspaceId,
          agentId: approval.agentId,
          capability: approval.capability,
          enabled: true,
        },
        update: { enabled: true },
      });
      return result;
    });
    await this.audit(workspaceId, userId, 'APPROVAL_APPROVED', approval.id);
    this.publish(
      approval.id,
      approval.agentId,
      workspaceId,
      updated.status,
      'APPROVED',
    );
    return updated;
  }

  async reject(userId: string, workspaceId: string, approvalId: string) {
    await this.requireMember(userId, workspaceId);
    const approval = await this.requirePending(workspaceId, approvalId);
    const updated = await this.prisma.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: ApprovalStatus.REJECTED,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
      },
    });
    await this.audit(workspaceId, userId, 'APPROVAL_REJECTED', approval.id);
    this.publish(
      approval.id,
      approval.agentId,
      workspaceId,
      updated.status,
      'REJECTED',
    );
    return updated;
  }

  async cancel(userId: string, workspaceId: string, approvalId: string) {
    await this.requireMember(userId, workspaceId);
    const approval = await this.requirePending(workspaceId, approvalId);
    const updated = await this.prisma.approvalRequest.update({
      where: { id: approval.id },
      data: { status: ApprovalStatus.CANCELLED },
    });
    await this.audit(workspaceId, userId, 'APPROVAL_CANCELLED', approval.id);
    this.publish(
      approval.id,
      approval.agentId,
      workspaceId,
      updated.status,
      'CANCELLED',
    );
    return updated;
  }

  async setToolPermission(
    userId: string,
    workspaceId: string,
    input: UpdateToolPermissionDto,
  ) {
    const membership = await this.requireMember(userId, workspaceId);
    this.permissions.requireWorkspaceRole(membership.role, WorkspaceRole.ADMIN);
    await this.requireAgent(workspaceId, input.agentId);
    const permission = await this.prisma.agentToolPermission.upsert({
      where: {
        agentId_capability: {
          agentId: input.agentId,
          capability: input.capability.trim(),
        },
      },
      create: {
        workspaceId,
        agentId: input.agentId,
        capability: input.capability.trim(),
        enabled: input.enabled,
      },
      update: { enabled: input.enabled },
    });
    await this.audit(
      workspaceId,
      userId,
      'TOOL_PERMISSION_UPDATED',
      permission.id,
    );
    return permission;
  }

  async listToolPermissions(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.prisma.agentToolPermission.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async requirePending(workspaceId: string, approvalId: string) {
    const approval = await this.prisma.approvalRequest.findFirst({
      where: { id: approvalId, workspaceId },
    });
    if (!approval) throw new NotFoundException('Approval request not found');
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ConflictException('Approval request is no longer pending');
    }
    if (approval.expiresAt && approval.expiresAt <= new Date()) {
      await this.prisma.approvalRequest.update({
        where: { id: approval.id },
        data: { status: ApprovalStatus.EXPIRED },
      });
      throw new ConflictException('Approval request has expired');
    }
    return approval;
  }

  private async requireMember(userId: string, workspaceId: string) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    return membership;
  }

  private async requireAgent(workspaceId: string, agentId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });
    if (!agent) throw new NotFoundException('Agent not found');
  }

  private expirePending(workspaceId: string) {
    return this.prisma.approvalRequest.updateMany({
      where: {
        workspaceId,
        status: ApprovalStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      data: { status: ApprovalStatus.EXPIRED },
    });
  }

  private publish(
    approvalId: string,
    agentId: string,
    workspaceId: string,
    status: ApprovalStatus,
    action: string,
  ) {
    this.events.publish({
      id: randomUUID(),
      type: 'ApprovalUpdated',
      aggregateId: approvalId,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: {
        approvalId,
        agentId: agentId as AgentId,
        status,
        action,
      },
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
        entityType: 'ApprovalRequest',
        entityId,
      },
    });
  }
}
