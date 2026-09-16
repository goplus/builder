#!/bin/bash
set -e

export PATH=/usr/local/go/bin:$PATH

if [[ "${VERCEL_ENV:-}" == "preview" ]]; then
  export VITE_PREVIEW_DEFAULT_ROUTE="${VITE_PREVIEW_DEFAULT_ROUTE:-/editor/nighca/match3/sprites/Board/code}"
fi

./build-wasm.sh
# Vercel can reuse dependencies across install/build phases, so do not rely on
# postinstall leaving the versioned public SPX link in the build workspace.
./link-spx.sh
# The install and build phases may use different Vercel environments.
corepack enable
corepack install --global pnpm@11.9.0
pnpm run build
