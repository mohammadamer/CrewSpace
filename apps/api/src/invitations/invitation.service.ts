import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvitationStatus,
  InvitationType,
  Prisma,
  WorkspaceRole,
} from '@crewspace/database';
import { WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  AcceptInvitationDto,
  CreateEmailInvitationDto,
  CreateLinkInvitationDto,
} from './invitation.dto';
import {
  createInvitationToken,
  hashInvitationPassword,
  hashInvitationToken,
  verifyInvitationPassword,
} from './invitation.crypto';

const MAX_INVITATION_ROLE = WorkspaceRole.ADMIN;

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
  ) {}

  async list(userId: string, workspaceId: string) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(membership.role, MAX_INVITATION_ROLE);
    await this.expirePending(workspaceId);
    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        invitedEmail: true,
        role: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        status: true,
        createdAt: true,
        acceptedAt: true,
        revokedAt: true,
      },
    });
  }

  async createEmail(
    userId: string,
    workspaceId: string,
    input: CreateEmailInvitationDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(membership.role, MAX_INVITATION_ROLE);
    this.assertInvitableRole(input.role);
    const email = input.invitedEmail.toLowerCase().trim();
    const token = createInvitationToken();
    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        invitedById: userId,
        type: InvitationType.EMAIL,
        invitedEmail: email,
        role: input.role,
        tokenHash: hashInvitationToken(token),
        expiresAt: this.expiresAt(input.expiresInDays),
        maxUses: 1,
      },
    });
    await this.recordAudit(
      workspaceId,
      userId,
      'INVITATION_CREATED',
      invitation.id,
      { type: InvitationType.EMAIL, email, role: input.role },
    );
    this.publishInvitationEvent(workspaceId, email, input.role);
    return {
      id: invitation.id,
      type: invitation.type,
      invitedEmail: invitation.invitedEmail,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      token,
    };
  }

  async createLink(
    userId: string,
    workspaceId: string,
    input: CreateLinkInvitationDto,
  ) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(membership.role, MAX_INVITATION_ROLE);
    this.assertInvitableRole(input.role);
    const token = createInvitationToken();
    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        invitedById: userId,
        type: InvitationType.LINK,
        role: input.role,
        tokenHash: hashInvitationToken(token),
        passwordHash: input.password
          ? hashInvitationPassword(input.password)
          : undefined,
        expiresAt: this.expiresAt(input.expiresInDays),
        maxUses: input.maxUses,
      },
    });
    await this.recordAudit(
      workspaceId,
      userId,
      'INVITATION_LINK_CREATED',
      invitation.id,
      { role: input.role, maxUses: input.maxUses },
    );
    this.publishInvitationEvent(workspaceId, null, input.role);
    return {
      id: invitation.id,
      type: invitation.type,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      maxUses: invitation.maxUses,
      token,
    };
  }

  async accept(userId: string, input: AcceptInvitationDto) {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(input.token) },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== InvitationStatus.PENDING)
      throw new ConflictException(
        `Invitation is ${invitation.status.toLowerCase()}`,
      );
    if (invitation.expiresAt <= new Date()) {
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new ConflictException('Invitation has expired');
    }
    if (
      invitation.maxUses !== null &&
      invitation.usedCount >= invitation.maxUses
    )
      throw new ConflictException('Invitation usage limit reached');
    if (
      invitation.passwordHash &&
      (!input.password ||
        !verifyInvitationPassword(input.password, invitation.passwordHash))
    )
      throw new ForbiddenException('Invitation password is invalid');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (
      invitation.type === InvitationType.EMAIL &&
      invitation.invitedEmail !== user.email.toLowerCase()
    )
      throw new ForbiddenException('Invitation is addressed to another email');
    const existing = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: invitation.workspaceId, userId },
      },
    });
    if (existing)
      throw new ConflictException('User is already a workspace member');

    const accepted = await this.prisma.$transaction(async (transaction) => {
      const membership = await transaction.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        },
      });
      await transaction.invitationAcceptance.create({
        data: { invitationId: invitation.id, userId },
      });
      const nextUsedCount = invitation.usedCount + 1;
      await transaction.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          usedCount: nextUsedCount,
          acceptedAt:
            invitation.type === InvitationType.EMAIL || invitation.maxUses === 1
              ? new Date()
              : undefined,
          status:
            invitation.type === InvitationType.EMAIL ||
            (invitation.maxUses !== null && nextUsedCount >= invitation.maxUses)
              ? InvitationStatus.ACCEPTED
              : InvitationStatus.PENDING,
        },
      });
      await transaction.auditLog.create({
        data: {
          workspaceId: invitation.workspaceId,
          actorUserId: userId,
          action: 'INVITATION_ACCEPTED',
          entityType: 'WorkspaceInvitation',
          entityId: invitation.id,
        },
      });
      return membership;
    });
    return { workspaceId: accepted.workspaceId, role: accepted.role };
  }

  async revoke(userId: string, workspaceId: string, invitationId: string) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(membership.role, MAX_INVITATION_ROLE);
    const invitation = await this.prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== InvitationStatus.PENDING)
      throw new ConflictException('Only pending invitations can be revoked');
    const revoked = await this.prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
    });
    await this.recordAudit(
      workspaceId,
      userId,
      'INVITATION_REVOKED',
      invitationId,
    );
    return {
      id: revoked.id,
      status: revoked.status,
      revokedAt: revoked.revokedAt,
    };
  }

  private async expirePending(workspaceId: string): Promise<void> {
    await this.prisma.workspaceInvitation.updateMany({
      where: {
        workspaceId,
        status: InvitationStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      data: { status: InvitationStatus.EXPIRED },
    });
  }

  private async recordAudit(
    workspaceId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata?: Record<string, string | number>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        action,
        entityType: 'WorkspaceInvitation',
        entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private publishInvitationEvent(
    workspaceId: string,
    email: string | null,
    role: WorkspaceRole,
  ): void {
    this.events.publish({
      id: randomUUID(),
      type: 'MemberInvited',
      aggregateId: workspaceId,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: { email: email ?? '', role },
    });
  }

  private expiresAt(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private assertInvitableRole(role: WorkspaceRole): void {
    if (role === WorkspaceRole.OWNER)
      throw new BadRequestException(
        'Owner role cannot be granted by invitation',
      );
  }
}
