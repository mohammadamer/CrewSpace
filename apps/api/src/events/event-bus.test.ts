import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryEventBus } from './event-bus';

test('in-memory events are sequenced and unsubscribable', () => {
  const bus = new InMemoryEventBus();
  const received: number[] = [];
  const unsubscribe = bus.subscribe((event) => received.push(event.sequence));
  const event = bus.publish({
    id: 'event-1',
    type: 'WorkspaceCreated',
    aggregateId: 'workspace-1',
    workspaceId: null,
    occurredAt: new Date().toISOString(),
    payload: { name: 'CrewSpace' },
  });
  assert.equal(event.sequence, 1);
  assert.deepEqual(received, [1]);
  unsubscribe();
  bus.publish({
    id: 'event-2',
    type: 'WorkspaceCreated',
    aggregateId: 'workspace-2',
    workspaceId: null,
    occurredAt: new Date().toISOString(),
    payload: { name: 'Other' },
  });
  assert.deepEqual(received, [1]);
});

function publish(bus: InMemoryEventBus, workspaceId = 'workspace-1') {
  return bus.publish({
    id: `event-${Math.random()}`,
    type: 'WorkspaceCreated',
    aggregateId: workspaceId,
    workspaceId: workspaceId as import('@crewspace/contracts').WorkspaceId,
    occurredAt: new Date().toISOString(),
    payload: { name: 'CrewSpace' },
  });
}

test('replay is ordered, workspace scoped, and excludes the last seen sequence', () => {
  const bus = new InMemoryEventBus();
  const first = publish(bus);
  publish(bus, 'other-workspace');
  const third = publish(bus);
  assert.deepEqual(bus.replay('workspace-1', first.sequence), [third]);
  assert.deepEqual(bus.replay('workspace-1', third.sequence), []);
  assert.deepEqual(bus.replay('unknown-workspace', 0), []);
});

test('bounded history accepts the oldest available boundary and rejects gaps', () => {
  const bus = new InMemoryEventBus();
  for (let i = 0; i < 1001; i++) publish(bus);
  assert.throws(() => bus.replay('workspace-1', 0), /history gap/);
  assert.equal(bus.replay('workspace-1', 1).length, 1000);
  assert.equal(bus.currentSequence, 1001);
});

test('replay rejects invalid or future cursors and identifies each stream', () => {
  const bus = new InMemoryEventBus();
  for (const cursor of [-1, 0.5, NaN, Infinity, 1]) {
    assert.throws(() => bus.replay('workspace-1', cursor), /cursor/);
  }
  assert.equal(typeof bus.streamId, 'string');
  assert.notEqual(bus.streamId, new InMemoryEventBus().streamId);
});
