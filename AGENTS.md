# AGENTS.md

Repository-wide guidance for coding agents working in Vid Pilot.

This root guide should stay thin. Workspace-specific implementation rules belong in the nearest `AGENTS.md` inside that workspace.

## Project

Vid Pilot is an AI-powered multi-platform video content management system.

The product lets users upload long-form media once, then manage AI-assisted transcript generation, subtitles, video chapters, short clips, content suggestions, and multi-platform publishing.

## Product Rules

The previous `docs/` source-of-truth set has been removed. Until a new rule set is added, align changes with the current code, the nearest workspace `AGENTS.md`, the workspace README, and the user's latest request.

## Workspace Guides

Before editing a workspace, read the closest workspace guide:

- Frontend: `frontend/AGENTS.md`
- Backend: `backend/AGENTS.md`

If a workspace does not have its own `AGENTS.md` yet, follow this root guide, the workspace README, and the user's latest instructions.

## Repository Layout

```text
frontend/        Next.js creator workspace
backend/         Node.js/TypeScript API service
worker/          Python Celery workers and media/AI pipelines
ai-service/      Python gRPC AI runtime for ASR and future AI providers
infrastructure/  Docker Compose and local service configuration
renderer/        Rendering-related workspace
evaluate/        Evaluation workspace and experiments
packages/        Shared package workspaces
scripts/         Repository-level scripts
notebook/        Research and smoke-test notebooks
```

## Git Workflow

- Main development branch: `dev`.
- Branch naming format: `<top-level-folder>/<feature-or-task>`.
- Examples: `backend/auth`, `backend/media`, `worker/transcript`, `frontend/studio`.
- The user chooses which files to stage and when to push.
- When asked for commit help, default to providing a Conventional Commit message only.

## General Rules

- Do not commit local secrets.
- Keep shared environment examples in `.env.example` files.
- Prefer clear English identifiers for files, functions, variables, classes, and types.
- Use Vietnamese sample copy only when it represents user-facing content examples.
- Keep changes scoped to the requested workspace and feature.
- Do not edit generated files by hand.
- Add comments only when the logic is not obvious.

## Verification

Use the workspace-specific guide or README for exact commands. Prefer running the relevant checks before finishing code changes.
