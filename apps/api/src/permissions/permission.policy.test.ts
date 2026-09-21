import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkspaceRole } from '@crewspace/database';
import { PermissionPolicy } from './permission.policy';

test('members can read but cannot manage a workspace', () => {
  const policy = new PermissionPolicy();
  assert.equal(policy.canReadWorkspace(WorkspaceRole.MEMBER), true);
  assert.equal(policy.canManageWorkspace(WorkspaceRole.MEMBER), false);
});

test('only admins and owners can manage a workspace', () => {
  const policy = new PermissionPolicy();
  assert.equal(policy.canManageWorkspace(WorkspaceRole.ADMIN), true);
  assert.equal(policy.canManageWorkspace(WorkspaceRole.OWNER), true);
  assert.throws(() =>
    policy.requireWorkspaceRole(WorkspaceRole.MEMBER, WorkspaceRole.ADMIN),
  );
});
