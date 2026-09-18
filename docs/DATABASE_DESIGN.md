# Cognitive Care NER — Database Design

## Design goals

- Strong separation between identity, relationships, activity data, and configuration.
- Row Level Security for all user-owned data.
- Append-oriented session/event data where useful for auditability and analytics.
- Idempotent synchronization using client-generated identifiers.

## Initial logical model

### `profiles`
Application profile linked to an authenticated user.

Key fields:
- `id`
- `auth_user_id`
- `display_name`
- `role` (`elderly` | `caregiver` | future roles only when approved)
- `locale`
- accessibility/preferences fields
- timestamps

### `caregiver_relationships`
Links caregivers to elderly profiles.

Key fields:
- `id`
- `caregiver_profile_id`
- `elderly_profile_id`
- relationship/status metadata
- timestamps

### `games`
Registry of supported games and versions.

Key fields:
- `id`
- stable game key
- name
- version
- active flag
- configuration metadata

### `game_sessions`
One completed or in-progress gameplay session.

Key fields:
- `id`
- `client_session_id`
- `elderly_profile_id`
- `game_id`
- difficulty/configuration snapshot
- started/completed timestamps
- status
- score and normalized performance metrics
- sync metadata

### `game_events`
Optional event-level telemetry needed for replay/debugging/adaptation. Keep retention and privacy requirements explicit before enabling high-volume storage.

### `adaptation_decisions`
Records why a difficulty/configuration was selected.

Key fields:
- user
- source metrics/window
- previous configuration
- selected configuration
- rule/model version
- reason codes
- timestamp

### `reminders`
Caregiver-configured reminders for an elderly profile.

### `alerts`
Actionable system-generated or rule-generated caregiver alerts.

### `sync_operations`
Client-side storage is expected to hold a local equivalent/outbox. The server may store deduplication/idempotency records where necessary.

## Security model

RLS policies should enforce:

- Users can read/update their own profile according to role rules.
- Caregivers can access only elderly profiles explicitly linked to them.
- Elderly users can access their own sessions/preferences.
- No user can infer or enumerate unrelated profiles.
- Server-side privileged operations run through trusted Edge Functions rather than exposing elevated database credentials.

## Indexing

Initial indexes should cover:
- relationship lookups by caregiver and elderly profile
- sessions by elderly profile + completion time
- sessions by game + completion time
- alerts by caregiver/profile + status
- idempotency/client session identifiers

Exact indexes and constraints will be created in migrations after schema review.
