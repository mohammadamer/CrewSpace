import assert from 'node:assert/strict';
import test from 'node:test';
import { starterPersonas } from './starter-personas';

test('starter team contains the four approved customizable teammates', () => {
  assert.deepEqual(
    starterPersonas.map((persona) => persona.name),
    ['Atlas', 'Iris', 'Bram', 'Nova'],
  );
  assert.equal(new Set(starterPersonas.map((persona) => persona.role)).size, 4);
  assert.ok(
    starterPersonas.every((persona) => persona.systemPrompt.length > 0),
  );
});
