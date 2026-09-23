import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationType, WorkspaceRole } from '@crewspace/database';
import { AgentId, ConversationId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { AgentService } from '../agents/agent.service';
import { WorkspaceService } from '../workspace/workspace.service';

const greetings: Record<string, string> = {
  Atlas: 'Welcome. I can help research questions, compare options, and surface evidence.',
  Iris: 'Hi. I can help make workflows clearer, friendlier, and easier to use.',
  Bram: 'Hello. I can help turn ideas into reliable technical plans and implementations.',
  Nova: 'Welcome to the team. I can help clarify priorities, owners, and next steps.',
};

@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agents: AgentService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
  ) {}

  async seedWorkspace(userId: string, workspaceId: string) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(membership.role, WorkspaceRole.ADMIN);
    await this.agents.createStarterTeam(userId, workspaceId);

    const teammates = await this.prisma.agent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    const conversations = [];

    for (const agent of teammates) {
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          workspaceId,
          type: ConversationType.DIRECT,
          AND: [
            { members: { some: { userId } } },
            { members: { some: { agentId: agent.id } } },
          ],
        },
      });

      if (!conversation) {
        conversation = await this.prisma.$transaction(async (transaction) => {
          const created = await transaction.conversation.create({
            data: {
              workspaceId,
              type: ConversationType.DIRECT,
              title: `You and ${agent.name}`,
            },
          });
          await transaction.conversationMember.createMany({
            data: [
              { conversationId: created.id, userId },
              { conversationId: created.id, agentId: agent.id },
            ],
          });
          return created;
        });
      }

      const existingGreeting = await this.prisma.message.findFirst({
        where: { conversationId: conversation.id, authorAgentId: agent.id },
      });
      if (!existingGreeting) {
        const message = await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            authorAgentId: agent.id,
            content: greetings[agent.name] ?? `${agent.name} is ready to help.`,
          },
        });
        this.events.publish({
          id: randomUUID(),
          type: 'MessageCreated',
          aggregateId: message.id,
          workspaceId: workspaceId as WorkspaceId,
          occurredAt: message.createdAt.toISOString(),
          payload: {
            conversationId: conversation.id as ConversationId,
            messageId: message.id,
            authorAgentId: agent.id as AgentId,
            content: message.content,
          },
        });
      }
      conversations.push(conversation);
    }

    return { agents: teammates, conversations };
  }

  async reply(
    userId: string,
    workspaceId: string,
    conversationId: string,
    content: string,
  ) {
    await this.workspaces.requireMembership(userId, workspaceId);
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
        members: { some: { userId } },
      },
      include: { members: { include: { agent: true } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const agent = conversation.members.find((member) => member.agent)?.agent;
    if (!agent)
      throw new ConflictException(
        'Demo conversation requires an Agent member',
      );

    const normalized = content.toLowerCase();
    const response = normalized.includes('research')
      ? 'I can break that into evidence, assumptions, and open questions.'
      : normalized.includes('design')
        ? 'I can help map the user goal, friction points, and a clearer next step.'
        : normalized.includes('build') || normalized.includes('code')
          ? 'I can help turn that into a small implementation plan with tradeoffs.'
          : 'I hear you. I can help clarify the goal and suggest a practical next step.';
    const message = await this.prisma.message.create({
      data: { conversationId, authorAgentId: agent.id, content: response },
    });
    this.events.publish({
      id: randomUUID(),
      type: 'MessageCreated',
      aggregateId: message.id,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: message.createdAt.toISOString(),
      payload: {
        conversationId: conversationId as ConversationId,
        messageId: message.id,
        authorAgentId: agent.id as AgentId,
        content: message.content,
      },
    });
    return message;
  }
}