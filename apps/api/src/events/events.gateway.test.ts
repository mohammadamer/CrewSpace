import assert from 'node:assert/strict';
import test from 'node:test';
import { WebSocket } from 'ws';
import { DomainEvent, WorkspaceId } from '@crewspace/contracts';
import { AuthService } from '../auth/auth.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { PrismaService } from '../prisma.service';
import { InMemoryEventBus } from './event-bus';
import { EventsGateway } from './events.gateway';

class Socket {
  readyState = WebSocket.OPEN;
  bufferedAmount = 0;
  frames: Array<Record<string, unknown>> = [];
  closeCode?: number;
  send(message: string) {
    this.frames.push(JSON.parse(message));
  }
  close(code: number) {
    this.closeCode = code;
    this.readyState = WebSocket.CLOSED as typeof WebSocket.OPEN;
  }
  get client() {
    return this as unknown as WebSocket;
  }
}

function fixture(role = 'MEMBER') {
  const bus = new InMemoryEventBus();
  let authenticated = true;
  let member = true;
  let conversationMember = true;
  const auth = {
    resolveToken: async (token: string) => {
      if (!authenticated || token !== 'valid') throw new Error('unauthorized');
      return { id: 'user-1' };
    },
  } as unknown as AuthService;
  const workspaces = {
    requireMembership: async (_user: string, workspace: string) => {
      if (!member || workspace !== 'workspace-1') throw new Error('forbidden');
      return { role };
    },
  } as unknown as WorkspaceService;
  const prisma = {
    conversation: {
      findFirst: async () =>
        conversationMember ? { id: 'conversation-1' } : null,
    },
  } as unknown as PrismaService;
  const gateway = new EventsGateway(bus, auth, workspaces, prisma);
  const socket = new Socket();
  gateway.handleConnection(socket.client);
  const subscribe = (
    data: unknown = { token: 'valid', workspaceId: 'workspace-1' },
  ) => gateway.subscribe(socket.client, data);
  const publish = (workspaceId: string | null = 'workspace-1') =>
    bus.publish({
      id: `event-${bus.currentSequence + 1}`,
      type: 'WorkspaceCreated',
      aggregateId: 'workspace-1',
      workspaceId: workspaceId as WorkspaceId | null,
      occurredAt: new Date().toISOString(),
      payload: { name: 'Team' },
    });
  return {
    bus,
    gateway,
    socket,
    subscribe,
    publish,
    auth,
    setRole: (nextRole: string) => {
      role = nextRole;
    },
    revokeSession: () => {
      authenticated = false;
    },
    removeMember: () => {
      member = false;
    },
    removeConversationMember: () => {
      conversationMember = false;
    },
    close: () => gateway.handleDisconnect(socket.client),
  };
}

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test('no events before authentication or from another workspace or global events', async () => {
  const f = fixture();
  try {
    f.publish();
    assert.equal(f.socket.frames.length, 0);
    await f.subscribe();
    f.publish('other');
    f.publish(null);
    const visible = f.publish();
    await settle();
    assert.deepEqual(
      f.socket.frames.map((frame) => frame.type),
      ['subscribed', 'WorkspaceCreated'],
    );
    assert.equal(f.socket.frames[1]?.sequence, visible.sequence);
  } finally {
    f.close();
  }
});

test('invalid credentials, foreign workspace and malformed subscriptions close without data', async () => {
  for (const data of [
    null,
    {},
    { token: 'bad', workspaceId: 'workspace-1' },
    { token: 'valid', workspaceId: 'other' },
    { token: 'valid', workspaceId: 'workspace-1', afterSequence: -1 },
  ]) {
    const f = fixture();
    try {
      await f.subscribe(data);
      f.publish();
      await settle();
      assert.equal(f.socket.closeCode, 1008);
      assert.equal(f.socket.frames.length, 0);
    } finally {
      f.close();
    }
  }
});

test('reconnect replays strictly after cursor then delivers live events in order', async () => {
  const f = fixture();
  try {
    const first = f.publish();
    f.publish('other');
    const missed = f.publish();
    await f.subscribe({
      token: 'valid',
      workspaceId: 'workspace-1',
      afterSequence: first.sequence,
      streamId: f.bus.streamId,
    });
    const live = f.publish();
    await settle();
    assert.deepEqual(
      f.socket.frames.slice(1).map((frame) => frame.sequence),
      [missed.sequence, live.sequence],
    );
  } finally {
    f.close();
  }
});

test('expired history, future cursor and changed stream require resynchronization', async () => {
  for (const mode of ['gap', 'future', 'restart', 'missing-stream']) {
    const f = fixture();
    try {
      if (mode === 'gap') for (let i = 0; i < 1001; i++) f.publish();
      await f.subscribe({
        token: 'valid',
        workspaceId: 'workspace-1',
        afterSequence: mode === 'future' ? 10 : 0,
        ...(mode === 'missing-stream'
          ? {}
          : {
              streamId:
                mode === 'restart' ? 'previous-process' : f.bus.streamId,
            }),
      });
      assert.equal(f.socket.frames[0]?.type, 'resync_required');
      assert.equal(f.socket.closeCode, 1008);
    } finally {
      f.close();
    }
  }
});

test('revoked sessions and removed workspace memberships cannot receive subsequent events', async () => {
  for (const revoke of ['revokeSession', 'removeMember'] as const) {
    const f = fixture();
    try {
      await f.subscribe();
      f[revoke]();
      f.publish();
      await settle();
      assert.equal(f.socket.closeCode, 1008);
      assert.equal(f.socket.frames.length, 1);
    } finally {
      f.close();
    }
  }
});

