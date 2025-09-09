#!/bin/bash

set -euo pipefail

# Environment variable configuration
MYSQL_VERSION="${MYSQL_VERSION:-5.7}"
MIGRATE_VERSION="${MIGRATE_VERSION:-4}"

# Internal configuration
MYSQL_CONTAINER_NAME="xbuilder-database-migration-test-$(date +%s)-$$"
MYSQL_PORT=$(shuf -i 13306-19999 -n 1)
MYSQL_HOST="127.0.0.1"
MYSQL_USER="xbuilder"
MYSQL_PASSWORD="xbuilder"
MYSQL_DATABASE="xbuilder"
MIGRATIONS_TABLE_NAME="schema_migration"
MIGRATIONS_DIR="spx-backend/internal/migration/migrations"
TMPDIR="$(mktemp -d)"
export TMPDIR
SNAPSHOTS_DIR=$(mktemp -d)

# Logging functions
log_error() {
	echo "[ERROR] $1"
}
log_error_and_exit() {
	log_error "$1"
	exit 1
}
log_info() {
	echo "[INFO] $1"
}
log_ok() {
	echo "[OK] $1"
}

# Set up cleanup trap
cleanup() {
	log_info "Cleaning up..."

	# Remove temporary container
	if docker ps -q -f name="${MYSQL_CONTAINER_NAME}" | grep -q .; then
		log_info "Stopping MySQL container: ${MYSQL_CONTAINER_NAME}"
		docker rm -f "${MYSQL_CONTAINER_NAME}" &>/dev/null || true
	fi

	# Remove temporary directory
	rm -rf "${TMPDIR}"
}
trap cleanup EXIT INT TERM

# Display initial information
log_info "MySQL version: ${MYSQL_VERSION}"
log_info "Migrate version: ${MIGRATE_VERSION}"

echo
echo "========================================================================="
echo

# Check if Docker is available
command -v docker &> /dev/null || log_error_and_exit "Docker not found. Please install Docker and try again."

# Pull necessary Docker images
log_info "Pulling necessary Docker images..."
docker pull --platform linux/amd64 mysql:${MYSQL_VERSION} >/dev/null || log_error_and_exit "Failed to pull MySQL Docker image"
docker pull --platform linux/amd64 migrate/migrate:${MIGRATE_VERSION} >/dev/null || log_error_and_exit "Failed to pull migrate Docker image"

echo
echo "========================================================================="
echo

# Start new MySQL container
log_info "Creating temporary MySQL container (port: ${MYSQL_PORT})"
docker run \
	-d \
	--platform linux/amd64 \
	--name "${MYSQL_CONTAINER_NAME}" \
	-e MYSQL_ROOT_PASSWORD=root \
	-e MYSQL_DATABASE="${MYSQL_DATABASE}" \
	-p "${MYSQL_PORT}:3306" \
	mysql:${MYSQL_VERSION} >/dev/null || log_error_and_exit "Failed to start MySQL container"
log_ok "Container started: ${MYSQL_CONTAINER_NAME}"

# Construct MySQL DSN
MYSQL_DSN="mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(${MYSQL_HOST}:${MYSQL_PORT})/${MYSQL_DATABASE}?charset=utf8mb4&parseTime=True&loc=UTC&multiStatements=true&x-migrations-table=${MIGRATIONS_TABLE_NAME}"

# MySQL command runner
run_mysql_command() {
	docker run --rm --platform linux/amd64 --network host mysql:${MYSQL_VERSION} \
		"$@" \
		-h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -uroot -proot
}

log_info "Waiting for MySQL to be ready..."
for i in {1..60}; do
	if run_mysql_command mysqladmin ping --silent 2>/dev/null; then
		log_ok "MySQL is ready"
		break
	fi

	if [[ $i -eq 60 ]]; then
		docker logs "${MYSQL_CONTAINER_NAME}" 2>/dev/null || true
		log_error_and_exit "MySQL failed to start within 120 seconds"
	fi

	if [[ $((i % 10)) -eq 0 ]]; then
		log_info "Still waiting... (${i}/60)"
	fi

	sleep 2
done

echo
echo "========================================================================="
echo

# Set up restricted user for production environment simulation
log_info "Creating restricted user for production simulation..."

# Create user
run_mysql_command mysql "${MYSQL_DATABASE}" -e "
	CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
" 2>/dev/null || log_error_and_exit "Failed to create user"

# Grant privileges matching production environment
run_mysql_command mysql "${MYSQL_DATABASE}" -e "
	GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';
" 2>/dev/null || log_error_and_exit "Failed to grant privileges"

# Flush privileges
run_mysql_command mysql "${MYSQL_DATABASE}" -e "
	FLUSH PRIVILEGES;
" 2>/dev/null || log_error_and_exit "Failed to flush privileges"

log_ok "User created with restricted privileges"

echo
echo "========================================================================="
echo

# Function to dump database schema
dump_schema() {
	local output_file="$1"
	local description="$2"

	log_info "Creating schema snapshot: ${description}"
	run_mysql_command mysqldump \
		--no-data \
		--skip-comments \
		--skip-add-locks \
		--skip-add-drop-table \
		--compact \
		--single-transaction \
		--ignore-table="${MYSQL_DATABASE}.${MIGRATIONS_TABLE_NAME}" \
		"${MYSQL_DATABASE}" > "${output_file}" 2>/dev/null || {
		# Handle empty database case
		touch "${output_file}"
	}

	# Normalize schema for comparison
	# Remove AUTO_INCREMENT values and sort for consistent comparison
	if [[ -s "${output_file}" ]]; then
		sed -i.bak 's/AUTO_INCREMENT=[0-9]*//' "${output_file}" && rm "${output_file}.bak"
		sort "${output_file}" -o "${output_file}"
	fi
}

