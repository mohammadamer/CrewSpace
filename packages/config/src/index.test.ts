import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from './index.js';

test('loadConfig provides local development defaults', () => {
  const config = loadConfig({});
  assert.equal(config.port, 3000);
  assert.equal(config.redisUrl, 'redis://localhost:6379');
});

test('loadConfig reads explicit environment values', () => {
  const config = loadConfig({
    PORT: '4100',
    REDIS_URL: 'redis://cache:6379',
    DATABASE_URL: 'postgres://db',
    SESSION_SECRET: 'secret',
  });
  assert.equal(config.port, 4100);
  assert.equal(config.redisUrl, 'redis://cache:6379');
  assert.equal(config.databaseUrl, 'postgres://db');
  assert.equal(config.sessionSecret, 'secret');
});
