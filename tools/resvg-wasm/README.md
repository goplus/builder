# Resvg WebAssembly binding

This tool exposes Resvg to browser JavaScript through wasm-bindgen. It rasterizes SVG strings to PNG while allowing callers to provide font buffers under explicit font-family aliases.

## Behavior

- `Renderer` maps each supplied font-family name to its corresponding font buffer, regardless of the font's internal family name.
- SVG font-family fallback order is preserved per text span, including fallback after variation selectors and ZWJ emoji clusters.
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

The tool currently pins `nighca/resvg` at a specific commit. Compared with the upstream main branch, this fork adds:

- The cluster-aware fallback merge from [linebender/resvg#1087](https://github.com/linebender/resvg/pull/1087). A fallback glyph can replace an entire grapheme cluster, so variation selectors and ZWJ emoji do not leave partial missing glyphs or prevent later fallback.
- The span-aware fallback context proposed by [linebender/resvg#1041](https://github.com/linebender/resvg/pull/1041). `FontResolver::select_fallback` receives a `FallbackRequest` containing the current span's `Font`, missing character, and previously used faces. A caller can therefore honor each span's own `font-family` sequence without conflating spans that share the same primary face.

The second change intentionally breaks the upstream `select_fallback` callback signature. This binding depends on that context to enforce its supplied font-family aliases as an ordered, per-span fallback list. Once these patches ship upstream, replace the fork with the corresponding upstream release or revision.
