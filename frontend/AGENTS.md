# Frontend Agent Guide

This file adds frontend-specific guidance for agents working under `frontend/`.
The root `../AGENTS.md` still applies. When rules overlap, use this file for
frontend implementation details.

## Product Direction

This frontend is a creator workspace for AI-assisted video/content work, not an
admin dashboard or marketing site.

Primary workspace flows:

- Upload and manage source media.
- Review and edit transcripts/captions.
- Review and regenerate chapters.
- Review clip candidates and rendered short clips.
- Prepare publishing drafts and platform-specific content.

Use `../docs/Plan.md`, `../docs/Editor.md`,
`../docs/Transcript_pipeline.md`, `../docs/Chaptering_pipeline.md`, and
`../docs/Long_to_short_pipeline.md` as product/domain references when building
Studio features.

## Code Organization

Keep route files thin. Files under `app/` should mostly compose feature
components and layouts.

Preferred ownership:

- `app/`: route entrypoints, route groups, route layouts, metadata where needed.
- `components/ui/`: installed or local shadcn-style primitives only.
- `components/layout/`: reusable app shell, sidebar, header, navigation config.
- `components/shared/`: small cross-feature UI helpers such as status badges,
  section headers, empty states, and common display primitives.
- `features/<feature>/`: feature-specific UI, typed mock data, local helpers,
  local state, and feature types.
- `features/<feature>/components/`: reusable feature components, not route pages.
- `features/<feature>/*.types.ts`: feature/domain types.
- `features/<feature>/*.data.ts` or `*.mock.ts`: typed mock data.
- `features/<feature>/*.utils.ts`: pure helpers only.
- `hooks/`: truly shared client hooks.
- `lib/`: small framework/shared utilities only.

Do not place large feature logic, mock arrays, or domain-specific state directly
inside route files.

## Studio Editor Structure

Studio editor code lives under `features/studio-editor/`.

Responsibilities:

- `studio.types.ts`: editor domain types and UI state types.
- `studio.data.ts`: typed mock editor project data and static panel config.
- `studio-editor-context.tsx`: editor-wide client state and actions.
- `components/studio-*.tsx`: editor shell pieces such as rail, topbar, canvas,
  timeline, inspector, and panel router.
- Tool-specific panels should be separate files, for example
  `captions-panel.tsx`, `chapters-panel.tsx`, and `clips-panel.tsx`.

Do not keep adding special cases to one giant panel file. If a tool needs its own
workflow, give it a dedicated component and keep shared shell/panel primitives
small.

## Mock Data And Future API Boundaries

Mock all data during MVP frontend work unless the user explicitly asks to wire
backend APIs.

Rules:

- Keep mocks typed and centralized near the feature.
- Do not inline large mock arrays in React components.
- Match planned backend/domain concepts where practical: media, transcripts,
  transcript segments, chapters, clip candidates, short clips, generated assets,
  processing jobs, social accounts, and publishing jobs.
- Keep media upload/original-file state separate from AI processing job state.
- Keep transcript versioning explicit. Derived outputs should carry the
  transcript version used to create them so stale UI can be shown later.
- Add data-access boundaries before real API wiring, such as feature query
  functions or hooks, so UI components do not need to be rewritten later.

## Avoid Patch-On-Patch Code

Prefer one clean implementation over repeated narrow patches.

Before editing:

- Read the current component, nearby feature files, and relevant docs.
- Identify the intended owner file for state, types, data, and UI.
- Remove or replace obsolete code paths when a new abstraction takes over.
- Check for unused props, unused state, unused types, dead mock data, and unused
  imports before finishing.

Do not leave compatibility code, fallback branches, old helpers, or unused
JavaScript "just in case". If behavior is intentionally temporary, keep it small
and name it as mock or placeholder.

## Asking And Proposals

The user understands basic frontend concepts but does not want to choose every
technical detail.

Ask the user when:

- The workflow, visual hierarchy, or interaction behavior is ambiguous.
- A change would alter navigation, routes, sidebar taxonomy, or major product
  structure.
- A new dependency is likely needed.
- There are meaningful tradeoffs in UX or implementation cost.
- A reference product/screenshot is needed to match an interaction precisely.

When proposing, make the recommendation concrete:

- State the recommended option first.
- Explain why it fits this codebase.
- Mention what files or modules would change.
- Ask for install approval when a new package is needed.

Do not silently add major dependencies or redesign product structure.

## Frontend Tech Stack Defaults

Current stack:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4
- shadcn-style UI primitives in `components/ui`
- Radix primitives through `radix-ui`
- lucide-react icons
- motion
- react-resizable-panels
- TanStack Query
- Zustand
- React Hook Form + Zod

Preferred library choices by problem:

- Resizable/collapsible editor panels: `react-resizable-panels`.
- Layout transitions, panel open/close polish, selected-item motion:
  `motion`.
- Large transcript/chapter/asset/clip lists: propose `@tanstack/react-virtual`
  before implementing virtualization.
- Sortable lists and drag/drop between editor regions: propose `dnd-kit`.
- Rich transcript editing beyond simple segment textareas: propose `Lexical`.
- Audio waveform, regions, zoom, or timeline waveform UI: propose
  `wavesurfer.js`.
- Canvas-like overlay editing with drag/resize/rotate handles: propose
  `react-konva` or `Moveable`, and explain the tradeoff before installing.
- Frame-accurate React video composition preview: consider `Remotion Player`
  only when the product actually needs frontend composition preview. Do not add
  it for ordinary video playback.

Use existing installed libraries first. When a recommended library is not
installed, stop and ask the user to install it or approve installation.

## UI Implementation Rules

- Keep UI dense, practical, and creator-workflow oriented.
- Avoid generic SaaS dashboard widgets unless analytics are explicitly requested.
- Keep Home as a creation hub, not a KPI dashboard.
- Use shared navigation config instead of duplicating labels/routes/icons.
- Use lucide icons for tool buttons when an icon exists.
- Use theme variables from `app/globals.css`; do not scatter hardcoded theme
  colors across feature components.
- Support light and dark mode unless a screen is intentionally fullscreen editor
  chrome.
- Keep fixed-format editor surfaces stable with explicit dimensions, min/max
  constraints, and overflow behavior.
- Ensure text does not overflow, overlap, or resize layout unexpectedly.

## Verification

Before finishing frontend changes, run from `frontend/`:

```bash
npm run lint
npm run build
```

If `npm run build` fails only because Next cannot fetch Google Fonts in a
sandboxed environment, rerun it with network permission. Report that clearly.

For editor interactions, manually verify the relevant route in the running dev
server and mention any unverified behavior.
