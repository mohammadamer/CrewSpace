import { Injectable } from '@nestjs/common';
import {
  EmbeddingProvider,
  EmbeddingProviderName,
  IntelligenceRequestContext,
  SearchProvider,
  SearchProviderName,
  SearchResult,
} from '@crewspace/contracts';
import { IntelligencePolicy } from './intelligence.policy';

@Injectable()
export class IntelligenceService {
  constructor(private readonly policy: IntelligencePolicy) {}

  async search(
    providers: SearchProvider[],
    context: IntelligenceRequestContext,
  ): Promise<SearchResult[]> {
    this.policy.validate(context);
    const results = await Promise.all(
      providers.map((provider) => provider.search(context)),
    );
    return results
      .flat()
      .sort(
        (left: SearchResult, right: SearchResult) => right.score - left.score,
      )
      .slice(0, context.limit);
  }

  async embed(provider: EmbeddingProvider, text: string): Promise<number[]> {
    if (!provider || !provider.name) {
      throw new Error('Embedding provider is required');
    }
    return provider.embed(text.trim());
  }

  selectSearchProvider(
    providers: SearchProvider[],
    preferred: SearchProviderName,
  ): SearchProvider {
    const provider = providers.find((entry) => entry.name === preferred);
    if (!provider) throw new Error(`Provider not registered: ${preferred}`);
    return provider;
  }

  selectEmbeddingProvider(
    providers: EmbeddingProvider[],
    preferred: EmbeddingProviderName,
  ): EmbeddingProvider {
    const provider = providers.find((entry) => entry.name === preferred);
    if (!provider) throw new Error(`Provider not registered: ${preferred}`);
    return provider;
  }
}
