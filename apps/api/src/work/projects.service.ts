import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectMemberRole,
  ProjectStatus,
  TaskStatus,
  WorkspaceRole,
} from '@crewspace/database';
import { AgentId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  AddProjectMemberDto,
  AddTaskDependencyDto,
  CreateDecisionDto,
  CreateProjectDto,
  CreateTaskDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from './projects.dto';

const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  TODO: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.CANCELLED],
  IN_PROGRESS: [TaskStatus.BLOCKED, TaskStatus.DONE, TaskStatus.CANCELLED],
  BLOCKED: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  DONE: [],
  CANCELLED: [],
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
  ) {}

  async listProjects(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.prisma.project.findMany({
      where: { workspaceId, members: { some: { userId } } },
      include: { members: true, tasks: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createProject(
    userId: string,
    workspaceId: string,
    input: CreateProjectDto,
  ) {
    const membership = await this.requireMember(userId, workspaceId);
    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        createdById: userId,
        name: input.name.trim(),
        description: input.description?.trim(),
        members: {
          create: { userId, role: ProjectMemberRole.LEAD },
        },
      },
      include: { members: true },
    });
    await this.audit(workspaceId, userId, 'PROJECT_CREATED', project.id);
    this.events.publish({
      id: randomUUID(),
      type: 'ProjectCreated',
      aggregateId: project.id,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: { projectId: project.id, name: project.name },
    });
    void membership;
    return project;
  }

  async getProject(userId: string, workspaceId: string, projectId: string) {
    await this.requireProjectAccess(userId, workspaceId, projectId);
    return this.prisma.project.findFirstOrThrow({
      where: { id: projectId, workspaceId },
      include: { members: true, tasks: true, decisions: true },
    });
  }

  async updateProject(
    userId: string,
    workspaceId: string,
    projectId: string,
    input: UpdateProjectDto,
  ) {
    await this.requireProjectEditor(userId, workspaceId, projectId);
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: input.name?.trim(),
        description: input.description?.trim(),
        status: input.status,
      },
      include: { members: true },
    });
    await this.audit(workspaceId, userId, 'PROJECT_UPDATED', project.id);
    return project;
  }

  async addProjectMember(
    userId: string,
    workspaceId: string,
    projectId: string,
    input: AddProjectMemberDto,
  ) {
    await this.requireProjectEditor(userId, workspaceId, projectId);
    if ((input.userId ? 1 : 0) + (input.agentId ? 1 : 0) !== 1) {
      throw new ConflictException('Provide exactly one project member');
    }
    if (input.userId) {
      await this.workspaces.requireMembership(input.userId, workspaceId);
    } else {
      await this.requireAgent(workspaceId, input.agentId!);
    }
    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: input.userId,
        agentId: input.agentId,
        role: input.role ?? ProjectMemberRole.MEMBER,
      },
    });
    await this.audit(workspaceId, userId, 'PROJECT_MEMBER_ADDED', member.id);
    return member;
  }

  async listTasks(userId: string, workspaceId: string, projectId: string) {
    await this.requireProjectAccess(userId, workspaceId, projectId);
    return this.prisma.task.findMany({
      where: { workspaceId, projectId },
      include: { dependencies: true, dependents: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createTask(
    userId: string,
    workspaceId: string,
    projectId: string,
    input: CreateTaskDto,
  ) {
    await this.requireProjectEditor(userId, workspaceId, projectId);
    await this.validateAssignment(
      projectId,
      input.assigneeUserId,
      input.assigneeAgentId,
    );
    if (input.decisionId)
      await this.requireDecision(workspaceId, input.decisionId);
    const task = await this.prisma.task.create({
      data: {
        workspaceId,
        projectId,
        createdById: userId,
        title: input.title.trim(),
        description: input.description?.trim(),
        priority: input.priority,
        assigneeUserId: input.assigneeUserId,
        assigneeAgentId: input.assigneeAgentId,
        decisionId: input.decisionId,
      },
    });
    await this.audit(workspaceId, userId, 'TASK_CREATED', task.id);
    this.publishTask(task.id, task.status, workspaceId);
    return task;
  }

  async updateTask(
    userId: string,
    workspaceId: string,
    taskId: string,
    input: UpdateTaskDto,
  ) {
    const task = await this.requireTask(workspaceId, taskId);
    await this.requireProjectEditor(userId, workspaceId, task.projectId);
    await this.validateAssignment(
      task.projectId,
      input.assigneeUserId,
      input.assigneeAgentId,
    );
    if (input.status && input.status !== task.status) {
      this.assertTransition(task.status, input.status);
      if (
        input.status === TaskStatus.IN_PROGRESS ||
        input.status === TaskStatus.DONE
      ) {
        await this.requireDependenciesComplete(task.id);
      }
    }
    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        title: input.title?.trim(),
        description: input.description?.trim(),
        status: input.status,
        priority: input.priority,
        assigneeUserId: input.assigneeUserId,
        assigneeAgentId: input.assigneeAgentId,
      },
      include: { dependencies: true, dependents: true },
    });
    await this.audit(workspaceId, userId, 'TASK_UPDATED', updated.id);
    this.publishTask(updated.id, updated.status, workspaceId);
    return updated;
  }

  async addDependency(
    userId: string,
    workspaceId: string,
    taskId: string,
    input: AddTaskDependencyDto,
  ) {
    const task = await this.requireTask(workspaceId, taskId);
    const dependency = await this.requireTask(
      workspaceId,
      input.dependsOnTaskId,
    );
    await this.requireProjectEditor(userId, workspaceId, task.projectId);
    if (task.projectId !== dependency.projectId) {
      throw new ConflictException('Task dependencies must share a Project');
    }
    if (task.id === dependency.id) {
      throw new ConflictException('A Task cannot depend on itself');
    }
    const created = await this.prisma.taskDependency.create({
      data: { taskId: task.id, dependsOnTaskId: dependency.id },
    });
    await this.audit(workspaceId, userId, 'TASK_DEPENDENCY_CREATED', task.id);
    return created;
  }

  async createDecision(
    userId: string,
    workspaceId: string,
    input: CreateDecisionDto,
  ) {
    await this.requireMember(userId, workspaceId);
    if (input.projectId) {
      await this.requireProjectAccess(userId, workspaceId, input.projectId);
    }
    if (input.sourceConversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: input.sourceConversationId, workspaceId },
      });
      if (!conversation) throw new NotFoundException('Conversation not found');
    }
    const decision = await this.prisma.decision.create({
      data: {
        workspaceId,
        projectId: input.projectId,
        createdById: userId,
        sourceConversationId: input.sourceConversationId,
        title: input.title.trim(),
        context: input.context.trim(),
        alternatives: input.alternatives as Prisma.InputJsonValue,
        conclusion: input.conclusion.trim(),
        provenance: input.provenance?.trim(),
      },
    });
    await this.audit(workspaceId, userId, 'DECISION_CREATED', decision.id);
    this.events.publish({
      id: randomUUID(),
      type: 'DecisionCreated',
      aggregateId: decision.id,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: { decisionId: decision.id, title: decision.title },
    });
    return decision;
  }

  async listDecisions(userId: string, workspaceId: string, projectId?: string) {
    await this.requireMember(userId, workspaceId);
    return this.prisma.decision.findMany({
      where: { workspaceId, projectId },
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });
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

  private async requireProjectAccess(
    userId: string,
    workspaceId: string,
    projectId: string,
  ) {
    await this.requireMember(userId, workspaceId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId, members: { some: { userId } } },
    });
    if (!project) throw new ForbiddenException('Project membership required');
    return project;
  }

  private async requireProjectEditor(
    userId: string,
    workspaceId: string,
    projectId: string,
  ) {
    return this.requireProjectAccess(userId, workspaceId, projectId);
  }

  private async requireTask(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async requireDecision(workspaceId: string, decisionId: string) {
    const decision = await this.prisma.decision.findFirst({
      where: { id: decisionId, workspaceId },
    });
    if (!decision) throw new NotFoundException('Decision not found');
    return decision;
  }

  private async requireAgent(workspaceId: string, agentId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
    });
    if (!agent) throw new NotFoundException('Agent not found');
  }

  private async validateAssignment(
    projectId: string,
    userId?: string,
    agentId?: string,
  ) {
    if ((userId ? 1 : 0) + (agentId ? 1 : 0) > 1) {
      throw new ConflictException('A Task can have only one assignee');
    }
    if (userId || agentId) {
      const member = await this.prisma.projectMember.findFirst({
        where: { projectId, userId, agentId },
      });
      if (!member)
        throw new ForbiddenException('Assignee must be a Project member');
    }
  }

  private assertTransition(from: TaskStatus, to: TaskStatus) {
    if (!allowedTransitions[from].includes(to)) {
      throw new ConflictException(
        `Cannot transition Task from ${from} to ${to}`,
      );
    }
  }

  private async requireDependenciesComplete(taskId: string) {
    const blockers = await this.prisma.taskDependency.findMany({
      where: { taskId, dependsOnTask: { status: { not: TaskStatus.DONE } } },
    });
    if (blockers.length > 0) {
      throw new ConflictException('All Task dependencies must be done first');
    }
  }

  private publishTask(taskId: string, status: TaskStatus, workspaceId: string) {
    this.events.publish({
      id: randomUUID(),
      type: 'TaskUpdated',
      aggregateId: taskId,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: { taskId, status },
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
        entityType: 'ProjectWork',
        entityId,
      },
    });
  }
}
