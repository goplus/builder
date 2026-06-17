#!/usr/bin/env bash
set -euo pipefail

runner_temp="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
TMP_DIR="$(mktemp -d "${runner_temp%/}/xgo-deploy.XXXXXX")"
trap 'rm -rf "${TMP_DIR}"' EXIT

fail() {
  echo "::error::$1" >&2
  exit 1
}

set_output() {
  local name="$1"
  local value="$2"
  local delimiter

  delimiter="xgo_deploy_${name}_${RANDOM}_${RANDOM}"
  while [[ "${value}" == *"${delimiter}"* ]]; do
    delimiter="xgo_deploy_${name}_${RANDOM}_${RANDOM}"
  done

  {
    printf '%s<<%s\n' "${name}" "${delimiter}"
    printf '%s\n' "${value}"
    printf '%s\n' "${delimiter}"
  } >>"${GITHUB_OUTPUT}"
}

require_numeric_id() {
  local name="$1"
  local value="$2"
  [[ "${value}" =~ ^[0-9]+$ ]] || fail "${name} must be a numeric ID"
}

require_numeric_id_array() {
  local name="$1"
  local value="$2"
  jq -e 'all(.[]; type == "number")' <<<"${value}" >/dev/null || fail "${name} must contain only numeric IDs"
}

request_json() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local body_file
  local http_code

  body_file="$(mktemp "${TMP_DIR}/req.XXXXXX")"
  if [[ "${method}" == "GET" ]]; then
    if ! http_code="$(
      curl -sS -o "${body_file}" -w "%{http_code}" \
        -H "Authorization: Bearer ${INPUT_TOKEN}" \
        -H "Accept: application/json, text/plain, */*" \
        "${url}"
    )"; then
      http_code="000"
    fi
  else
    if ! http_code="$(
      curl -sS -o "${body_file}" -w "%{http_code}" \
        -X "${method}" \
        -H "Authorization: Bearer ${INPUT_TOKEN}" \
        -H "Accept: application/json, text/plain, */*" \
        -H "Content-Type: application/json" \
        --data-raw "${data}" \
        "${url}"
    )"; then
      http_code="000"
    fi
  fi

  if [[ ! "${http_code}" =~ ^2[0-9][0-9]$ ]]; then
    echo "Request failed: ${method} ${url}" >&2
    echo "HTTP status: ${http_code}" >&2
    cat "${body_file}" >&2
    fail "Request failed with HTTP status ${http_code}"
  fi

  cat "${body_file}"
}

upload_package() {
  local url="$1"
  local file="$2"
  local filename="$3"
  local body_file
  local http_code

  body_file="$(mktemp "${TMP_DIR}/upload.XXXXXX")"
  if ! http_code="$(
    curl -sS -o "${body_file}" -w "%{http_code}" \
      -X POST \
      -H "Authorization: Bearer ${INPUT_TOKEN}" \
      -H "Accept: application/json, text/plain, */*" \
      -F "files[]=@${file};type=application/x-gzip;filename=${filename}" \
      "${url}"
  )"; then
    http_code="000"
  fi

  if [[ ! "${http_code}" =~ ^2[0-9][0-9]$ ]]; then
    echo "Package upload failed: ${url}" >&2
    echo "HTTP status: ${http_code}" >&2
    cat "${body_file}" >&2
    fail "Package upload failed with HTTP status ${http_code}"
  fi

  cat "${body_file}"
}

fetch_deploy_detail() {
  local deploy_id="$1"
  request_json "GET" "${endpoint}/qpass/matrix-deploys/${deploy_id}"
}

print_deploy_logs() {
  local detail="$1"
  local log_ids

  log_ids="$(
    jq -r '
      .content.deploy_infos[]?
      .server_deliver_list_data[]?
      .log_url
      | select(type == "string" and . != "")
      | split("/")[-1]
    ' <<<"${detail}" | sort -u
  )"

  if [[ -z "${log_ids}" ]]; then
    return
  fi

  while IFS= read -r log_id; do
    [[ -z "${log_id}" ]] && continue
    require_numeric_id "log_id" "${log_id}"
    echo "::group::Deploy log ${log_id}"
    request_json "GET" "${endpoint}/qpass/matrix-deploy-logs/${log_id}" | jq -r '.content.msg // .message // .'
    echo "::endgroup::"
  done <<<"${log_ids}"
}

