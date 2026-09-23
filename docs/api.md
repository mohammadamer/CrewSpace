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
- `GET /workspaces/:workspaceId/convenes`
- `GET /workspaces/:workspaceId/convenes/:conveneId`
- `POST /workspaces/:workspaceId/convenes`
- `POST /workspaces/:workspaceId/convenes/:conveneId/participants`
- `POST /workspaces/:workspaceId/convenes/:conveneId/start`
- `POST /workspaces/:workspaceId/convenes/:conveneId/pause`
- `POST /workspaces/:workspaceId/convenes/:conveneId/resume`
- `POST /workspaces/:workspaceId/convenes/:conveneId/contributions`
- `POST /workspaces/:workspaceId/convenes/:conveneId/complete`
- `POST /workspaces/:workspaceId/convenes/:conveneId/cancel`
- `GET /workspaces/:workspaceId/approvals`
- `POST /workspaces/:workspaceId/agents/:agentId/approvals`
- `POST /workspaces/:workspaceId/approvals/:approvalId/approve`
- `POST /workspaces/:workspaceId/approvals/:approvalId/reject`
- `POST /workspaces/:workspaceId/approvals/:approvalId/cancel`
- `GET /workspaces/:workspaceId/tool-permissions`
- `POST /workspaces/:workspaceId/tool-permissions`
- `GET /workspaces/:workspaceId/projects`
- `POST /workspaces/:workspaceId/projects`
- `GET /workspaces/:workspaceId/projects/:projectId`
- `PATCH /workspaces/:workspaceId/projects/:projectId`
- `POST /workspaces/:workspaceId/projects/:projectId/members`
- `GET /workspaces/:workspaceId/projects/:projectId/tasks`
- `POST /workspaces/:workspaceId/projects/:projectId/tasks`
- `PATCH /workspaces/:workspaceId/tasks/:taskId`
- `POST /workspaces/:workspaceId/tasks/:taskId/dependencies`
- `POST /workspaces/:workspaceId/decisions`
- `GET /workspaces/:workspaceId/decisions`

Protected endpoints require `Authorization: Bearer <session>`. Tenant-owned data is always resolved through the authenticated User's Workspace membership.

Invitation tokens are stored as hashes and returned only when an invitation is created. Email invitations require the authenticated user's email to match; shareable links can enforce expiration, usage limits, and an optional password. Invitation creation, acceptance, revocation, member changes, and settings changes create audit records.

Agent and Persona endpoints require Workspace membership. Agent creation and updates are limited to non-Guest members, while starter-team creation requires an Admin or Owner. Agent profiles include Persona, capabilities, status, and recent activity.

Conversation endpoints require non-Guest Workspace membership and conversation membership. Conversation creation validates every user and Agent participant against the requested Workspace and automatically includes the creating User. Message history uses cursor pagination ordered by creation time and message ID. Human-authored message creation publishes a typed `MessageCreated` event; Agent-authored messages remain reserved for the runtime phase.

Execution endpoints require non-Guest Workspace membership and validate the Agent's Workspace scope. The runtime currently uses a deterministic MockRuntime behind the `AgentRuntime` interface. Execution state records attempts, timeout, cancellation, failure, output, and usage; lifecycle events are published without provider-specific calls in domain logic.

Agent communication requires both Agents to belong to the Workspace and the conversation. The policy bounds message depth, token count, cumulative budget, cooldown, relevance, and repeated content. Blocked attempts are persisted with a reason and exposed through Agent activity; allowed messages are authored by the source Agent and publish `MessageCreated` with Agent authorship.

Collaboration-context reads require Workspace membership. Creating, editing, and recording interactions require a non-Guest role. Relationship records store summaries, communication preferences, interaction counts, recent interactions, and unresolved topics; they do not represent literal emotion. Mutations create audit records and publish `CollaborationContextUpdated` events.

Initiative schedule reads and wake-cycle inspection require Workspace membership. Creating, editing, and cancelling schedules require a non-Guest role. A wake cycle evaluates enabled state, timezone-aware active hours, cadence, cooldown, and daily budget. Each evaluation records an outcome and reason; `NO_ACTION` is an explicit result rather than an implicit failure. Schedule mutations and wake cycles are audited and wake-cycle events are published.

