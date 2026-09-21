export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;

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
  | EventEnvelope<'MemberInvited', { email: string; role: WorkspaceRole }>;
