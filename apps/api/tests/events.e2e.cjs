// Requires a migrated, disposable PostgreSQL database in DATABASE_URL.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const test = require('node:test');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { WsAdapter } = require('@nestjs/platform-ws');
const { WebSocket } = require('ws');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/prisma.service');

async function connect(url) {
  const socket = new WebSocket(url);
  const frames = [];
  const waiters = [];
  socket.on('message', (data) => {
    const frame = JSON.parse(data.toString());
    const waiter = waiters.shift();
    if (waiter) waiter(frame);
    else frames.push(frame);
  });
  await once(socket, 'open');
  return {
    socket,
    frames,
    subscribe(data) {
      socket.send(JSON.stringify({ event: 'subscribe', data }));
    },
    next() {
      if (frames.length) return Promise.resolve(frames.shift());
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Timed out waiting for WebSocket frame')),
          5000,
        );
        waiters.push((frame) => {
          clearTimeout(timer);
          resolve(frame);
        });
      });
    },
    async close() {
      if (socket.readyState === WebSocket.CLOSED) return;
      const closed = once(socket, 'close');
      socket.close();
      await closed;
    },
  };
}

test(
  'real API and PostgreSQL enforce authenticated workspace delivery and reconnect replay',
  { timeout: 30_000 },
  async () => {
    assert.ok(
      process.env.DATABASE_URL,
      'Set DATABASE_URL to a migrated test database',
    );
    const app = await NestFactory.create(AppModule, { logger: false });
    app.useWebSocketAdapter(new WsAdapter(app));
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    const clients = [];
    const userIds = [];
    const workspaceIds = [];
    const prisma = app.get(PrismaService);
    try {
      await app.listen(0, '127.0.0.1');
      const base = `${await app.getUrl()}/api/v1`;
      const socketUrl = base.replace('http:', 'ws:') + '/events';
      async function request(path, token, body) {
        const response = await fetch(base + path, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        assert.equal(
          response.status,
          201,
          `${path}: ${await response.clone().text()}`,
        );
        return response.json();
      }
      async function client() {
        const value = await connect(socketUrl);
        clients.push(value);
        return value;
      }
      const suffix = randomUUID();
      const password = 'test-only-password-45';
      const alice = await request('/auth/register', undefined, {
        email: `alice-${suffix}@example.com`,
        password,
        displayName: 'Alice',
      });
      userIds.push(alice.user.id);
      const bob = await request('/auth/register', undefined, {
        email: `bob-${suffix}@example.com`,
        password,
        displayName: 'Bob',
      });
      userIds.push(bob.user.id);
      const team = await request('/workspaces', alice.token, {
        name: 'Alice team',
      });
      workspaceIds.push(team.id);
      const other = await request('/workspaces', bob.token, {
        name: 'Bob team',
      });
      workspaceIds.push(other.id);

      const anonymous = await client();
      const denied = await client();
      const deniedClosed = once(denied.socket, 'close');
      denied.subscribe({ token: bob.token, workspaceId: team.id });
      assert.equal((await deniedClosed)[0], 1008);
      assert.deepEqual(denied.frames, []);

      const invalid = await client();
      const invalidClosed = once(invalid.socket, 'close');
      invalid.subscribe({ token: 'invalid-session', workspaceId: team.id });
      assert.equal((await invalidClosed)[0], 1008);

      const aliceClient = await client();
      aliceClient.subscribe({ token: alice.token, workspaceId: team.id });
      const subscribed = await aliceClient.next();
      assert.equal(subscribed.type, 'subscribed');
      const bobClient = await client();
      bobClient.subscribe({ token: bob.token, workspaceId: other.id });
      assert.equal((await bobClient.next()).type, 'subscribed');

      const createAgent = (workspace, token, name) =>
        request(`/workspaces/${workspace}/agents`, token, {
          name,
          role: 'Researcher',
        });
      const first = await createAgent(team.id, alice.token, 'First Agent');
      const firstEvent = await aliceClient.next();
      assert.equal(firstEvent.type, 'AgentCreated');
      assert.equal(firstEvent.aggregateId, first.id);
      const bobAgent = await createAgent(other.id, bob.token, 'Bob Agent');
      assert.equal((await bobClient.next()).aggregateId, bobAgent.id);
      assert.deepEqual(anonymous.frames, []);
      assert.deepEqual(aliceClient.frames, []);

      await aliceClient.close();
      const missed = await createAgent(team.id, alice.token, 'Missed Agent');
      const reconnected = await client();
      reconnected.subscribe({
        token: alice.token,
        workspaceId: team.id,
        streamId: subscribed.streamId,
        afterSequence: firstEvent.sequence,
      });
      assert.equal((await reconnected.next()).type, 'subscribed');
      const replay = await reconnected.next();
      assert.equal(replay.aggregateId, missed.id);
      assert.ok(replay.sequence > firstEvent.sequence);
      const live = await createAgent(team.id, alice.token, 'Live Agent');
      const liveEvent = await reconnected.next();
      assert.equal(liveEvent.aggregateId, live.id);
      assert.ok(liveEvent.sequence > replay.sequence);
      assert.deepEqual(bobClient.frames, []);

      // A Workspace member still cannot receive another member's private conversation.
      await prisma.workspaceMember.create({
        data: { workspaceId: team.id, userId: bob.user.id, role: 'MEMBER' },
      });
      const teammate = await client();
      teammate.subscribe({ token: bob.token, workspaceId: team.id });
      assert.equal((await teammate.next()).type, 'subscribed');
      const conversation = await request(
        `/workspaces/${team.id}/conversations`,
        alice.token,
        { agentIds: [first.id] },
      );
      const message = await request(
        `/workspaces/${team.id}/conversations/${conversation.id}/messages`,
        alice.token,
        { content: 'Private research' },
      );
      const messageEvent = await reconnected.next();
      assert.equal(messageEvent.type, 'MessageCreated');
      assert.equal(messageEvent.payload.messageId, message.id);
      const marker = await createAgent(
        team.id,
        alice.token,
        'After Private Message',
      );
      assert.equal((await reconnected.next()).aggregateId, marker.id);
      assert.equal((await teammate.next()).aggregateId, marker.id);
      assert.deepEqual(teammate.frames, []);
      await request(`/workspaces/${team.id}/invitations/email`, alice.token, {
        invitedEmail: `invited-${suffix}@example.com`,
        role: 'MEMBER',
      });
      assert.equal((await reconnected.next()).type, 'MemberInvited');
      const afterInvitation = await createAgent(
        team.id,
        alice.token,
        'After Invitation',
      );
      assert.equal((await reconnected.next()).aggregateId, afterInvitation.id);
      assert.equal((await teammate.next()).aggregateId, afterInvitation.id);
      assert.deepEqual(teammate.frames, []);
      await teammate.close();

      const stale = await client();
      const staleClosed = once(stale.socket, 'close');
      stale.subscribe({
        token: alice.token,
        workspaceId: team.id,
        streamId: 'previous-process',
        afterSequence: firstEvent.sequence,
      });
      assert.equal((await stale.next()).type, 'resync_required');
      assert.equal((await staleClosed)[0], 1008);

      await request('/auth/logout', alice.token, {});
      const newSession = await request('/auth/login', undefined, {
        email: alice.user.email,
        password,
      });
      const revokedClosed = once(reconnected.socket, 'close');
      await createAgent(team.id, newSession.token, 'After Logout');
      assert.equal((await revokedClosed)[0], 1008);
      assert.deepEqual(reconnected.frames, []);
      assert.deepEqual(anonymous.frames, []);
    } finally {
      await Promise.all(clients.map((value) => value.close()));
      await prisma.workspace.deleteMany({
        where: { id: { in: workspaceIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await app.close();
    }
  },
);
