# Cognitive Care NER — Architecture

## 1. Architectural direction

Use a TypeScript monorepo with two user-facing applications and shared domain packages.

- `apps/elderly-app`: primary older-adult experience.
- `apps/caregiver-dashboard`: caregiver web experience.
- `packages/game-engine`: framework and contracts for games.
- `packages/ai-engine`: deterministic/adaptive decision logic and future model adapters.
- `packages/ui`: shared accessible design system/components.
- `packages/voice`: voice abstraction and provider adapters.
- `packages/shared`: shared types, validation, utilities, and domain contracts.
- `supabase`: database migrations, Edge Functions, and seed data.

The exact frontend framework can be finalized during foundation implementation, but React + TypeScript is the default direction.

## 2. Layering

### Presentation
Screens, components, navigation, accessibility behavior, localization, and user interaction.

### Application/domain
Game sessions, scoring, adaptation, reminders, caregiver views, sync orchestration, and authorization-aware use cases.

### Infrastructure
Supabase client, local persistence, sync transport, voice providers, analytics/telemetry, and external AI/model providers.

Business rules must not be embedded directly inside UI components.

## 3. Data flow

```text
User
  -> UI
  -> application/domain use case
  -> local state + persistence
  -> optional remote synchronization
  -> Supabase

Performance history
  -> adaptation engine
  -> next-session configuration
  -> game engine
```

## 4. Game contract

Every game should implement a common contract conceptually equivalent to:

- game metadata
- configuration/difficulty
- start session
- process interaction
- calculate score/performance metrics
- finish session
- serialize session events/results
- accessibility configuration

The contract should allow games to differ internally without changing analytics, sync, or caregiver code.

## 5. Adaptation boundary

The UI and games request a recommended configuration from `ai-engine`/adaptation services. They do not independently decide difficulty based on ad-hoc thresholds.

For the MVP, adaptation should be deterministic and testable. Model-based recommendations can be introduced behind the same interface later.

## 6. Offline boundary

Core game execution must not require a network request per interaction. A game session is created and updated locally; synchronization happens asynchronously.

Remote state is authoritative for server-owned relationships and access control. Local state is authoritative only for pending/offline work until successful synchronization.

## 7. Supabase boundary

Use Supabase for:
- authentication
- PostgreSQL persistence
- Row Level Security
- Edge Functions for privileged/server-side workflows
- optional realtime features where they materially improve the caregiver experience

The client must never contain service-role credentials.

## 8. Testing strategy

- Unit tests: domain rules, scoring, adaptation, sync conflict/idempotency.
- Component tests: critical accessible UI behavior.
- Integration tests: authentication, database policies, game-session persistence.
- End-to-end tests: critical elderly and caregiver journeys.

## 9. Deployment direction

Use a conventional CI pipeline that runs formatting/type checks/tests/builds before deployment. Web-facing applications may be deployed independently while sharing packages.

Production infrastructure decisions should be captured here before implementation rather than becoming undocumented conventions.