require_command() {
  local name="$1"
  command -v "${name}" >/dev/null 2>&1 || fail "Missing required command: ${name}"
}

require_command curl
require_command jq
require_command tar

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  echo "::add-mask::${INPUT_TOKEN}"
fi

endpoint="${INPUT_ENDPOINT%/}"
app_id="${INPUT_APP_ID}"
package_name="${INPUT_PACKAGE_NAME}"
package_dir="${INPUT_PACKAGE_DIR}"
timeout_seconds="${INPUT_TIMEOUT_SECONDS}"
poll_interval_seconds="${INPUT_POLL_INTERVAL_SECONDS}"
fail_on_deploy_failure="${INPUT_FAIL_ON_DEPLOY_FAILURE}"

[[ "${endpoint}" =~ ^https?:// ]] || fail "endpoint must start with http:// or https://"
[[ "${app_id}" =~ ^[0-9]+$ ]] || fail "app-id must be a number"
[[ "${package_name}" =~ ^[A-Za-z0-9._-]+$ ]] || fail "package-name may only contain letters, digits, dots, underscores, and hyphens"
[[ -d "${package_dir}" ]] || fail "package-dir does not exist: ${package_dir}"
[[ -n "$(find "${package_dir}" -mindepth 1 -print -quit)" ]] || fail "package-dir is empty: ${package_dir}"
[[ "${timeout_seconds}" =~ ^[0-9]+$ ]] || fail "timeout-seconds must be a number"
[[ "${poll_interval_seconds}" =~ ^[0-9]+$ ]] || fail "poll-interval-seconds must be a number"
[[ "${poll_interval_seconds}" -gt 0 ]] || fail "poll-interval-seconds must be greater than 0"
[[ "${fail_on_deploy_failure}" == "true" || "${fail_on_deploy_failure}" == "false" ]] || fail "fail-on-deploy-failure must be true or false"

version="$(TZ=Asia/Shanghai date +%Y.%m.%d.%H%M%S)"
package_filename="${package_name}_${version}.tar.gz"
archive_path="${TMP_DIR}/${package_filename}"
remark="Deploy ${package_name} ${version} from ${GITHUB_REPOSITORY}@${GITHUB_SHA}"

echo "Deploy endpoint: ${endpoint}"
echo "App ID: ${app_id}"
echo "Package name: ${package_name}"
echo "Package directory: ${package_dir}"
echo "Deploy version: ${version}"
echo "Package filename: ${package_filename}"
echo "Remark: ${remark}"

set_output "version" "${version}"

echo "::group::Create package archive"
tar -C "${package_dir}" -czf "${archive_path}" .
echo "Archive path: ${archive_path}"
echo "Archive size: $(du -h "${archive_path}" | awk '{print $1}')"
echo "::endgroup::"

echo "::group::Upload package"
upload_response="$(upload_package "${endpoint}/qpass/matrix-packages-upload" "${archive_path}" "${package_filename}")"
echo "${upload_response}" | jq .
upload_status="$(jq -r '.status // empty' <<<"${upload_response}")"
[[ "${upload_status}" == "success" ]] || fail "Package upload did not return success"
echo "::endgroup::"

echo "::group::Resolve package ID"
package_id=""
package_url=""
for attempt in {1..10}; do
  packages_response="$(request_json "GET" "${endpoint}/qpass/matrix-packages-all?name=${package_name}&app_id=${app_id}")"
  package_record="$(
    jq -c --arg version "${version}" '
      first(.content.matrix_packages[]? | select(.version == $version)) // empty
    ' <<<"${packages_response}"
  )"

  if [[ -n "${package_record}" ]]; then
    package_id="$(jq -r '.id' <<<"${package_record}")"
    package_url="$(jq -r '.download_url' <<<"${package_record}")"
    require_numeric_id "package_id" "${package_id}"
    break
  fi

  echo "Package is not visible yet. Attempt ${attempt}/10."
  sleep 3
done

[[ -n "${package_id}" ]] || fail "Could not find uploaded package version: ${version}"
echo "Package ID: ${package_id}"
echo "Package URL: ${package_url}"
set_output "package-id" "${package_id}"
set_output "package-url" "${package_url}"
echo "::endgroup::"

echo "::group::Resolve deploy units"
deploy_units_response="$(request_json "GET" "${endpoint}/qpass/matrix-deploy-units-all?app_id=${app_id}")"
deploy_unit_ids="$(
  jq -c '[.content.matrix_deploy_units[]?.id]' <<<"${deploy_units_response}"
)"
deploy_unit_count="$(jq -r 'length' <<<"${deploy_unit_ids}")"
require_numeric_id_array "deploy_unit_ids" "${deploy_unit_ids}"
[[ "${deploy_unit_count}" -gt 0 ]] || fail "No deploy units found for app-id: ${app_id}"
echo "Deploy unit IDs: ${deploy_unit_ids}"
echo "::endgroup::"

