# Vid Pilot Frontend

Frontend is the creator workspace for Vid Pilot: upload long-form media, generate transcripts, chapters, subtitles, short clips, voiceover assets, and prepare content for publishing.

This app uses Next.js App Router with a direct `frontend/` layout. Do not migrate the app into a `src/` folder unless that is an explicit refactor.

## Development

```bash
npm run dev
```

Open the local URL printed by Next.js.

Before finishing frontend changes, run:

```bash
npm run lint
npm run build
```

## High-Level Structure

```text
frontend/
├── app/                  # Next.js App Router routes and layouts
├── components/
│   ├── ui/               # shadcn-style primitives only
│   ├── layout/           # workspace shell, sidebar, header, nav config
│   ├── shared/           # small reusable domain-neutral display components
│   └── providers/        # app-level React providers
├── features/             # product domains and workflows
├── hooks/                # truly shared React hooks
├── lib/                  # small shared utilities and framework helpers
├── public/               # static files served directly by Next.js
├── scripts/              # frontend maintenance scripts
└── e2e/                  # Playwright end-to-end tests
```

## Folder Responsibilities

### `app/`

`app/` is the routing layer. Keep route files thin.

Put here:

- Route groups such as `(dashboard)`, `(auth)`, or `(public)`.
- `layout.tsx`, `page.tsx`, `loading.tsx`, and route metadata.
- Small adapters that render page containers from `features`.

Avoid putting here:

- Large UI components.
- Mock arrays.
- API calls.
- Editor state machines.
- Timeline, caption, media, or publishing workflow logic.

Preferred shape:

```tsx
import { StudioPage } from "@/features/studio-editor/pages/studio-page";

export default function Page() {
  return <StudioPage />;
}
```

### `components/ui/`

Owns shadcn-style UI primitives only.

Examples:

- `button.tsx`
- `card.tsx`
- `input.tsx`
- `sidebar.tsx`
- `dropdown-menu.tsx`
- `tooltip.tsx`

Do not put product-specific components here. Components such as media cards, transcript editors, publishing tables, upload panels, and studio tool panels belong in `features/`.

### `components/layout/`

Owns the shared workspace shell.

Examples:

- App sidebar.
- Dashboard header.
- Account menu.
- Theme toggle.
- Navigation config.
- Active route behavior.

Keep primary navigation centralized here:

```text
Home
Media Library
Studio
Text to Speech
Social Accounts
Publishing
Settings
```

Do not duplicate navigation labels, paths, or icons across feature files.

### `components/shared/`

Owns small reusable components that are domain-neutral.

Good examples:

- `section-header.tsx`
- `status-badge.tsx`
- `data-pagination.tsx`
- Empty states.
- Loading states.

If a component needs to understand media, transcripts, chapters, clips, publishing jobs, or social accounts, it probably belongs in that feature instead of `shared`.

### `components/providers/`

Owns app-level provider wrappers.

Examples:

- Query client provider.
- Theme provider.
- Toast or notification provider.

Keep feature-specific state providers inside the owning feature.

### `features/`

Owns product domains and workflows. Feature code should stay close to the domain it supports.

Recommended feature shape:

```text
features/<feature>/
├── pages/                # feature page containers used by app route adapters
├── components/           # feature-only UI
├── data/                 # typed mocks and static config
├── hooks/                # feature workflow/query/state hooks
├── lib/                  # pure feature helpers
├── services/             # API adapters for the feature
├── store/                # feature client state when needed
├── <feature>.types.ts    # domain and UI state types
├── <feature>.data.ts     # small typed mock/config data
└── <feature>.utils.ts    # small pure helpers
```

Use this when a feature grows:

- Move large route UI into `features/<feature>/pages/`.
- Move large mock arrays into `features/<feature>/data/`.
- Move calculations and business rules into `features/<feature>/lib/`.
- Move client state into `features/<feature>/store/`.
- Keep feature components focused on rendering and interaction.

### `features/home/`

Home is a creation hub, not an analytics dashboard.

It should help users quickly start workflows:

