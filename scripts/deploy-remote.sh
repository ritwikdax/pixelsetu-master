#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-pixelsetu-master}"
REMOTE_HOST="${REMOTE_HOST:-pixelsetu-deploy}"
REMOTE_PATH="${REMOTE_PATH:-/opt/pixelsetu-master}"
ENV_FILE="${ENV_FILE:-.env}"
ARCHIVE="${1:?Usage: deploy-remote.sh <archive.tar.gz>}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

if [[ ! -f "$ARCHIVE" ]]; then
  echo "Missing archive: ${ARCHIVE}" >&2
  exit 1
fi

# Load secrets locally — they are injected over SSH and never written to the server.
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a
export NODE_ENV="${NODE_ENV:-production}"

ENV_EXPORTS=""
while IFS= read -r _env_key; do
  _env_value="$(printenv "${_env_key}" 2>/dev/null || true)"
  if [[ -n "${_env_value}" ]]; then
    ENV_EXPORTS="${ENV_EXPORTS}export $(printf '%q=%q' "${_env_key}" "${_env_value}")"$'\n'
  fi
done < <(
  grep -E '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}" \
    | sed -E 's/^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=.*/\1/'
)
ENV_EXPORTS="${ENV_EXPORTS}export $(printf '%q=%q' NODE_ENV "${NODE_ENV}")"$'\n'

echo "Uploading ${ARCHIVE} to ${REMOTE_HOST}:${REMOTE_PATH}..."
ssh "${REMOTE_HOST}" "mkdir -p ${REMOTE_PATH}/releases"
scp "${ARCHIVE}" "${REMOTE_HOST}:${REMOTE_PATH}/releases/"

echo "Deploying ${APP_NAME} (env injected at runtime, not stored on server)..."

ssh "${REMOTE_HOST}" "bash -s" <<REMOTE
set -euo pipefail

APP_NAME="${APP_NAME}"
REMOTE_PATH="${REMOTE_PATH}"
ARCHIVE_NAME="$(basename "${ARCHIVE}")"

${ENV_EXPORTS}

cd "\${REMOTE_PATH}"

# Remove legacy .env if a previous deploy left one on disk.
rm -f "\${REMOTE_PATH}/.env"

rm -rf deploy
mkdir -p deploy
tar -xzf "releases/\${ARCHIVE_NAME}" -C deploy
rm -f "releases/\${ARCHIVE_NAME}"

cd "\${REMOTE_PATH}/deploy"
npm ci --omit=dev

pm2 delete "\${APP_NAME}" 2>/dev/null || true
pm2 start "dist/main.js" --name "\${APP_NAME}" --cwd "\${REMOTE_PATH}/deploy" --update-env
pm2 save

echo ""
echo "\${APP_NAME} is running on \${REMOTE_PATH}"
REMOTE
