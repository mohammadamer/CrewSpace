import assert from 'node:assert/strict';
import test from 'node:test';
import { SecretService } from './secret.service';

test('secret service binds workspace-scoped secrets and prepares deployment plans', () => {
  const service = new SecretService();
  const secret = service.bindSecret(
    'provider-1',
    'workspace-1',
    'WORKSPACE',
    'vault://provider-1',
  );
  const plan = service.createDeploymentPlan(
    'workspace-1',
    'provider-1',
    'production',
    'rollout provider secret to production queue',
  );

  assert.equal(secret.workspaceId, 'workspace-1');
  assert.equal(plan.status, 'READY');
  assert.equal(plan.environment, 'production');
  assert.throws(
    () =>
      service.bindSecret('', 'workspace-1', 'WORKSPACE', 'vault://provider-1'),
    /Provider id is required/,
  );
});
