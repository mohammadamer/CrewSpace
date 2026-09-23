# CrewSpace

CrewSpace is an open-source collaboration platform where humans and persistent AI teammates work together inside shared workspaces.

This is not another chatbot. CrewSpace is designed around persistent Agent identity, private Agent Knowledge, shared Workspace Knowledge, initiative, human approval, and synchronized Web, Desktop, and Mobile clients.

## Current Status

The current branch contains foundation work through Phase 32, including release verification and the MVP mock teammate experience:

- pnpm and Turborepo monorepo.
- NestJS API with PostgreSQL, Prisma, and Redis local infrastructure.
- Email/password authentication with OAuth provider ports and mocked Google/GitHub adapters.
- Workspace creation, membership, and server-side roles.
- Typed contracts, an in-memory event bus, and WebSocket gateway foundation.
- Web, Tauri-ready Desktop, and Expo-ready Mobile shells.
- Workspace invitations and shareable invitation links.
- Invitation expiration, revocation, usage limits, role restrictions, optional passwords, and authenticated acceptance.
- Workspace member listing, role management, removals, settings, and audit records.
- Persistent workspace-scoped Agents and Personas, starter teammates, statuses, capabilities, profiles, and activity.
- Private Agent memory with explicit ownership and inspection permissions, default private visibility, and scoped retrieval boundaries.
- Workspace-scoped direct, group, and channel conversations with user and Agent membership.
- Authorized message creation, stable cursor-based message pagination, and typed `MessageCreated` events.
- Provider-independent Agent execution with a deterministic MockRuntime, retry, timeout, cancellation, usage records, and lifecycle events.
- Bounded Agent-to-Agent messages with depth, token, cooldown, relevance, budget, and loop checks.
- Auditable allowed and blocked communication attempts with Agent activity records.
- Workspace-scoped Agent relationships with summaries, communication preferences, interaction history, and unresolved topics.
- Permission-scoped relationship editing, interaction recording, audit logs, and typed context-update events.
- Bounded Agent schedules with cadence, time zones, active hours, cooldowns, daily budgets, cancellation, and explicit `NO_ACTION` wake cycles.
- Workspace-scoped Projects with user and Agent membership.
- Tasks with priorities, assignments, dependency checks, status transitions, and Decision provenance.
- Decisions with context, alternatives, conclusions, source provenance, related Tasks, audit records, and typed events.
- Convene sessions with participant selection, discussion/evidence contributions, pause/resume, synthesis, Decisions, and owned action Tasks.
- Agent-initiated approval requests with risk metadata, human approve/reject/cancel transitions, and capability enablement.
- Workspace-scoped tool permissions with audited changes and typed approval events for client synchronization.
- Authenticated Workspace-scoped WebSocket subscriptions with ordered event replay and bounded history-gap handling.
- Shared integration records with encrypted credentials, provider binding, and auditable lifecycle updates.
- Search and embedding provider abstractions with privacy-safe request validation, provider selection, and ranked retrieval results.
- Offline sync state with deduplicated queued actions and deterministic replay after reconnect.
- Native client delivery metadata with typed notification payloads and validated deep-link routing.
- Device registration and platform handshake contracts for workspace-scoped client connection metadata.
- Push-token registration and workspace-scoped delivery envelopes for platform-native client alerts.
- Provider registration and queue-oriented delivery runs for production orchestration metadata.
- Provider credential binding and queue integration plans for explicit runtime delivery wiring.
- Secret bindings and deployment plans for provider runtime configuration and rollout readiness.
- Environment registrations and rollout records for production deployment orchestration metadata.
- Runtime activations and live activation plans for production rollout execution metadata.
- Cutover gates and production readiness plans for activation and switch-over safety.
- Activation execution records and live cutover plans for production switch-over orchestration.
- Final activation records and deployment stability plans for production-ready runtime activation.
- Runtime stabilization records and release-gate plans for final runtime readiness and deployment safety.
- Final release-gate records and deployment verification plans for production-safe handoff.
- Production readiness records and deployment signoff plans for release approval and handoff safety.
- Release verification records and plans for final deployment checks.
- Idempotent MVP demo data for Atlas, Iris, Bram, and Nova with persisted greetings and deterministic mock replies.

