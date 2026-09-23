import assert from 'node:assert/strict';
import test from 'node:test';
import { CutoverService } from './cutover.service';

test('cutover service prepares production gates and plans', () => {
  const service = new CutoverService();
  const gate = service.createGate('workspace-1', 'provider-1', 'production', [
    'health',
    'queue',
  ]);
  const plan = service.createPlan(
    'workspace-1',
    'provider-1',
    'production',
    'Provider is ready to cut over to production',
  );

  assert.equal(gate.workspaceId, 'workspace-1');
  assert.equal(gate.state, 'READY');
  assert.equal(plan.status, 'READY');
  assert.throws(
    () => service.createGate('', 'provider-1', 'production', []),
    /Workspace id is required/,
  );
});
