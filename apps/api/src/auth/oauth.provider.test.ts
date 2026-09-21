import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MockGitHubOAuthProvider,
  MockGoogleOAuthProvider,
} from './oauth.provider';

test('mock OAuth providers expose normalized profiles behind one port', async () => {
  const google = await new MockGoogleOAuthProvider().resolveProfile('code');
  const github = await new MockGitHubOAuthProvider().resolveProfile('code');
  assert.equal(google.provider, 'google');
  assert.equal(github.provider, 'github');
  assert.match(google.email, /@example\.local$/);
  assert.match(github.email, /@example\.local$/);
});
