import {
  AgentRuntime,
  AgentRuntimeRequest,
  AgentRuntimeResult,
} from './agent-runtime';

export type RuntimeFailureStatus = 'CANCELLED' | 'TIMED_OUT' | 'FAILED';

export class RuntimeExecutionError extends Error {
  constructor(
    readonly status: RuntimeFailureStatus,
    message: string,
    readonly attempts: number,
  ) {
    super(message);
    this.name = 'RuntimeExecutionError';
  }
}

export interface ExecutionRunOptions {
  maxAttempts: number;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface ExecutionRunResult {
  result: AgentRuntimeResult;
  attempts: number;
  durationMs: number;
}

export class ExecutionRunner {
  constructor(private readonly runtime: AgentRuntime) {}

  async run(
    request: AgentRuntimeRequest,
    options: ExecutionRunOptions,
  ): Promise<ExecutionRunResult> {
    const maxAttempts = Math.max(1, options.maxAttempts);
    const startedAt = Date.now();
    let lastFailure: RuntimeExecutionError | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (options.signal?.aborted) {
        throw new RuntimeExecutionError(
          'CANCELLED',
          'Execution was cancelled',
          attempt - 1,
        );
      }

      const controller = new AbortController();
      let timedOut = false;
      const relayAbort = () => controller.abort();
      options.signal?.addEventListener('abort', relayAbort, { once: true });
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, options.timeoutMs);

      try {
        const result = await this.runtime.run(request, controller.signal);
        return {
          result,
          attempts: attempt,
          durationMs: Date.now() - startedAt,
        };
      } catch (error) {
        if (options.signal?.aborted) {
          throw new RuntimeExecutionError(
            'CANCELLED',
            'Execution was cancelled',
            attempt,
          );
        }
        const status = timedOut ? 'TIMED_OUT' : 'FAILED';
        lastFailure = new RuntimeExecutionError(
          status,
          error instanceof Error ? error.message : 'Runtime execution failed',
          attempt,
        );
        if (status === 'TIMED_OUT' && attempt < maxAttempts) continue;
        if (status === 'FAILED' && attempt < maxAttempts) continue;
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', relayAbort);
      }
    }

    throw (
      lastFailure ??
      new RuntimeExecutionError(
        'FAILED',
        'Runtime execution failed',
        maxAttempts,
      )
    );
  }
}
