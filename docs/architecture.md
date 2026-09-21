# Architecture

CrewSpace has three first-class clients over one backend source of truth:

- Web: React and TypeScript.
- Desktop: Tauri with React and TypeScript.
- Mobile: Expo and React Native with TypeScript.

The backend uses NestJS, PostgreSQL/Prisma, Redis, BullMQ, REST under `/api/v1`, and typed WebSocket events. Shared contracts, validation, permissions vocabulary, and platform abstractions live in packages. Clients do not own domain mutations or authorization.

See [ImplementationSpecification.md](../ImplementationSpecification.md) for boundaries, persistence, event contracts, and phased delivery.
