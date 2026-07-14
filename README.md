# Vid Pilot

AI-powered multi-platform video content management system.

Vid Pilot lets creators upload long-form media once, then manage AI-assisted transcript generation, subtitles, chapters, short clips, content suggestions, and multi-platform publishing.

This root README is a workspace index. Each major folder should own its detailed README so implementation notes stay close to the code they describe.

## Workspace Index

| Folder | Purpose | README |
| --- | --- | --- |
| `frontend/` | Next.js creator workspace for upload, Studio, TTS, social accounts, publishing, and settings UI. | [frontend/README.md](frontend/README.md) |
| `backend/` | Node.js/TypeScript API service with Express, Prisma, PostgreSQL, S3-compatible storage, auth, media, transcript, chaptering, and job APIs. | [backend/README.md](backend/README.md) |
| `worker/` | Python Celery workers for media, transcript, chaptering, and long-running processing pipelines. | [worker/README.md](worker/README.md) |
| `ai-service/` | Python gRPC AI runtime for ASR and future AI providers. | [ai-service/README.md](ai-service/README.md) |
| `infrastructure/` | Local infrastructure such as Docker Compose, PostgreSQL, MinIO, and environment examples. | [infrastructure/README.md](infrastructure/README.md) |
| `renderer/` | Rendering-related workspace. | [renderer/README.md](renderer/README.md) |
| `evaluate/` | Evaluation workspace for experiments and quality checks. | [evaluate/README.md](evaluate/README.md) |
| `packages/` | Shared packages used by one or more workspaces. | [packages/README.md](packages/README.md) |
| `scripts/` | Repository-level scripts and utility commands. | [scripts/README.md](scripts/README.md) |
| `notebook/` | Research and smoke-test notebooks for ASR, transcript, and chaptering workflows. | [notebook/README.md](notebook/README.md) |

## Product Rules

The previous `docs/` reference set has been removed. New product and architecture rules will be added separately later. For now, use the workspace README, workspace `AGENTS.md`, current code patterns, and the user's latest instructions.

## Development Notes

- Main development branch: `dev`.
- Branch naming format: `<top-level-folder>/<feature-or-task>`.
- Do not commit local secrets. Keep local values in ignored `.env` files and shared examples in `.env.example` files.
- Prefer each workspace README for setup, commands, and ownership details.

## Common Verification

Use the workspace-specific README before running commands. Current preferred checks are:

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
npm run build
npm run lint
npm test
```

```bash
cd worker
uv run pytest
uv run ruff check app tests
uv run ruff format --check app tests
uv run python -m compileall -q app tests
```

```bash
cd ai-service
uv run pytest
uv run ruff check app tests scripts
uv run ruff format --check app tests scripts
uv run python -m compileall -q app tests proto/generated scripts
```
