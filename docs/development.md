# Development

Install Node.js 24+, pnpm 12+, and Docker. Then run:

```bash
pnpm install
docker compose up -d
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The default local services are PostgreSQL on port 5432 and Redis on port 6379. Apply migrations with:

```bash
DATABASE_URL=postgresql://crewspace:crewspace@localhost:5432/crewspace pnpm --filter @crewspace/database exec prisma migrate deploy
```

Run the API with `pnpm --filter @crewspace/api dev`, Web with `pnpm --filter @crewspace/web dev`, and the Mobile shell with `pnpm --filter @crewspace/mobile dev`. The API allows the Web dev origin `http://localhost:5173` by default; set `WEB_ORIGIN` when the Web runs at another origin.

Run API end-to-end tests against a migrated, disposable database with `DATABASE_URL=... pnpm --filter @crewspace/api test:e2e`.
Run the API with `pnpm --filter @crewspace/api dev`, Web with `pnpm --filter @crewspace/web dev`, and the Mobile shell with `pnpm --filter @crewspace/mobile dev`.

## Event stream end-to-end validation

The API E2E test uses real HTTP requests, WebSocket connections, and PostgreSQL. It covers authentication, Workspace isolation, private conversation and invitation filtering, reconnect replay, process-stream mismatch, and session revocation. It removes only the users and Workspaces it creates. Use a disposable database, never production:

```bash
docker run --name crewspace-events-test \
  -e POSTGRES_USER=crewspace -e POSTGRES_PASSWORD=crewspace \
  -e POSTGRES_DB=crewspace_events_test \
  -p 127.0.0.1:55445:5432 -d postgres:17-alpine
# Wait until PostgreSQL is ready.
docker exec crewspace-events-test pg_isready -U crewspace
export DATABASE_URL=postgresql://crewspace:crewspace@localhost:55445/crewspace_events_test
pnpm --filter @crewspace/database exec prisma migrate deploy
pnpm exec turbo run build --filter=@crewspace/api...
pnpm --filter @crewspace/api test:e2e
docker rm -f -v crewspace-events-test
```

`pnpm test` continues to run the database-independent unit suite. Run the E2E command separately after building the API and deploying all migrations. No AI credentials or external provider connections are needed.
