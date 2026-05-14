#!/bin/bash
set -euo pipefail

prototype_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${prototype_dir}/../.." && pwd)"
spx_gui_dir="${repo_root}/spx-gui"

install_go_if_needed() {
  if command -v go >/dev/null 2>&1; then
    go version
    return
  fi

  if ! command -v yum >/dev/null 2>&1; then
    echo "Go is required to prepare the Builder frontend wasm assets." >&2
    echo "Install Go locally or run this script in the Vercel build image." >&2
    exit 1
  fi

  yum -y install wget tar gzip unzip

  wget https://go.dev/dl/go1.25.8.linux-amd64.tar.gz
  tar -C /usr/local -xzf ./go1.25.8.linux-amd64.tar.gz
  /usr/local/go/bin/go version
}

install_go_if_needed

(
  cd "${spx_gui_dir}"
  npm install
)

(
  cd "${prototype_dir}"
  npm install
)
