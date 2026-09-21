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

Run the API with `pnpm --filter @crewspace/api dev`, Web with `pnpm --filter @crewspace/web dev`, and the Mobile shell with `pnpm --filter @crewspace/mobile dev`.
