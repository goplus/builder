# Resvg WebAssembly renderer

This tool builds the WebAssembly SVG renderer used by the XBuilder editor for SVG images that need project-font rendering. It is an editor-preview adapter only: project export and the SPX runtime continue to consume the original SVG files.

The wrapper accepts project font family names and font buffers. It maps those names directly to the loaded faces, applies the SVG font-family fallback order, and rasterizes the SVG to PNG. This lets canvas-based editor consumers render project fonts without embedding large font files in every SVG.

## Build

Requirements:

- Rust `1.88` or newer with the `wasm32-unknown-unknown` target;
- `wasm-bindgen-cli 0.2.126`.

Run:

```bash
./build.sh
```

The script installs the required `wasm-bindgen-cli` version when necessary, then writes these generated files to `pkg/`:

- `resvg.js`
- `resvg.d.ts`
- `resvg_bg.wasm`

`pkg/` and `target/` are generated and ignored. `spx-gui/build-wasm.sh` invokes this tool and copies the three files into `spx-gui/src/assets/wasm/` for Vite to bundle.

Useful checks:

```bash
cargo check --target wasm32-unknown-unknown
cargo test
./build.sh
```

## Resvg dependency

The tool currently pins `nighca/resvg` at a specific commit. The fork carries the cluster-aware font-fallback patch from [linebender/resvg#1087](https://github.com/linebender/resvg/pull/1087), which is required for project-font sequences containing variation selectors or ZWJ emoji before a later fallback font. Once that patch ships in upstream Resvg, replace the fork with the corresponding upstream release or revision.
