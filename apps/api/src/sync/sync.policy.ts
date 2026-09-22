import { Injectable } from '@nestjs/common';
import { QueuedSyncAction, SyncState } from '@crewspace/contracts';

@Injectable()
export class SyncPolicy {
  queueAction(action: QueuedSyncAction): QueuedSyncAction {
    if (!action.actionType.trim()) throw new Error('Action type is required');
    if (!action.workspaceId) throw new Error('Workspace scope is required');
    if (!action.dedupeKey.trim()) throw new Error('Dedupe key is required');
    return action;
  }

  markState(state: SyncState): SyncState {
    if (!state.clientId) throw new Error('Client identifier is required');
    if (!state.workspaceId) throw new Error('Workspace identifier is required');
    if (!['ONLINE', 'OFFLINE', 'SYNCING'].includes(state.status)) {
      throw new Error('Unknown sync status');
    }
    return state;
  }
}
