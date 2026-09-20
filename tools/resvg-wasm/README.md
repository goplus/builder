# Resvg WebAssembly binding

This tool exposes Resvg to browser JavaScript through wasm-bindgen. It rasterizes SVG strings to PNG while allowing callers to provide font buffers under explicit font-family aliases.

## Behavior

- `Renderer` maps each supplied font-family name to its corresponding font buffer, regardless of the font's internal family name.
- SVG font-family fallback order is preserved, including fallback after variation selectors and ZWJ emoji clusters.
- `Renderer.render` takes a maximum output size and proportionally scales the rendered PNG to fit it. Callers should always supply a size appropriate for their memory budget.
- Rendering is synchronous. Callers that render many or large SVGs should schedule work to avoid blocking their UI.

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

`pkg/` and `target/` are generated and ignored.

Useful checks:

```bash
cargo check --target wasm32-unknown-unknown
cargo test
./build.sh
```

## Resvg dependency

The tool currently pins `nighca/resvg` at a specific commit. The fork carries the cluster-aware font-fallback patch from [linebender/resvg#1087](https://github.com/linebender/resvg/pull/1087), which is required for project-font sequences containing variation selectors or ZWJ emoji before a later fallback font. Once that patch ships in upstream Resvg, replace the fork with the corresponding upstream release or revision.
