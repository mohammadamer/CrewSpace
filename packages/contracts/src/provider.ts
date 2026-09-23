export type ProviderKind = 'PUSH' | 'EMAIL' | 'SMS' | 'WEBHOOK';
export type ProviderStatus = 'ACTIVE' | 'DEGRADED' | 'DISABLED';

export interface ProviderRegistration {
  id: string;
  name: string;
  kind: ProviderKind;
  workspaceId: string;
  status: ProviderStatus;
  capabilities: string[];
  createdAt: string;
}

export interface ProviderDeliveryRun {
  id: string;
  workspaceId: string;
  providerId: string;
  queueKey: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  attempts: number;
  lastError?: string;
  startedAt: string;
}
