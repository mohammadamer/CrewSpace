export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type AgentId = Brand<string, 'AgentId'>;
export type ConversationId = Brand<string, 'ConversationId'>;

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';

export interface SessionUser {
  id: UserId;
  email: string;
  displayName: string;
}

export interface WorkspaceSummary {
  id: WorkspaceId;
  name: string;
  role: WorkspaceRole;
}

export interface EventEnvelope<TType extends string, TPayload> {
  id: string;
  type: TType;
  aggregateId: string;
  workspaceId: WorkspaceId | null;
  occurredAt: string;
  sequence: number;
  payload: TPayload;
}

export type DomainEvent =
  | EventEnvelope<'WorkspaceCreated', { name: string }>
  | EventEnvelope<'MemberInvited', { email: string; role: WorkspaceRole }>
  | EventEnvelope<'AgentCreated', { name: string; role: string }>
  | EventEnvelope<'AgentStatusChanged', { status: string }>
  | EventEnvelope<
      'MessageCreated',
      {
        conversationId: ConversationId;
        messageId: string;
        authorUserId: UserId;
        content: string;
      }
    >;

/** Sent as { event: 'subscribe', data: EventSubscription } on /api/v1/events. */
export interface EventSubscription {
  token: string;
  workspaceId: string;
  afterSequence?: number;
  streamId?: string;
}

export type EventStreamControl =
  | {
      type: 'subscribed';
      workspaceId: string;
      streamId: string;
      sequence: number;
    }
  | { type: 'resync_required' };
