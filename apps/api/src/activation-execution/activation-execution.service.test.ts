import assert from 'node:assert/strict';
import test from 'node:test';
import { ActivationExecutionService } from './activation-execution.service';

test('activation execution service prepares execution state and records live switch-over events', () => {
  const service = new ActivationExecutionService();
  const execution = service.beginExecution(
    'workspace-1',
    'provider-1',
    'production',
    'PRODUCTION',
    ['queue-check', 'secret-check'],
  );
  const record = service.recordExecution(
    'workspace-1',
    'provider-1',
    'production',
    'ROLLING',
    'Production switch-over is ready to begin',
  );

  assert.equal(execution.workspaceId, 'workspace-1');
  assert.equal(execution.state, 'READY');
  assert.equal(record.status, 'READY');
  assert.throws(
    () =>
      service.beginExecution('', 'provider-1', 'production', 'PRODUCTION', []),
    /Workspace id is required/,
  );
});
