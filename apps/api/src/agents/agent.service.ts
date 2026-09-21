import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgentStatus, Prisma, WorkspaceRole } from '@crewspace/database';
import { AgentId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateAgentDto, CreatePersonaDto, UpdateAgentDto } from './agent.dto';
import { starterPersonas } from './starter-personas';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
  ) {}

  async listAgents(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.prisma.agent.findMany({
      where: { workspaceId },
      include: { persona: true, capabilities: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAgent(userId: string, workspaceId: string, agentId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
      include: {
        persona: true,
        capabilities: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async createPersona(
    userId: string,
    workspaceId: string,
    input: CreatePersonaDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    return this.prisma.agentPersona.create({
      data: this.personaData(workspaceId, input),
    });
  }

  async listPersonas(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.prisma.agentPersona.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async createAgent(
    userId: string,
    workspaceId: string,
    input: CreateAgentDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    if (input.personaId)
      await this.requirePersona(workspaceId, input.personaId);
    const agent = await this.prisma.agent.create({
      data: {
        workspaceId,
        personaId: input.personaId,
        name: input.name.trim(),
        role: input.role.trim(),
        avatar: input.avatar,
        modelConfiguration: input.modelConfiguration as Prisma.InputJsonValue,
        capabilities: { create: this.capabilityData(input.capabilities) },
        activities: {
          create: {
            type: 'CREATED',
            summary: `${input.name.trim()} was created`,
          },
        },
      },
      include: { persona: true, capabilities: true, activities: true },
    });
    await this.audit(workspaceId, userId, 'AGENT_CREATED', agent.id, {
      name: agent.name,
    });
    this.events.publish({
      id: randomUUID(),
      type: 'AgentCreated',
      aggregateId: agent.id,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: { name: agent.name, role: agent.role },
    });
    return agent;
  }

  async updateAgent(
    userId: string,
    workspaceId: string,
    agentId: string,
    input: UpdateAgentDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    const existing = await this.requireAgent(workspaceId, agentId);
    const agent = await this.prisma.$transaction(async (transaction) => {
      if (input.capabilities)
        await transaction.agentCapability.deleteMany({ where: { agentId } });
      return transaction.agent.update({
        where: { id: existing.id },
        data: {
          name: input.name?.trim(),
          role: input.role?.trim(),
          avatar: input.avatar,
          status: input.status,
          modelConfiguration: input.modelConfiguration as
            Prisma.InputJsonValue | undefined,
          capabilities: input.capabilities
            ? { create: this.capabilityData(input.capabilities) }
            : undefined,
          activities: input.status
            ? {
                create: {
                  type: 'STATUS_CHANGED',
                  summary: `Status changed to ${input.status}`,
                },
              }
            : undefined,
        },
        include: {
          persona: true,
          capabilities: true,
          activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });
    });
    await this.audit(workspaceId, userId, 'AGENT_UPDATED', agent.id, {
      status: agent.status,
    });
    if (input.status)
      this.events.publish({
        id: randomUUID(),
        type: 'AgentStatusChanged',
        aggregateId: agent.id,
        workspaceId: workspaceId as WorkspaceId,
        occurredAt: new Date().toISOString(),
        payload: { status: agent.status },
      });
    return agent;
  }

  async createStarterTeam(userId: string, workspaceId: string) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(membership.role, WorkspaceRole.ADMIN);
    const result = [];
    for (const template of starterPersonas) {
      const existing = await this.prisma.agent.findFirst({
        where: { workspaceId, name: template.name },
      });
      if (existing) continue;
      const persona = await this.prisma.agentPersona.create({
        data: this.personaData(workspaceId, template, true),
      });
      result.push(
        await this.createAgent(userId, workspaceId, {
          name: template.name,
          role: template.role,
          personaId: persona.id,
          modelConfiguration: { provider: 'mock', model: 'default' },
          capabilities: [],
        }),
      );
    }
    return result;
  }

  private async requireAgent(workspaceId: string, agentId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  private async requirePersona(workspaceId: string, personaId: string) {
    const persona = await this.prisma.agentPersona.findFirst({
      where: { id: personaId, workspaceId },
    });
    if (!persona) throw new NotFoundException('Persona not found');
    return persona;
  }

  private personaData(
    workspaceId: string,
    input: CreatePersonaDto | (typeof starterPersonas)[number],
    isBuiltIn = false,
  ) {
    return {
      workspaceId,
      name: input.name,
      role: input.role,
      personality: input.personality,
      expertise: input.expertise,
      responsibilities: input.responsibilities,
      communicationStyle: input.communicationStyle,
      behavioralRules: input.behavioralRules,
      goals: input.goals,
      constraints: input.constraints,
      systemPrompt: input.systemPrompt,
      isBuiltIn,
    };
  }

  private capabilityData(capabilities: string[]) {
    return capabilities
      .filter((capability, index) => capabilities.indexOf(capability) === index)
      .map((capability) => ({ capability, enabled: true }));
  }

  private audit(
    workspaceId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata: Record<string, string>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        action,
        entityType: 'Agent',
        entityId,
        metadata,
      },
    });
  }
}
