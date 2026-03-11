#!/bin/bash
set -e

cd "$(dirname "$0")"

# Keep this version in sync with `VITE_SPX_VERSION` in `.env`.
SPX_VERSION="2.0.0-pre.46.0.20260311090023-f1d975cfeca5"

SPX_NAME="spx_${SPX_VERSION}"
SPX_RELEASE_URL="https://github.com/goplus/spx/releases/download/v${SPX_VERSION}/spx_web.zip"
SPX_TARGET_DIR="./public/${SPX_NAME}"
SPX_STAGING_DIR="./public/.${SPX_NAME}.tmp"
SPX_ZIP_PATH="${SPX_STAGING_DIR}/spx_web.zip"

if [[ -d "${SPX_TARGET_DIR}" ]]; then
  exit 0
fi

trap 'rm -rf "${SPX_STAGING_DIR}"' EXIT

rm -rf "${SPX_STAGING_DIR}"
mkdir -p "${SPX_STAGING_DIR}"

if wget --spider --quiet "${SPX_RELEASE_URL}"; then
  wget -O "${SPX_ZIP_PATH}" "${SPX_RELEASE_URL}"
else
  ghcr_token="$(wget -qO- "https://ghcr.io/token?service=ghcr.io&scope=repository:goplus/spx:pull" | awk -F'"' '/"token":/{print $4}')"
  if [[ -z "${ghcr_token}" ]]; then
    echo "failed to get GHCR token for goplus/spx" >&2
    exit 1
  fi

  blob_digest="$(wget -qO- \
      --header="Authorization: Bearer ${ghcr_token}" \
      --header='Accept: application/vnd.oci.image.manifest.v1+json, application/vnd.oci.artifact.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json' \
      "https://ghcr.io/v2/goplus/spx/manifests/web-zip-${SPX_VERSION}" \
      | tr -d '[:space:]' \
      | sed -n 's/.*"mediaType":"application\/zip"[^}]*"digest":"\([^"]*\)".*/\1/p')"
  if [[ -z "${blob_digest}" ]]; then
    echo "failed to resolve OCI blob digest for ghcr.io/goplus/spx:web-zip-${SPX_VERSION}" >&2
    exit 1
  fi

  wget -O "${SPX_ZIP_PATH}" --header="Authorization: Bearer ${ghcr_token}" "https://ghcr.io/v2/goplus/spx/blobs/${blob_digest}"
fi

unzip -o "${SPX_ZIP_PATH}" -d "${SPX_STAGING_DIR}"
rm -f "${SPX_ZIP_PATH}"
mv "${SPX_STAGING_DIR}" "${SPX_TARGET_DIR}"
