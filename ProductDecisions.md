# CrewSpace Product Decisions

**Status:** Accepted
**Date:** 2026-09-21
**Scope:** Product direction and Phase 1 architecture

This document records the decisions agreed for CrewSpace. It is the source of truth for the initial product and architecture direction until superseded by a later decision.

## 1. Phase 1 Boundary

Phase 1 will deliver:

- The pnpm/Turborepo monorepo foundation.
- Shared core and typed contract packages.
- A NestJS API foundation.
- PostgreSQL and Prisma persistence foundations.
- Authentication.
- Workspace creation and membership.
- Server-enforced RBAC.
- Health checks and basic operational foundations.
- Minimal authenticated shells for Web, Desktop, and Mobile.

Phase 1 will not implement agents, memory, conversations, chat, orchestration, or autonomous behavior. Those capabilities begin in later phases after the foundation is stable.

## 2. Authentication

The first production-ready authentication capability will support:

- Email and password.
- Google OAuth.
- GitHub OAuth.

Authentication will sit behind a provider abstraction so additional identity providers can be added without changing domain logic. Authentication is distinct from workspace authorization: successfully signing in does not grant access to a workspace.

## 3. Tenant Boundary

A Workspace is the tenant boundary for CrewSpace. Tenant-owned data belongs to exactly one Workspace and must be scoped to that Workspace server-side.

Global records may exist outside a Workspace where appropriate, including:

- User identity records.
- Global persona templates.
- System configuration.

Cross-workspace references are not allowed for tenant-owned domain data unless a future decision explicitly introduces a controlled sharing model.

## 4. User and Workspace Membership

`User` represents a global authenticated person.

`WorkspaceMember` represents that User's membership and access within one Workspace. Roles belong to WorkspaceMember, not User.

A User may belong to multiple Workspaces. Every request that accesses workspace data must establish both the authenticated User and the relevant Workspace membership on the server.

Initial WorkspaceMember roles:

- OWNER
- ADMIN
- MEMBER
- GUEST

Client-side role checks may improve presentation, but they are never security boundaries.

## 5. Persistent Agent Identity

An Agent is a persistent, workspace-owned AI teammate. It is not merely a model configuration or a temporary conversation participant.

An Agent has its own:

- Persona.
- Permissions.
- Capabilities.
- Memory.
- Private workspace.
- Activity and execution history.

Model configuration is replaceable runtime configuration attached to an Agent. Provider-specific calls must remain behind runtime adapters.

## 6. Private Agent Knowledge

Private agent memory, notes, files, and working material are inaccessible to other agents and ordinary workspace search by default.

Human access also requires an explicit permission or inspection capability. Private content must never enter shared context implicitly or become shared knowledge merely because an Agent read or created it.

The product will distinguish clearly between:

- Private Agent Knowledge.
- Shared Workspace Knowledge.
- Project Knowledge.
- Public Conversation.

## 7. Backend Authority

The backend is authoritative for identity, authorization, workspace state, domain mutations, agent state, permissions, persisted data, and synchronization events.

Web, Desktop, and Mobile clients consume typed contracts and may use optimistic UI for responsiveness. Optimistic state is provisional and must reconcile with authoritative backend state and events.

Clients do not implement independent business rules or authorization decisions.

## 8. Synchronization Model

All first-class clients connect to the same backend and source of truth:

- Web uses React and TypeScript.
- Desktop uses Tauri with React and TypeScript.
- Mobile uses React Native, Expo, and TypeScript.

The backend publishes typed, ordered domain events over WebSockets. Clients must support reconnects, missed-event recovery, duplicate-event handling, stale state reconciliation, and conflict resolution as those capabilities are implemented.

## 9. Monorepo and Package Boundaries

The repository will use pnpm and Turborepo. Business logic will be organized around domain boundaries and shared contracts rather than duplicated per client.

Shared packages will own reusable domain concepts, validation, permissions, event contracts, state models, design tokens, and platform-neutral services. Platform-specific code is permitted only where Web, Desktop, or Mobile genuinely require different behavior.

## 10. Backend and Persistence

The backend foundation will use Node.js, TypeScript, NestJS, PostgreSQL, and Prisma. PostgreSQL is the initial persistence source for transactional domain data and the first search implementation.

Redis and BullMQ remain part of the planned backend platform for event distribution, queues, scheduling, and background work when those phases are implemented.

Database entities will not be exposed directly through the API. API DTOs and typed contracts define the public boundary.

## 11. API and Events

The API will use versioned REST endpoints under `/api/v1/` with DTOs, validation, typed responses, and consistent error handling.

WebSockets will expose typed event contracts for cross-client synchronization. The event system will begin with an in-memory abstraction designed to support a Redis-backed implementation later.

## 12. Architectural Decision Records

The following decisions are considered ADR-worthy and are explicitly accepted:

1. Monorepo and shared package boundaries.
2. Backend-authoritative state.
3. PostgreSQL and Prisma as the initial persistence model.
4. Versioned REST plus typed WebSockets.
5. Authentication behind a provider abstraction.
6. Server-enforced multi-tenant authorization.
7. Persistent Agents as workspace-owned domain entities.
8. Private agent knowledge as an explicit access boundary.
9. Thin authenticated shells for all three clients in Phase 1.

This file acts as the initial decision register. Dedicated ADR files may be split out when implementation begins and the trade-offs need deeper historical detail.

## 13. Phase 1 Exit Criteria

Phase 1 is stable when the repository can demonstrate:

- A User can authenticate with the supported initial methods.
- A User can create a Workspace.
- Workspace membership and roles are enforced server-side.
- Tenant-owned data cannot be accessed across Workspaces.
- Web, Desktop, and Mobile shells can authenticate against the same backend.
- Shared contracts compile for all clients.
- Health checks, tests, lint, typecheck, migrations, and builds pass.
- The architecture is documented well enough to begin the Agent phase without moving business logic into clients.

## 14. Implementation Planning Decisions

The following decisions govern the implementation specification:

- A Phase is an independently verifiable delivery increment with scope, dependencies, tests, and an exit gate.
- The specification documents all 15 roadmap phases, but only Phase 1 is authorized for immediate implementation.
- Phase 1 clients provide authenticated shells with workspace selection, workspace creation, role-aware navigation, and explicit placeholders for future features.
- PostgreSQL and Redis run locally through Docker Compose. In-memory substitutes are limited to isolated tests.
- Email/password authentication is delivered end to end first. Google and GitHub OAuth have provider interfaces and mocked adapters before real local credentials are required.
- Every Phase has a risk-based quality gate with a mandatory baseline of tests, lint, typecheck, and build. Schema, WebSocket, platform, and end-to-end checks become mandatory when introduced.
- MVP completion requires the full MVP capability set across Web, Desktop, and Mobile. An earlier internal alpha is allowed after foundation, workspace, Agents, and basic chat are stable.
- Implementation proceeds in dependency order: domain and contracts, persistence, application services and authorization, API and events, client state and screens, platform adapters, then tests and operational validation.
- `ImplementationSpecification.md` owns the phased execution plan. `ProductDecisions.md` owns accepted decisions, and `CONTEXT.md` owns canonical domain vocabulary.
