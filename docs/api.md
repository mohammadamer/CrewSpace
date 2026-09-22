# API

The API is versioned under `/api/v1` and uses DTO validation, server-side authentication, Workspace membership checks, and typed error responses.

Phase 1 endpoints:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/session`
- `GET /workspaces`
- `POST /workspaces`
- `GET /workspaces/:workspaceId`
- `GET /workspaces/:workspaceId/members`
- `PATCH /workspaces/:workspaceId/members/:userId`
- `DELETE /workspaces/:workspaceId/members/:userId`
- `PATCH /workspaces/:workspaceId/settings`
- `GET /workspaces/:workspaceId/invitations`
- `POST /workspaces/:workspaceId/invitations/email`
- `POST /workspaces/:workspaceId/invitations/link`
- `DELETE /workspaces/:workspaceId/invitations/:invitationId`
- `POST /invitations/accept`
- `GET /workspaces/:workspaceId/agents`
- `GET /workspaces/:workspaceId/agents/:agentId`
- `POST /workspaces/:workspaceId/agents`
- `PATCH /workspaces/:workspaceId/agents/:agentId`
- `POST /workspaces/:workspaceId/agents/starter-team`
- `GET /workspaces/:workspaceId/personas`
- `POST /workspaces/:workspaceId/personas`
- `POST /workspaces/:workspaceId/conversations`
- `GET /workspaces/:workspaceId/conversations`
- `GET /workspaces/:workspaceId/conversations/:conversationId`
- `POST /workspaces/:workspaceId/conversations/:conversationId/messages`
- `GET /workspaces/:workspaceId/conversations/:conversationId/messages`
- `POST /workspaces/:workspaceId/agents/:agentId/executions`
- `POST /workspaces/:workspaceId/executions/:executionId/cancel`
- `POST /workspaces/:workspaceId/conversations/:conversationId/agents/:sourceAgentId/messages`
- `GET /workspaces/:workspaceId/relationships`
- `GET /workspaces/:workspaceId/relationships/:relationshipId`
- `POST /workspaces/:workspaceId/agents/:agentId/relationships`
- `PATCH /workspaces/:workspaceId/relationships/:relationshipId`
- `POST /workspaces/:workspaceId/relationships/:relationshipId/interactions`
- `GET /workspaces/:workspaceId/schedules`
- `POST /workspaces/:workspaceId/agents/:agentId/schedules`
- `PATCH /workspaces/:workspaceId/schedules/:scheduleId`
- `POST /workspaces/:workspaceId/schedules/:scheduleId/cancel`
- `POST /workspaces/:workspaceId/schedules/:scheduleId/wake`
- `GET /workspaces/:workspaceId/schedules/:scheduleId/wake-cycles`

Protected endpoints require `Authorization: Bearer <session>`. Tenant-owned data is always resolved through the authenticated User's Workspace membership.

Invitation tokens are stored as hashes and returned only when an invitation is created. Email invitations require the authenticated user's email to match; shareable links can enforce expiration, usage limits, and an optional password. Invitation creation, acceptance, revocation, member changes, and settings changes create audit records.

Agent and Persona endpoints require Workspace membership. Agent creation and updates are limited to non-Guest members, while starter-team creation requires an Admin or Owner. Agent profiles include Persona, capabilities, status, and recent activity.

Conversation endpoints require non-Guest Workspace membership and conversation membership. Conversation creation validates every user and Agent participant against the requested Workspace and automatically includes the creating User. Message history uses cursor pagination ordered by creation time and message ID. Human-authored message creation publishes a typed `MessageCreated` event; Agent-authored messages remain reserved for the runtime phase.

Execution endpoints require non-Guest Workspace membership and validate the Agent's Workspace scope. The runtime currently uses a deterministic MockRuntime behind the `AgentRuntime` interface. Execution state records attempts, timeout, cancellation, failure, output, and usage; lifecycle events are published without provider-specific calls in domain logic.

Agent communication requires both Agents to belong to the Workspace and the conversation. The policy bounds message depth, token count, cumulative budget, cooldown, relevance, and repeated content. Blocked attempts are persisted with a reason and exposed through Agent activity; allowed messages are authored by the source Agent and publish `MessageCreated` with Agent authorship.

Collaboration-context reads require Workspace membership. Creating, editing, and recording interactions require a non-Guest role. Relationship records store summaries, communication preferences, interaction counts, recent interactions, and unresolved topics; they do not represent literal emotion. Mutations create audit records and publish `CollaborationContextUpdated` events.

Initiative schedule reads and wake-cycle inspection require Workspace membership. Creating, editing, and cancelling schedules require a non-Guest role. A wake cycle evaluates enabled state, timezone-aware active hours, cadence, cooldown, and daily budget. Each evaluation records an outcome and reason; `NO_ACTION` is an explicit result rather than an implicit failure. Schedule mutations and wake cycles are audited and wake-cycle events are published.
