# Contributing to CrewSpace

CrewSpace uses a pnpm/Turborepo monorepo. Keep business rules in the backend and shared domain packages; clients should consume typed contracts and present state.

## Before opening a PR

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use the Phase and ticket boundaries in [ImplementationSpecification.md](ImplementationSpecification.md). Keep changes focused, add tests for changed domain behavior, and update [CONTEXT.md](CONTEXT.md) when canonical product terminology changes.
