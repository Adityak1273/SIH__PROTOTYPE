# Cognitive Care NER — Offline & Sync

## Requirement

Core gameplay must continue during temporary network loss. The app should not block a user from completing a game because a remote API is unavailable.

## Local-first session flow

1. Create a client-generated session ID.
2. Persist session state locally.
3. Record gameplay results/events locally.
4. Mark completed work as pending synchronization.
5. Attempt background synchronization when connectivity is available.
6. Retry transient failures with backoff.
7. Mark the operation synchronized only after server acknowledgement.

## Idempotency

Every syncable write needs a stable client identifier or idempotency key. Replaying the same operation must not create duplicate game sessions, results, reminders, or other records.

## Conflict policy

Conflicts should be resolved by domain rather than by a universal last-write-wins rule.

- Immutable completed session results: prefer the first accepted idempotent result.
- User preferences: define field-level or timestamp-based resolution explicitly.
- Caregiver relationships/permissions: server state wins.
- Configuration/content: server version wins after validation.

## Connectivity states

The UI should clearly but calmly communicate offline state. Do not repeatedly interrupt the elderly user with technical errors.

## Data minimization

Store only the local data required to continue the product experience and synchronize it. Sensitive data should have explicit retention/deletion rules.
