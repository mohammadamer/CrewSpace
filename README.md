# CrewSpace

CrewSpace is an open-source collaboration platform where humans and persistent AI teammates work together inside shared workspaces.

This is not another chatbot. CrewSpace is designed around persistent Agent identity, private Agent Knowledge, shared Workspace Knowledge, initiative, human approval, and synchronized Web, Desktop, and Mobile clients.

## Phase 1

The current branch implements the foundation:

- pnpm and Turborepo monorepo.
- NestJS API with PostgreSQL, Prisma, and Redis local infrastructure.
- Email/password authentication with OAuth provider ports and mocked Google/GitHub adapters.
- Workspace creation, membership, and server-side roles.
- Typed contracts, an in-memory event bus, and WebSocket gateway foundation.
- Web, Tauri-ready Desktop, and Expo-ready Mobile shells.

Agents, memory, conversations, and orchestration are planned for later phases. See [ImplementationSpecification.md](ImplementationSpecification.md) for the full roadmap.

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

Start the API from the repository root after applying the migration:

```bash
DATABASE_URL=postgresql://crewspace:crewspace@localhost:5432/crewspace \
  pnpm --filter @crewspace/api dev
```

In another terminal, start the Web client:

```bash
pnpm --filter @crewspace/web dev
```

The API runs on `http://localhost:3000` and the Web client runs on the Vite development port shown in the terminal. Desktop and Mobile shells are available through their respective workspace scripts:

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
packages/*     Shared contracts, domain primitives, database, UI, and platform code
docs/          Architecture, API, security, and development documentation
```

## Roadmap

Phase 1 establishes identity, Workspace tenancy, server-side roles, shared contracts, and first-class client shells. Later phases add persistent Agents, Personas, private Agent Knowledge, Conversations, Agent Runtime, initiative, Projects, Tasks, Decisions, Convene, integrations, and offline synchronization.

The complete phased plan and acceptance gates are documented in [ImplementationSpecification.md](ImplementationSpecification.md). Product decisions live in [ProductDecisions.md](ProductDecisions.md), and canonical domain terminology lives in [CONTEXT.md](CONTEXT.md).
