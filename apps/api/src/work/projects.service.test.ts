import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { ProjectsService } from './projects.service';

const workspaceId = 'workspace-1';
const projectId = 'project-1';
const taskId = 'task-1';

function createService(prisma: unknown, role = 'MEMBER') {
  return new ProjectsService(
    prisma as PrismaService,
    {
      requireMembership: async () => ({ role }),
    } as unknown as WorkspaceService,
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );
}

function task(status = 'TODO') {
  return { id: taskId, projectId, status };
}

test('prevents completing a task while dependencies remain open', async () => {
  const service = createService({
    task: { findFirst: async () => task('IN_PROGRESS') },
    project: { findFirst: async () => ({ id: projectId }) },
    taskDependency: {
      findMany: async () => [{ taskId, dependsOnTaskId: 'blocker-1' }],
    },
  });

  await assert.rejects(
    service.updateTask('user-1', workspaceId, taskId, { status: 'DONE' }),
    /dependencies must be done first/,
  );
});

test('rejects transitions out of terminal task states', async () => {
  const service = createService({
    task: { findFirst: async () => task('DONE') },
    project: { findFirst: async () => ({ id: projectId }) },
  });

  await assert.rejects(
    service.updateTask('user-1', workspaceId, taskId, { status: 'TODO' }),
    /Cannot transition Task from DONE to TODO/,
  );
});

test('creates a Decision and publishes an auditable event', async () => {
  const events = new InMemoryEventBus();
  const received: unknown[] = [];
  events.subscribe((event) => received.push(event));
  const auditEntries: unknown[] = [];
  const decision = {
    id: 'decision-1',
    workspaceId,
    title: 'Use PostgreSQL',
  };
  const prisma = {
    decision: {
      create: async () => decision,
    },
    auditLog: {
      create: async ({ data }: { data: unknown }) => {
        auditEntries.push(data);
        return data;
      },
    },
  };
  const service = new ProjectsService(
    prisma as unknown as PrismaService,
    {
      requireMembership: async () => ({ role: 'MEMBER' }),
    } as unknown as WorkspaceService,
    new PermissionPolicy(),
    events,
  );

  const result = await service.createDecision('user-1', workspaceId, {
    title: decision.title,
    context: 'Compare storage options',
    alternatives: ['SQLite', 'PostgreSQL'],
    conclusion: 'Use PostgreSQL',
  });

  assert.equal(result.id, decision.id);
  assert.equal(auditEntries.length, 1);
  assert.equal((received[0] as { type: string }).type, 'DecisionCreated');
});
