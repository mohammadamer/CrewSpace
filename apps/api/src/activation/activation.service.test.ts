import assert from 'node:assert/strict';
import test from 'node:test';
import { ActivationService } from './activation.service';

test('activation service prepares runtime activations and activation plans', () => {
  const service = new ActivationService();
  const activation = service.prepareActivation(
    'workspace-1',
    'provider-1',
    'production',
    'PRODUCTION',
    ['health-check', 'queue-check'],
  );
  const plan = service.createActivationPlan(
    'workspace-1',
    'provider-1',
    'production',
    'CANARY',
    'Canary is enabled for safe rollout',
  );

  assert.equal(activation.workspaceId, 'workspace-1');
  assert.equal(activation.state, 'READY');
  assert.equal(plan.mode, 'CANARY');
  assert.throws(
    () =>
      service.prepareActivation(
        '',
        'provider-1',
        'production',
        'PRODUCTION',
        [],
      ),
    /Workspace id is required/,
  );
});
