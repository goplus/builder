# Prototype Full Frontend Sync Design

## Goal

Make `ui/prototype` a standalone offline prototype that structurally mirrors the current `spx-gui` frontend across all current pages and widgets.

The prototype should look and navigate like the frontend preview produced by `spx-gui`, with one intentional difference: all data and product state come from local deterministic mocks instead of real backend services.

## Source Of Truth

The sync source is the current local `spx-gui` project on branch `prototype`.

The implementation must follow `ui/prototype/AGENTS.md`:

- `ui/prototype` remains independently installable, runnable, buildable, and previewable.
- Prototype runtime and build must not import from `spx-gui`.
- Prototype must not call real backend services.
- Needed frontend structure should be recreated locally under `ui/prototype`.
- Production-only concerns are replaced with local mock APIs, fake data, or local UI feedback.

## Scope

The prototype must cover every current frontend route surface in `spx-gui/src/pages`:

- `404`
- community shell, home, explore, search, project detail
- user page and user child pages: overview, projects, likes, followers, following
- editor route
- tutorials index, course series, course start
- sign-in callback and token routes
- docs API route
- docs UI design route

The prototype must also cover the current widget entry surfaces in `spx-gui/src/widgets`:

- `spx-runner`
- `xgo-code-editor`

## Architecture

Use a page-first sync strategy. Each real frontend page gets a corresponding local prototype page file with the same route shape where practical. Components are copied or adapted only when they are needed by those pages or widgets.

The prototype keeps the same broad frontend stack and organization:

- Vite
- Vue 3
- Vue Router
- Tailwind CSS v4
- page/component/API-style boundaries
- local theme tokens and app styles

The prototype does not mirror the full production dependency graph. Instead, production infrastructure is replaced at clear local boundaries:

- HTTP APIs become local async mock functions.
- auth state becomes deterministic local signed-in state.
- cloud persistence becomes static project data and in-memory UI state.
- publishing, liking, following, search, and navigation use local data.
- editor, runner, docs, and code-editor surfaces keep their visual and interaction scaffolding without real LSP, cloud save, SSE, upload, or backend features.

## Route Design

`prototype/src/router.ts` should align with `spx-gui/src/router.ts` for route shape:

- `/`
- `/explore`
- `/search`
- `/user/:nameInput`
- `/user/:nameInput/projects`
- `/user/:nameInput/likes`
- `/user/:nameInput/followers`
- `/user/:nameInput/following`
- `/project/:ownerInput/:nameInput`
- `/editor`
- `/editor/:ownerNameInput/:projectNameInput/:inEditorPath*`
- `/tutorials`
- `/course/:courseSeriesIdInput/:courseIdInput/start`
- `/course-series/:courseSeriesIdInput`
- `/sign-in/callback`
- `/sign-in/token`
- `/share/:owner/:name`
- `/docs/api/:pathMatch(.*)?`
- `/docs/ui-design`
- fallback 404 route

Route helpers that affect page links should exist locally when prototype pages need them, but they must not depend on real stores or backend-resolved identities.

## Data And API Design

Local data lives under `prototype/src/data`.

Local API facades live under `prototype/src/apis`. They should resemble the production API modules only at the consumer boundary needed by prototype pages. They return promises where production code expects async data, but the returned values are deterministic local objects.

Required mock domains:

- users and signed-in user
- projects, local project files, project metadata, release history, likes, remixes
- community home sections
- explore and search results
- course series and courses
- docs API sample content
- widget sample inputs

No mock function may call remote URLs. Any action that would normally mutate server state should update local reactive state or show local feedback.

## Page And Component Design

Community pages should mirror the current real frontend structure more closely than the existing prototype. The user page should regain the child-route split used by `spx-gui`, rather than folding all tabs into one file.

The project page should be expanded from the current simplified page into a structure matching the real product surface: owner information, project preview/runner area, title and metadata, actions, description/instructions, remixed-from information when present, and release history when present.

Tutorial pages should align with the real frontend page/component split while keeping tutorial progression local.

The editor page should preserve the current offline editor preview intent but align its surrounding route and component boundaries with the real editor. Deep production editor functionality should remain mocked or static unless needed for visual parity.

Sign-in pages should render local prototype equivalents of the production callback/token screens and then route or message locally. They must not start real auth.

Docs pages should provide local static documentation/demo content that matches the production route surfaces and layout intent without calling external API documentation services.

Widgets should exist as local prototype entry surfaces. They should render representative UI and accept local sample data without depending on the production widget implementation.

## Validation

Extend `prototype/scripts/check-prototype.mjs` so the contract test checks:

- every route listed in this spec exists
- all page files listed in this spec exist under `prototype/src/pages`
- widget entry files exist under `prototype/src/widgets`
- user child page files exist separately
- no source file references `spx-gui`
- no source file uses `axios`
- no source file calls remote URLs through `fetch`
- required mock API/data domains exist

After implementation, run from `ui/prototype`:

```bash
npm run test:prototype
npm run build
```

For visual verification, run the local dev server and inspect representative routes:

- `/`
- `/explore`
- `/search`
- `/user/kiko`
- `/user/kiko/projects`
- `/project/kiko/niu-run`
- `/editor/kiko/niu-run`
- `/tutorials`
- `/course-series/getting-started`
- `/course/getting-started/move/start`
- `/sign-in/callback`
- `/sign-in/token`
- `/docs/api`
- `/docs/ui-design`
- a missing route for 404

## Non-Goals

This work does not implement real backend integration, real auth, real cloud save, real upload, real publishing, real AI streaming, real language server features, or a full production editor model.

This work does not modify `spx-gui` unless the user explicitly authorizes it.

This work does not replace the prototype with a static demo. The prototype remains a standalone Vue app with routeable pages and local interactions.
