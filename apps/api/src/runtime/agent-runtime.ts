export interface AgentRuntimeRequest {
  prompt: string;
  modelConfiguration?: Record<string, unknown>;
}

export interface AgentRuntimeUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AgentRuntimeResult {
  output: string;
  usage: AgentRuntimeUsage;
}

export interface AgentRuntime {
  run(
    request: AgentRuntimeRequest,
    signal: AbortSignal,
  ): Promise<AgentRuntimeResult>;
}

export interface MockRuntimeOptions {
  delayMs?: number;
  failuresBeforeSuccess?: number;
}

export class MockRuntime implements AgentRuntime {
  private failuresRemaining: number;

  constructor(private readonly options: MockRuntimeOptions = {}) {
    this.failuresRemaining = options.failuresBeforeSuccess ?? 0;
  }

  async run(
    request: AgentRuntimeRequest,
    signal: AbortSignal,
  ): Promise<AgentRuntimeResult> {
    await this.delay(this.options.delayMs ?? 0, signal);
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new Error('Mock runtime failure');
    }
    if (signal.aborted) throw new Error('Runtime cancelled');

    const inputTokens = this.tokenCount(request.prompt);
    const output = `Mock response: ${request.prompt}`;
    const outputTokens = this.tokenCount(output);
    return {
      output,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  }

  private async delay(delayMs: number, signal: AbortSignal): Promise<void> {
    if (delayMs <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delayMs);
      const cancel = () => {
        clearTimeout(timer);
        reject(new Error('Runtime cancelled'));
      };
      if (signal.aborted) cancel();
      else signal.addEventListener('abort', cancel, { once: true });
    });
  }

  private tokenCount(value: string): number {
    return value.trim() ? value.trim().split(/\s+/).length : 0;
  }
}