- Upload media.
- Open Studio.
- Generate clips.
- Create transcripts or chapters.
- Start Text to Speech.
- Review recent projects, assets, or jobs.

### `features/media-library/`

Owns uploaded source media and original media state.

Examples:

- Media lists.
- Media detail views.
- Upload state UI.
- Media metadata.
- Media API adapters.

AI processing state should belong to processing jobs or the feature workflow that owns it, not directly to source media status.

### `features/studio-editor/`

Owns the main editing workspace for transcripts, captions, chapters, media preview, timeline, assets, and export workflows.

Expected structure:

```text
features/studio-editor/
├── pages/
├── shell/                # topbar, rail, sidebar, editor shell pieces
├── canvas/               # preview sizing, media sync, layers, overlays
├── captions/             # captions panel, cue list, word editing
├── chapters/             # chapter panel and chapter editing UI
├── timeline/             # ruler, tracks, waveform, resize/move helpers
├── inspector/            # property panels and focused field controls
├── media-panel/          # project media panel and adapters
├── text-panel/           # text layer workflows
├── tool-panel/           # panel routing and generic tool panel shell
├── render-export/        # render/export flow, queries, service, types
├── store/                # scoped editor state, selectors, actions
├── data/                 # project, transcript, media, navigation mocks
├── lib/                  # selection, caption cues, aspect ratio, time helpers
└── studio.types.ts       # editor domain and UI state types
```

Keep full subfeatures such as canvas, captions, timeline, and inspector under `studio-editor/` while they depend on editor project state, selection state, or editor store state.

### `features/text-to-speech/`

Owns voiceover and generated voice asset workflows.

Examples:

- Script editor.
- Voice picker.
- Voice asset list.
- TTS generation state.
- TTS service adapters.

### `features/social-accounts/`

Owns platform account connection and OAuth status.

Examples:

- Platform connection cards.
- Connected account rows.
- OAuth callback handling.
- Social account store.
- Platform account service adapters.

Never log or expose raw OAuth tokens.

### `features/publishing/`

Owns publishing workflows.

Examples:

- Draft posts.
- Scheduled posts.
- Publish queue.
- Publishing history.
- Platform-specific publish state.

### `features/settings/`

Owns account, team, preferences, billing, and configuration placeholders.

Keep settings UI practical and grouped by user workflow.

### `hooks/`

Use only for hooks that are truly shared and not owned by one feature.

Good examples:

- `use-mobile.ts`
- `use-local-storage.ts`

Avoid placing feature hooks here. A hook such as `use-media-upload`, `use-transcript-editor`, or `use-platform-accounts` belongs in the owning feature.

### `lib/`

Use only for small shared utilities and framework helpers.

Good examples:

- `utils.ts` with `cn`.
- Generic formatting helpers.
- Shared client setup.

Do not put media, transcript, chaptering, publishing, or editor business rules here unless they are genuinely cross-feature and domain-neutral.

### `public/`

Stores files served directly by URL.

Examples:

- Mock media files.
- Thumbnails.
- Static images.
- Public placeholders.

Imported code assets can move into a feature-local `assets/` folder when that ownership becomes clearer.

### `e2e/`

Owns Playwright end-to-end tests for real user flows.

Use this for flows such as:

- Opening the workspace.
- Navigating the shell.
- Upload flow UI.
- Studio editor interactions.
- Publishing flow smoke tests.

### `scripts/`

Owns frontend maintenance scripts.

Keep scripts small, documented, and scoped to frontend concerns.

## Review Rules

- Keep `app/` thin.
- Keep product-specific code inside `features/`.
- Keep shadcn primitives inside `components/ui/`.
- Keep navigation config centralized in `components/layout/`.
- Keep mock data typed and close to the feature that uses it.
- Keep shared code genuinely shared and domain-neutral.
- Avoid deep cross-feature imports.
- Split large components before adding more behavior.
- Do not add dashboard analytics, new navigation items, or marketing sections unless the task asks for them.
- Support both light and dark mode through theme variables in `app/globals.css`.
