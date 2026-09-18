# Cognitive Care NER — Product Specification

## 1. Purpose

Cognitive Care NER is an accessible digital cognitive-care prototype designed to make structured cognitive activities approachable for older adults while giving caregivers a clear view of engagement and performance.

This document is the product source of truth. Implementation must not introduce major features without updating this specification.

## 2. Primary users

### Older adult
- Needs a simple, low-friction interface.
- May have reduced vision, hearing, dexterity, memory, or technology familiarity.
- Uses games and guided activities regularly.
- May use voice interaction and supported languages.
- Must be able to continue core activities without an internet connection.

### Caregiver
- Creates/manages an older-adult profile or relationship.
- Reviews activity history, trends, adherence, and alerts.
- Configures reminders and support preferences.

## 3. Core product loop

1. Older adult opens the app.
2. App presents a small number of clear actions.
3. User completes a cognitive activity/game.
4. Session performance is recorded.
5. Adaptive logic evaluates recent performance and chooses an appropriate next difficulty/activity.
6. Caregiver-facing analytics summarize trends rather than exposing unnecessary raw data.
7. Offline sessions are synchronized when connectivity returns.

## 4. Initial MVP capabilities

### Elderly experience
- Accessible home screen.
- Friendly animated companion (initial concept: cat).
- Large touch targets and readable typography.
- High-contrast and reduced-complexity presentation options.
- Voice interaction framework.
- Multilingual UI/content framework.
- Game launcher and session flow.

### Initial five-game framework

The five games must share a common game contract so scoring, timing, difficulty, session persistence, accessibility, and analytics do not get reimplemented independently.

Game names/content are implementation decisions to be finalized before coding the individual games. The architecture must support memory, attention, language, visuospatial, and/or reasoning-style activities without coupling the engine to a single game type.

### Adaptive experience
- Per-user performance history.
- Difficulty progression/regression.
- Session-level recommendations.
- Basic trend detection.
- Explainable adaptation rules for the prototype.

### Caregiver
- Authentication and role-based access.
- Linked older-adult profiles.
- Activity history.
- High-level trends.
- Reminder management.
- Actionable alerts where defined by product rules.

### Offline
- Core games usable offline after initial app setup/content availability.
- Local persistence of sessions.
- Sync queue for completed sessions and supported settings.
- Safe retry/idempotency behavior.

## 5. Non-goals for the initial prototype

- Medical diagnosis.
- Clinical decision-making.
- Claims that game scores diagnose or treat a disease.
- Unbounded social features.
- General-purpose chatbot functionality.
- Complex wearable/IoT integrations unless separately approved.

## 6. Product principles

1. **Simple beats clever.** The elderly experience should minimize cognitive load.
2. **Accessibility is core functionality, not polish.**
3. **Offline is a first-class state.**
4. **Adaptation must be explainable.**
5. **Caregiver information should be useful, not overwhelming.**
6. **Privacy by default.**
7. **No clinical claims without clinical validation.**

## 7. Success criteria for the prototype

- A new user can reach and start a game without training.
- A complete game session produces structured performance data.
- Difficulty can change based on prior performance.
- Caregiver can see meaningful recent activity/trends for a linked user.
- Core game sessions remain usable during temporary connectivity loss.
- Accessibility checks are part of acceptance criteria, not a final QA pass.
