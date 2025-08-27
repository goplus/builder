#!/bin/bash
set -e

# Version of spx, keep in sync with the version in `.env`.
SPX_VERSION=2.0.0-pre.7
SPX_NAME="spx_${SPX_VERSION}"
SPX_FILE_NAME="${SPX_NAME}.zip"
SPX_FILE_URL="https://github.com/goplus/spx/releases/download/v${SPX_VERSION}/spx_web.zip"

wget -O "${SPX_FILE_NAME}" "${SPX_FILE_URL}"
unzip -o "${SPX_FILE_NAME}" -d "./public/${SPX_NAME}"
rm "${SPX_FILE_NAME}"
