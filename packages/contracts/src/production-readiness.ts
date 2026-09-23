export type ProductionReadinessState = 'READY' | 'CHECKING' | 'STABLE' | 'BLOCKED';

export interface ProductionReadinessRecord {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  state: ProductionReadinessState;
  readinessChecks: string[];
  createdAt: string;
}

export interface ProductionReadinessPlan {
  id: string;
  workspaceId: string;
  providerId: string;
  environment: string;
  status: ProductionReadinessState;
  notes: string;
  createdAt: string;
}
