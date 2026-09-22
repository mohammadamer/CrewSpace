import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryEventBus } from './event-bus';
import { EventsGateway } from './events.gateway';
import { AuthService } from '../auth/auth.service';
import { WorkspaceService } from '../workspace/workspace.service';

const workspaceId = 'workspace-1';

function request(url: string) {
  return {
    url,
    headers: { host: 'localhost' },
  } as never;
}

test('authenticated clients receive only their Workspace events in order', async () => {
  const bus = new InMemoryEventBus();
  const sent: unknown[] = [];
  const client = {
    readyState: 1,
    send: (value: string) => sent.push(JSON.parse(value)),
    close: () => undefined,
  };
  const gateway = new EventsGateway(
    bus,
    { resolveToken: async () => ({ id: 'user-1' }) } as unknown as AuthService,
    {
      requireMembership: async () => ({ role: 'MEMBER' }),
    } as unknown as WorkspaceService,
  );
  gateway.server = { clients: new Set([client]) } as never;

  await gateway.handleConnection(
    client as never,
    request(`/api/v1/events?token=session&workspaceId=${workspaceId}&since=0`),
  );
  bus.publish({
    id: 'other',
    type: 'WorkspaceCreated',
    aggregateId: 'other',
    workspaceId: 'workspace-2' as never,
    occurredAt: new Date().toISOString(),
    payload: { name: 'Other' },
  });
  bus.publish({
    id: 'local',
    type: 'WorkspaceCreated',
    aggregateId: workspaceId,
    workspaceId: workspaceId as never,
    occurredAt: new Date().toISOString(),
    payload: { name: 'Local' },
  });

  const eventTypes = sent
    .filter(
      (message): message is { type: string } =>
        typeof message === 'object' && message !== null && 'type' in message,
    )
    .map((message) => message.type);
  assert.deepEqual(eventTypes, ['RealtimeReady', 'WorkspaceCreated']);
  assert.equal(
    (
      sent.find(
        (message) => (message as { type?: string }).type === 'WorkspaceCreated',
      ) as {
        aggregateId: string;
      }
    ).aggregateId,
    workspaceId,
  );
});
