import { randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { WorkspaceRole } from '@crewspace/database';
import { WorkspaceId } from '@crewspace/contracts';
import { PrismaService } from '../prisma.service';
import { InMemoryEventBus } from '../events/event-bus';
import { CreateWorkspaceDto } from './workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: InMemoryEventBus,
  ) {}

  async listForUser(userId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { workspace: { createdAt: 'asc' } },
    });
  }

  async create(userId: string, input: CreateWorkspaceDto) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name: input.name.trim(),
        members: { create: { userId, role: WorkspaceRole.OWNER } },
      },
      include: { members: true },
    });
    this.events.publish({
      id: randomUUID(),
      type: 'WorkspaceCreated',
      aggregateId: workspace.id,
      workspaceId: workspace.id as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: { name: workspace.name },
    });
    return workspace;
  }

  async requireMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership)
      throw new ForbiddenException('Workspace membership required');
    return membership;
  }
}
