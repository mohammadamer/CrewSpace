import { Injectable } from '@nestjs/common';
import {
  ProviderDeliveryRun,
  ProviderRegistration,
} from '@crewspace/contracts';

@Injectable()
export class ProviderService {
  registerProvider(
    name: string,
    kind: ProviderRegistration['kind'],
    workspaceId: string,
    capabilities: string[] = [],
  ): ProviderRegistration {
    if (!name.trim()) throw new Error('Provider name is required');
    if (!workspaceId) throw new Error('Workspace id is required');
    return {
      id: `provider-${Date.now()}`,
      name: name.trim(),
      kind,
      workspaceId,
      status: 'ACTIVE',
      capabilities,
      createdAt: new Date().toISOString(),
    };
  }

  createDeliveryRun(
    workspaceId: string,
    providerId: string,
    queueKey: string,
  ): ProviderDeliveryRun {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!queueKey.trim()) throw new Error('Queue key is required');
    return {
      id: `run-${Date.now()}`,
      workspaceId,
      providerId,
      queueKey: queueKey.trim(),
      status: 'QUEUED',
      attempts: 0,
      startedAt: new Date().toISOString(),
    };
  }
}
