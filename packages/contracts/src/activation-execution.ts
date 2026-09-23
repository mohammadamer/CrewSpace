export type SwitchMode = 'CANARY' | 'ROLLING' | 'PRODUCTION';
export type ExecutionState = 'READY' | 'RUNNING' | 'DONE' | 'FAILED';

export interface ActivationExecution {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  mode: SwitchMode;
  state: ExecutionState;
  auditTrail: string[];
  startedAt: string;
}

export interface ActivationExecutionRecord {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  mode: SwitchMode;
  status: ExecutionState;
  notes: string;
  createdAt: string;
}
