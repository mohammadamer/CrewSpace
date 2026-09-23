import { Injectable } from '@nestjs/common';
import {
  ReleaseVerificationPlan,
  ReleaseVerificationRecord,
} from '@crewspace/contracts';

@Injectable()
export class ReleaseVerificationService {
  createRecord(
    workspaceId: string,
    providerId: string,
    environment: string,
    readinessChecks: string[] = [],
  ): ReleaseVerificationRecord {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    return {
      id: `verification-${Date.now()}`,
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
  ): ReleaseVerificationPlan {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    if (!notes.trim()) throw new Error('Notes are required');
    return {
      id: `release-plan-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      status: 'APPROVED',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
  }
}
