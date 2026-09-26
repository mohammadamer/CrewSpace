# Mock Teammate Workspace Implementation Plan

> **For agentic workers:** Execute inline; user authorized autonomous issue work.

**Goal:** Complete #85 with seeded direct teammate chats, persisted greetings/replies, and Web UI.

**Architecture:** Authenticated OnboardingService composes existing Agent and Conversation services with Prisma. ConversationService writes deterministic replies only in one-Agent direct chats. Web loads onboarding and API state per eligible workspace.

**Tech Stack:** NestJS, Prisma/PostgreSQL, React, TypeScript, node:test.

---

### Task 1: Idempotent onboarding

**Files:** create `apps/api/src/onboarding/onboarding.service.ts` and `.test.ts`; create `onboarding.controller.ts`; register in `apps/api/src/app.module.ts`.

- [ ] Write failing service tests for first call and repeated call. Mock existing AgentService/ConversationService and a Prisma fake. Assert four Agent chats get created once, every greeting has Agent author ID, and second call returns same four pairs without additional writes.
- [ ] Run `pnpm --filter @crewspace/api build`; expected missing module/API failures.
- [ ] Implement `POST /workspaces/:workspaceId/onboarding/initialize` behind `SessionGuard`. Require ADMIN or OWNER. Ensure starter team, list Agents, find the signed-in User's direct Conversation with each Agent, create missing conversation, and insert greeting only when no greeting from that Agent exists.
- [ ] Run API focused tests; assert owner/admin succeeds, member is forbidden, seed rerun adds zero records.

### Task 2: Deterministic replies

**Files:** modify `apps/api/src/conversations/conversation.service.ts` and `.test.ts`.

- [ ] Write failing tests that user message in one-Agent DIRECT conversation persists one Agent-authored bounded deterministic response, while GROUP and human-only DIRECT conversations produce no response.
- [ ] Run conversation test; expected mock reply absent.
- [ ] Implement deterministic local response. Keep 20,000-character message limit; bound quoted user content. Persist via `Message.authorAgentId` and advance conversation timestamp. Keep the current user-authored MessageCreated event contract unchanged.
- [ ] Run conversation service tests; assert response sequence, Agent author, and no provider/network dependency.

### Task 3: Web teammate and chat experience

**Files:** modify `apps/web/src/main.tsx`, `apps/web/src/styles.css`.

- [ ] Manually verify existing main build before changes. Then implement authenticated Workspace loading, owner/admin onboarding call, Agent/conversation/message loading, selectable teammate navigation, message history and composer, request errors, empty/loading states, and responsive layout matching existing CrewSpace palette.
- [ ] Run `pnpm --filter @crewspace/web typecheck` and `pnpm --filter @crewspace/web build`; correct all errors.

### Task 4: Real E2E and release checks

**Files:** create `apps/api/tests/onboarding.e2e.cjs`; add `test:e2e` package script; update `docs/api.md` and `docs/development.md`; fix the missing closing parenthesis in `0005_conversations/migration.sql` only if fresh migration deployment confirms the existing failure.

- [ ] E2E against disposable PostgreSQL and real Nest HTTP: register owner/member, create workspace, initialize onboarding twice, verify four distinct Agents/Direct chats/greetings, paginate/read them, send messages, verify deterministic Agent-authored replies persist, and reject member initialization and cross-Workspace conversation access.
- [ ] Deploy migrations to a new DB; expected failure on malformed historical CHECK until minimal syntax repair is included.
- [ ] Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, migration deploy, and `pnpm --filter @crewspace/api test:e2e`.
- [ ] Review acceptance criteria/diff; commit, push separate branch, open PR referencing #85, attach PR.
