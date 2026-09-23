import assert from 'node:assert/strict';
import test from 'node:test';
import { DeviceService } from './device.service';

test('device service registers a workspace-scoped device and generates a valid handshake', () => {
  const service = new DeviceService();
  const registration = service.registerDevice(
    'user-1',
    'workspace-1',
    'MOBILE',
    'token-abc',
    ['offline', 'push'],
  );

  assert.equal(registration.workspaceId, 'workspace-1');
  assert.deepEqual(registration.capabilities, ['offline', 'push']);

  const handshake = service.createHandshake(
    'client-1',
    'workspace-1',
    'MOBILE',
    registration.id,
    '1.0.0',
    3,
  );

  assert.equal(handshake.platform, 'MOBILE');
  assert.equal(handshake.sessionVersion, 3);
  assert.throws(
    () => service.registerDevice('', 'workspace-1', 'WEB', 'token', []),
    /User id is required/,
  );
});
