#!/bin/bash
set -euo pipefail

prototype_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${prototype_dir}/../.." && pwd)"
spx_gui_dir="${repo_root}/spx-gui"

export PATH="/usr/local/go/bin:${PATH}"

(
  cd "${spx_gui_dir}"
  ./install-spx.sh
  ./build-wasm.sh
  ./build-tutorial-books.sh
)
