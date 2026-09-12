#!/bin/bash
set -e

cd "$(dirname "$0")"

wasm_bindgen_version="0.2.126"
installed_wasm_bindgen_version="$(wasm-bindgen --version 2>/dev/null || true)"
if [[ "$installed_wasm_bindgen_version" != "wasm-bindgen $wasm_bindgen_version" ]]; then
  cargo install wasm-bindgen-cli --version "$wasm_bindgen_version" --locked
fi

cargo build --release --target wasm32-unknown-unknown
wasm-bindgen --target web --out-dir pkg --out-name resvg target/wasm32-unknown-unknown/release/resvg_wasm.wasm
