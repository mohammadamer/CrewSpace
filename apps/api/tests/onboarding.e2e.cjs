// Requires a migrated, disposable PostgreSQL database in DATABASE_URL.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { WsAdapter } = require('@nestjs/platform-ws');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/prisma.service');

test(
  'workspace onboarding seeds four starter chats once and persists deterministic Agent replies',
  { timeout: 30_000 },
  async () => {
    assert.ok(
      process.env.DATABASE_URL,
      'Set DATABASE_URL to a migrated test database',
    );
    const app = await NestFactory.create(AppModule, { logger: false });
    app.enableCors({ origin: 'http://localhost:5173' });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    const userIds = [];
    const workspaceIds = [];
    const prisma = app.get(PrismaService);
    try {
      app.useWebSocketAdapter(new WsAdapter(app));
      await app.listen(0, '127.0.0.1');
      const base = (await app.getUrl()) + '/api/v1';
      const preflight = await fetch(base + '/auth/login', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization,content-type',
        },
      });
      assert.equal(
        preflight.headers.get('access-control-allow-origin'),
        'http://localhost:5173',
      );
      async function request(path, token, body) {
        const response = await fetch(base + path, {
          method: body === undefined ? 'GET' : 'POST',
          headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: 'Bearer ' + token } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return {
          status: response.status,
          body: await response.json().catch(() => null),
        };
      }
      const suffix = randomUUID();
      const password = 'onboarding-test-password';
      const owner = await request('/auth/register', undefined, {
        email: 'owner-' + suffix + '@example.com',
        password,
        displayName: 'Owner',
      });
      assert.equal(owner.status, 201);
      userIds.push(owner.body.user.id);
      const workspace = await request('/workspaces', owner.body.token, {
        name: 'Mock teammates',
      });
      assert.equal(workspace.status, 201);
      workspaceIds.push(workspace.body.id);
      const root = '/workspaces/' + workspace.body.id;

      const initialized = await request(
        root + '/onboarding/initialize',
        owner.body.token,
        {},
      );
      assert.equal(initialized.status, 201);
      assert.deepEqual(initialized.body.map((item) => item.agent.name).sort(), [
        'Atlas',
        'Bram',
        'Iris',
        'Nova',
      ]);
      assert.equal(
        new Set(initialized.body.map((item) => item.conversation.id)).size,
        4,
      );

      const repeated = await request(
        root + '/onboarding/initialize',
        owner.body.token,
        {},
      );
      assert.equal(repeated.status, 201);
      assert.deepEqual(
        repeated.body.map((item) => item.conversation.id),
        initialized.body.map((item) => item.conversation.id),
      );
      assert.deepEqual(
        repeated.body.map((item) => item.greeting.id),
        initialized.body.map((item) => item.greeting.id),
      );
      assert.equal(
        (await request(root + '/agents', owner.body.token)).body.length,
        4,
      );
      assert.equal(
        (await request(root + '/conversations', owner.body.token)).body.length,
        4,
      );

      for (const teammate of repeated.body) {
        const history = await request(
          root + '/conversations/' + teammate.conversation.id + '/messages',
          owner.body.token,
        );
        assert.equal(history.status, 200);
        assert.equal(history.body.items.length, 1);
        assert.equal(history.body.items[0].authorAgentId, teammate.agent.id);
        assert.match(
          history.body.items[0].content,
          new RegExp(teammate.agent.name),
        );
      }

      const atlas = repeated.body.find((item) => item.agent.name === 'Atlas');
      for (let i = 0; i < 2; i++) {
        const sent = await request(
          root + '/conversations/' + atlas.conversation.id + '/messages',
          owner.body.token,
          { content: '  Compare two launch plans  ' },
        );
        assert.equal(sent.status, 201);
      }
      const messages = await request(
        root + '/conversations/' + atlas.conversation.id + '/messages',
        owner.body.token,
      );
      assert.equal(messages.body.items.length, 5);
      const chronological = messages.body.items.toReversed();
      assert.equal(chronological[1].authorUserId, owner.body.user.id);
      assert.equal(chronological[2].authorAgentId, atlas.agent.id);
      assert.equal(chronological[2].content, chronological[4].content);
      assert.match(
        chronological[2].content,
        /Atlas \(Researcher\).*Compare two launch plans/,
      );

      const member = await request('/auth/register', undefined, {
        email: 'member-' + suffix + '@example.com',
        password,
        displayName: 'Member',
      });
      assert.equal(member.status, 201);
      userIds.push(member.body.user.id);
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.body.id,
          userId: member.body.user.id,
          role: 'MEMBER',
        },
      });
      assert.equal(
        (await request(root + '/onboarding/initialize', member.body.token, {}))
          .status,
        403,
      );
      assert.equal(
        (
          await request(
            root + '/conversations/' + atlas.conversation.id + '/messages',
            member.body.token,
          )
        ).status,
        403,
      );

      const other = await request('/workspaces', member.body.token, {
        name: 'Other workspace',
      });
      assert.equal(other.status, 201);
      workspaceIds.push(other.body.id);
      assert.equal(
        (
          await request(
            '/workspaces/' +
              other.body.id +
              '/conversations/' +
              atlas.conversation.id +
              '/messages',
            member.body.token,
          )
        ).status,
        403,
      );
    } catch (error) {
      throw error;
    } finally {
      if (workspaceIds.length) {
        await prisma.message.deleteMany({
          where: { conversation: { workspaceId: { in: workspaceIds } } },
        });
        await prisma.conversation.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });
      }
      await prisma.workspace.deleteMany({
        where: { id: { in: workspaceIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await app.close();
    }
  },
);
