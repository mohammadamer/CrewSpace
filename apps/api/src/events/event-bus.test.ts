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
