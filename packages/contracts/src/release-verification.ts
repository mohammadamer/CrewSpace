export type ReleaseVerificationState =
  'READY' | 'VERIFYING' | 'APPROVED' | 'BLOCKED';

export interface ReleaseVerificationRecord {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  state: ReleaseVerificationState;
  readinessChecks: string[];
  createdAt: string;
}

export interface ReleaseVerificationPlan {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  status: ReleaseVerificationState;
  notes: string;
  createdAt: string;
}
