import { Injectable } from '@nestjs/common';
import {
  QueuedSyncAction,
  SyncReplayResult,
  SyncState,
} from '@crewspace/contracts';
import { SyncPolicy } from './sync.policy';

@Injectable()
export class SyncService {
  constructor(private readonly policy: SyncPolicy) {}

  createQueuedAction(
    clientId: string,
    workspaceId: string,
    actionType: string,
    payload: Record<string, unknown>,
    sequence: number,
  ): QueuedSyncAction {
    const action: QueuedSyncAction = {
      id: `${clientId}:${actionType}:${sequence}`,
      clientId,
      workspaceId,
      actionType,
      payload,
      createdAt: new Date().toISOString(),
      sequence,
      dedupeKey: `${workspaceId}:${actionType}:${sequence}`,
    };
    return this.policy.queueAction(action);
  }

  rehydrate(state: SyncState, actions: QueuedSyncAction[]): SyncReplayResult {
    this.policy.markState(state);
    const pending = actions.filter(
      (action) => action.sequence > state.lastSyncedSequence,
    );
    return {
      state: {
        ...state,
        queuedActions: pending,
        status: pending.length > 0 ? 'SYNCING' : state.status,
      },
      pendingActions: pending,
    };
  }

  dedupe(actions: QueuedSyncAction[]): QueuedSyncAction[] {
    const seen = new Map<string, QueuedSyncAction>();
    for (const action of actions) {
      seen.set(action.dedupeKey, action);
    }
    return [...seen.values()].sort(
      (left, right) => left.sequence - right.sequence,
    );
  }
}
