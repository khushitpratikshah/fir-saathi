#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/fir-saathi/app"
ENV_FILE="/etc/fir-saathi.env"
SERVICE_NAME="fir-saathi"
EXPECTED_SHA="${1:-}"

if [[ "$(id -un)" != "firsaathi" ]]; then
  echo "This deployment script must run as the firsaathi service user." >&2
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" || ! -r "$ENV_FILE" ]]; then
  echo "The FIR Saathi checkout or environment file is unavailable." >&2
  exit 1
fi

export NVM_DIR="/srv/fir-saathi/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 22 --silent

cd "$APP_DIR"
git fetch --prune origin main
git switch main
git pull --ff-only origin main

if [[ -n "$EXPECTED_SHA" ]] && ! git merge-base --is-ancestor "$EXPECTED_SHA" HEAD; then
  echo "The checked-out main branch does not contain the workflow revision." >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a
pnpm install --frozen-lockfile
pnpm check
pnpm build

sudo /bin/systemctl restart "$SERVICE_NAME"
sudo /bin/systemctl is-active --quiet "$SERVICE_NAME"
printf 'FIR Saathi deployed at %s\n' "$(git rev-parse --short HEAD)"
