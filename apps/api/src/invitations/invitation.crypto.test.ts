import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInvitationToken,
  hashInvitationPassword,
  hashInvitationToken,
  verifyInvitationPassword,
} from './invitation.crypto';

test('invitation tokens are one-way hashed', () => {
  const token = createInvitationToken();
  assert.notEqual(token, hashInvitationToken(token));
  assert.equal(hashInvitationToken(token), hashInvitationToken(token));
});

test('optional invitation passwords verify without storing plaintext', () => {
  const encoded = hashInvitationPassword('invite-secret');
  assert.notEqual(encoded, 'invite-secret');
  assert.equal(verifyInvitationPassword('invite-secret', encoded), true);
  assert.equal(verifyInvitationPassword('wrong-secret', encoded), false);
});
