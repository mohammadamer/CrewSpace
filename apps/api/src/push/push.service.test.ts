import assert from 'node:assert/strict';
import test from 'node:test';
import { PushService } from './push.service';

test('push service registers devices and builds workspace-scoped delivery envelopes', () => {
  const service = new PushService();
  const registration = service.registerPush(
    'user-1',
    'workspace-1',
    'device-1',
    'MOBILE',
    'token-xyz',
    ['mentions', 'approvals'],
  );

  assert.equal(registration.workspaceId, 'workspace-1');
  assert.equal(registration.status, 'ENABLED');
  const envelope = service.createEnvelope(
    'workspace-1',
    'device-1',
    'Task assigned',
    'HIGH',
  );

  assert.equal(envelope.priority, 'HIGH');
  assert.equal(envelope.dedupeKey, 'workspace-1:device-1:Task assigned');
  assert.throws(
    () =>
      service.registerPush('', 'workspace-1', 'device-1', 'WEB', 'token', []),
    /User id is required/,
  );
});
