#!/bin/bash
set -e

cd "$(dirname "$0")"

# Version of spx, keep in sync with the version in `.env`.
SPX_VERSION=2.0.0-pre.40
SPX_NAME="spx_${SPX_VERSION}"
SPX_FILE_NAME="${SPX_NAME}.zip"
SPX_FILE_URL="https://github.com/goplus/spx/releases/download/v${SPX_VERSION}/spx_web.zip"
SPX_TARGET_DIR="./public/${SPX_NAME}"

if [[ -d "${SPX_TARGET_DIR}" ]]; then
	exit 0
fi

wget -O "${SPX_FILE_NAME}" "${SPX_FILE_URL}"
unzip -o "${SPX_FILE_NAME}" -d "${SPX_TARGET_DIR}"
rm "${SPX_FILE_NAME}"
