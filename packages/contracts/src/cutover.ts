export type CutoverState = 'READY' | 'ACTIVE' | 'BLOCKED';

export interface CutoverGate {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  state: CutoverState;
  readinessChecks: string[];
  createdAt: string;
}

export interface CutoverPlan {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  status: CutoverState;
  notes: string;
  createdAt: string;
}
