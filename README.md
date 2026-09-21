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
- Phase 2 workspace invitations, shareable links, member management, settings, and audit records.

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
