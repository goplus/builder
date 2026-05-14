# AGENTS.md

This file guides AI agents working under `ui/prototype/`.

## Purpose

`ui/prototype/` is the runnable Builder prototype preview workspace for UI design changes from `ui/pages/` and `ui/components/`.

It is not an isolated demo. It is a local overlay preview for the real Builder frontend:

- `spx-gui/` is the real product frontend and the source of technical truth.
- `ui/prototype/` is the design-change preview entrypoint.
- Prototype code should use the same frontend stack, routing model, styling approach, component boundaries, and interaction behavior as the real Builder frontend whenever practical.
- Prototype changes should override only the page, route, or component surface affected by the latest design change.
- Unchanged pages, routes, and key flows should continue to come from the real frontend preview surface and remain usable.

The goal is to make a Design PR reviewable as a working Builder preview with the intended local UI change applied, not as a separate static reproduction.

## Core Contract

Agents must preserve all of the following:

- Run commands from `ui/prototype/` for prototype work.
- Keep prototype-authored files under `ui/` unless the user explicitly authorizes a broader scope.
- Treat `spx-gui/` as read-only source and reference by default.
- It is allowed for `ui/prototype` runtime, build, type-check, Vite config, aliases, and local preview code to depend on `spx-gui` when that is required to keep the prototype aligned with the real Builder frontend.
- Local prototype files should be narrow overrides for changed design surfaces, not a fork of the whole frontend.
- Do not duplicate real frontend code into `ui/prototype` unless a local override is genuinely needed for the changed design surface.
- Do not add unrelated product behavior, network behavior, persistence, auth changes, or infrastructure changes unless required to keep the real preview usable.

Stable rule:

- Reuse the real frontend implementation by default.
- Override locally only where the current `.pen` or design change requires a visible or interactive difference.

## Source Priority

When changing the prototype, use this order:

1. The changed Pencil file or design asset decides what should be different.
2. The current real frontend implementation decides structure, routing, styling, and behavior.
3. Existing prototype files decide how local overrides are organized.

If these disagree, keep the real frontend behavior for unchanged surfaces and apply only the current design delta in `ui/prototype`.

## Maintenance Requests

When the user says they changed a Pencil file under `ui/pages/` or `ui/components/` and asks to update the prototype, treat that as a complete request. The user does not need to restate the workflow.

From that request:

1. Inspect the changed Pencil file through the appropriate design tooling.
2. Map it to the corresponding real frontend route, page, component, or UI surface.
3. Inspect the current real frontend implementation in `spx-gui/`.
4. Make the minimal local prototype override under `ui/prototype/`.
5. Validate that the preview still behaves like Builder's frontend with only that surface changed.

Example:

> I changed `/path/to/builder/ui/pages/spx/editor-sprite.pen`; update prototype.

This file is the canonical maintenance contract for `ui/prototype/`. Do not rely on a separate skill file for these rules.

## Editing Rules

When iterating on the prototype:

1. Start from the design artifact that changed.
2. Map the changed Pencil file to the real frontend route, page, component, or UI surface.
3. Inspect the corresponding real frontend implementation before editing prototype code.
4. If the target prototype surface does not exist, initialize only the needed local override based on the current real frontend structure.
5. If an existing prototype surface has drifted from the real frontend organization, align the local structure first, then apply the design change.
6. Apply only the current design change. If only `tutorial.pen` changed, only adjust the tutorials surface. If only `editor-sprite.pen` changed, only adjust the editor sprite surface.
7. Keep other pages, routes, navigation, search, course-card navigation, project pages, and key flows available through the real frontend preview environment when relevant.
8. Prefer importing or aliasing the real frontend implementation for unchanged surfaces instead of recreating local mock pages.
9. Prefer Tailwind utility classes and the same token/style conventions as the real frontend.
10. Keep local mock data only for surfaces that cannot reasonably use the real frontend data path in the preview.
11. Document any deliberate divergence near the affected file or in `README.md`.
12. Write prototype-related changes only under `ui/` unless the user explicitly authorizes a broader scope.

## Vercel Preview

`ui/prototype` Vercel preview must be treated as a Builder frontend overlay build, not as a standalone demo deployment.

Expected Vercel project setup:

- Root Directory: `ui/prototype`
- Install Command: `source ./vercel-install.sh`
- Build Command: `source ./vercel-build.sh`
- Output Directory: `dist`

The Vercel install strategy must prepare both the real frontend and the prototype workspace:

1. Install the Go toolchain needed by the real frontend wasm build when it is not already present.
2. Install `spx-gui` dependencies from `../../spx-gui`.
3. Install `ui/prototype` dependencies from the Vercel project root.

The Vercel build strategy must prepare real frontend generated assets before building the prototype:

1. Add the installed Go toolchain to `PATH`.
2. Run `npm run build` from `ui/prototype`.
3. Let the `prebuild` script run `./prepare-frontend.sh`, which installs SPX web assets, builds real frontend wasm assets, and builds tutorial books from `../../spx-gui`.

The output is the prototype preview artifact, but the environment must have the same generated frontend prerequisites as Builder's real Vercel preview.

If the prototype Vite config later changes to merge, extend, or wrap `spx-gui/vite.config.ts`, keep these Vercel scripts as the single install/build entrypoint and update this section at the same time.

## Validation

`ui/prototype` must be able to start a frontend preview environment from inside that directory. The preview should behave like Builder's existing frontend preview environment, with only the intended prototype surface changed.

After substantive changes:

- run `npm run build` inside `ui/prototype/`

When Vercel scripts or real frontend prerequisites change, also run what is practical locally:

- `./vercel-build.sh` if Go and the real frontend prerequisites are available
- otherwise, run the closest local verification and report the missing prerequisite

When UI structure or styling changes, also do the following when possible:

- run the dev server from `ui/prototype/`
- open the preview in a browser
- verify the main route renders
- verify the changed page is accessible
- verify important unchanged pages still load through the real frontend preview environment
- verify navigation, search, course-card navigation, project pages, and other key flows still work when relevant
- verify the changed page visually matches the latest Pencil design

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
- the Vercel install/build strategy
- the local prototype architecture
- the sync strategy for theme, asset, or config surfaces
