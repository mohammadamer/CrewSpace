import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { AgentService } from '../agents/agent.service';
import { ConversationService } from '../conversations/conversation.service';
import { PermissionPolicy } from '../permissions/permission.policy';
import { OnboardingService } from './onboarding.service';

function fixture(role = 'OWNER') {
  const agentRows = ['Atlas', 'Iris', 'Bram', 'Nova'].map((name) => ({
    id: `agent-${name.toLowerCase()}`,
    name,
    role: name === 'Atlas' ? 'Researcher' : 'Teammate',
  }));
  const conversations: Array<{
    id: string;
    type: string;
    members: Array<{ userId?: string; agentId?: string }>;
  }> = [];
  const messages: Array<Record<string, unknown>> = [];
  let createdConversations = 0;
  let createdGreetings = 0;
  const prisma = {
    conversation: { update: async () => undefined },
    message: {
      findFirst: async ({ where }: { where: { conversationId: string } }) =>
        messages.find(
          (message) => message.conversationId === where.conversationId,
        ) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdGreetings++;
        const message = {
          id: `greeting-${createdGreetings}`,
          authorUserId: null,
          createdAt: new Date(),
          ...data,
        };
        messages.push(message);
        return message;
      },
    },
  } as unknown as PrismaService;
  const workspaces = {
    requireMembership: async () => ({ role }),
  } as unknown as WorkspaceService;
  const agents = {
    createStarterTeam: async () => agentRows,
    listAgents: async () => agentRows,
  } as unknown as AgentService;
  const conversationService = {
    listConversations: async () => conversations,
    createConversation: async (
      userId: string,
      _workspaceId: string,
      input: { agentIds: string[] },
    ) => {
      createdConversations++;
      const conversation = {
        id: `conversation-${createdConversations}`,
        type: 'DIRECT',
        members: [{ userId }, { agentId: input.agentIds[0] }],
      };
      conversations.push(conversation);
      return conversation;
    },
  } as unknown as ConversationService;
  const service = new OnboardingService(
    prisma,
    workspaces,
    agents,
    conversationService,
    new PermissionPolicy(),
  );
  return {
    service,
    conversations,
    messages,
    get createdConversations() {
      return createdConversations;
    },
    get createdGreetings() {
      return createdGreetings;
    },
  };
}

test('initializes one direct greeting conversation per starter Agent and is repeatable', async () => {
  const f = fixture();
  const first = await f.service.initialize('user-1', 'workspace-1');
  assert.equal(first.length, 4);
  assert.equal(f.createdConversations, 4);
  assert.equal(f.createdGreetings, 4);
  for (const teammate of first) {
    assert.equal(teammate.greeting.conversationId, teammate.conversation.id);
    assert.equal(teammate.greeting.authorAgentId, teammate.agent.id);
    assert.equal(teammate.greeting.authorUserId, null);
  }
  const second = await f.service.initialize('user-1', 'workspace-1');
  assert.deepEqual(
    second.map((item) => item.conversation.id),
    first.map((item) => item.conversation.id),
  );
  assert.deepEqual(
    second.map((item) => item.greeting.id),
    first.map((item) => item.greeting.id),
  );
  assert.equal(f.createdConversations, 4);
  assert.equal(f.createdGreetings, 4);
});

test('creates missing greeting in an existing direct conversation without duplicating conversation', async () => {
  const f = fixture();
  f.conversations.push({
    id: 'existing',
    type: 'DIRECT',
    members: [{ userId: 'user-1' }, { agentId: 'agent-atlas' }],
  });
  const seeded = await f.service.initialize('user-1', 'workspace-1');
  assert.equal(
    seeded.find((item) => item.agent.name === 'Atlas')?.conversation.id,
    'existing',
  );
  assert.equal(f.createdConversations, 3);
  assert.equal(f.createdGreetings, 4);
});

test('members cannot seed starter conversations', async () => {
  const f = fixture('MEMBER');
  await assert.rejects(
    f.service.initialize('user-1', 'workspace-1'),
    /Requires ADMIN role/,
  );
  assert.equal(f.createdConversations, 0);
  assert.equal(f.createdGreetings, 0);
});
