import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { ApprovalService } from './approval.service';

const workspaceId = 'workspace-1';
const approvalId = 'approval-1';
const agentId = 'agent-1';

function workspace(role = 'MEMBER') {
  return {
    requireMembership: async () => ({ role }),
  } as unknown as WorkspaceService;
}

function approval(status = 'PENDING', expiresAt?: Date) {
  return {
    id: approvalId,
    workspaceId,
    agentId,
    capability: 'deploy',
    action: 'Deploy release',
    status,
    expiresAt,
  };
}

test('Agent approval requests are persisted and publish pending events', async () => {
  const received: unknown[] = [];
  const events = new InMemoryEventBus();
  events.subscribe((event) => received.push(event));
  const auditEntries: unknown[] = [];
  const prisma = {
    agent: { findFirst: async () => ({ id: agentId }) },
    approvalRequest: {
      create: async () => approval(),
    },
    auditLog: {
      create: async ({ data }: { data: unknown }) => {
        auditEntries.push(data);
        return data;
      },
    },
  } as unknown as PrismaService;
  const service = new ApprovalService(
    prisma,
    workspace(),
    new PermissionPolicy(),
    events,
  );

  const result = await service.request('user-1', workspaceId, agentId, {
    capability: 'deploy',
    action: 'Deploy release',
    risk: 'DESTRUCTIVE',
    payload: { release: 'v1' },
    reason: 'Release is ready',
  });

  assert.equal(result.id, approvalId);
  assert.equal(auditEntries.length, 1);
  assert.equal((received[0] as { type: string }).type, 'ApprovalUpdated');
});

test('approval enables the requested Agent capability', async () => {
  const auditEntries: unknown[] = [];
  const prisma = {
    approvalRequest: {
      findFirst: async () => approval(),
      update: async () => approval('APPROVED'),
    },
    $transaction: async (callback: (transaction: unknown) => unknown) =>
      callback({
        approvalRequest: {
          update: async () => approval('APPROVED'),
        },
        agentToolPermission: {
          upsert: async () => ({ enabled: true }),
        },
      }),
    auditLog: {
      create: async ({ data }: { data: unknown }) => {
        auditEntries.push(data);
        return data;
      },
    },
  } as unknown as PrismaService;
  const service = new ApprovalService(
    prisma,
    workspace(),
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  const result = await service.approve('user-1', workspaceId, approvalId);

  assert.equal(result.status, 'APPROVED');
  assert.equal(auditEntries.length, 1);
});

test('Guests cannot review approvals', async () => {
  const service = new ApprovalService(
    {} as PrismaService,
    workspace('GUEST'),
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  await assert.rejects(
    service.approve('user-1', workspaceId, approvalId),
    /Requires MEMBER role/,
  );
});

test('expired approval requests cannot be approved', async () => {
  const prisma = {
    approvalRequest: {
      findFirst: async () => approval('PENDING', new Date('2020-01-01')),
      update: async () => approval('EXPIRED'),
    },
  } as unknown as PrismaService;
  const service = new ApprovalService(
    prisma,
    workspace(),
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  await assert.rejects(
    service.approve('user-1', workspaceId, approvalId),
    /has expired/,
  );
});
