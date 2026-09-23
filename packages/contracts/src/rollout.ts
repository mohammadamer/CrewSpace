export type RolloutState = 'READY' | 'IN_PROGRESS' | 'FAILED';

export interface EnvironmentRegistration {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  state: RolloutState;
  readinessChecks: string[];
  createdAt: string;
}

export interface RolloutRecord {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  status: RolloutState;
  notes: string;
  createdAt: string;
}
