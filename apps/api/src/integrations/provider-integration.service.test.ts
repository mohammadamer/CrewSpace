import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderIntegrationService } from './provider-integration.service';

test('provider integration service binds credentials and creates queue integration plans', () => {
  const service = new ProviderIntegrationService();
  const credential = service.bindCredential(
    'provider-1',
    'workspace-1',
    'push-key',
    'vault://push-key',
  );
  const plan = service.createQueuePlan(
    'workspace-1',
    'provider-1',
    'queue:workspace-1:push',
    'linear-backoff',
    3,
  );

  assert.equal(credential.workspaceId, 'workspace-1');
  assert.equal(plan.status, 'QUEUED');
  assert.equal(plan.maxAttempts, 3);
  assert.throws(
    () =>
      service.bindCredential('', 'workspace-1', 'push-key', 'vault://push-key'),
    /Provider id is required/,
  );
});
