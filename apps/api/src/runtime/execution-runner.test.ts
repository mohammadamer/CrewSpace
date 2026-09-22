import assert from 'node:assert/strict';
import test from 'node:test';
import { MockRuntime } from './agent-runtime';
import { ExecutionRunner, RuntimeExecutionError } from './execution-runner';

const request = { prompt: 'summarize the workspace' };

const runOptions = {
  maxAttempts: 3,
  timeoutMs: 100,
};

test('MockRuntime completes with deterministic output and usage', async () => {
  const result = await new ExecutionRunner(new MockRuntime()).run(
    request,
    runOptions,
  );

  assert.equal(result.result.output, 'Mock response: summarize the workspace');
  assert.equal(result.attempts, 1);
  assert.equal(result.result.usage.totalTokens, 8);
});

test('ExecutionRunner retries transient runtime failures', async () => {
  const result = await new ExecutionRunner(
    new MockRuntime({ failuresBeforeSuccess: 1 }),
  ).run(request, runOptions);

  assert.equal(result.attempts, 2);
  assert.equal(result.result.output, 'Mock response: summarize the workspace');
});

test('ExecutionRunner records timeout after bounded retries', async () => {
  await assert.rejects(
    new ExecutionRunner(new MockRuntime({ delayMs: 20 })).run(request, {
      maxAttempts: 2,
      timeoutMs: 1,
    }),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeExecutionError);
      assert.equal(error.status, 'TIMED_OUT');
      assert.equal(error.attempts, 2);
      return true;
    },
  );
});

test('ExecutionRunner stops promptly when cancelled', async () => {
  const controller = new AbortController();
  const execution = new ExecutionRunner(new MockRuntime({ delayMs: 50 })).run(
    request,
    { ...runOptions, signal: controller.signal },
  );
  setTimeout(() => controller.abort(), 1);

  await assert.rejects(execution, (error: unknown) => {
    assert.ok(error instanceof RuntimeExecutionError);
    assert.equal(error.status, 'CANCELLED');
    return true;
  });
});
