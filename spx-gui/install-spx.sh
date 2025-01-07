#!/bin/bash
set -e

# Version of spx, keep in sync with the version in `.env`.
SPX_VERSION=2.0.1
SPX_NAME=spx_${SPX_VERSION}
SPX_FILE_NAME=${SPX_NAME}.zip
SPX_FILE_URL=https://github.com/realdream-ai/gdspx/releases/download/spx${SPX_VERSION}/spx${SPX_VERSION}_web.zip

wget -O ${SPX_FILE_NAME} ${SPX_FILE_URL}
unzip ${SPX_FILE_NAME} -d ./public/${SPX_NAME}
rm ${SPX_FILE_NAME}
