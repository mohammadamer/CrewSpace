import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceRole } from '@crewspace/database';
import { AgentId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  CreateRelationshipDto,
  RecordInteractionDto,
  UpdateRelationshipDto,
} from './context.dto';

@Injectable()
export class CollaborationContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
  ) {}

  async listRelationships(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.prisma.agentRelationship.findMany({
      where: { workspaceId },
      include: { agent: true, relatedAgent: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getRelationship(
    userId: string,
    workspaceId: string,
    relationshipId: string,
  ) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.requireRelationship(workspaceId, relationshipId);
  }

  async createRelationship(
    userId: string,
    workspaceId: string,
    agentId: string,
    input: CreateRelationshipDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    this.assertDistinctAgents(agentId, input.relatedAgentId);
    await this.requireAgents(workspaceId, [agentId, input.relatedAgentId]);

    const relationship = await this.prisma.agentRelationship.create({
      data: {
        workspaceId,
        agentId,
        relatedAgentId: input.relatedAgentId,
        summary: input.summary?.trim(),
        communicationPreferences: (input.communicationPreferences ??
          {}) as Prisma.InputJsonValue,
        recentInteractions: [],
        unresolvedTopics: input.unresolvedTopics ?? [],
      },
      include: { agent: true, relatedAgent: true },
    });
    await this.audit(
      workspaceId,
      userId,
      'COLLABORATION_CONTEXT_CREATED',
      relationship.id,
    );
    this.publishUpdate(
      relationship.id,
      agentId,
      input.relatedAgentId,
      workspaceId,
      'CREATED',
    );
    return relationship;
  }

  async updateRelationship(
    userId: string,
    workspaceId: string,
    relationshipId: string,
    input: UpdateRelationshipDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    const existing = await this.requireRelationship(
      workspaceId,
      relationshipId,
    );
    const relationship = await this.prisma.agentRelationship.update({
      where: { id: existing.id },
      data: {
        summary: input.summary?.trim(),
        communicationPreferences: input.communicationPreferences as
          Prisma.InputJsonValue | undefined,
        unresolvedTopics: input.unresolvedTopics,
      },
      include: { agent: true, relatedAgent: true },
    });
    await this.audit(
      workspaceId,
      userId,
      'COLLABORATION_CONTEXT_UPDATED',
      relationship.id,
    );
    this.publishUpdate(
      relationship.id,
      relationship.agentId,
      relationship.relatedAgentId,
      workspaceId,
      'UPDATED',
    );
    return relationship;
  }

  async recordInteraction(
    userId: string,
    workspaceId: string,
    relationshipId: string,
    input: RecordInteractionDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    const existing = await this.requireRelationship(
      workspaceId,
      relationshipId,
    );
    const recentInteractions = this.stringArray(existing.recentInteractions);
    recentInteractions.push(input.summary.trim());
    const relationship = await this.prisma.agentRelationship.update({
      where: { id: existing.id },
      data: {
        interactionCount: { increment: 1 },
        recentInteractions: recentInteractions.slice(-20),
        unresolvedTopics: input.unresolvedTopics,
        lastInteractionAt: new Date(),
      },
      include: { agent: true, relatedAgent: true },
    });
    await this.audit(
      workspaceId,
      userId,
      'COLLABORATION_INTERACTION_RECORDED',
      relationship.id,
    );
    this.publishUpdate(
      relationship.id,
      relationship.agentId,
      relationship.relatedAgentId,
      workspaceId,
      'INTERACTION_RECORDED',
    );
    return relationship;
  }

  private async requireRelationship(
    workspaceId: string,
    relationshipId: string,
  ) {
    const relationship = await this.prisma.agentRelationship.findFirst({
      where: { id: relationshipId, workspaceId },
      include: { agent: true, relatedAgent: true },
    });
    if (!relationship) throw new NotFoundException('Relationship not found');
    return relationship;
  }

  private async requireAgents(workspaceId: string, agentIds: string[]) {
    const count = await this.prisma.agent.count({
      where: { workspaceId, id: { in: agentIds } },
    });
    if (count !== agentIds.length)
      throw new NotFoundException('Agent not found');
  }

  private assertDistinctAgents(agentId: string, relatedAgentId: string) {
    if (agentId === relatedAgentId) {
      throw new ConflictException('An Agent cannot relate to itself');
    }
  }

  private stringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private publishUpdate(
    relationshipId: string,
    agentId: string,
    relatedAgentId: string,
    workspaceId: string,
    action: string,
  ) {
    this.events.publish({
      id: randomUUID(),
      type: 'CollaborationContextUpdated',
      aggregateId: relationshipId,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: {
        relationshipId,
        agentId: agentId as AgentId,
        relatedAgentId: relatedAgentId as AgentId,
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
        entityType: 'AgentRelationship',
        entityId,
      },
    });
  }
}
