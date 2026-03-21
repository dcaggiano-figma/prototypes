#!/usr/bin/env bash
set -euo pipefail

# Thin bootstrap that pulls the latest update.sh from origin/main and runs it.
# This ensures the update logic is always current, even on old branches.
#
# Usage: .claude/scripts/updater.sh [--dry-run]

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "Fetching latest from origin..."
git fetch origin main --quiet

# Extract the latest update.sh from origin/main into a temp file
UPDATE_SCRIPT=$(mktemp)
trap 'rm -f "$UPDATE_SCRIPT"' EXIT

if ! git show origin/main:.claude/scripts/update.sh > "$UPDATE_SCRIPT" 2>/dev/null; then
  echo "Error: .claude/scripts/update.sh not found on origin/main"
  echo "Falling back to local copy..."
  exec bash "$REPO_ROOT/.claude/scripts/update.sh" "$@"
fi

exec bash "$UPDATE_SCRIPT" "$@"
