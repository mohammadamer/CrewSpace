# Mock teammate workspace experience (#85)

## Goal

After the workspace owner signs in, they can talk to Atlas, Iris, Bram, and Nova without provider credentials.

## Design

Add an authenticated, idempotent workspace onboarding endpoint. It requires Admin/Owner, creates the existing starter team where missing, then ensures a direct conversation and persisted greeting for every starter Agent. Repeated calls reuse prior teammates/conversations and never add duplicate greetings. Existing conversation membership and workspace checks stay authoritative.

Extend message creation only for direct conversations with exactly one Agent participant: persist a bounded deterministic mock reply authored by that Agent, alongside the user message. Group conversations and human-only direct conversations keep existing behavior. No external model calls.

The Web client runs onboarding for owner/admin memberships at first authenticated load, fetches Agents and their conversations, and renders a responsive teammate list and message panel. Selecting a teammate opens that Agent's conversation. Sending a message refreshes persisted history to show the deterministic reply. Other workspace roles continue using APIs according to their current permissions.

## Verification

Service tests cover seeding repeatability and reply eligibility/content. A disposable PostgreSQL E2E test registers/logs in an owner, creates a workspace, initializes twice, verifies four unique Agents/conversations/greetings, sends messages and verifies stored deterministic Agent replies, and checks unauthorized/member access. Web build and TypeScript checks validate the client integration. Full monorepo checks run before PR.

## Boundaries

Starter conversations and mock responses are scoped per user and workspace. No external credentials, model runtime, production provider wiring, or multi-user group chat reply behavior is introduced.
