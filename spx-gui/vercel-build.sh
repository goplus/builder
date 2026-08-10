#!/bin/bash
set -e

export PATH=/usr/local/go/bin:$PATH

./build-wasm.sh
# Vercel can reuse dependencies across install/build phases, so do not rely on
# postinstall leaving the versioned public SPX link in the build workspace.
./link-spx.sh
# Vercel may select pnpm 9 by default, which ignores our required pnpm 11 setup.
corepack pnpm@11.9.0 run build
