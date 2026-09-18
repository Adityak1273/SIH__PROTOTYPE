# Docker deployment — Cognitive Care NER Demo Unit

The repository contains a Dockerfile that packages the current Demo Unit from `prototype/phase-0` behind the Node.js HTTP server.

## Deployment source of truth

- Repository: `Adityak1273/SIH_PROTOTYPE_REPO`
- Branch: `main`
- Build context: repository root (`.`)
- Dockerfile: `Dockerfile`
- Container port: `80`
- Health endpoint: `/health`
- Current prototype build: `0.17.1`

The `main` branch is the current deployment branch. Do not configure ZopDay/ZopCloud to use the old `develop` branch.

## Local Docker

Build:

```bash
docker build -t cognitive-care-ner-demo .
```

Run:

```bash
docker run --rm -p 8080:80 cognitive-care-ner-demo
```

Verify:

```bash
curl http://localhost:8080/health
```

The response should report `ok: true` and build `0.17.1`.

Open `http://localhost:8080`.

## Docker Compose

```bash
docker compose up --build
```

Open `http://localhost:8080`.

Stop it with:

```bash
docker compose down
```

## ZopDay / ZopCloud

Use repository `Adityak1273/SIH_PROTOTYPE_REPO` on branch `main`. Configure the deployment to build from the repository root using `Dockerfile`, expose container port `80`, and publish the resulting HTTP service. The container provides `/health` for runtime health verification.

No application environment variables are required for the current static demo. AI chat is optional; if `OPENAI_API_KEY` is absent, the `/api/chat` endpoint returns a controlled configuration error while the cognitive-training application remains available.

The Docker image intentionally contains only the demo assets and Node.js runtime. Future backend/API services should be deployed separately and connected through environment configuration rather than embedded into this image.
