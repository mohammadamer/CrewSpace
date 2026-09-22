import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { IntegrationService } from './integration.service';

const workspaceId = 'workspace-1';
const integrationId = 'integration-1';

function workspace() {
  return {
    requireMembership: async () => ({ role: 'MEMBER' }),
  } as unknown as WorkspaceService;
}

test('creates an integration and publishes a typed event', async () => {
  const events = new InMemoryEventBus();
  const seen: unknown[] = [];
  events.subscribe((event) => seen.push(event));
  const auditEntries: unknown[] = [];
  const prisma = {
    integration: {
      create: async () => ({
        id: integrationId,
        workspaceId,
        provider: 'GITHUB',
        name: 'GitHub',
        credentials: [],
      }),
    },
    auditLog: {
      create: async ({ data }: { data: unknown }) => {
        auditEntries.push(data);
        return data;
      },
    },
  } as unknown as PrismaService;
  const service = new IntegrationService(
    prisma,
    workspace(),
    new PermissionPolicy(),
    events,
  );

  const result = await service.create('user-1', workspaceId, {
    name: 'GitHub',
    provider: 'GITHUB',
  });

  assert.equal(result.id, integrationId);
  assert.equal(auditEntries.length, 1);
  assert.equal((seen[0] as { type: string }).type, 'IntegrationCreated');
});

test('stores encrypted credentials and rejects mismatched provider bindings', async () => {
  const prisma = {
    integration: {
      findFirst: async () => ({
        id: integrationId,
        workspaceId,
        provider: 'GITHUB',
      }),
    },
    integrationCredential: {
      upsert: async () => ({ id: 'credential-1', encryptedValue: 'Z2l0aHVi' }),
    },
    auditLog: {
      create: async ({ data }: { data: unknown }) => data,
    },
  } as unknown as PrismaService;
  const service = new IntegrationService(
    prisma,
    workspace(),
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  const result = await service.addCredential(
    'user-1',
    workspaceId,
    integrationId,
    {
      provider: 'GITHUB',
      value: 'github',
    },
  );

  assert.equal(result.encryptedValue, 'Z2l0aHVi');
  await assert.rejects(
    service.addCredential('user-1', workspaceId, integrationId, {
      provider: 'SLACK',
      value: 'secret',
    }),
    /must match the integration provider/,
  );
});
