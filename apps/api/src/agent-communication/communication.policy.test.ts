import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentCommunicationPolicy } from './communication.policy';

const baseInput = {
  sourceAgentId: 'atlas',
  targetAgentId: 'bram',
  content: 'Bram, review the database migration',
  depth: 1,
  tokenBudget: 100,
  usedTokens: 0,
  recentContents: [],
  targetTerms: ['Bram', 'Engineer'],
  now: new Date('2026-09-22T12:00:01.000Z'),
};

test('allows relevant Agent communication within bounds', () => {
  const decision = new AgentCommunicationPolicy().evaluate(baseInput);

  assert.equal(decision.allowed, true);
  assert.equal(decision.tokenCount, 5);
});

test('blocks self-messages and excessive depth', () => {
  const policy = new AgentCommunicationPolicy();

  assert.equal(
    policy.evaluate({ ...baseInput, targetAgentId: 'atlas' }).reason,
    'Source and target Agents must differ',
  );
  assert.equal(
    policy.evaluate({ ...baseInput, depth: 4 }).reason,
    'Maximum communication depth exceeded',
  );
});

test('blocks messages that exceed per-message or cumulative budgets', () => {
  const policy = new AgentCommunicationPolicy();

  assert.equal(
    policy.evaluate({
      ...baseInput,
      content: `${'Bram '.repeat(513)}migration`,
    }).reason,
    'Agent message token limit exceeded',
  );
  assert.equal(
    policy.evaluate({ ...baseInput, usedTokens: 99 }).reason,
    'Communication execution budget exhausted',
  );
});

test('blocks cooldowns and repeated messages to prevent loops', () => {
  const policy = new AgentCommunicationPolicy();

  assert.equal(
    policy.evaluate({
      ...baseInput,
      lastSentAt: new Date('2026-09-22T12:00:00.500Z'),
    }).reason,
    'Agent communication cooldown is active',
  );
  assert.equal(
    policy.evaluate({
      ...baseInput,
      recentContents: [baseInput.content],
    }).reason,
    'Repeated Agent message detected',
  );
});

test('blocks messages that do not mention relevant target terms', () => {
  const decision = new AgentCommunicationPolicy().evaluate({
    ...baseInput,
    content: 'Please review the weather forecast',
  });

  assert.equal(decision.allowed, false);
  assert.equal(
    decision.reason,
    'Agent message is not relevant to the target Agent',
  );
});
