# Cognitive Care NER — Phase 2

Phase 2 moves the Phase 1 local-first demo toward a connected product without removing offline behavior.

## Delivered

- Supabase-backed account foundation using the publishable client key.
- Email magic-link sign-in flow when Supabase Auth/email delivery is enabled.
- Local-first fallback when the device is offline or cloud authentication is unavailable.
- Cloud sync for completed cognitive sessions and per-game results after authentication.
- Caregiver/progress dashboard with 7-day, 30-day and per-game views.
- Caregiver alert data model for missed reminders, performance changes, sync issues and care notes.
- Notification preference data model.
- Training baselines for longitudinal comparison.
- Plain-language trend reporting.

## Clinical safety boundary

Game scores are training-performance data. The app does not convert percentages into dementia stages, diagnose a disease, or replace clinician-administered assessments. A future clinical-validation phase must establish any comparison with validated instruments before such comparisons are displayed.

## Offline behavior

The game session and local history continue to work without network access. Cloud features become available again when connectivity and authentication return.

## Production prerequisites

Before clinical or public deployment, configure Supabase Auth redirect URLs and email delivery, test account recovery, add consent/privacy flows, validate caregiver linking, complete accessibility testing, add secure server-side monitoring, and perform clinical/privacy/security validation.
