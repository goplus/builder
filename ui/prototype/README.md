# XBuilder Prototype

`ui/prototype` is the preview project for XBuilder product and UI changes. It is
a demo implementation, but not an isolated demo app: it runs on top of the
current real Builder frontend, follows the same frontend stack, and keeps the
real application routes and behavior available.

Prototype changes are driven by Pencil files under `ui/components` and
`ui/pages`. When a Pencil file changes, the corresponding product behavior,
page structure, or UI styling is reflected here using the current real frontend
code organization.

## Architecture

The prototype project reuses `spx-gui` as its runtime base:

- Vite config, env loading, API proxy, server headers, widgets, routing, and
  shared frontend behavior come from `spx-gui`.
- Vue, Vue Router, TailwindCSS utilities, component conventions, data fetching,
  and interaction patterns should match the real frontend implementation.
- Prototype files under `ui/prototype/src` override only the pages or components
  affected by the latest Pencil changes.
- Routes and components that are not overridden continue to resolve to the real
  `spx-gui/src` implementation.

This keeps the prototype useful for reviewing concrete UI/product changes while
preserving the behavior of the full XBuilder application.

## Change Policy

- Keep the prototype project fixed at `ui/prototype`.
- Make changes only under `ui/`.
- Do not build standalone static pages or duplicate an independent frontend
  stack.
- If the target page or component does not exist in `ui/prototype`, initialize it
  from the current real frontend structure before applying prototype changes.
- If an existing prototype file has drifted from the current real frontend
  structure, align the structure first, then apply the Pencil-driven change.
- Override only the affected page or component. For example, a change in
  `ui/pages/**/tutorial.pen` should not replace unrelated routes.

## Active Overrides

The current prototype setup overrides:

- `@/pages/tutorials/index.vue`
- `@/components/community/CommunityNavbar.vue`
- `@/components/community/CenteredWrapper.vue`
- `@/components/navbar/NavbarWrapper.vue`
- `@/pages/editor/index.vue`
- `@/components/editor/ProjectEditor.vue`
- `@/components/editor/sprite/SpriteEditor.vue`
- `@/components/editor/sprite/CostumesEditor.vue`
- `@/components/editor/sprite/AnimationEditor.vue`
- `@/components/tutorials/CourseSeriesItem.vue`
- `@/components/tutorials/TutorialsBanner.vue`
- `@/assets/wasm/*`, generated locally for the prototype runtime

All other routes and unresolved aliases continue to use the real `spx-gui`
implementation.

## Development

```bash
npm install --ignore-scripts
npm run dev -- --host 127.0.0.1 --port 5174
```

Open:

```text
http://127.0.0.1:5174/
```

If the requested port is already in use, Vite will choose the next available
port. Use the actual URL printed by Vite.

`npm run dev` and `npm run build` run `scripts/build-wasm.sh` first. The script
builds the local wasm assets required by the reused Builder frontend runtime and
writes them to `src/assets/wasm/`.

## Verification

After changing the prototype, run:

```bash
npm run build
```

Then start the preview server and verify the affected UI plus representative
real application routes:

- `/` loads the real XBuilder home page.
- `/tutorials` loads the prototype override when tutorials is the affected area.
- Navigation, search, course card navigation, and project/user pages remain
  usable.
- Console errors should be investigated. Backend 4xx responses from real API
  data should be distinguished from frontend runtime, routing, or override
  errors.
