# Workspace Events Implementation Plan

> Execute inline with superpowers:executing-plans. Autonomous implementation authorized by task request.

**Goal:** Complete #45 with authenticated, Workspace-scoped event delivery and bounded reconnect replay.

**Architecture:** Extend the existing in-memory bus with bounded history and a stream identity. Replace unconditional gateway broadcast with one authenticated subscription and an ordered queue per socket. Preserve existing event envelopes and HTTP permissions.

**Tech Stack:** TypeScript, NestJS, ws, Prisma, PostgreSQL, node:test.

- [ ] Add failing `apps/api/src/events/event-bus.test.ts` cases: Workspace replay, strict cursor exclusion, bounded history gap, future/invalid cursor. Run compiled Node tests; confirm missing replay API fails.
- [ ] Implement `event-bus.ts`: 1,000-entry history, stream ID, current sequence, validated Workspace replay. Re-run bus tests.
- [ ] Add failing `events.gateway.test.ts` cases using socket doubles and explicit authentication/persistence seams. Assert unauthenticated sockets get nothing; forbidden subscriptions close; authorized replay/live frames retain order; duplicates do not deliver; access revocation closes; conversation membership filters messages; disconnect cancels pending authorization.
- [ ] Implement subscription DTO validation, authenticated gateway queues, listener cleanup and resync frames. Add shared protocol contracts. Compile and run gateway tests.
- [ ] Add `tests/events.e2e.cjs` using actual compiled Nest application, ws sockets and PostgreSQL. Register two users, create independent Workspaces, verify HTTP-triggered events reach only subscribed members, reconnect with cursor and stream ID, revoke session, and assert no subsequent delivery. Clean up only created fixtures.
- [ ] Document wire protocol, retention/restart limits and E2E command in API/development docs. Add package E2E command.
- [ ] Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and real E2E against migrated isolated PostgreSQL.
- [ ] Review diff and issue acceptance criteria; commit, push fork, open PR using repository PR skill template, attach PR, report upstream.
