export type Brand<T, B extends string> = T & { readonly __brand: B };

export * from './device.js';
export * from './integration.js';
export * from './intelligence.js';
export * from './notifications.js';
export * from './provider.js';
export * from './push.js';
export * from './sync.js';

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
      'AgentExecutionStarted',
      { executionId: string; agentId: AgentId }
    >
  | EventEnvelope<
      'AgentExecutionCompleted',
      { executionId: string; agentId: AgentId; output: string }
    >
  | EventEnvelope<
      'AgentExecutionFailed',
      { executionId: string; agentId: AgentId; status: string; error: string }
    >
  | EventEnvelope<
      'CollaborationContextUpdated',
      {
        relationshipId: string;
        agentId: AgentId;
        relatedAgentId: AgentId;
        action: string;
      }
    >
  | EventEnvelope<
      'AgentWakeCycleRecorded',
      { scheduleId: string; agentId: AgentId; status: string; reason: string }
    >
  | EventEnvelope<'ProjectCreated', { projectId: string; name: string }>
  | EventEnvelope<'TaskUpdated', { taskId: string; status: string }>
  | EventEnvelope<'DecisionCreated', { decisionId: string; title: string }>
  | EventEnvelope<
      'IntegrationCreated',
      { integrationId: string; provider: string; name: string }
    >
  | EventEnvelope<
      'ApprovalUpdated',
      { approvalId: string; agentId: AgentId; status: string; action: string }
    >
  | EventEnvelope<
      'ConveneUpdated',
      { conveneId: string; status: string; action: string }
    >
  | EventEnvelope<
      'MessageCreated',
      {
        conversationId: ConversationId;
        messageId: string;
        authorUserId?: UserId;
        authorAgentId?: AgentId;
        content: string;
      }
    >;
