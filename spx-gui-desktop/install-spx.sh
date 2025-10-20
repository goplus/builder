#!/bin/bash
set -e

SPX_VERSION=2.0.0-pre.29
SPX_NAME="spx_${SPX_VERSION}"
SPX_FILE_NAME="${SPX_NAME}.zip"
SPX_PLATFORM="darwin-arm64"
SPX_FILE_URL="https://github.com/goplus/spx/releases/download/v${SPX_VERSION}/spx-${SPX_PLATFORM}.zip"
SPX_DIR="./spx"

rm -rf "${SPX_DIR}"
wget -O "${SPX_FILE_NAME}" "${SPX_FILE_URL}"
unzip -o "${SPX_FILE_NAME}" -d "${SPX_DIR}"
rm "${SPX_FILE_NAME}"

# TODO: chmod u+w
chmod -R u+w "${SPX_DIR}"
