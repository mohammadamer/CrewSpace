# Workspace event synchronization (#45)

Use the existing process-local event bus and NestJS `ws` gateway. A persistent broker would require deployment work outside this issue; URL bearer tokens would expose credentials to access logs. Instead, clients authenticate a single `subscribe` frame containing a session token and Workspace ID. No event is sent before authorization. Connections must subscribe within ten seconds.

Keep the latest 1,000 events globally in sequence order. Replay only events in the requested Workspace, strictly after the supplied cursor. Reject expired, future, or invalid cursors. Pair the cursor with a process-specific stream ID so a restarted process cannot silently skip events. Fresh subscriptions start at the current sequence. Resynchronization starts with a fresh subscription: buffer incoming events, refresh state through HTTP, then reconcile buffered events idempotently.

Each connection has a bounded serial delivery queue. Subscribe and capture replay synchronously after asynchronous authorization, preventing replay/live gaps. Suppress sequences already delivered. Revalidate sessions and membership before delivery; conversation messages additionally require conversation membership. Close on authorization failure, duplicate subscriptions, or queue/backpressure overflow. Disconnect removes listeners and timers.

Tests cover ordering, replay boundaries, tenant isolation, invalid credentials, revoked access, duplicate delivery, disconnect during authorization, and private conversation events. A real Nest application and PostgreSQL database exercise registration, Workspace creation, HTTP-triggered events, WebSocket delivery, reconnect replay, and denied subscriptions.

In-memory replay is a single-process foundation. Durable history, multi-instance routing, client caches, and native notifications remain deferred as specified in #45.
