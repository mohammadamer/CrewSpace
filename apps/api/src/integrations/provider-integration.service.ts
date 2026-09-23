import { Injectable } from '@nestjs/common';
import { ProviderCredential, QueueIntegrationPlan } from '@crewspace/contracts';

@Injectable()
export class ProviderIntegrationService {
  bindCredential(
    providerId: string,
    workspaceId: string,
    keyName: string,
    secretRef: string,
  ): ProviderCredential {
    if (!providerId) throw new Error('Provider id is required');
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!keyName.trim()) throw new Error('Key name is required');
    if (!secretRef.trim()) throw new Error('Secret reference is required');
    return {
      id: `credential-${Date.now()}`,
      providerId,
      workspaceId,
      keyName: keyName.trim(),
      secretRef: secretRef.trim(),
      createdAt: new Date().toISOString(),
    };
  }

  createQueuePlan(
    workspaceId: string,
    providerId: string,
    queueKey: string,
    retryPolicy: string,
    maxAttempts: number,
  ): QueueIntegrationPlan {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!queueKey.trim()) throw new Error('Queue key is required');
    if (!retryPolicy.trim()) throw new Error('Retry policy is required');
    if (maxAttempts <= 0)
      throw new Error('Max attempts must be greater than zero');
    return {
      id: `queue-plan-${Date.now()}`,
      workspaceId,
      providerId,
      queueKey: queueKey.trim(),
      status: 'QUEUED',
      retryPolicy: retryPolicy.trim(),
      maxAttempts,
      createdAt: new Date().toISOString(),
    };
  }
}
