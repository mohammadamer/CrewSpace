import { Injectable } from '@nestjs/common';
import { CutoverGate, CutoverPlan } from '@crewspace/contracts';

@Injectable()
export class CutoverService {
  createGate(
    workspaceId: string,
    providerId: string,
    environment: string,
    readinessChecks: string[] = [],
  ): CutoverGate {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    return {
      id: `gate-${Date.now()}`,
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
  ): CutoverPlan {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    if (!notes.trim()) throw new Error('Notes are required');
    return {
      id: `cutover-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      status: 'READY',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
  }
}
