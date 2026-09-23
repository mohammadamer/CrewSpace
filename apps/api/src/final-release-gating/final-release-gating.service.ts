import { Injectable } from '@nestjs/common';
import { DeploymentReleasePlan, FinalReleaseGate } from '@crewspace/contracts';

@Injectable()
export class FinalReleaseGatingService {
  createGate(
    workspaceId: string,
    providerId: string,
    environment: string,
    readinessChecks: string[] = [],
  ): FinalReleaseGate {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    return {
      id: `final-gate-${Date.now()}`,
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
  ): DeploymentReleasePlan {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    if (!notes.trim()) throw new Error('Notes are required');
    return {
      id: `release-plan-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      status: 'STABLE',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
  }
}
