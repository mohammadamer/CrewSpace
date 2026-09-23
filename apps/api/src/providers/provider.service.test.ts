import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderService } from './provider.service';

test('provider service registers a workspace-scoped provider and creates queued runs', () => {
  const service = new ProviderService();
  const provider = service.registerProvider(
    'push-gateway',
    'PUSH',
    'workspace-1',
    ['notify', 'retry'],
  );
  const run = service.createDeliveryRun(
    'workspace-1',
    provider.id,
    'queue:workspace-1:push',
  );

  assert.equal(provider.workspaceId, 'workspace-1');
  assert.equal(provider.status, 'ACTIVE');
  assert.equal(run.status, 'QUEUED');
  assert.equal(run.attempts, 0);
  assert.throws(
    () => service.registerProvider('', 'EMAIL', 'workspace-1', []),
    /Provider name is required/,
  );
});
