export type ActivationMode = 'CANARY' | 'PRODUCTION';
export type ActivationState = 'READY' | 'ACTIVE' | 'FAILED';

export interface RuntimeActivation {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  mode: ActivationMode;
  state: ActivationState;
  readinessChecks: string[];
  startedAt: string;
}

export interface ActivationPlan {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  mode: ActivationMode;
  status: ActivationState;
  notes: string;
  createdAt: string;
}
