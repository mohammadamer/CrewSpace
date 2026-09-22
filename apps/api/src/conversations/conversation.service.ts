import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@crewspace/database';
import { ConversationId, UserId, WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  CreateConversationDto,
  CreateMessageDto,
  ListMessagesQueryDto,
} from './conversation.dto';

const maxMessageLength = 20_000;

type MessageCursor = {
  createdAt: Date;
  id: string;
};

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
  ) {}

  async createConversation(
    userId: string,
    workspaceId: string,
    input: CreateConversationDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );

    const userIds = this.uniqueIds([userId, ...input.userIds]);
    const agentIds = this.uniqueIds(input.agentIds);
    if (userIds.length + agentIds.length < 2) {
      throw new ConflictException(
        'A conversation requires at least two members',
      );
    }
    await this.requireUsers(workspaceId, userIds);
    await this.requireAgents(workspaceId, agentIds);

    const conversation = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.conversation.create({
        data: {
          workspaceId,
          type: input.type,
          title: input.title?.trim(),
        },
      });
      await transaction.conversationMember.createMany({
        data: [
          ...userIds.map((memberId) => ({
            conversationId: created.id,
            userId: memberId,
          })),
          ...agentIds.map((memberId) => ({
            conversationId: created.id,
            agentId: memberId,
          })),
        ],
      });
      return transaction.conversation.findUniqueOrThrow({
        where: { id: created.id },
        include: { members: true },
      });
    });

    return conversation;
  }

  async listConversations(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.prisma.conversation.findMany({
      where: {
        workspaceId,
        members: { some: { userId } },
      },
      include: { members: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversation(
    userId: string,
    workspaceId: string,
    conversationId: string,
  ) {
    await this.requireConversationMember(userId, workspaceId, conversationId);
    return this.prisma.conversation.findFirstOrThrow({
      where: { id: conversationId, workspaceId },
      include: { members: true },
    });
  }

  async createMessage(
    userId: string,
    workspaceId: string,
    conversationId: string,
    input: CreateMessageDto,
  ) {
    await this.requireConversationMember(userId, workspaceId, conversationId);
    const content = input.content.trim();
    if (content.length === 0) {
      throw new ConflictException('Message content cannot be empty');
    }
    if (content.length > maxMessageLength) {
      throw new ConflictException('Message exceeds the maximum length');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        authorUserId: userId as UserId,
        content,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    this.events.publish({
      id: randomUUID(),
      type: 'MessageCreated',
      aggregateId: message.id,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: {
        conversationId: conversationId as ConversationId,
        messageId: message.id,
        authorUserId: userId as UserId,
        content: message.content,
      },
    });
    return message;
  }

  async listMessages(
    userId: string,
    workspaceId: string,
    conversationId: string,
    query: ListMessagesQueryDto,
  ) {
    await this.requireConversationMember(userId, workspaceId, conversationId);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = messages.length > query.limit;
    const items = hasMore ? messages.slice(0, query.limit) : messages;
    const lastItem = items.at(-1);
    return {
      items,
      nextCursor:
        hasMore && lastItem
          ? this.encodeCursor(lastItem.createdAt, lastItem.id)
          : null,
    };
  }

  private async requireConversationMember(
    userId: string,
    workspaceId: string,
    conversationId: string,
  ) {
    await this.workspaces.requireMembership(userId, workspaceId);
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
        members: { some: { userId } },
      },
    });
    if (!conversation) {
      throw new ForbiddenException('Conversation membership required');
    }
    return conversation;
  }

  private async requireUsers(workspaceId: string, userIds: string[]) {
    const count = await this.prisma.workspaceMember.count({
      where: { workspaceId, userId: { in: userIds } },
    });
    if (count !== userIds.length) {
      throw new NotFoundException('Conversation user member not found');
    }
  }

  private async requireAgents(workspaceId: string, agentIds: string[]) {
    if (agentIds.length === 0) return;
    const count = await this.prisma.agent.count({
      where: { workspaceId, id: { in: agentIds } },
    });
    if (count !== agentIds.length) {
      throw new NotFoundException('Conversation Agent member not found');
    }
  }

  private uniqueIds(ids: string[]) {
    return [...new Set(ids)];
  }

  private encodeCursor(createdAt: Date, id: string) {
    return Buffer.from(`${createdAt.toISOString()}|${id}`).toString(
      'base64url',
    );
  }

  private decodeCursor(cursor: string): MessageCursor {
    const [createdAt, id] = Buffer.from(cursor, 'base64url')
      .toString()
      .split('|');
    if (!createdAt || !id || Number.isNaN(Date.parse(createdAt))) {
      throw new ConflictException('Invalid message cursor');
    }
    return { createdAt: new Date(createdAt), id };
  }
}