echo "::group::Create deployment"
# QPass expects this legacy misspelling.
create_payload="$(
  jq -n \
    --arg remark "${remark}" \
    --argjson app_id "${app_id}" \
    --argjson package_id "${package_id}" \
    --argjson deploy_unit_ids "${deploy_unit_ids}" \
    '{
      remark: $remark,
      app_id: $app_id,
      pack_type: "matrix",
      need_approve: "no",
      build_info: {
        package_id: $package_id
      },
      config_type: "yes",
      deploy_unit_ids: $deploy_unit_ids,
      deploy_server_ids: [],
      version: "",
      strategy_info: {
        strategy: "manul",
        deploy_batch_info: []
      },
      restart_app: "yes",
      bucketPackageInfo: ""
    }'
)"
create_response="$(request_json "POST" "${endpoint}/qpass/matrix-deploys-create" "${create_payload}")"
echo "${create_response}" | jq .
deploy_id="$(jq -r '.content.id // empty' <<<"${create_response}")"
require_numeric_id "deploy_id" "${deploy_id}"
echo "Deploy ID: ${deploy_id}"
set_output "deploy-id" "${deploy_id}"
echo "::endgroup::"

echo "::group::Resolve delivery IDs"
detail="$(fetch_deploy_detail "${deploy_id}")"
build_id="$(jq -r '.content.build_data.id // empty' <<<"${detail}")"
deliver_ids="$(
  jq -c '[.content.deploy_infos[]?.server_deliver_list_data[]?.id]' <<<"${detail}"
)"
deliver_count="$(jq -r 'length' <<<"${deliver_ids}")"
require_numeric_id "build_id" "${build_id}"
require_numeric_id_array "deliver_ids" "${deliver_ids}"
[[ "${deliver_count}" -gt 0 ]] || fail "Deploy detail did not include deliver IDs"
echo "Build ID: ${build_id}"
echo "Deliver IDs: ${deliver_ids}"
set_output "build-id" "${build_id}"
echo "::endgroup::"

echo "::group::Start delivery"
deliver_payload="$(
  jq -n \
    --argjson deliver_ids "${deliver_ids}" \
    --argjson build_id "${build_id}" \
    '{
      deliver_ids: $deliver_ids,
      build_ids: [$build_id],
      pack_ids: []
    }'
)"
deliver_response="$(request_json "POST" "${endpoint}/qpass/matrix-deploys-deliver" "${deliver_payload}")"
echo "${deliver_response}" | jq .
echo "::endgroup::"

echo "::group::Poll deployment"
deadline="$((SECONDS + timeout_seconds))"
while [[ "${SECONDS}" -lt "${deadline}" ]]; do
  detail="$(fetch_deploy_detail "${deploy_id}")"
  status="$(jq -r '.content.deploy_data.status // empty' <<<"${detail}")"
  echo "Deployment status: ${status}"
  jq -r '
    .content.deploy_infos[]?
    .server_deliver_list_data[]?
    | "- \(.server) \(.host_name): \(.status)"
  ' <<<"${detail}"

  if [[ "${status}" == "成功" ]]; then
    set_output "status" "${status}"
    echo "::endgroup::"
    exit 0
  fi

  if [[ "${status}" == "失败" ]]; then
    set_output "status" "${status}"
    print_deploy_logs "${detail}"
    echo "::endgroup::"
    if [[ "${fail_on_deploy_failure}" == "true" ]]; then
      fail "Deployment failed: ${deploy_id}"
    fi
    exit 0
  fi

  sleep "${poll_interval_seconds}"
done

set_output "status" "timeout"
echo "::endgroup::"
fail "Deployment polling timed out: ${deploy_id}"
