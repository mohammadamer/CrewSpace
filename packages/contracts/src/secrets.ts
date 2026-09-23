export type SecretScope = 'WORKSPACE' | 'ENVIRONMENT' | 'GLOBAL';
export type DeploymentStatus = 'READY' | 'ROLLING' | 'FAILED';

export interface SecretBinding {
  id: string;
  providerId: string;
  workspaceId: string;
  scope: SecretScope;
  secretRef: string;
  createdAt: string;
}

export interface DeploymentPlan {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  status: DeploymentStatus;
  rolloutNotes: string;
  createdAt: string;
}
