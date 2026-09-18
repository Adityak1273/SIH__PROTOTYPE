# Cognitive Care NER — Security

## Baseline

Security is part of the architecture from the first database migration.

### Authentication

Use managed authentication with short-lived access tokens and secure session handling. Do not implement custom password storage.

### Authorization

Authorization must be enforced server-side using database Row Level Security and trusted server functions. UI role checks are convenience only, never the security boundary.

### Secrets

- Never commit API keys, service-role keys, private tokens, or production credentials.
- Keep privileged credentials server-side.
- Use separate development/staging/production configuration.

### Data protection

- Collect the minimum personal data required.
- Avoid storing unnecessary medical/clinical information.
- Encrypt data in transit and rely on managed encryption at rest.
- Define retention/deletion behavior before collecting high-volume telemetry.

### Auditability

Important authorization and caregiver-access changes should be attributable to an authenticated actor.

### AI safety

External AI providers must receive only the minimum data required for their task. Do not send raw personal data to an AI provider by default.

## Threats to test

- Cross-user data access.
- Caregiver accessing an unlinked elderly profile.
- Client-side role manipulation.
- Replay/duplicate sync operations.
- Token/session leakage.
- Secret exposure in logs/build artifacts.
- Prompt/data leakage through future AI integrations.
