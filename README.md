# Cognitive Care NER

> Working product name for the SIH prototype. Repository: `SIH_PROTOTYPE_REPO`.

This repository is the source of truth for the Cognitive Care NER prototype: an accessible cognitive-care application for older adults with a caregiver-facing dashboard, adaptive game experiences, voice interaction, multilingual support, reminders, analytics, and offline-first operation.

## Status

Phase 0 prototype is now available on the `develop` branch. The first runnable slice focuses on the living AI companion: animated character states, voice output, optional speech input, simple conversation, contextual reactions, and hooks for future game events.

## Phase 0 prototype

- `prototype/phase-0/index.html`
- `prototype/phase-0/styles.css`
- `prototype/phase-0/app.js`
- `.github/workflows/phase-0-pages.yml`

The prototype is intentionally independent of the production LLM/backend at this stage so the character experience can be tested first. Game correctness and scoring will remain deterministic in the future game engine.

## Documentation

- [Product Specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database Design](docs/DATABASE_DESIGN.md)
- [AI Adaptation](docs/AI_ADAPTATION.md)
- [Offline & Sync](docs/OFFLINE_SYNC.md)
- [Security](docs/SECURITY.md)
- [UI/UX](docs/UI_UX.md)

## Planned repository layout

```text
apps/
  elderly-app/
  caregiver-dashboard/
packages/
  game-engine/
  ai-engine/
  ui/
  voice/
  shared/
supabase/
  migrations/
  functions/
  seed/
tests/
docs/
prototype/
  phase-0/
```

The production application structure remains intentionally separate from this Phase 0 interaction prototype.