Private Agent Knowledge is explicitly separated from workspace-shared context. Phase 5 covers the conversation and message backend foundation, Phase 6 covers provider-independent execution, Phase 7 adds bounded Agent-to-Agent communication, Phase 8 adds inspectable collaboration context without representing literal emotion, Phase 9 adds bounded initiative scheduling, Phase 10 connects Decisions to durable Tasks, Phase 11 adds structured Convene decisions, Phase 12 adds explicit human approvals for sensitive Agent actions, Phase 13 hardens authenticated realtime delivery, Phase 14 adds controlled external integrations, Phase 15 adds provider-aware intelligence abstraction, Phase 16 establishes offline-first sync state, Phase 17 adds native notification and deep-link contracts, Phase 18 covers device registration and platform client readiness, Phase 19 covers push delivery registration and deduped routing, Phase 20 adds explicit provider orchestration metadata, Phase 21 adds provider credential binding and queue integration plans, Phase 22 adds secret binding and deployment readiness metadata, Phase 23 adds environment registration and rollout records, Phase 24 adds runtime activation and live rollout execution metadata, Phase 25 adds cutover gates and production readiness plans, Phase 26 adds live cutover execution records for production activation, Phase 27 adds final activation records for production stabilization, Phase 28 adds runtime stabilization and release-gate records for final deployment readiness, Phase 29 adds final release-gate records for production handoff, Phase 30 adds production readiness records for deployment signoff, and Phase 31 adds deployment signoff records for production release approval. Final deployment verification remains planned. See [ImplementationSpecification.md](ImplementationSpecification.md) for the full roadmap.

## Benefits

- **Persistent teammates:** Agents have identity, Personas, capabilities, activity, and memory boundaries instead of acting as disposable chat sessions.
- **Shared context:** Humans and Agents work in Workspace-scoped conversations, Projects, Tasks, Decisions, and Convene sessions.
- **Human control:** Permissions, approvals, audit records, and explicit private knowledge boundaries keep sensitive actions reviewable.
- **Cross-platform access:** The same backend and contracts support Web, Desktop, and Mobile clients.
- **Provider independence:** The MockRuntime and provider abstractions make the product testable without external AI credentials.

## Technology

- **Monorepo:** pnpm workspaces and Turborepo.
- **Backend:** NestJS, TypeScript, REST APIs, WebSockets, class-validator, and a typed event bus.
- **Persistence:** PostgreSQL with Prisma migrations and repositories.
- **Infrastructure:** Docker Compose with PostgreSQL and Redis.
- **Web:** React, TypeScript, Vite, and a development proxy for the API.
- **Desktop:** A Vite-ready React shell intended for a Tauri wrapper.
- **Mobile:** Expo and React Native.
- **Shared packages:** Contracts, core utilities, configuration, database, platform abstractions, and UI foundations.

## Development

Requirements: Node.js 24+, pnpm 12+, and Docker.

```bash
pnpm install
docker compose up -d
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Apply the database migration with:

```bash
DATABASE_URL=postgresql://crewspace:crewspace@localhost:5432/crewspace pnpm --filter @crewspace/database exec prisma migrate deploy
```

See [docs/development.md](docs/development.md), [docs/architecture.md](docs/architecture.md), and [docs/api.md](docs/api.md) for details.

## Run Locally

Install dependencies and start the local services:

```bash
pnpm install
docker compose up -d
```

Apply the database migrations:

```bash
DATABASE_URL=postgresql://crewspace:crewspace@localhost:5432/crewspace \
	pnpm --filter @crewspace/database exec prisma migrate deploy
```

Start the API in one terminal:

```bash
DATABASE_URL=postgresql://crewspace:crewspace@localhost:5432/crewspace \
	pnpm --filter @crewspace/api dev
```

The API listens on `http://localhost:3000` and exposes the health check at `/api/v1/health`.

### Web

Start the Web client in another terminal:

```bash
pnpm --filter @crewspace/web dev --host 0.0.0.0
```

Open `http://localhost:5173`. During development, Vite proxies `/api/*` to the API, which also works in a remote container or Codespace. Set `VITE_API_URL` when the API is hosted elsewhere.

### Mobile

Start Expo:

```bash
pnpm --filter @crewspace/mobile dev
```

Use the Expo QR code or an emulator. The current Mobile shell is a foundation client and uses the local API address directly; a physical device or Android emulator may require replacing `localhost` with the host machine's reachable IP (`10.0.2.2` is typical for the Android emulator).

### Desktop