# Function to check if database is empty (excluding migration tracking table)
is_database_empty() {
	local table_count
	table_count=$(run_mysql_command mysql -e "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name != '${MIGRATIONS_TABLE_NAME}'" -s -N 2>/dev/null || echo "0")
	[[ "${table_count}" -eq 0 ]]
}

# Function to get migration version from filename
get_version() {
	local filename="$1"
	echo "${filename}" | grep -oE '^[0-9]+' || echo "000"
}

# Function to compare schemas
compare_schemas() {
	local expected_file="$1"
	local actual_file="$2"
	local version="$3"

	if ! diff -u "${expected_file}" "${actual_file}" > "${SNAPSHOTS_DIR}/diff_${version}.txt"; then
		log_error "Schema mismatch detected at version ${version}"
		log_info "Expected schema: ${expected_file}"
		log_info "Actual schema: ${actual_file}"
		log_info "Diff saved to: ${SNAPSHOTS_DIR}/diff_${version}.txt"
		echo
		echo "Differences:"
		head -20 "${SNAPSHOTS_DIR}/diff_${version}.txt"
		return 1
	else
		log_ok "Schema matches perfectly for version ${version}"
		return 0
	fi
}

log_info "Phase 1: Validating UP migrations"

# Verify we start with an empty database
is_database_empty || log_error_and_exit "Database is not empty at start"

# Create initial empty schema snapshot
dump_schema "${SNAPSHOTS_DIR}/schema_000.sql" "Initial empty database"
log_ok "Confirmed database is empty"

# Get all UP migration files and sort by version
up_migrations=($(find "${MIGRATIONS_DIR}" -name "*.up.sql" | sort))

[[ ${#up_migrations[@]} -eq 0 ]] && log_error_and_exit "No UP migration files found in ${MIGRATIONS_DIR}"

log_info "Found ${#up_migrations[@]} UP migration files"

# Execute UP migrations
for migration_file in "${up_migrations[@]}"; do
	filename=$(basename "${migration_file}")
	version=$(get_version "${filename}")

	log_info "Executing UP migration: ${filename}"

	# Execute migration using Docker
	if docker run --rm -v "$(pwd)/${MIGRATIONS_DIR}:/migrations" --network host migrate/migrate:${MIGRATE_VERSION} -path /migrations -database "${MYSQL_DSN}" up 1; then
		log_ok "UP migration ${filename} executed successfully"
	else
		log_error_and_exit "UP migration ${filename} failed"
	fi

	# Create schema snapshot
	dump_schema "${SNAPSHOTS_DIR}/schema_${version}.sql" "After UP migration ${filename}"
done

log_ok "All UP migrations executed successfully"

echo
echo "========================================================================="
echo

log_info "Phase 2: Validating DOWN migrations"

# Get all DOWN migration files and sort by version (descending)
down_migrations=($(find "${MIGRATIONS_DIR}" -name "*.down.sql" | sort -r))

[[ ${#down_migrations[@]} -eq 0 ]] && log_error_and_exit "No DOWN migration files found in ${MIGRATIONS_DIR}"

log_info "Found ${#down_migrations[@]} DOWN migration files"

# Execute DOWN migrations and compare schemas
for migration_file in "${down_migrations[@]}"; do
	filename=$(basename "${migration_file}")
	version=$(get_version "${filename}")

	# Calculate expected version (previous version)
	expected_version=$(printf "%03d" $((10#${version} - 1)))

	log_info "Executing DOWN migration: ${filename}"

	# Execute migration using Docker
	if docker run --rm -v "$(pwd)/${MIGRATIONS_DIR}:/migrations" --network host migrate/migrate:${MIGRATE_VERSION} -path /migrations -database "${MYSQL_DSN}" down 1; then
		log_ok "DOWN migration ${filename} executed successfully"
	else
		log_error_and_exit "DOWN migration ${filename} failed"
	fi

	# Create current schema snapshot
	dump_schema "${SNAPSHOTS_DIR}/schema_after_down_${version}.sql" "After DOWN migration ${filename}"

	# Compare with expected schema
	expected_schema="${SNAPSHOTS_DIR}/schema_${expected_version}.sql"
	actual_schema="${SNAPSHOTS_DIR}/schema_after_down_${version}.sql"

	if [[ -f "${expected_schema}" ]]; then
		if compare_schemas "${expected_schema}" "${actual_schema}" "${version}"; then
			log_ok "Schema symmetry verified for migration ${version}"
		else
			log_error_and_exit "Schema symmetry FAILED for migration ${version}"
		fi
	else
		log_error_and_exit "Expected schema file not found: ${expected_schema}"
	fi
done

# Final check: ensure database is empty
if is_database_empty; then
	log_ok "Database is empty after all DOWN migrations"
else
	echo "Remaining tables:"
	run_mysql_command mysql -e "SELECT table_name FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name != '${MIGRATIONS_TABLE_NAME}'" -s -N "${MYSQL_DATABASE}" 2>/dev/null || true
	log_error_and_exit "Database is not empty after all DOWN migrations"
fi

echo
echo "========================================================================="
echo

log_ok "All migration validation tests passed"
log_ok "UP migrations execute without errors"
log_ok "DOWN migrations execute without errors"
log_ok "Migration symmetry is perfect"
log_ok "Database returns to empty state"

echo
echo "========================================================================="
echo
