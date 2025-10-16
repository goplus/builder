#!/bin/bash
set -e

# https://go.dev/dl/go1.23.4.darwin-arm64.tar.gz
GO_VERSION=1.23.4
GO_PLATFORM=darwin-arm64
GO_TAR_FILE="go${GO_VERSION}.${GO_PLATFORM}.tar.gz"
GO_TAR_URL="https://go.dev/dl/${GO_TAR_FILE}"
GO_INSTALL_DIR="./toolchain/"

wget -O "${GO_TAR_FILE}" "${GO_TAR_URL}"
tar -C "${GO_INSTALL_DIR}" -xzf "${GO_TAR_FILE}"
rm "${GO_TAR_FILE}"