Start the Tauri-ready React shell:

```bash
pnpm --filter @crewspace/desktop dev --host 0.0.0.0
```

### Worker

Run the background worker when testing scheduled or queued behavior:

```bash
pnpm --filter @crewspace/worker dev
```

## Using CrewSpace

1. Open the Web client and choose **Create an account** or sign in.
2. Create a Workspace when prompted.
3. Empty Workspaces are seeded with Atlas, Iris, Bram, and Nova for MVP testing.
4. Select a teammate to open their direct conversation and read the persisted greeting.
5. Send a message. The demo teammate returns a deterministic mock reply without external provider credentials.
6. Use the API and shared contracts when testing features that are not yet surfaced in the client UI.

## Starter Agent Team

After authenticating and creating a Workspace, an Owner or Admin can create the built-in team:

```bash
curl -X POST http://localhost:3000/api/v1/workspaces/<workspace-id>/agents/starter-team \
	-H "Authorization: Bearer <session-token>"
```

This creates customizable Personas and persistent Agents for Atlas (Researcher), Iris (Product Designer), Bram (Engineer), and Nova (Product Manager). Agent profiles expose status, capabilities, Persona data, and recent activity through the Agent API.

## Contributing

1. Fork the repository or create a focused feature branch from `dev`.
2. Install dependencies and start PostgreSQL and Redis with the commands in [Run Locally](#run-locally).
3. Keep business rules in the backend or shared domain packages; clients should consume typed contracts rather than duplicate rules.
4. Keep each change focused on one phase or issue. Add tests for changed domain behavior and update documentation when public behavior changes.
5. Run the full quality checks before opening a PR:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

6. Describe the behavior changed, test evidence, migrations, configuration requirements, and any known limitations in the PR.

Use [CONTRIBUTING.md](CONTRIBUTING.md) for the short contribution policy, [ImplementationSpecification.md](ImplementationSpecification.md) for phase boundaries, and [SECURITY.md](SECURITY.md) for security reporting.

## Repository Layout

```text
apps/api       NestJS API and WebSocket gateway
apps/web       React Web client
apps/desktop   Tauri-ready React Desktop client
apps/mobile    Expo React Native client
apps/worker    Background worker entrypoint
packages/*     Shared contracts, domain, database, UI, and platform packages
docs/          Architecture, API, security, and development documentation
```

## Roadmap

Phase 1 establishes identity, Workspace tenancy, roles, shared contracts, and first-class client shells. Phase 2 adds invitations and Workspace collaboration. Phase 3 adds persistent Agents and Personas. Phase 4 adds private Agent memory, scoped retrieval rules, and explicit inspection permissions without leaking private knowledge. Phase 5 adds the conversation and message backend foundation. Phase 6 adds provider-independent Agent execution and auditable lifecycle state. Phase 7 adds bounded Agent-to-Agent communication with loop and budget controls. Phase 8 adds editable, auditable collaboration context. Phase 9 adds bounded Agent initiative scheduling. Phase 10 adds Projects, Tasks, dependencies, and Decisions. Phase 11 adds structured Convene sessions. Phase 12 adds human approval and advanced permission records. Phase 13 adds authenticated realtime synchronization. Phase 14 adds external integration adapters and encrypted credentials. Phase 15 adds provider-aware search and embedding abstractions with privacy-safe selection. Phase 16 adds offline queued-sync state and replay semantics. Phase 17 adds typed native notifications and deep-link routing for client delivery. Phase 18 adds device registration and platform capability handshakes for client readiness. Phase 19 adds push-registration and workspace-scoped delivery envelopes for platform-native alerts. Phase 20 adds provider registration and queue-oriented delivery runs for production orchestration. Phase 21 adds provider credential binding and queue integration plans for live runtime delivery. Phase 22 adds secret binding and deployment readiness metadata for provider configuration. Phase 23 adds environment registration and rollout records for production deployment orchestration. Phase 24 adds runtime activation and live rollout execution metadata for production activation. Phase 25 adds cutover gates and production readiness plans for activation safety. Phase 26 adds live cutover execution records for final production activation orchestration. Later phases add live production switch-over wiring and deployment activation.

Product decisions live in [ProductDecisions.md](ProductDecisions.md), canonical domain terminology lives in [CONTEXT.md](CONTEXT.md), and the versioned API is documented in [docs/api.md](docs/api.md).
