import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@crewspace/database';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from './workspace.service';
import { UpdateMemberRoleDto, UpdateWorkspaceSettingsDto } from './member.dto';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaces.requireMembership(userId, workspaceId);
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateRole(
    actorId: string,
    workspaceId: string,
    targetUserId: string,
    input: UpdateMemberRoleDto,
  ) {
    const actor = await this.workspaces.requireMembership(actorId, workspaceId);
    const target = await this.findMember(workspaceId, targetUserId);
    if (
      target.role === WorkspaceRole.OWNER ||
      input.role === WorkspaceRole.OWNER
    )
      throw new ForbiddenException('Owner membership cannot be changed here');
    this.permissions.requireWorkspaceRole(actor.role, WorkspaceRole.ADMIN);
    if (
      actor.role === WorkspaceRole.ADMIN &&
      target.role === WorkspaceRole.ADMIN
    )
      throw new ForbiddenException('Admins cannot change admin roles');
    if (
      actor.role === WorkspaceRole.ADMIN &&
      input.role === WorkspaceRole.ADMIN
    )
      throw new ForbiddenException('Admins cannot grant admin role');
    const updated = await this.prisma.workspaceMember.update({
      where: { id: target.id },
      data: { role: input.role },
    });
    await this.audit(
      workspaceId,
      actorId,
      'MEMBER_ROLE_UPDATED',
      targetUserId,
      { role: input.role },
    );
    return updated;
  }

  async remove(actorId: string, workspaceId: string, targetUserId: string) {
    const actor = await this.workspaces.requireMembership(actorId, workspaceId);
    const target = await this.findMember(workspaceId, targetUserId);
    if (target.role === WorkspaceRole.OWNER)
      throw new ForbiddenException('Owner membership cannot be removed');
    if (actorId === targetUserId)
      throw new ConflictException(
        'Use workspace transfer before leaving as an owner',
      );
    this.permissions.requireWorkspaceRole(actor.role, WorkspaceRole.ADMIN);
    if (
      actor.role === WorkspaceRole.ADMIN &&
      target.role === WorkspaceRole.ADMIN
    )
      throw new ForbiddenException('Admins cannot remove admins');
    await this.prisma.workspaceMember.delete({ where: { id: target.id } });
    await this.audit(workspaceId, actorId, 'MEMBER_REMOVED', targetUserId);
    return { removed: true };
  }

  async updateSettings(
    actorId: string,
    workspaceId: string,
    input: UpdateWorkspaceSettingsDto,
  ) {
    const actor = await this.workspaces.requireMembership(actorId, workspaceId);
    this.permissions.requireWorkspaceRole(actor.role, WorkspaceRole.ADMIN);
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: input.name.trim() },
    });
    await this.audit(
      workspaceId,
      actorId,
      'WORKSPACE_SETTINGS_UPDATED',
      workspaceId,
      { name: workspace.name },
    );
    return workspace;
  }

  private async findMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new NotFoundException('Workspace member not found');
    return member;
  }

  private audit(
    workspaceId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata?: Record<string, string>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        action,
        entityType: 'WorkspaceMember',
        entityId,
        metadata,
      },
    });
  }
}
