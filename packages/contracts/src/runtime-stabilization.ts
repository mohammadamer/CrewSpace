export type ReleaseState = 'READY' | 'STABILIZING' | 'STABLE' | 'BLOCKED';

export interface RuntimeStabilizationRecord {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  state: ReleaseState;
  readinessChecks: string[];
  createdAt: string;
}

export interface ReleaseGatePlan {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  status: ReleaseState;
  notes: string;
  createdAt: string;
}
