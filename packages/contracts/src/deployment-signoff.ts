export type SignoffState = 'READY' | 'VERIFYING' | 'APPROVED' | 'BLOCKED';

export interface DeploymentSignoffRecord {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  state: SignoffState;
  readinessChecks: string[];
  createdAt: string;
}

export interface DeploymentSignoffPlan {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  status: SignoffState;
  notes: string;
  createdAt: string;
}
