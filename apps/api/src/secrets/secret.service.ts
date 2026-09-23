import { Injectable } from '@nestjs/common';
import { DeploymentPlan, SecretBinding } from '@crewspace/contracts';

@Injectable()
export class SecretService {
  bindSecret(
    providerId: string,
    workspaceId: string,
    scope: SecretBinding['scope'],
    secretRef: string,
  ): SecretBinding {
    if (!providerId) throw new Error('Provider id is required');
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!secretRef.trim()) throw new Error('Secret reference is required');
    return {
      id: `secret-${Date.now()}`,
      providerId,
      workspaceId,
      scope,
      secretRef: secretRef.trim(),
      createdAt: new Date().toISOString(),
    };
  }

  createDeploymentPlan(
    workspaceId: string,
    providerId: string,
    environment: string,
    rolloutNotes: string,
  ): DeploymentPlan {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    if (!rolloutNotes.trim()) throw new Error('Rollout notes are required');
    return {
      id: `deployment-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      status: 'READY',
      rolloutNotes: rolloutNotes.trim(),
      createdAt: new Date().toISOString(),
    };
  }
}
