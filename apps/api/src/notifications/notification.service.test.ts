import assert from 'node:assert/strict';
import test from 'node:test';
import { NotificationService } from './notification.service';

test('notification service creates workspace-scoped payloads and validates deep links', () => {
  const service = new NotificationService();
  const notification = service.buildNotification(
    'workspace-1',
    'New task assigned',
    'A task was assigned to you',
    'PUSH',
    'HIGH',
    {
      workspaceId: 'workspace-1',
      target: 'task',
      targetId: 'task-42',
      route: '/workspaces/workspace-1/tasks/task-42',
    },
  );

  assert.equal(notification.workspaceId, 'workspace-1');
  assert.equal(notification.channel, 'PUSH');
  assert.equal(notification.deepLink?.target, 'task');
  assert.deepEqual(
    service.validateDeepLink({
      workspaceId: 'workspace-1',
      target: 'agent',
      targetId: 'agent-7',
      route: '/workspaces/workspace-1/agents/agent-7',
    }),
    {
      workspaceId: 'workspace-1',
      target: 'agent',
      targetId: 'agent-7',
      route: '/workspaces/workspace-1/agents/agent-7',
    },
  );
  assert.throws(
    () =>
      service.validateDeepLink({
        workspaceId: '',
        target: 'workspace',
        targetId: 'workspace-1',
        route: 'bad-route',
      }),
    /workspace|start with \/|target id/,
  );
});
