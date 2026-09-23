export type RuntimeStabilizationState =
  'READY' | 'STABILIZING' | 'STABLE' | 'FAILED';

export interface FinalActivationRecord {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  state: RuntimeStabilizationState;
  readinessChecks: string[];
  createdAt: string;
}

export interface FinalActivationPlan {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  status: RuntimeStabilizationState;
  notes: string;
  createdAt: string;
}
