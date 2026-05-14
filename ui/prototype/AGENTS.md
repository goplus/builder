# AGENTS.md

This file guides AI agents working under `ui/prototype/`.

## Purpose

`ui/prototype/` is a standalone, design-driven UI preview workspace, usually generated from `.pen` files in `ui/pages/` and assets in `ui/images/`.

It is a runnable product prototype, not an isolated static demo. It should stay close to the real frontend in stack and presentation style, but it is not the real frontend.

## Core Contract

- `spx-gui/` is the real product frontend.
- `ui/prototype/` is a local preview sandbox.
- The prototype should resemble the real frontend in structure, theme shape, typography, and implementation style.
- The prototype must not depend on the real frontend at runtime, build time, or type-check time.

Stable rule:

- You may copy or adapt presentation-layer patterns from the real frontend.
- You must not import code, config, styles, fonts, routes, tokens, utilities, or components directly from `spx-gui/`.

If something is needed from the real frontend, copy the minimum local version into `ui/prototype/` and remove production-only concerns.

## Source Priority

When changing the prototype, use this order:

1. Design files and design assets decide what should be rendered.
2. Existing prototype files decide local conventions.
3. The real frontend is only a reference for structure, theme, naming, and visual implementation patterns.

## Maintenance Requests

When the user says they changed a Pencil file under `ui/pages/` or `ui/components/` and asks to update the prototype, treat that as a complete request. The user does not need to restate the workflow.

From that request, infer the target design surface, locate the corresponding real frontend route, page, component, or UI surface, update `ui/prototype/`, and validate the preview.

Example:

> I changed `/path/to/builder/ui/pages/spx/editor-sprite.pen`; update prototype.

This file is the canonical maintenance contract for `ui/prototype/`. Do not rely on a separate skill file for these rules.

## Boundaries

Agents must preserve all of the following:

- `ui/prototype/` stays installable, runnable, and buildable by itself.
- Runtime and build dependencies stay inside `ui/prototype/`, except shared static assets under `ui/images/`.
- Do not import from `../../spx-gui` or any other real frontend directory.
- Do not extend, merge, or proxy real frontend config.
- Do not modify `spx-gui/` or other non-`ui/` directories by default.
- Do not add business logic, network requests, auth flow, persistence, or real app state.
- Keep interactions local, minimal, and preview-oriented.
- Keep mock data local.

Forbidden shortcuts include:

- importing the real frontend's Vite config, router, token files, or components
- reading fonts from the real frontend instead of copying them locally
- using aliases that resolve into the real frontend project

## Alignment And Simplification

Keep these areas aligned with the real frontend when practical:

- Vite + Vue 3 + Vue Router + Tailwind CSS v4
- page/component/data/style directory split
- semantic token naming and UI-facing class style
- typography, spacing, radius, shadow, and color conventions
- `src/styles/app.css`, especially the `@theme inline` bridge and base presentation rules

At the same time, keep the prototype simpler than the real frontend:

- replace business state with static data or minimal local state
- replace real flows with a small local router
- replace product actions with no-op handlers or local feedback
- omit infrastructure and edge-case handling unless it changes the visual result

## Editing Rules

When iterating on the prototype:

1. Start from the design artifact that changed.
2. Map the changed Pencil file to the corresponding real frontend route, page, component, or UI surface.
3. Inspect the corresponding real frontend implementation before editing prototype code.
4. Reuse the same page structure, routing model, component boundaries, styling approach, and interaction logic where practical, while keeping all code local to `ui/prototype/`.
5. Ensure the target prototype surface exists. If it does not, initialize it from the current real frontend structure by copying or recreating only the minimum local presentational subset.
6. If an existing prototype surface has drifted from the real frontend organization, align the local structure first, then apply the design change.
7. Apply only the current design change. If only `tutorial.pen` changed, only override the tutorials surface. If only `editor-sprite.pen` changed, only override the editor sprite surface.
8. Keep other pages, routes, and features accessible and consistent with the local prototype's real-frontend-aligned behavior.
9. Add or adjust local prototype routing, aliases, and config only as needed to expose the affected surface. Never point those aliases or config entries at the real frontend project.
10. Reuse existing prototype components before adding abstractions.
11. Prefer pure presentational Vue components.
12. Prefer Tailwind utility classes.
13. Keep `src/styles/app.css` structurally aligned with the real frontend's `app.css`.
14. If new token families are needed, add local `--ui-*` variables first, then expose them through local `@theme inline` mapping.
15. If copying from the real frontend, copy the minimum presentational subset and strip production logic.
16. Write prototype-related changes only under `ui/` unless the user explicitly authorizes a broader scope.

## Long-Term Stability

These rules are more important than reducing duplication:

- Never reintroduce a direct dependency on the real frontend.
- Prefer local copies over shared imports for theme, style, asset, and config surfaces.
- Keep the prototype's public shape similar to the real frontend so later migration stays easy.
- Keep the prototype's implementation simpler so preview work stays cheap.
- If the prototype deliberately diverges from the real frontend, document that near the affected file or in `README.md`.

Sync direction:

1. Copy semantic token names and theme structure.
2. Copy base presentation rules.
3. Copy static assets locally when needed.
4. Recreate markup and styling locally.
5. Drop production-only logic.

Do not treat prototype code as the source of truth for production code.

## Validation

`ui/prototype` must be able to start a frontend preview environment from inside that directory. The preview should behave like Builder's existing frontend preview environment, with only the intended prototype surface changed.

After substantive changes:

- run `npm run build` inside `ui/prototype/`

When UI structure or styling changes, also do the following when possible:

- run the dev server from `ui/prototype/`
- open the preview in a browser
- verify the main route renders
- verify any local preview interaction still works
- verify the changed page is accessible
- verify important unchanged pages still load
- verify navigation, search, course-card navigation, project pages, and other key flows still work when relevant
- verify the changed page visually matches the latest Pencil design

Before finishing, confirm:

- no import points into `spx-gui/`
- no config references the real frontend
- the prototype still behaves as a standalone app

When reporting the result, include:

- which Pencil page or design surface was synced
- which real frontend files or structures were used as reference
- which `ui/` files changed
- which validation steps were run, and any remaining gaps

## Keep This File Updated

Keep this file and `README.md` aligned with reality.

Update this file when any of the following changes:

- the allowed relationship with the real frontend
- the validation flow
- the local prototype architecture
- the sync strategy for theme, asset, or config surfaces

If a change creates pressure to depend on the real frontend directly, document the local alternative here instead.
