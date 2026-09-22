import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgentWakeStatus, WorkspaceRole } from '@crewspace/database';
import { AgentId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { AgentScheduler, ScheduleState } from './agent-scheduler';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  WakeScheduleDto,
} from './initiative.dto';

@Injectable()
export class InitiativeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
    private readonly scheduler: AgentScheduler,
  ) {}

  async listSchedules(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.prisma.agentSchedule.findMany({
      where: { workspaceId },
      include: { agent: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createSchedule(
    userId: string,
    workspaceId: string,
    agentId: string,
    input: CreateScheduleDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    this.validateTimezone(input.timezone);
    await this.requireAgent(workspaceId, agentId);
    const schedule = await this.prisma.agentSchedule.create({
      data: {
        workspaceId,
        agentId,
        cadenceMinutes: input.cadenceMinutes,
        timezone: input.timezone,
        activeHoursStart: input.activeHoursStart,
        activeHoursEnd: input.activeHoursEnd,
        cooldownMinutes: input.cooldownMinutes,
        dailyBudget: input.dailyBudget,
      },
      include: { agent: true },
    });
    await this.audit(
      workspaceId,
      userId,
      'AGENT_SCHEDULE_CREATED',
      schedule.id,
    );
    return schedule;
  }

  async updateSchedule(
    userId: string,
    workspaceId: string,
    scheduleId: string,
    input: UpdateScheduleDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    const existing = await this.requireSchedule(workspaceId, scheduleId);
    const next = { ...existing, ...input };
    this.validateTimezone(next.timezone);
    const schedule = await this.prisma.agentSchedule.update({
      where: { id: scheduleId },
      data: {
        enabled: input.enabled,
        cadenceMinutes: input.cadenceMinutes,
        timezone: input.timezone,
        activeHoursStart: input.activeHoursStart,
        activeHoursEnd: input.activeHoursEnd,
        cooldownMinutes: input.cooldownMinutes,
        dailyBudget: input.dailyBudget,
      },
      include: { agent: true },
    });
    await this.audit(
      workspaceId,
      userId,
      'AGENT_SCHEDULE_UPDATED',
      schedule.id,
    );
    return schedule;
  }

  async cancelSchedule(
    userId: string,
    workspaceId: string,
    scheduleId: string,
  ) {
    return this.updateSchedule(userId, workspaceId, scheduleId, {
      enabled: false,
    });
  }

  async wakeSchedule(
    userId: string,
    workspaceId: string,
    scheduleId: string,
    input: WakeScheduleDto = {},
  ) {
    await this.workspaces.requireMembership(userId, workspaceId);
    const schedule = await this.requireSchedule(workspaceId, scheduleId);
    const now = new Date();
    const state = this.resetBudgetIfNeeded(schedule, now);
    const decision = this.scheduler.evaluate(state, now);
    const reason = input.requestedByExecutionId
      ? `${decision.reason}; requested by execution ${input.requestedByExecutionId}`
      : decision.reason;
    const wakeCycle = await this.prisma.agentWakeCycle.create({
      data: {
        scheduleId,
        status: decision.status as AgentWakeStatus,
        reason,
      },
    });

    if (decision.status === 'EXECUTED') {
      await this.prisma.agentSchedule.update({
        where: { id: scheduleId },
        data: {
          budgetUsed: state.budgetUsed + 1,
          budgetResetAt: state.budgetResetAt ?? this.nextUtcDay(now),
          lastWakeAt: now,
          nextWakeAt: new Date(now.getTime() + state.cadenceMinutes * 60_000),
        },
      });
    } else if (state.budgetUsed !== schedule.budgetUsed) {
      await this.prisma.agentSchedule.update({
        where: { id: scheduleId },
        data: {
          budgetUsed: state.budgetUsed,
          budgetResetAt: state.budgetResetAt,
        },
      });
    }

    await this.audit(
      workspaceId,
      userId,
      'AGENT_WAKE_CYCLE_RECORDED',
      wakeCycle.id,
    );
    this.events.publish({
      id: randomUUID(),
      type: 'AgentWakeCycleRecorded',
      aggregateId: wakeCycle.id,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: now.toISOString(),
      payload: {
        scheduleId,
        agentId: schedule.agentId as AgentId,
        status: decision.status,
        reason,
      },
    });
    return { wakeCycle, decision };
  }

  async listWakeCycles(
    userId: string,
    workspaceId: string,
    scheduleId: string,
  ) {
    await this.workspaces.requireMembership(userId, workspaceId);
    await this.requireSchedule(workspaceId, scheduleId);
    return this.prisma.agentWakeCycle.findMany({
      where: { scheduleId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async requireSchedule(workspaceId: string, scheduleId: string) {
    const schedule = await this.prisma.agentSchedule.findFirst({
      where: { id: scheduleId, workspaceId },
      include: { agent: true },
    });
    if (!schedule) throw new NotFoundException('Agent schedule not found');
    return schedule;
  }

  private async requireAgent(workspaceId: string, agentId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  private validateTimezone(timezone: string) {
    try {
      this.scheduler.validateTimezone(timezone);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid timezone',
      );
    }
  }

  private resetBudgetIfNeeded<T extends ScheduleState>(
    schedule: T,
    now: Date,
  ): T {
    if (schedule.budgetResetAt && now >= schedule.budgetResetAt) {
      return { ...schedule, budgetUsed: 0, budgetResetAt: undefined };
    }
    return schedule;
  }

  private nextUtcDay(now: Date) {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
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
        entityType: 'AgentSchedule',
        entityId,
      },
    });
  }
}
