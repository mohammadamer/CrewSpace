export type DeploymentReleaseState = 'READY' | 'GATED' | 'STABLE' | 'BLOCKED';

export interface FinalReleaseGate {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  state: DeploymentReleaseState;
  readinessChecks: string[];
  createdAt: string;
}

export interface DeploymentReleasePlan {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  status: DeploymentReleaseState;
  notes: string;
  createdAt: string;
}
