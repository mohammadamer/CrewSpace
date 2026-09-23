import { Injectable } from '@nestjs/common';
import { EnvironmentRegistration, RolloutRecord } from '@crewspace/contracts';

@Injectable()
export class RolloutService {
  registerEnvironment(
    workspaceId: string,
    providerId: string,
    environment: string,
    readinessChecks: string[] = [],
  ): EnvironmentRegistration {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    return {
      id: `environment-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      state: 'READY',
      readinessChecks,
      createdAt: new Date().toISOString(),
    };
  }

  createRolloutRecord(
    workspaceId: string,
    providerId: string,
    environment: string,
    notes: string,
  ): RolloutRecord {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    if (!notes.trim()) throw new Error('Notes are required');
    return {
      id: `rollout-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      status: 'READY',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
  }
}
