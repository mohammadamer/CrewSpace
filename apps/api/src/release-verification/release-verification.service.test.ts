import assert from 'node:assert/strict';
import test from 'node:test';
import { ReleaseVerificationService } from './release-verification.service';

test('release verification service prepares verification records and plans', () => {
  const service = new ReleaseVerificationService();
  const record = service.createRecord(
    'workspace-1',
    'provider-1',
    'production',
    ['health', 'latency'],
  );
  const plan = service.createPlan(
    'workspace-1',
    'provider-1',
    'production',
    'Release verification passed and runtime approval is ready',
  );

  assert.equal(record.workspaceId, 'workspace-1');
  assert.equal(record.state, 'READY');
  assert.equal(plan.status, 'APPROVED');
  assert.throws(
    () => service.createRecord('', 'provider-1', 'production', []),
    /Workspace id is required/,
  );
});
