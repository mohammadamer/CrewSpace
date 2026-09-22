export type SearchProviderName = 'HYBRID' | 'VECTOR' | 'KEYWORD' | 'GRAPH';

export type EmbeddingProviderName = 'LOCAL' | 'OPENAI' | 'ANTHROPIC' | 'MIXED';

export type IntelligenceProviderStatus =
  'ACTIVE' | 'DEGRADED' | 'DISABLED' | 'ERROR';

export interface SearchProviderConfig {
  name: SearchProviderName;
  model?: string;
  enabled: boolean;
  maxResults?: number;
  includePrivateKnowledge?: boolean;
}

export interface EmbeddingProviderConfig {
  name: EmbeddingProviderName;
  model?: string;
  enabled: boolean;
  dimensions?: number;
}

export interface IntelligenceRequestContext {
  workspaceId: string;
  userId: string;
  allowPrivateKnowledge: boolean;
  limit: number;
  query: string;
}

export interface SearchResult {
  id: string;
  score: number;
  source: string;
  snippet: string;
}

export interface SearchProvider {
  name: SearchProviderName;
  search(context: IntelligenceRequestContext): Promise<SearchResult[]>;
}

export interface EmbeddingProvider {
  name: EmbeddingProviderName;
  embed(text: string): Promise<number[]>;
}
