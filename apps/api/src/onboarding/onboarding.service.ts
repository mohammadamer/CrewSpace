import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConversationType, WorkspaceRole } from '@crewspace/database';
import { AgentService } from '../agents/agent.service';
import { starterPersonas } from '../agents/starter-personas';
import { ConversationService } from '../conversations/conversation.service';
import { PrismaService } from '../prisma.service';
import { PermissionPolicy } from '../permissions/permission.policy';
import { WorkspaceService } from '../workspace/workspace.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly agents: AgentService,
    private readonly conversations: ConversationService,
    private readonly permissions: PermissionPolicy,
  ) {}

  async initialize(userId: string, workspaceId: string) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(membership.role, WorkspaceRole.ADMIN);
    await this.agents.createStarterTeam(userId, workspaceId);

    const starterNames = new Set<string>(
      starterPersonas.map((persona) => persona.name),
    );
    const agents = (await this.agents.listAgents(userId, workspaceId)).filter(
      (agent) => starterNames.has(agent.name),
    );
    const existing = await this.conversations.listConversations(
      userId,
      workspaceId,
    );
    const initialized = [];

    for (const agent of agents) {
      let conversation = existing.find(
        (candidate) =>
          candidate.type === ConversationType.DIRECT &&
          candidate.members.length === 2 &&
          candidate.members.some((member) => member.userId === userId) &&
          candidate.members.some((member) => member.agentId === agent.id),
      );
      if (!conversation) {
        conversation = await this.conversations.createConversation(
          userId,
          workspaceId,
          {
            type: ConversationType.DIRECT,
            userIds: [],
            agentIds: [agent.id],
          },
        );
        existing.push(conversation);
      }

      let greeting = await this.prisma.message.findFirst({
        where: { conversationId: conversation.id, authorAgentId: agent.id },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      if (!greeting) {
        greeting = await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            authorAgentId: agent.id,
            content: `Hi, I'm ${agent.name}, your ${agent.role}. I'm ready to help with your next task.`,
          },
        });
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: greeting.createdAt },
        });
      }
      initialized.push({ agent, conversation, greeting });
    }
    return initialized;
  }
}
