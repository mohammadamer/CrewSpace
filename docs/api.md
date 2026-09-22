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

Protected endpoints require `Authorization: Bearer <session>`. Tenant-owned data is always resolved through the authenticated User's Workspace membership.

Invitation tokens are stored as hashes and returned only when an invitation is created. Email invitations require the authenticated user's email to match; shareable links can enforce expiration, usage limits, and an optional password. Invitation creation, acceptance, revocation, member changes, and settings changes create audit records.

Agent and Persona endpoints require Workspace membership. Agent creation and updates are limited to non-Guest members, while starter-team creation requires an Admin or Owner. Agent profiles include Persona, capabilities, status, and recent activity.
