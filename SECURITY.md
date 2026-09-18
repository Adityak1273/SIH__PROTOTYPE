# Cognitive Care NER — Security & Compliance Controls

## Scope
This document defines the technical controls implemented by the prototype. It is **compliance-ready engineering documentation, not a legal certification**. Before clinical/public deployment, the operator must complete a jurisdiction-specific privacy/legal review and an independent security assessment.

## Implemented controls
- Supabase Row Level Security on patient, caregiver, session, result, reminder, task, notification and synchronization data.
- Caregiver access is relationship-based through active `caregiver_links`; caregiver dashboards cannot query arbitrary patients.
- Audit log is append-only from the application role and user-scoped by RLS.
- Patient data export and application-data deletion controls are available in the privacy/security center.
- No service-role or OpenAI secret is shipped to the browser; AI calls are proxied by the server.
- AI endpoint has request-size limits, per-IP rate limiting, timeout handling, generic error responses and origin allowlisting.
- Static server uses CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy headers.
- Offline data is kept in a local queue and is only applied to the authenticated user's cloud records when connectivity/authentication is available.
- Idempotent client IDs prevent duplicate reminder/task synchronization.
- Native Android reminder delivery uses the OS local-notification scheduler, so scheduled reminders can fire while the app is not open.
- Training results are explicitly separated from medical diagnosis and clinical staging.

## Data minimization
The MVP stores only the profile, preference, reminder/task, cognitive-training and caregiver-link information required by its features. Raw microphone audio is not stored by the application layer.

## Retention
The production operator must define and enforce a documented retention schedule appropriate to the deployment and applicable law. The prototype provides deletion/export mechanisms but does not select a legal retention period automatically.

## Required pre-production controls
1. Independent penetration test and dependency/SBOM review.
2. Formal privacy notice, consent language and data-processing agreements where applicable.
3. Identity verification and least-privilege role administration for caregivers/health workers.
4. Secure backups, disaster recovery and restore testing.
5. Monitoring, alerting and incident-response runbook.
6. Device-loss/session-revocation procedure.
7. Clinical validation and accessibility/usability study with representative older adults.
8. Security review of authentication, OAuth configuration and production hosting before handling real patient data.
