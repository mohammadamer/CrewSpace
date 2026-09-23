import { Injectable } from '@nestjs/common';
import { ProductionReadinessPlan, ProductionReadinessRecord } from '@crewspace/contracts';

@Injectable()
export class ProductionReadinessService {
  createRecord(
    workspaceId: string,
    providerId: string,
    environment: string,
    readinessChecks: string[] = [],
  ): ProductionReadinessRecord {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    return {
      id: `readiness-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      state: 'READY',
      readinessChecks,
      createdAt: new Date().toISOString(),
    };
  }

  createPlan(
    workspaceId: string,
    providerId: string,
    environment: string,
    notes: string,
  ): ProductionReadinessPlan {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    if (!notes.trim()) throw new Error('Notes are required');
    return {
      id: `production-readiness-plan-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      status: 'STABLE',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
  }
}
