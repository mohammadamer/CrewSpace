export type QueueStatus =
  'QUEUED' | 'RUNNING' | 'RETRYING' | 'FAILED' | 'SUCCEEDED';

export interface ProviderCredential {
  id: string;
  providerId: string;
  workspaceId: string;
  keyName: string;
  secretRef: string;
  createdAt: string;
}

export interface QueueIntegrationPlan {
  id: string;
  workspaceId: string;
  providerId: string;
  queueKey: string;
  status: QueueStatus;
  retryPolicy: string;
  maxAttempts: number;
  createdAt: string;
}
