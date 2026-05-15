#!/bin/bash
set -euo pipefail

prototype_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

(
  cd "${prototype_dir}"
  npm run build
)
