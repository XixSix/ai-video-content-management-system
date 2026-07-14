# Backend Agent Guide

This file contains backend-specific guidance for agents working under `backend/`.
The root `../AGENTS.md` still applies. When rules overlap, use this file for backend implementation details.

## Architecture

Backend uses Express, TypeScript, Prisma, PostgreSQL, MinIO/S3, Zod, Jest, and Supertest.

Use the agreed layer/module pattern. Do not introduce dependency injection, class controllers, decorators, or broad framework abstractions unless the user explicitly asks.

```text
backend/src/
├── config/          env loading and typed config object
├── infrastructure/  database clients and external adapters
├── middleware/      Express middleware
├── modules/         feature modules
├── services/        shared services only when cross-module
├── repositories/    shared repositories only when cross-module
├── models/          shared domain model types if needed
├── utils/           shared helpers only when cross-module
└── types/           shared TypeScript types only when cross-module
```

Feature modules live under `backend/src/modules/<feature>/`:

```text
<feature>.routes.ts
<feature>.controller.ts
<feature>.service.ts
<feature>.repository.ts
<feature>.schema.ts
<feature>.types.ts
<feature>.util.ts
<feature>.error.ts
<feature>.routes.test.ts
```

Mount feature routers from `backend/src/modules/index.ts`.

## Layer Rules

- Routes compose middleware and controller functions.
- Controllers handle HTTP concerns only: read validated request data, call services, set cookies/headers, send responses.
- Services contain business logic and call repositories.
- Repositories are the only feature layer that calls Prisma directly.
- Schemas contain Zod schemas and DTO types only. Do not import Express types in schema files.
- Feature-specific types, mappers, token helpers, cookie helpers, and utility functions should live inside that feature module.
- Use `backend/src/types` and `backend/src/utils` only for code shared across multiple modules.
- Middleware lives in `backend/src/middleware`.
- Config lives in `backend/src/config` and should work like typed settings: load env once, validate with Zod, export `config`.

## Backend Rules

- Prefer TypeScript.
- Keep route handlers thin.
- Put validation in schemas or middleware.
- Put business logic in services, no queries database here.
- Keep database access in repositories.
- Do not run heavy video, AI, subtitle, or publishing processing in HTTP handlers.
- For long-running tasks, create a database job record, enqueue a RabbitMQ job with the database `jobId`, and return the job status to the client.
- Use centralized error middleware.
- Never expose internal stack traces to clients.
- Never hardcode secrets, API keys, tokens, or platform credentials.
- Use environment variables for configuration.
- Keep API responses consistent.
- Use clear English identifiers for files, functions, variables, classes, and types.
- Use Vietnamese text for user-facing sample content when relevant.
- Add comments only when the logic is not obvious.

## Validation And Types

Use `validateRequest` from `backend/src/middleware/validate-request.ts`.

Do not use `express-zod-safe`.

Schema files should export only Zod schemas and inferred DTO types:

```ts
export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type RegisterBody = z.infer<typeof registerSchema>;
```

Controller files should use shared handler aliases from `backend/src/types/express.ts`:

```ts
import type { BodyRequestHandler } from "../../types/express";
import type { RegisterBody } from "./auth.schema";

export const register: BodyRequestHandler<RegisterBody> = async (
  req,
  res,
  next,
) => {
  // req.body is RegisterBody after validateRequest({ body: registerSchema })
};
```

Do not define ad hoc aliases like `RegisterRequest = Request<...>`.
Do not globally override `Express.Request["body"]`. Route bodies differ per route.
Global Express augmentation is only appropriate for shared fields such as `req.user`.

DTO naming is optional. Prefer names that describe the boundary:

- Request DTOs inferred from schemas: `RegisterBody`, `ListMediaQuery`, `MediaParams`.
- Response DTOs or service result shapes in `<feature>.types.ts`: `AuthResponseData`, `CreateUploadUrlResult`.
- Repository input types may stay in the repository when they are persistence-only shapes.

## API Rules

API prefix is:

```text
/api/v1
```

Implemented modules currently include:

