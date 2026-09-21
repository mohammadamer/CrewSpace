# Cross-Platform Foundation

All clients authenticate against the same API and use the same Workspace identity and permissions. Phase 1 provides authenticated shells and shared contracts. Later phases add offline caches, push/system notifications, deep links, missed-event recovery, and cross-client end-to-end synchronization.

Platform-specific code belongs behind explicit capability boundaries. A client may change presentation for its platform, but it must not duplicate backend business rules.
