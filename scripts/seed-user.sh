#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${BRIDGE_DB:-bridge.db}"
GO_BIN="go"

echo "bridge-app — user seed"
echo ""

if [ -z "${BRIDGE_SEED_PASS:-}" ]; then
  read -rsp "Password: " PASS
  echo ""
else
  PASS="$BRIDGE_SEED_PASS"
  echo "Using BRIDGE_SEED_PASS env"
fi

if [ -z "${1:-}" ]; then
  read -rp "Username [admin]: " USERNAME
  USERNAME="${USERNAME:-admin}"
else
  USERNAME="$1"
fi

"$GO_BIN" run ./scripts/seed/main.go --db "$DB_PATH" --user "$USERNAME" --pass "$PASS"
