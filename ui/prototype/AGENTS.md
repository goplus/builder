# AGENTS.md

This file guides AI agents working under `ui/prototype/`.

## Purpose

`ui/prototype/` is a standalone, runnable XBuilder frontend prototype. It exists for Design PR work: product behavior, page structure, visual design, and basic interactions should be experienced here before production logic is implemented in `spx-gui/`.

The prototype must look and behave like the current Builder frontend, but it must be disconnected from the server. Data shown in the prototype is local fake data.

## Core Contract

- `spx-gui/` is the real product frontend and the reference implementation.
- `ui/prototype/` is an independent frontend app with its own install, dev, build, and preview flow.
- Prototype code must follow the real frontend's stack and organization where practical: Vite, Vue 3, Vue Router, Tailwind CSS v4, page/component/API-style boundaries, local theme tokens, and local app styles.
- Runtime, build, and typecheck must not depend on `spx-gui/`.
- The prototype must not call real backend services.

Stable rule:

- Inspect the current real frontend implementation before changing the corresponding prototype surface.
- Recreate the needed structure locally under `ui/prototype/`.
- Use local mock APIs and fake data instead of real network calls.
- Do not import code, config, styles, fonts, routes, tokens, utilities, or components directly from `spx-gui/`.

If something is needed from the real frontend, copy or adapt the minimum local presentation-layer subset into `ui/prototype/` and remove production-only concerns.

## Source Priority

When changing the prototype, use this order:

1. The changed Pencil design file or design asset decides the intended UI.
2. The current real frontend decides the page structure, route shape, component boundaries, styling approach, and interaction model.
3. Existing prototype files decide local conventions.

Do not invent an unrelated demo architecture when a matching real frontend surface exists.

## Required Workflow

1. Start from the real frontend.
   - Inspect the corresponding implementation in the current Builder frontend before editing prototype code.
   - Reuse the same route model, page/component split, style approach, and interaction logic where practical.

2. Ensure the target prototype surface exists.
   - If `ui/prototype` does not have the changed page or UI, initialize it from the current real frontend structure.
   - If it exists but has drifted from the real frontend organization, align the structure first, then apply the design change.

3. Apply only the current design change.
   - Sync the latest relevant Pencil page change into `ui/prototype`.
   - If only one page changed, only override that page or component surface.
   - Other pages, routes, and features must remain accessible and usable through local mock behavior.

4. Keep the prototype offline.
   - Replace server APIs with local `src/apis/*` mock modules.
   - Replace auth, persistence, permission, and backend state with deterministic local state.
   - Keep interactions local and preview-oriented.

5. Keep edits scoped.
   - Write prototype-related changes under `ui/` unless the user explicitly authorizes broader scope.
   - Do not modify `spx-gui/` by default.

## Boundaries

Agents must preserve all of the following:

- `ui/prototype/` stays installable, runnable, and buildable by itself.
- Runtime and build dependencies stay inside `ui/prototype/`, except shared static assets under `ui/images/`.
- Do not import from `../../spx-gui` or any other real frontend directory.
- Do not extend, merge, or proxy real frontend config.
- Do not add real network requests, real auth flow, real persistence, or real app state.
- Keep mock data local.

Forbidden shortcuts include:

- importing the real frontend's Vite config, router, token files, or components
- reading fonts from the real frontend instead of copying them locally
- using aliases that resolve into the real frontend project
- adding `fetch`, `axios`, or backend client calls for prototype data
- replacing the app with a single isolated static demo page

## Alignment And Simplification

Keep these areas aligned with the real frontend when practical:

- Vite + Vue 3 + Vue Router + Tailwind CSS v4
- route names and URL shape for community, search, tutorials, project, and editor surfaces
- page/component/API-style directory split
- semantic token naming and UI-facing class style
- typography, spacing, radius, shadow, and color conventions
- `src/styles/app.css`, especially the `@theme inline` bridge and base presentation rules

At the same time, keep the prototype simpler than the real frontend:

- replace business state with static data or minimal local state
- replace real APIs with local functions returning mock data
- replace product actions with local feedback
- omit infrastructure and edge-case handling unless it changes the visual result

## Editing Rules

When iterating on the prototype:

1. Start from the design artifact that changed.
2. Inspect the matching real frontend files.
3. Reuse existing prototype components before adding abstractions.
4. Prefer pure presentational Vue components.
5. Prefer Tailwind utility classes.
6. Keep `src/styles/app.css` structurally aligned with the real frontend's `app.css`.
7. If new token families are needed, add local `--ui-*` variables first, then expose them through local `@theme inline` mapping.
8. If copying from the real frontend, copy the minimum presentational subset and strip production logic.

## Validation

After substantive changes, run from `ui/prototype/`:

```bash
npm run test:prototype
npm run build
```

When UI structure or styling changes, also:

- run the dev server from `ui/prototype/`
- open the preview in a browser
- verify the main route renders
- verify changed pages are accessible
- verify important unchanged pages still load
- verify navigation, search, course-card navigation, project pages, and editor preview flows when relevant

Before finishing, confirm:

- no import points into `spx-gui/`
- no config references the real frontend
- no real backend calls exist
- the prototype still behaves as a standalone offline app

## Keep This File Updated

Keep this file and `README.md` aligned with reality.

Update this file when any of the following changes:

- the allowed relationship with the real frontend
- the validation flow
- the local prototype architecture
- the mock API/data strategy
- the sync strategy for theme, asset, or config surfaces

If a change creates pressure to depend on the real frontend directly, document the local alternative here instead.
