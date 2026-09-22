import assert from 'node:assert/strict';
import test from 'node:test';
import { SyncPolicy } from './sync.policy';
import { SyncService } from './sync.service';

const state = {
  clientId: 'client-1',
  workspaceId: 'workspace-1',
  status: 'ONLINE' as const,
  lastSyncedSequence: 10,
  queuedActions: [],
  updatedAt: new Date().toISOString(),
};

test('sync policy accepts valid offline states and queues only valid actions', () => {
  const policy = new SyncPolicy();
  const action = {
    id: '1',
    clientId: 'client-1',
    workspaceId: 'workspace-1',
    actionType: 'message:create',
    payload: { text: 'hi' },
    createdAt: new Date().toISOString(),
    sequence: 11,
    dedupeKey: 'workspace-1:message:create:11',
  };

  assert.doesNotThrow(() => policy.queueAction(action));
  assert.doesNotThrow(() => policy.markState(state));
  assert.throws(
    () => policy.queueAction({ ...action, actionType: '' }),
    /Action type/,
  );
});

test('sync service rehydrates pending actions and deduplicates replay queues', () => {
  const service = new SyncService(new SyncPolicy());
  const actionA = service.createQueuedAction(
    'client-1',
    'workspace-1',
    'message:create',
    { text: 'hi' },
    11,
  );
  const actionB = service.createQueuedAction(
    'client-1',
    'workspace-1',
    'message:create',
    { text: 'hi' },
    11,
  );
  const replay = service.rehydrate(state, [actionA, actionB]);

  assert.equal(replay.pendingActions.length, 2);
  assert.equal(service.dedupe([actionA, actionB]).length, 1);
  assert.equal(replay.state.status, 'SYNCING');
});
