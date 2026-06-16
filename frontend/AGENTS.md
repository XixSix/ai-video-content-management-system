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

- Keep the current direct `frontend/` layout. Do not migrate the app into a
  `src/` folder unless the user explicitly asks for that structural refactor.
- `app/`: route entrypoints, route groups, route layouts, metadata where needed.
  Route files should be adapters that import and render feature page/container
  components.
- `components/ui/`: installed or local shadcn-style primitives only. Do not put
  product-specific editor controls, workflow cards, or feature state here.
- `components/layout/`: reusable app shell, sidebar, header, navigation config,
  account menu, and active-route behavior.
- `components/shared/`: small cross-feature UI helpers such as status badges,
  section headers, empty states, and common display primitives.
- `features/<feature>/`: one product domain or workflow. It owns feature-specific
  UI, typed mock data, local helpers, local state, services, and feature types.
- `features/<feature>/components/`: reusable feature components, not route pages.
- `features/<feature>/data/`: larger typed mocks and fixtures when one data file
  gets too large.
- `features/<feature>/hooks/`: feature workflow, query, mutation, and state hooks.
- `features/<feature>/lib/`: pure feature helpers and calculations.
- `features/<feature>/pages/`: optional feature page containers used by thin app
  route adapters when a route needs meaningful composition.
- `features/<feature>/services/`: future API adapters for the feature.
- `features/<feature>/store/`: feature client state when context/reducer/store is
  needed.
- `features/<feature>/*.types.ts`: feature/domain types.
- `features/<feature>/*.data.ts` or `*.mock.ts`: small typed mock/config data.
- `features/<feature>/*.utils.ts`: small pure helpers only.
- `hooks/`: truly shared client hooks.
- `lib/`: small framework/shared utilities only.
- `public/`: files served directly by URL, including MVP mock video/audio/image
  assets.

Do not place large feature logic, mock arrays, or domain-specific state directly
inside route files.

If a route page starts to own layout state, queries, dialogs, or workflow
composition, move that code into `features/<feature>/pages/<FeaturePage>.tsx` or
a feature container component, and leave `app/**/page.tsx` as a thin adapter.

Dependency boundaries:

- `app` may import features, layout components, shared components, hooks, and
  utilities, but should not own business logic.
- `features/<feature>` may import shared code and its own internals. Avoid deep
  imports into multiple other features from one UI component.
- `components/shared`, `hooks`, and `lib` should not import feature-specific
  code. If shared code needs feature types or business rules, it likely belongs
  in that feature or in an explicit adapter.
- If one feature needs another feature's behavior, prefer a small public
  helper/hook from that feature, a screen-owned orchestration hook, or moving
  genuinely generic code into shared.
- Split large files by responsibility once they become hard to reason about. As
  a rule of thumb, a component above roughly 300-400 lines, or a file mixing
  rendering, state mutation, data shaping, and interaction math, should be split
  before adding more behavior.

## Subfeatures

A subfeature is a smaller workflow inside a parent feature. Use one when a
feature folder becomes crowded, files in a workflow change together, or the
folder name describes a product area instead of a technical category.

Use the lightweight pattern when the subfeature is mostly UI composition:

```text
features/<feature>/
├── components/
│   ├── <workflow-name>/
│   │   ├── WorkflowPanel.tsx
│   │   ├── WorkflowToolbar.tsx
│   │   └── workflow.helpers.ts
│   └── SharedFeatureCard.tsx
├── hooks/
├── lib/
└── <feature>.types.ts
```

In this pattern, subfeature folders live under `components/`. Parent-level
`hooks/`, `lib/`, `services/`, `data/`, and types still own shared feature logic.

Use the full subfeature pattern when the workflow has its own components, hooks,
pure helpers, local state, and several files:

```text
features/<feature>/
├── <workflow-name>/
│   ├── workflow-entry.tsx
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── data/
├── components/
├── hooks/
├── lib/
└── <feature>.types.ts
```

This is the preferred pattern for a major workflow such as Studio Timeline.

Subfeature rules:

- Do not introduce a top-level `features/<workflow-name>/` just because a folder
  is large. Promote to a top-level feature only when the workflow can stand as an
  independent product area with its own route ownership, data boundary, and
  little dependency on a parent feature.
- Do not introduce a generic `subfeatures/` directory unless a feature has
  several full subfeatures and the user approves that structural convention.
  Prefer the simplest clear owner first.
- Name subfeature folders in kebab-case with workflow names, for example
  `project-list`, `project-detail`, `caption-editor`, or `timeline`.
- Avoid vague names such as `misc`, `common`, `parts`, `new`, or `helpers`.
- Inside one parent feature, sibling subfeatures may import each other only when
  the relationship is intentional and easy to explain.
- If two subfeatures need the same component or helper, move it up to the parent
  feature's `components/` or `lib/`.
- If multiple top-level features need the same code, move it to shared code only
  when it is truly domain-neutral. Do not move feature business rules into shared
  folders for convenience.
- A full subfeature should have one obvious entry component or hook. Other code
  should hang below it by responsibility: `components/` for rendering, `hooks/`
  for interaction/state orchestration, `lib/` for pure helpers, `data/` for local
  mocks, and `services/` for API adapters.

## Studio Editor Structure

Studio editor code lives under `features/studio-editor/`.

Responsibilities:

- `studio.types.ts`: editor domain types and UI state types.
- `studio.data.ts`: small typed mock editor project data and static panel config.
  Split large fixtures into `data/` as the editor grows, for example
  `data/project.mock.ts`, `data/transcript.mock.ts`, `data/timeline.mock.ts`,
  and `data/assets.mock.ts`.
- `store/`: scoped Zustand editor state, domain action groups, selectors, and
  public hooks such as `useStudioProjectState`, `useStudioPlaybackState`, and
  `useStudioSelectionState`.
- `components/studio-*.tsx`: editor shell pieces such as rail, topbar, canvas,
  inspector, sidebar, and panel router.
- Tool-specific panels should be separate files, for example
  `captions-panel.tsx`, `chapters-panel.tsx`, and `clips-panel.tsx`.
- Timeline is a full Studio Editor subfeature, not a top-level
  `features/studio-timeline` feature while it depends on `StudioEditorProject`,
  editor store state, and editor selection state. Keep all timeline code under
  `features/studio-editor/timeline/`.
- Timeline structure:

```text
features/studio-editor/timeline/
├── studio-timeline.tsx  timeline entry component used by editor layout
├── constants.ts         timeline sizing, zoom, and ruler constants
├── components/          toolbar, ruler, tracks, segments, waveform UI
├── hooks/               timeline interaction and waveform hooks
└── lib/                 pure time, layout, display, and operation helpers
```

- Do not split one timeline behavior across both `components/timeline` and
  `timeline`. If code belongs to the timeline feature, keep it inside
  `features/studio-editor/timeline/`.

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
