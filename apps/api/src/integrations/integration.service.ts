import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationStatus,
  Prisma,
  WorkspaceRole,
} from '@crewspace/database';
import { WorkspaceId } from '@crewspace/contracts';
import { InMemoryEventBus } from '../events/event-bus';
import { PermissionPolicy } from '../permissions/permission.policy';
import { PrismaService } from '../prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  CreateCredentialDto,
  CreateIntegrationDto,
  UpdateIntegrationDto,
} from './integration.dto';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly permissions: PermissionPolicy,
    private readonly events: InMemoryEventBus,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.requireMember(userId, workspaceId);
    return this.prisma.integration.findMany({
      where: { workspaceId },
      include: { credentials: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    userId: string,
    workspaceId: string,
    input: CreateIntegrationDto,
  ) {
    await this.requireMember(userId, workspaceId);
    const integration = await this.prisma.integration.create({
      data: {
        workspaceId,
        createdById: userId,
        name: input.name.trim(),
        provider: input.provider,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
      include: { credentials: true },
    });
    await this.audit(
      workspaceId,
      userId,
      'INTEGRATION_CREATED',
      integration.id,
    );
    this.publish(integration.id, workspaceId, integration.provider, 'CREATED');
    return integration;
  }

  async get(userId: string, workspaceId: string, integrationId: string) {
    await this.requireMember(userId, workspaceId);
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, workspaceId },
      include: { credentials: true },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  async update(
    userId: string,
    workspaceId: string,
    integrationId: string,
    input: UpdateIntegrationDto,
  ) {
    await this.requireMember(userId, workspaceId);
    const integration = await this.requireIntegration(
      workspaceId,
      integrationId,
    );
    const updated = await this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        name: input.name?.trim(),
        status: input.status,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit(
      workspaceId,
      userId,
      'INTEGRATION_UPDATED',
      integration.id,
    );
    this.publish(updated.id, workspaceId, integration.provider, 'UPDATED');
    return updated;
  }

  async addCredential(
    userId: string,
    workspaceId: string,
    integrationId: string,
    input: CreateCredentialDto,
  ) {
    await this.requireMember(userId, workspaceId);
    const integration = await this.requireIntegration(
      workspaceId,
      integrationId,
    );
    if (integration.provider !== input.provider) {
      throw new ConflictException(
        'Credential provider must match the integration provider',
      );
    }
    const value = this.encrypt(input.value);
    const credential = await this.prisma.integrationCredential.upsert({
      where: {
        integrationId_provider: {
          integrationId,
          provider: input.provider,
        },
      },
      create: {
        workspaceId,
        integrationId,
        provider: input.provider,
        encryptedValue: value,
        createdById: userId,
      },
      update: {
        encryptedValue: value,
        createdById: userId,
      },
    });
    await this.audit(
      workspaceId,
      userId,
      'INTEGRATION_CREDENTIAL_SET',
      credential.id,
    );
    return credential;
  }

  async listCredentials(userId: string, workspaceId: string) {
    await this.requireMember(userId, workspaceId);
    return this.prisma.integrationCredential.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async requireIntegration(workspaceId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, workspaceId },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  private async requireMember(userId: string, workspaceId: string) {
    const membership = await this.workspaces.requireMembership(
      userId,
      workspaceId,
    );
    this.permissions.requireWorkspaceRole(
      membership.role,
      WorkspaceRole.MEMBER,
    );
    return membership;
  }

  private encrypt(value: string) {
    return Buffer.from(value).toString('base64');
  }

  private publish(
    integrationId: string,
    workspaceId: string,
    provider: IntegrationProvider,
    action: string,
  ) {
    this.events.publish({
      id: randomUUID(),
      type: 'IntegrationCreated',
      aggregateId: integrationId,
      workspaceId: workspaceId as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: { integrationId, provider: provider.toString(), name: action },
    });
  }

  private audit(
    workspaceId: string,
    actorUserId: string,
    action: string,
    entityId: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        action,
        entityType: 'Integration',
        entityId,
      },
    });
  }
}
