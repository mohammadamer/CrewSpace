import { Injectable } from '@nestjs/common';
import { ActivationPlan, RuntimeActivation } from '@crewspace/contracts';

@Injectable()
export class ActivationService {
  prepareActivation(
    workspaceId: string,
    providerId: string,
    environment: string,
    mode: RuntimeActivation['mode'],
    readinessChecks: string[] = [],
  ): RuntimeActivation {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    return {
      id: `activation-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      mode,
      state: 'READY',
      readinessChecks,
      startedAt: new Date().toISOString(),
    };
  }

  createActivationPlan(
    workspaceId: string,
    providerId: string,
    environment: string,
    mode: ActivationPlan['mode'],
    notes: string,
  ): ActivationPlan {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    if (!notes.trim()) throw new Error('Notes are required');
    return {
      id: `plan-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      mode,
      status: 'READY',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
  }
}
