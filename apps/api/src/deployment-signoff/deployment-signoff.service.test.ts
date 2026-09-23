import assert from 'node:assert/strict';
import test from 'node:test';
import { DeploymentSignoffService } from './deployment-signoff.service';

test('deployment signoff service prepares signoff records and plans', () => {
  const service = new DeploymentSignoffService();
  const record = service.createRecord('workspace-1', 'provider-1', 'production', ['health', 'latency']);
  const plan = service.createPlan(
    'workspace-1',
    'provider-1',
    'production',
    'Production signoff is approved and ready',
  );

  assert.equal(record.workspaceId, 'workspace-1');
  assert.equal(record.state, 'READY');
  assert.equal(plan.status, 'APPROVED');
  assert.throws(
    () => service.createRecord('', 'provider-1', 'production', []),
    /Workspace id is required/,
  );
});
