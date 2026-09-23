import { Injectable } from '@nestjs/common';
import { DeploymentSignoffPlan, DeploymentSignoffRecord } from '@crewspace/contracts';

@Injectable()
export class DeploymentSignoffService {
  createRecord(
    workspaceId: string,
    providerId: string,
    environment: string,
    readinessChecks: string[] = [],
  ): DeploymentSignoffRecord {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    return {
      id: `signoff-${Date.now()}`,
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
  ): DeploymentSignoffPlan {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    if (!notes.trim()) throw new Error('Notes are required');
    return {
      id: `signoff-plan-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      status: 'APPROVED',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
  }
}
