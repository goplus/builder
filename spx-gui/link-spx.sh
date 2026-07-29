#!/bin/bash
set -euo pipefail
shopt -s nullglob

cd "$(dirname "$0")"

SPX_PACKAGE="@xgo-pkgs/spx"
SPX_PACKAGE_DIR="./node_modules/${SPX_PACKAGE}"

if [[ ! -d "${SPX_PACKAGE_DIR}" ]]; then
  echo "missing ${SPX_PACKAGE_DIR}" >&2
  echo "run pnpm install to install ${SPX_PACKAGE}" >&2
  exit 1
fi

SPX_VERSION="$(node -p "require('${SPX_PACKAGE_DIR}/package.json').version")"
SPX_TARGET_DIR="./public/spx_${SPX_VERSION}"

mkdir -p "$(dirname "${SPX_TARGET_DIR}")"
for link in ./public/spx_*; do
  [[ -L "${link}" ]] || continue
  [[ "$(readlink "${link}")" == "../node_modules/${SPX_PACKAGE}" ]] || continue
  rm -- "${link}"
done
rm -rf "${SPX_TARGET_DIR}"
ln -s "../node_modules/${SPX_PACKAGE}" "${SPX_TARGET_DIR}"
