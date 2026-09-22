import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentExecutionStatus, WorkspaceRole } from '@crewspace/database';
import { AgentId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { ExecuteAgentDto } from './execution.dto';
import { ExecutionRunner, RuntimeExecutionError } from './execution-runner';

@Injectable()
export class AgentExecutionService {
  private readonly activeControllers = new Map<string, AbortController>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
    private readonly runner: ExecutionRunner,
  ) {}

  async execute(
    userId: string,
    workspaceId: string,
    agentId: string,
    input: ExecuteAgentDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    const execution = await this.prisma.agentExecution.create({
      data: {
        agentId,
        workspaceId,
        prompt: input.prompt.trim(),
        maxAttempts: input.maxAttempts,
        timeoutMs: input.timeoutMs,
      },
    });
    const controller = new AbortController();
    this.activeControllers.set(execution.id, controller);
    await this.prisma.agentExecution.update({
      where: { id: execution.id },
      data: { status: AgentExecutionStatus.RUNNING, startedAt: new Date() },
    });
    this.events.publish({
      id: randomUUID(),
      type: 'AgentExecutionStarted',
      aggregateId: execution.id,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: { executionId: execution.id, agentId: agentId as AgentId },
    });

    try {
      const run = await this.runner.run(
        {
          prompt: input.prompt.trim(),
          modelConfiguration:
            input.modelConfiguration ??
            (agent.modelConfiguration as Record<string, unknown>),
        },
        {
          maxAttempts: input.maxAttempts,
          timeoutMs: input.timeoutMs,
          signal: controller.signal,
        },
      );
      const completedAt = new Date();
      const completed = await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: AgentExecutionStatus.COMPLETED,
          attempt: run.attempts,
          output: run.result.output,
          completedAt,
          usage: {
            create: {
              inputTokens: run.result.usage.inputTokens,
              outputTokens: run.result.usage.outputTokens,
              totalTokens: run.result.usage.totalTokens,
              durationMs: run.durationMs,
            },
          },
        },
        include: { usage: true },
      });
      this.events.publish({
        id: randomUUID(),
        type: 'AgentExecutionCompleted',
        aggregateId: execution.id,
        workspaceId: workspaceId as WorkspaceId,
        occurredAt: completedAt.toISOString(),
        payload: {
          executionId: execution.id,
          agentId: agentId as AgentId,
          output: run.result.output,
        },
      });
      return completed;
    } catch (error) {
      const failure =
        error instanceof RuntimeExecutionError
          ? error
          : new RuntimeExecutionError(
              'FAILED',
              error instanceof Error ? error.message : 'Execution failed',
              1,
            );
      const completedAt = new Date();
      const failed = await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: failure.status as AgentExecutionStatus,
          attempt: failure.attempts,
          error: failure.message,
          completedAt,
        },
      });
      this.events.publish({
        id: randomUUID(),
        type: 'AgentExecutionFailed',
        aggregateId: execution.id,
        workspaceId: workspaceId as WorkspaceId,
        occurredAt: completedAt.toISOString(),
        payload: {
          executionId: execution.id,
          agentId: agentId as AgentId,
          status: failure.status,
          error: failure.message,
        },
      });
      return failed;
    } finally {
      this.activeControllers.delete(execution.id);
    }
  }

  async cancel(userId: string, workspaceId: string, executionId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    const execution = await this.prisma.agentExecution.findFirst({
      where: { id: executionId, workspaceId },
    });
    if (!execution) throw new NotFoundException('Execution not found');
    this.activeControllers.get(executionId)?.abort();
    return execution;
  }
}
