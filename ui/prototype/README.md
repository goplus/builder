# XBuilder Prototype Preview

`ui/prototype` is the runnable Builder prototype preview workspace for design changes in `ui/pages` and `ui/components`.

It should behave like the real Builder frontend preview with only the current prototype surface overridden. It is not meant to be a standalone static demo.

## Run Locally

Run commands from this directory:

```bash
cd /Users/zengqingqing/workspace/builder/ui/prototype
npm run vercel:install
npm run dev -- --host 127.0.0.1 --port 5174
```

`npm run dev` runs the real frontend preparation step first, matching `spx-gui` dev behavior: install SPX web assets, build wasm assets, and build tutorial books.

Preview URL:

```text
http://127.0.0.1:5174/
```

## Current Scope

- Routes, navigation, search, tutorial pages, project pages, and editor entry points come from the real `spx-gui` frontend.
- The current prototype override replaces only `spx-gui/src/components/ui/block-items/UIEditorSpriteItem.vue`.
- Prototype-authored overrides live under `ui/prototype/src/overrides`
- Shared design assets may be read from `ui/images`
- Real frontend structure, route behavior, styling conventions, and generated prerequisites should be taken from `spx-gui`

## Vercel

The Vercel preview for this directory should be configured as a Builder frontend overlay preview:

- Root Directory: `ui/prototype`
- Install Command: `source ./vercel-install.sh`
- Build Command: `source ./vercel-build.sh`
- Output Directory: `dist`

The install script prepares both sides of the preview:

- installs the Go toolchain when needed for the Builder wasm build
- installs dependencies in `../../spx-gui`
- installs dependencies in `ui/prototype`

The build script prepares real frontend generated assets before building the prototype:

- runs `npm run build` in `ui/prototype`
- relies on the `prebuild` step to install SPX web assets, build wasm assets, and build tutorial books first

This keeps Vercel aligned with Builder's real frontend prerequisites while still emitting the prototype preview from `ui/prototype/dist`.

## Maintenance

See `AGENTS.md` for the full prototype maintenance contract.
