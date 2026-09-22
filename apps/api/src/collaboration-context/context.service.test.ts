import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CollaborationContextService } from './context.service';

const workspaceId = 'workspace-1';
const relationshipId = 'relationship-1';

function relationship() {
  return {
    id: relationshipId,
    workspaceId,
    agentId: 'agent-1',
    relatedAgentId: 'agent-2',
    recentInteractions: ['Earlier discussion'],
    agent: { id: 'agent-1', name: 'Atlas' },
    relatedAgent: { id: 'agent-2', name: 'Bram' },
  };
}

test('rejects self-relationships before persistence', async () => {
  const service = new CollaborationContextService(
    {} as PrismaService,
    {
      requireMembership: async () => ({ role: 'MEMBER' }),
    } as unknown as WorkspaceService,
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  await assert.rejects(
    service.createRelationship('user-1', workspaceId, 'agent-1', {
      relatedAgentId: 'agent-1',
    }),
    /cannot relate to itself/,
  );
});

test('guests cannot edit collaboration context', async () => {
  const prisma = {
    agentRelationship: {
      findFirst: async () => relationship(),
    },
  } as unknown as PrismaService;
  const service = new CollaborationContextService(
    prisma,
    {
      requireMembership: async () => ({ role: 'GUEST' }),
    } as unknown as WorkspaceService,
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  await assert.rejects(
    service.updateRelationship('user-1', workspaceId, relationshipId, {
      summary: 'Updated',
    }),
    /Requires MEMBER role/,
  );
});

test('recording an interaction updates history, audits, and publishes context state', async () => {
  const updated = {
    ...relationship(),
    interactionCount: 1,
    recentInteractions: ['Earlier discussion', 'Reviewed the migration'],
  };
  const auditEntries: unknown[] = [];
  const events = new InMemoryEventBus();
  const received: unknown[] = [];
  events.subscribe((event) => received.push(event));
  const prisma = {
    agentRelationship: {
      findFirst: async () => relationship(),
      update: async () => updated,
    },
    auditLog: {
      create: async ({ data }: { data: unknown }) => {
        auditEntries.push(data);
        return data;
      },
    },
  } as unknown as PrismaService;
  const service = new CollaborationContextService(
    prisma,
    {
      requireMembership: async () => ({ role: 'MEMBER' }),
    } as unknown as WorkspaceService,
    new PermissionPolicy(),
    events,
  );

  const result = await service.recordInteraction(
    'user-1',
    workspaceId,
    relationshipId,
    { summary: 'Reviewed the migration' },
  );

  assert.deepEqual(result.recentInteractions, [
    'Earlier discussion',
    'Reviewed the migration',
  ]);
  assert.equal(auditEntries.length, 1);
  assert.equal(received.length, 1);
  assert.equal(
    (received[0] as { type: string }).type,
    'CollaborationContextUpdated',
  );
});
