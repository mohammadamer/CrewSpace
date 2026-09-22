export interface CommunicationPolicyInput {
  sourceAgentId: string;
  targetAgentId: string;
  content: string;
  depth: number;
  tokenBudget: number;
  usedTokens: number;
  lastSentAt?: Date;
  recentContents: string[];
  targetTerms: string[];
  now?: Date;
}

export interface CommunicationDecision {
  allowed: boolean;
  reason?: string;
  tokenCount: number;
}

export class AgentCommunicationPolicy {
  static readonly maxDepth = 3;
  static readonly maxMessageTokens = 512;
  static readonly maxBudgetTokens = 2_048;
  static readonly cooldownMs = 1_000;

  evaluate(input: CommunicationPolicyInput): CommunicationDecision {
    const content = input.content.trim();
    const tokenCount = this.tokenCount(content);
    const now = input.now ?? new Date();

    if (input.sourceAgentId === input.targetAgentId) {
      return this.block('Source and target Agents must differ', tokenCount);
    }
    if (!content)
      return this.block('Agent message cannot be empty', tokenCount);
    if (input.depth > AgentCommunicationPolicy.maxDepth) {
      return this.block('Maximum communication depth exceeded', tokenCount);
    }
    if (tokenCount > AgentCommunicationPolicy.maxMessageTokens) {
      return this.block('Agent message token limit exceeded', tokenCount);
    }
    if (input.tokenBudget > AgentCommunicationPolicy.maxBudgetTokens) {
      return this.block(
        'Communication budget exceeds the allowed maximum',
        tokenCount,
      );
    }
    if (input.usedTokens + tokenCount > input.tokenBudget) {
      return this.block('Communication execution budget exhausted', tokenCount);
    }
    if (
      input.lastSentAt &&
      now.getTime() - input.lastSentAt.getTime() <
        AgentCommunicationPolicy.cooldownMs
    ) {
      return this.block('Agent communication cooldown is active', tokenCount);
    }
    if (
      input.recentContents.some(
        (recent) => recent.trim().toLowerCase() === content.toLowerCase(),
      )
    ) {
      return this.block('Repeated Agent message detected', tokenCount);
    }

    const normalizedContent = content.toLowerCase();
    const relevant = input.targetTerms
      .flatMap((term) => term.toLowerCase().split(/\s+/))
      .filter((term) => term.length > 2)
      .some((term) => normalizedContent.includes(term));
    if (!relevant) {
      return this.block(
        'Agent message is not relevant to the target Agent',
        tokenCount,
      );
    }

    return { allowed: true, tokenCount };
  }

  private block(reason: string, tokenCount: number): CommunicationDecision {
    return { allowed: false, reason, tokenCount };
  }

  private tokenCount(content: string): number {
    return content ? content.split(/\s+/).length : 0;
  }
}