- Auth:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/logout-all`
  - `GET /api/v1/auth/me`
- Media upload:
  - `POST /api/v1/media/upload-url`
  - `POST /api/v1/media/complete-upload`
  - `POST /api/v1/media/abort-upload`
- Transcripts:
  - `POST /api/v1/media/:mediaId/transcripts/generate`
  - `GET /api/v1/media/:mediaId/transcripts`
  - `GET /api/v1/transcripts/:transcriptId`
  - `GET /api/v1/transcripts/:transcriptId/segments`
- Chaptering:
  - `POST /api/v1/media/:mediaId/chapters/generate`
  - `GET /api/v1/media/:mediaId/chapters`
- Jobs:
  - `GET /api/v1/jobs/:jobId`
  - `GET /api/v1/jobs/:jobId/events`
- Health:
  - `GET /api/v1/health`

For future APIs, follow the current module patterns and the user's latest product/API direction until a new source-of-truth document exists.

## Data And Processing Rules

- `Media.status` reflects original file state only, such as `UPLOADING`, `UPLOADED`, `FAILED`, `DELETED`.
- AI processing state belongs in `ProcessingJob`, not `Media`.
- Offline transcript generation is asynchronous: backend creates `ProcessingJob`, publishes the queue message with `jobId`, worker processes media, and clients follow status through job APIs/SSE.
- Realtime transcript processing and offline transcript processing must stay separate. Realtime code may manage sessions, chunks, buffers, flush cadence, and low-latency partial results. Offline code should process full media/jobs and persist final transcript outputs.
- `TranscriptSegment` is the canonical storage for timestamped transcript content.
- `Transcript.fullText` is a denormalized cache for preview/search/LLM prompts.
- Do not let users edit `Transcript.fullText` as source data. Transcript editor saves timestamped segment edits, then `fullText` is rebuilt asynchronously from segments.
- When transcript segments change, set transcript edit/version dirty state, increment `Transcript.version`, and let dependent outputs become stale.
- Outputs derived from transcript content, such as subtitles, chapters, clip candidates, short clips, and transcript-level generated assets, must record the transcript version they were generated from.
- ASR outputs must be validated before persistence: non-empty segments, `startTime < endTime`, sorted timestamps, timestamps within media/audio duration, and non-empty text overall.
- `GeneratedAsset` stores generated media-level/transcript-level/chapter-level files, not rendered short clip source-of-truth files.
- Platform OAuth tokens must be encrypted. Never log raw tokens.

## Chaptering Direction

Current chaptering direction is not rule-based-only. Until a new dedicated chaptering spec exists, preserve the existing embedding plus LLM-constrained direction and keep changes compatible with current code patterns.

Target flow:

```text
TranscriptSegment[]
-> validate transcript
-> normalize text lightly
-> merge segments into 45-90s chapter blocks
-> generate embeddings for blocks
-> detect candidate boundaries from semantic shift and supporting signals
-> score/rank candidates
-> let LLM choose final chapter starts from candidate times only
-> let LLM generate title and one-sentence summary
-> validate and repair output
-> save VideoChapter rows with transcriptVersion and scores
```

Important rules:

- Do not let the LLM invent timestamps. Final chapter start times must be `0` or selected candidate boundary times.
- Compute `endTime` in code from the next chapter start; last chapter ends at media duration.
- Keep segmentation and title/summary generation as separate steps so each can be tested and debugged independently.
- Keep validation after every AI step: JSON shape, increasing timestamps, duration limits, max chapter count, non-empty title, media duration bounds, and transcript version match.
- Use fake embedding and LLM providers in default tests. Do not require network, model downloads, API keys, or GPUs for normal tests.
- The older rule-based worker implementation is a transitional fallback, not the target architecture. When migrating it, preserve deterministic validation and fallback behavior, but move the primary boundary signal toward embeddings plus LLM-constrained final selection.

## Prisma And Database

- Prisma schema: `backend/prisma/schema.prisma`.
- Generated Prisma client output: `backend/src/infrastructure/db/generated/prisma`.
- Do not manually edit generated Prisma files.
- Shared Prisma client: `backend/src/infrastructure/db/prisma.ts`.
- Feature repositories call Prisma. Controllers and services should not call Prisma directly.

## Object Storage

Object storage uses S3-compatible APIs, currently backed by MinIO in `infrastructure/docker-compose.yml`.

- S3 client code lives under `backend/src/infrastructure/s3`.
- Media upload business logic lives under `backend/src/modules/media`.
- Storage config is loaded from `config.s3` and `config.upload`.

## Imports

Use extensionless local imports in source files:

```ts
import { config } from "../../config/index";
```

The build script uses `tsc-alias --resolve-full-paths` so emitted ESM can run under Node.

## Testing

Use Jest and Supertest.

Test files should be named `*.test.ts` and usually live near the module or middleware they test.

Current verification commands:

```bash
cd backend
npm run build
npm run lint
npm test
```

Supertest opens local ephemeral servers. In sandboxed environments this may require elevated permission for loopback sockets.

Do not require a live database for route validation/auth-required tests. Use DB integration tests only when the behavior needs persistence.

## Local Infrastructure

Docker Compose lives in `infrastructure/docker-compose.yml`.

Common local services:

- PostgreSQL
- MinIO

Run infrastructure from repo root:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml up -d
```

Keep `infrastructure/.env.example` updated whenever `backend/src/config/env.ts` adds or changes env variables.

## Implementation Checklist

Before finishing backend changes:

- Follow the module/layer pattern.
- Keep schema files free of Express types.
- Use `validateRequest` for request validation.
- Use shared handler types from `src/types/express.ts`.
- Mount routes through `src/modules/index.ts`.
- Update tests for new or changed endpoints.
- Run `npm run build`, `npm run lint`, and relevant tests.
- Check that generated files, secrets, and unrelated changes are not accidentally included.
