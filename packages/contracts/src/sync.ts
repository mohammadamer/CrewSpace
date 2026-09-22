export type SyncStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING';

export interface QueuedSyncAction {
  id: string;
  clientId: string;
  workspaceId: string;
  actionType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  sequence: number;
  dedupeKey: string;
}

export interface SyncState {
  clientId: string;
  workspaceId: string;
  status: SyncStatus;
  lastSyncedSequence: number;
  queuedActions: QueuedSyncAction[];
  updatedAt: string;
}

export interface SyncReplayResult {
  state: SyncState;
  pendingActions: QueuedSyncAction[];
}