Convene reads require Workspace membership; lifecycle mutations require a non-Guest Workspace role and Project membership when a Project is attached. A Convene requires multiple participants before starting, accepts discussion and evidence contributions, supports pause/resume, and completes by creating a Decision and optional project-owned action Tasks. Lifecycle transitions and completion are audited and publish `ConveneUpdated` events.

Approval requests are scoped to a Workspace and Agent and include capability, action, risk, payload, reason, and optional expiry metadata. Non-Guest members can review pending requests; expired or terminal requests cannot transition. Approving a request enables the corresponding Agent tool capability, while all request and review transitions are audited and publish `ApprovalUpdated` events. Tool permission changes require an Admin or Owner.

The WebSocket event endpoint is `/api/v1/events`. Clients must provide a session token and `workspaceId` query parameter, for example `/api/v1/events?token=<session>&workspaceId=<workspace-id>&since=<last-sequence>`. The gateway authenticates the session, verifies Workspace membership, filters events to the subscribed Workspace, and replays ordered events after `since`. If the requested sequence is older than the bounded event history, the client receives `ReplayUnavailable` and must perform a fresh state synchronization.

Integration records are Workspace-scoped adapters with a provider enum, status, metadata, and credential lifecycle. The API exposes `GET /workspaces/:workspaceId/integrations`, `POST /workspaces/:workspaceId/integrations`, `GET /workspaces/:workspaceId/integrations/:integrationId`, `PATCH /workspaces/:workspaceId/integrations/:integrationId`, and `POST /workspaces/:workspaceId/integrations/:integrationId/credentials`. Credentials are stored encrypted at rest and bound to the matching Integration provider; unencrypted secret material is never returned through the API.

The intelligence layer exposes a provider-agnostic search and embedding seam for later provider-backed ranking. Contracts define typed `SearchProvider`, `EmbeddingProvider`, `IntelligenceRequestContext`, and `SearchResult` shapes with strict privacy-safe validation for workspace scope, user scope, limit bounds, and private-knowledge access. Providers are selected through explicit enum names rather than hidden runtime inference, keeping cost, policy, and retrieval boundaries auditable.

The offline synchronization layer exposes a `SyncState` contract and queued action model for reconnect-safe replay. Clients can persist queued actions keyed by workspace and dedupe key, mark the local sync state as `ONLINE`, `OFFLINE`, or `SYNCING`, and replay only unseen actions after reconnect without duplication or stale state drift.

The native client delivery layer defines typed `NotificationPayload` and `DeepLink` contracts so platform clients can deliver workspace-scoped alerts with an explicit route and a safe deep link target. Notification payloads include a workspace id, channel, priority, title, body, optional actor, optional deep link, and timestamp. The server validates that the deep link stays within a valid workspace-scoped target route before it is delivered to Web, Desktop, or Mobile clients.

The device registration layer defines `DeviceRegistration` and `DeviceSessionHandshake` contracts for workspace-scoped client readiness. A device registration tracks the user, workspace, platform, token, capabilities, and timestamps; a handshake records the client id, platform, app version, session version, and timestamp. These contracts support replay-safe client identity and platform capability metadata without allowing a device to impersonate another workspace or user.

The push delivery layer defines `PushRegistration` and `PushDeliveryEnvelope` contracts for workspace-scoped client alerts. A push registration captures the user, workspace, device id, platform, token, delivery status, and preferences; a delivery envelope records the workspace, device, alert message, dedupe key, priority, and timestamp. This ensures the payload remains auditable, deduplicated, and scoped to the correct workspace before an external delivery provider is used.

The provider orchestration layer defines `ProviderRegistration` and `ProviderDeliveryRun` contracts for queue-oriented delivery runs. A provider registration stores the workspace, provider kind, status, and capabilities, while a delivery run tracks the provider id, queue key, attempt count, and status transitions. This makes provider selection and retry metadata explicit enough for runtime orchestration without embedding provider secrets into application logic.

The provider integration layer defines `ProviderCredential` and `QueueIntegrationPlan` contracts for runtime delivery wiring. A credential binds a provider and workspace to a registered secret reference; a queue plan records the provider, queue key, retry policy, max attempts, and lifecycle status. These contracts keep live routing metadata explicit and auditable without exposing secret material through the application surface.

Project and work-management reads require both Workspace and Project membership. Project and Task mutations require non-Guest Project members. Task transitions are dependency-aware and terminal states cannot be reopened. Tasks may be assigned to a Project member User or Agent, and a Decision can be related to a Task through Decision provenance. Decision creation and Task updates create audit records and publish typed events.
