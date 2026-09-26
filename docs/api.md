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
- `POST /workspaces/:workspaceId/onboarding/initialize` (creates the starter team and direct chats for workspace admins)
- `GET /workspaces/:workspaceId/personas`
- `POST /workspaces/:workspaceId/personas`
- `POST /workspaces/:workspaceId/conversations`
- `GET /workspaces/:workspaceId/conversations`
- `GET /workspaces/:workspaceId/conversations/:conversationId`
- `POST /workspaces/:workspaceId/conversations/:conversationId/messages`
- `GET /workspaces/:workspaceId/conversations/:conversationId/messages`

Protected endpoints require `Authorization: Bearer <session>`. Tenant-owned data is always resolved through the authenticated User's Workspace membership.

Invitation tokens are stored as hashes and returned only when an invitation is created. Email invitations require the authenticated user's email to match; shareable links can enforce expiration, usage limits, and an optional password. Invitation creation, acceptance, revocation, member changes, and settings changes create audit records.

Agent and Persona endpoints require Workspace membership. Agent creation and updates are limited to non-Guest members, while starter-team creation requires an Admin or Owner. Agent profiles include Persona, capabilities, status, and recent activity.

Conversation endpoints require non-Guest Workspace membership and conversation membership. Conversation creation validates every user and Agent participant against the requested Workspace and automatically includes the creating User. Message history uses cursor pagination ordered by creation time and message ID. Human-authored message creation publishes a typed `MessageCreated` event; Agent-authored messages remain reserved for the runtime phase.

## Workspace event stream

Connect to `ws://localhost:3000/api/v1/events` (`wss://` in production). Within ten seconds send one subscription frame; credentials belong in the frame, never in the URL:

```json
{
  "event": "subscribe",
  "data": {
    "token": "<session-token>",
    "workspaceId": "<workspace-id>"
  }
}
```

The server checks the session and Workspace membership, then sends:

```json
{
  "type": "subscribed",
  "workspaceId": "<workspace-id>",
  "streamId": "<process-stream-id>",
  "sequence": 42
}
```

Fresh subscriptions start at the current sequence. Subsequent frames are existing `DomainEvent` envelopes with increasing `sequence` values. Events from other Workspaces and global events are excluded. `MessageCreated` also requires current conversation membership; `MemberInvited` requires the current Admin or Owner role, matching the invitation API. Sessions and membership are rechecked before delivery, including replay. Invalid authentication, removed membership, malformed subscriptions, or a second subscription close the connection with code `1008`.

Persist the stream ID and last processed sequence. Reconnect with the same frame plus `data.streamId` and `data.afterSequence`. The acknowledgment sequence is the requested cursor; replay then delivers only authorized events strictly after it, followed by live events. Ignore duplicate sequences at or below the last processed cursor. Sequence gaps are normal because events for other Workspaces or inaccessible conversations are filtered.

History retains the latest 1,000 events across all Workspaces in this API process. An expired/future cursor or a missing/mismatched stream ID yields `{"type":"resync_required"}` and closes with `1008`. Open a fresh subscription, buffer incoming events while refreshing authorized state through HTTP, then reconcile buffered events and retain the new stream ID/cursor. Do not repeatedly retry an invalid cursor. History is not durable or shared between API replicas; a process restart requires resynchronization. Multi-instance delivery requires a shared event broker in a future phase.

A connection buffers at most 1,000 pending events. Queue overflow or more than 1 MB of pending socket output closes with `1013`; reconnect with the last processed cursor, or resynchronize if history has expired. Subscription frames are limited to 4 KB. Web, Desktop, and Mobile consumers share `EventSubscription` and `EventStreamControl` contracts; client reconnect/cache implementations remain deferred.