test('private conversation messages require current conversation membership', async () => {
  const f = fixture();
  try {
    await f.subscribe();
    f.removeConversationMember();
    f.bus.publish({
      id: 'private',
      type: 'MessageCreated',
      aggregateId: 'conversation-1',
      workspaceId: 'workspace-1' as WorkspaceId,
      occurredAt: new Date().toISOString(),
      payload: {
        conversationId: 'conversation-1',
        messageId: 'message-1',
        authorUserId: 'user-2',
        content: 'private',
      },
    } as Omit<DomainEvent, 'sequence'>);
    const visible = f.publish();
    await settle();
    assert.deepEqual(
      f.socket.frames.slice(1).map((frame) => frame.sequence),
      [visible.sequence],
    );
  } finally {
    f.close();
  }
});

test('disconnect during authorization cannot create a subscription', async () => {
  const f = fixture();
  let resolve!: (user: {
    id: string;
    email: string;
    displayName: string;
  }) => void;
  f.auth.resolveToken = () =>
    new Promise((done) => {
      resolve = done;
    });
  const subscribing = f.subscribe();
  f.close();
  resolve({ id: 'user-1', email: 'test@example.com', displayName: 'Test' });
  await subscribing;
  f.publish();
  await settle();
  assert.equal(f.socket.frames.length, 0);
});

test('duplicate subscriptions close the socket and remove its listener', async () => {
  const f = fixture();
  try {
    await f.subscribe();
    await f.subscribe();
    f.publish();
    await settle();
    assert.equal(f.socket.closeCode, 1008);
    assert.equal(f.socket.frames.length, 1);
  } finally {
    f.close();
  }
});

test('slow sockets are disconnected instead of buffering unbounded payloads', async () => {
  const f = fixture();
  try {
    await f.subscribe();
    f.socket.bufferedAmount = 2_000_000;
    f.publish();
    await settle();
    assert.equal(f.socket.closeCode, 1013);
    assert.equal(f.socket.frames.length, 1);
  } finally {
    f.close();
  }
});

test('live events arriving during replay stay ordered and duplicate sequences are ignored', async () => {
  const f = fixture();
  const first = f.publish();
  const missed = f.publish();
  let deliver!: (event: DomainEvent) => void;
  const originalSubscribe = f.bus.subscribe.bind(f.bus);
  f.bus.subscribe = (handler) => {
    deliver = handler;
    return originalSubscribe(handler);
  };
  let release!: () => void;
  let calls = 0;
  const originalResolve = f.auth.resolveToken.bind(f.auth);
  f.auth.resolveToken = async (token) => {
    if (++calls === 2)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    return originalResolve(token);
  };
  try {
    const subscribing = f.subscribe({
      token: 'valid',
      workspaceId: 'workspace-1',
      streamId: f.bus.streamId,
      afterSequence: first.sequence,
    });
    await settle();
    deliver(missed);
    const live = f.publish();
    release();
    await subscribing;
    assert.deepEqual(
      f.socket.frames.slice(1).map((frame) => frame.sequence),
      [missed.sequence, live.sequence],
    );
    f.close();
    f.publish();
    await settle();
    assert.equal(f.socket.frames.length, 3);
  } finally {
    f.close();
  }
});

test('bounded pending queues close even while authorization is stalled', async () => {
  const f = fixture();
  try {
    await f.subscribe();
    let release!: (user: {
      id: string;
      email: string;
      displayName: string;
    }) => void;
    f.auth.resolveToken = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    f.publish();
    for (let i = 0; i < 1001; i++) f.publish();
    assert.equal(f.socket.closeCode, 1013);
    release({ id: 'user-1', email: 'test@example.com', displayName: 'Test' });
    await settle();
    assert.equal(f.socket.frames.length, 1);
  } finally {
    f.close();
  }
});

function invitation(bus: InMemoryEventBus) {
  return bus.publish({
    id: `invitation-${bus.currentSequence + 1}`,
    type: 'MemberInvited',
    aggregateId: 'workspace-1',
    workspaceId: 'workspace-1' as WorkspaceId,
    occurredAt: new Date().toISOString(),
    payload: { email: 'invited@example.com', role: 'MEMBER' },
  });
}

test('invitation details require admin privileges for both replay and live delivery', async () => {
  for (const role of ['OWNER', 'ADMIN', 'MEMBER', 'GUEST']) {
    const f = fixture(role);
    try {
      const replay = invitation(f.bus);
      await f.subscribe({
        token: 'valid',
        workspaceId: 'workspace-1',
        streamId: f.bus.streamId,
        afterSequence: 0,
      });
      const live = invitation(f.bus);
      const marker = f.publish();
      await settle();
      const permitted = role === 'OWNER' || role === 'ADMIN';
      assert.deepEqual(
        f.socket.frames.slice(1).map((frame) => frame.sequence),
        permitted
          ? [replay.sequence, live.sequence, marker.sequence]
          : [marker.sequence],
        role,
      );
    } finally {
      f.close();
    }
  }
});

test('role downgrade stops invitation delivery on an existing subscription', async () => {
  const f = fixture('ADMIN');
  try {
    await f.subscribe();
    const allowed = invitation(f.bus);
    await settle();
    f.setRole('MEMBER');
    invitation(f.bus);
    const marker = f.publish();
    await settle();
    assert.deepEqual(
      f.socket.frames.slice(1).map((frame) => frame.sequence),
      [allowed.sequence, marker.sequence],
    );
  } finally {
    f.close();
  }
});
