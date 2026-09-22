import { Injectable } from '@nestjs/common';
import { IntelligenceRequestContext } from '@crewspace/contracts';

@Injectable()
export class IntelligencePolicy {
  validate(context: IntelligenceRequestContext) {
    if (!context.workspaceId) throw new Error('Workspace scope is required');
    if (!context.userId) throw new Error('User scope is required');
    if (context.limit <= 0 || context.limit > 50) {
      throw new Error('Result limit must stay between 1 and 50');
    }
    if (!context.query.trim()) throw new Error('Query cannot be empty');
    if (!context.allowPrivateKnowledge && context.query.includes('private')) {
      throw new Error(
        'Private knowledge access is not permitted in this request',
      );
    }
    return true;
  }
}
