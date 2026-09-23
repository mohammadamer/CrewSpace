import assert from 'node:assert/strict';
import test from 'node:test';
import { RolloutService } from './rollout.service';

test('rollout service prepares environment registrations and rollout records', () => {
  const service = new RolloutService();
  const environment = service.registerEnvironment(
    'workspace-1',
    'provider-1',
    'production',
    ['secret', 'queue'],
  );
  const record = service.createRolloutRecord(
    'workspace-1',
    'provider-1',
    'production',
    'Provider is ready for rollout',
  );

  assert.equal(environment.workspaceId, 'workspace-1');
  assert.equal(record.status, 'READY');
  assert.equal(environment.environment, 'production');
  assert.throws(
    () => service.registerEnvironment('', 'provider-1', 'production', []),
    /Workspace id is required/,
  );
});
