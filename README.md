# CrewSpace

CrewSpace is an open-source collaboration platform where humans and persistent AI teammates work together inside shared workspaces.

This is not another chatbot. CrewSpace is designed around persistent Agent identity, private Agent Knowledge, shared Workspace Knowledge, initiative, human approval, and synchronized Web, Desktop, and Mobile clients.

## Current Status

The current branch contains the Phase 1 foundation and Phase 2 workspace collaboration:

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

Persistent Agents, memory, conversations, and orchestration are planned for later phases. See [ImplementationSpecification.md](ImplementationSpecification.md) for the full roadmap.

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

Apply migrations, then start the API from the repository root:

```bash
DATABASE_URL=postgresql://crewspace:crewspace@localhost:5432/crewspace \
	pnpm --filter @crewspace/api dev
```

In another terminal, start the Web client:

```bash
pnpm --filter @crewspace/web dev
```

The API uses `http://localhost:3000` by default. Desktop and Mobile shells are available through:

```bash
pnpm --filter @crewspace/desktop dev
pnpm --filter @crewspace/mobile dev
```

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

Phase 1 establishes identity, Workspace tenancy, roles, shared contracts, and first-class client shells. Phase 2 adds invitations and Workspace collaboration. Phase 3 adds persistent Agents and Personas. Later phases add private Agent Knowledge, Conversations, Agent Runtime, initiative, Projects, Tasks, Decisions, Convene, integrations, and offline synchronization.

Product decisions live in [ProductDecisions.md](ProductDecisions.md), canonical domain terminology lives in [CONTEXT.md](CONTEXT.md), and the Phase 2 API is documented in [docs/api.md](docs/api.md).
