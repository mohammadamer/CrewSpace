import assert from 'node:assert/strict';
import test from 'node:test';
import { DomainError, requireNonEmpty } from './index.js';

test('requireNonEmpty trims valid input', () => {
  assert.equal(requireNonEmpty('  CrewSpace  ', 'name'), 'CrewSpace');
});

test('requireNonEmpty rejects blank input with a domain error', () => {
  assert.throws(
    () => requireNonEmpty('  ', 'name'),
    (error: unknown) => {
      return error instanceof DomainError && error.code === 'VALIDATION_ERROR';
    },
  );
});
