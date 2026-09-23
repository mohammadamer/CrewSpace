import assert from 'node:assert/strict';
import test from 'node:test';
import { RuntimeStabilizationService } from './runtime-stabilization.service';

test('runtime stabilization service prepares release-gate records and plans', () => {
  const service = new RuntimeStabilizationService();
  const record = service.createRecord('workspace-1', 'provider-1', 'production', ['health', 'latency']);
  const plan = service.createPlan(
    'workspace-1',
    'provider-1',
    'production',
    'Runtime has stabilized and is release-gated',
  );

  assert.equal(record.workspaceId, 'workspace-1');
  assert.equal(record.state, 'READY');
  assert.equal(plan.status, 'STABLE');
  assert.throws(
    () => service.createRecord('', 'provider-1', 'production', []),
    /Workspace id is required/,
  );
});
