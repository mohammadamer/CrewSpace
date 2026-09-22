import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { ConveneService } from './convene.service';

const workspaceId = 'workspace-1';
const conveneId = 'convene-1';

function baseConvene(status = 'DRAFT') {
  return {
    id: conveneId,
    workspaceId,
    projectId: 'project-1',
    title: 'Choose storage',
    topic: 'Choose a storage engine',
    status,
    participants: [{ userId: 'user-1' }, { agentId: 'agent-1' }],
    contributions: [],
    decision: null,
  };
}

function workspace() {
  return {
    requireMembership: async () => ({ role: 'MEMBER' }),
  } as unknown as WorkspaceService;
}

test('requires multiple participants before starting a Convene', async () => {
  const prisma = {
    convene: { findFirst: async () => baseConvene() },
    conveneParticipant: { count: async () => 1 },
  } as unknown as PrismaService;
  const service = new ConveneService(
    prisma,
    workspace(),
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  await assert.rejects(
    service.start('user-1', workspaceId, conveneId),
    /at least two participants/,
  );
});

test('only Convene participants can contribute', async () => {
  const prisma = {
    convene: { findFirst: async () => baseConvene('RUNNING') },
    conveneParticipant: { findFirst: async () => null },
  } as unknown as PrismaService;
  const service = new ConveneService(
    prisma,
    workspace(),
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  await assert.rejects(
    service.addContribution('user-2', workspaceId, conveneId, {
      content: 'Evidence',
      type: 'EVIDENCE',
    }),
    /participation required/,
  );
});

test('pause and resume publish lifecycle updates', async () => {
  const received: unknown[] = [];
  const events = new InMemoryEventBus();
  events.subscribe((event) => received.push(event));
  const prisma = {
    convene: {
      findFirst: async () => baseConvene('RUNNING'),
      update: async ({ data }: { data: { status: string } }) => ({
        ...baseConvene(data.status),
      }),
    },
    auditLog: { create: async () => undefined },
  } as unknown as PrismaService;
  const service = new ConveneService(
    prisma,
    workspace(),
    new PermissionPolicy(),
    events,
  );

  await service.pause('user-1', workspaceId, conveneId);
  assert.equal((received[0] as { type: string }).type, 'ConveneUpdated');
});

test('completion creates a Decision and generated action Tasks', async () => {
  const auditEntries: unknown[] = [];
  const prisma = {
    convene: {
      findFirst: async () => baseConvene('PAUSED'),
    },
    project: { findFirst: async () => ({ id: 'project-1' }) },
    auditLog: {
      create: async ({ data }: { data: unknown }) => {
        auditEntries.push(data);
        return data;
      },
    },
    $transaction: async (callback: (transaction: unknown) => unknown) =>
      callback({
        decision: {
          create: async () => ({ id: 'decision-1', title: 'Choose storage' }),
        },
        task: {
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            id: 'task-1',
            ...data,
          }),
        },
        conveneContribution: { create: async () => undefined },
        convene: {
          update: async () => ({ ...baseConvene('COMPLETED') }),
        },
      }),
  } as unknown as PrismaService;
  const service = new ConveneService(
    prisma,
    workspace(),
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  const result = await service.complete('user-1', workspaceId, conveneId, {
    conclusion: 'Use PostgreSQL',
    alternatives: ['SQLite'],
    actionItems: [{ title: 'Create the migration' }],
  });

  assert.equal(result.decision.id, 'decision-1');
  assert.equal(result.tasks.length, 1);
  assert.equal(auditEntries.length, 1);
});
