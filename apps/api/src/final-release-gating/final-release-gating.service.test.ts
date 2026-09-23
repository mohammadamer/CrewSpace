import assert from 'node:assert/strict';
import test from 'node:test';
import { FinalReleaseGatingService } from './final-release-gating.service';

test('final release gating service prepares deployment gate records and plans', () => {
  const service = new FinalReleaseGatingService();
  const gate = service.createGate('workspace-1', 'provider-1', 'production', ['health', 'latency']);
  const plan = service.createPlan(
    'workspace-1',
    'provider-1',
    'production',
    'Final release gating is stable and ready',
  );

  assert.equal(gate.workspaceId, 'workspace-1');
  assert.equal(gate.state, 'READY');
  assert.equal(plan.status, 'STABLE');
  assert.throws(
    () => service.createGate('', 'provider-1', 'production', []),
    /Workspace id is required/,
  );
});
