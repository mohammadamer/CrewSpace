import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { ConversationService } from './conversation.service';

const workspaceId = 'workspace-1';
const conversationId = 'conversation-1';
const userId = 'user-1';

function createService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    conversation: {
      findFirst: async () => ({ id: conversationId, members: [{ userId }] }),
      findMany: async () => [],
      update: async () => undefined,
    },
    message: {
      create: async ({ data }: { data: Record<string, string> }) => ({
        id: 'message-1',
        ...data,
        createdAt: new Date('2026-09-22T12:00:00.000Z'),
      }),
      findMany: async () => [],
    },
    ...overrides,
  } as unknown as PrismaService;
  const workspaces = {
    requireMembership: async () => ({ role: 'MEMBER' }),
  } as unknown as WorkspaceService;
  const events = new InMemoryEventBus();
  const service = new ConversationService(
    prisma,
    workspaces,
    new PermissionPolicy(),
    events,
  );
  return { service, events };
}

test('non-members cannot read or send messages', async () => {
  const prisma = {
    conversation: {
      findFirst: async () => null,
    },
  } as unknown as PrismaService;
  const workspaces = {
    requireMembership: async () => ({ role: 'MEMBER' }),
  } as unknown as WorkspaceService;
  const service = new ConversationService(
    prisma,
    workspaces,
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  await assert.rejects(
    service.listMessages(userId, workspaceId, conversationId, { limit: 50 }),
    /Conversation membership required/,
  );
  await assert.rejects(
    service.createMessage(userId, workspaceId, conversationId, {
      content: 'Hello',
    }),
    /Conversation membership required/,
  );
});

test('message creation publishes a workspace-scoped MessageCreated event', async () => {
  const { service, events } = createService();
  const received: unknown[] = [];
  events.subscribe((event) => received.push(event));

  const message = await service.createMessage(
    userId,
    workspaceId,
    conversationId,
    { content: '  Hello team  ' },
  );

  assert.equal(message.content, 'Hello team');
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], {
    id: (received[0] as { id: string }).id,
    type: 'MessageCreated',
    aggregateId: 'message-1',
    workspaceId,
    occurredAt: (received[0] as { occurredAt: string }).occurredAt,
    sequence: 1,
    payload: {
      conversationId,
      messageId: 'message-1',
      authorUserId: userId,
      content: 'Hello team',
    },
  });
});

test('message pagination returns a stable next cursor', async () => {
  const first = {
    id: 'message-2',
    createdAt: new Date('2026-09-22T12:02:00.000Z'),
  };
  const second = {
    id: 'message-1',
    createdAt: new Date('2026-09-22T12:01:00.000Z'),
  };
  const findMany = async () => [first, second];
  const { service } = createService({ message: { findMany } });

  const page = await service.listMessages(userId, workspaceId, conversationId, {
    limit: 1,
  });

  assert.deepEqual(page.items, [first]);
  assert.equal(
    page.nextCursor,
    Buffer.from(`${first.createdAt.toISOString()}|${first.id}`).toString(
      'base64url',
    ),
  );
});

test('a direct one-Agent conversation persists deterministic reply as that Agent', async () => {
  const created: Array<Record<string, unknown>> = [];
  const prisma = {
    conversation: {
      findFirst: async () => ({
        id: conversationId,
        type: 'DIRECT',
        members: [{ userId }, { agentId: 'agent-atlas' }],
      }),
      update: async () => undefined,
    },
    message: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `message-${created.length + 1}`, ...data };
        created.push(row);
        return row;
      },
    },
    agent: { findFirst: async () => ({ name: 'Atlas', role: 'Researcher' }) },
  } as unknown as PrismaService;
  const service = new ConversationService(
    prisma,
    {
      requireMembership: async () => ({ role: 'OWNER' }),
    } as unknown as WorkspaceService,
    new PermissionPolicy(),
    new InMemoryEventBus(),
  );

  await service.createMessage(userId, workspaceId, conversationId, {
    content: '  Compare these options  ',
  });

  assert.equal(created.length, 2);
  assert.equal(created[0]?.content, 'Compare these options');
  assert.equal(created[0]?.authorUserId, userId);
  assert.equal(created[1]?.authorAgentId, 'agent-atlas');
  assert.equal(created[1]?.authorUserId, undefined);
  assert.match(String(created[1]?.content), /Atlas.*Compare these options/);
});

test('group and human-only direct conversations do not trigger mock replies', async () => {
  for (const conversation of [
    {
      id: conversationId,
      type: 'GROUP',
      members: [{ userId }, { agentId: 'agent-atlas' }],
    },
    {
      id: conversationId,
      type: 'DIRECT',
      members: [{ userId }, { userId: 'user-2' }],
    },
  ]) {
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      conversation: {
        findFirst: async () => conversation,
        update: async () => undefined,
      },
      message: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return { id: 'message', ...data };
        },
      },
      agent: { findFirst: async () => ({ name: 'Atlas', role: 'Researcher' }) },
    } as unknown as PrismaService;
    const service = new ConversationService(
      prisma,
      {
        requireMembership: async () => ({ role: 'OWNER' }),
      } as unknown as WorkspaceService,
      new PermissionPolicy(),
      new InMemoryEventBus(),
    );
    await service.createMessage(userId, workspaceId, conversationId, {
      content: 'Hello',
    });
    assert.equal(created.length, 1);
  }
});
