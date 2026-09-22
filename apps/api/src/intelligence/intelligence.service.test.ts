import assert from 'node:assert/strict';
import test from 'node:test';
import { IntelligencePolicy } from './intelligence.policy';
import { IntelligenceService } from './intelligence.service';

const context = {
  workspaceId: 'workspace-1',
  userId: 'user-1',
  allowPrivateKnowledge: false,
  limit: 5,
  query: 'release plan',
};

test('search policy enforces privacy and bounded limits', () => {
  const policy = new IntelligencePolicy();
  assert.doesNotThrow(() => policy.validate(context));
  assert.throws(
    () => policy.validate({ ...context, limit: 0 }),
    /between 1 and 50/,
  );
  assert.throws(
    () =>
      policy.validate({
        ...context,
        allowPrivateKnowledge: false,
        query: 'private release plan',
      }),
    /Private knowledge access is not permitted/,
  );
});

test('intelligence service selects a provider and ranks results', async () => {
  const service = new IntelligenceService(new IntelligencePolicy());
  const providers = [
    {
      name: 'KEYWORD',
      search: async () => [
        { id: 'one', score: 0.25, source: 'work', snippet: 'release note' },
      ],
    },
    {
      name: 'VECTOR',
      search: async () => [
        { id: 'two', score: 0.9, source: 'memory', snippet: 'release plan' },
      ],
    },
  ];

  const results = await service.search(providers as never, context);

  assert.ok(results[0]);
  assert.equal(results[0]!.id, 'two');
  assert.equal(
    service.selectSearchProvider(providers as never, 'VECTOR').name,
    'VECTOR',
  );
});

test('embedding provider selection and embedding are validating and deterministic', async () => {
  const service = new IntelligenceService(new IntelligencePolicy());
  const provider = {
    name: 'LOCAL',
    embed: async (text: string) => [text.length, 1],
  };

  const output = await service.embed(provider as never, 'release plan');

  assert.deepEqual(output, [12, 1]);
  assert.equal(
    service.selectEmbeddingProvider([provider] as never, 'LOCAL').name,
    'LOCAL',
  );
});
