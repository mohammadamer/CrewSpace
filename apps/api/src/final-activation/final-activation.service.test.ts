import assert from 'node:assert/strict';
import test from 'node:test';
import { FinalActivationService } from './final-activation.service';

test('final activation service prepares stabilization records and release plans', () => {
  const service = new FinalActivationService();
  const record = service.createRecord(
    'workspace-1',
    'provider-1',
    'production',
    ['health', 'queue'],
  );
  const plan = service.createPlan(
    'workspace-1',
    'provider-1',
    'production',
    'Runtime is stable and ready for final activation',
  );

  assert.equal(record.workspaceId, 'workspace-1');
  assert.equal(record.state, 'READY');
  assert.equal(plan.status, 'STABLE');
  assert.throws(
    () => service.createRecord('', 'provider-1', 'production', []),
    /Workspace id is required/,
  );
});
