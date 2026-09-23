import { Injectable } from '@nestjs/common';
import {
  ActivationExecution,
  ActivationExecutionRecord,
} from '@crewspace/contracts';

@Injectable()
export class ActivationExecutionService {
  beginExecution(
    workspaceId: string,
    providerId: string,
    environment: string,
    mode: ActivationExecution['mode'],
    auditTrail: string[] = [],
  ): ActivationExecution {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    return {
      id: `execution-${Date.now()}`,
      workspaceId,
      providerId,
      environment: environment.trim(),
      mode,
      state: 'READY',
      auditTrail,
      startedAt: new Date().toISOString(),
    };
  }

  recordExecution(
    workspaceId: string,
    providerId: string,
    environment: string,
    mode: ActivationExecutionRecord['mode'],
    notes: string,
  ): ActivationExecutionRecord {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!providerId) throw new Error('Provider id is required');
    if (!environment.trim()) throw new Error('Environment is required');
    if (!notes.trim()) throw new Error('Notes are required');
    return {
      id: `execution-record-${Date.now()}`,
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
