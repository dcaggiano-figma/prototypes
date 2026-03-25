#!/usr/bin/env bash
set -euo pipefail

# Tests for the update_figma_versions function in update.sh.
#
# Uses fixture data and a mock npm command to validate behavior without
# hitting the network.
#
# Usage: bash .claude/scripts/update-figma-versions.test.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source just the function from update.sh without running the full script
__UPDATE_SH_SOURCED=true source "$SCRIPT_DIR/update.sh"

PASS=0
FAIL=0
ERRORS=()

# --- Helpers ---

setup_fixtures() {
  local dir="$1"

  cat > "$dir/pnpm-workspace.yaml" << 'YAML'
packages:
  - templates/*
  - apps/*
  - packages/*

catalog:
  '@figma/fpl-cli': 0.6.1
  '@figma/fpl-components': 0.6.0
  '@figma/fpl-icons': 0.6.0
  '@figma/fpl-tokens': 0.6.0
  '@figma/ppg-ai': ^1.9.0
  '@figma/ppg-dev-tools': ^1.9.0
  '@figma/ppg-eslint-config': ^1.9.0
  '@figma/ppg-vite-config': ^1.9.0
  motion: 12.34.5
YAML

  cat > "$dir/package.json" << 'JSON'
{
  "name": "test-project",
  "pnpm": {
    "overrides": {
      "@figma/fpl-components": "0.6.0",
      "@figma/fpl-tokens": "0.6.0",
      "@figma/fpl-icons": "0.6.0"
    }
  }
}
JSON
}

create_mock_npm() {
  local mock_script="$1"
  shift
  cat > "$mock_script" << 'HEADER'
#!/usr/bin/env bash
PKG="$1"
case "$PKG" in
HEADER

  while [[ $# -ge 2 ]]; do
    local pkg="$1" ver="$2"
    shift 2
    echo "  \"$pkg\") echo \"$ver\" ;;" >> "$mock_script"
  done

  cat >> "$mock_script" << 'FOOTER'
  *) echo "" ;;
esac
FOOTER

  chmod +x "$mock_script"
}

create_mock_all_upgraded() {
  create_mock_npm "$1" \
    "@figma/fpl-cli" "0.7.0" \
    "@figma/fpl-components" "0.7.0" \
    "@figma/fpl-icons" "0.7.0" \
    "@figma/fpl-tokens" "0.7.0" \
    "@figma/ppg-ai" "1.10.0" \
    "@figma/ppg-dev-tools" "1.10.0" \
    "@figma/ppg-eslint-config" "1.10.0" \
    "@figma/ppg-vite-config" "1.10.0"
}

create_mock_already_latest() {
  create_mock_npm "$1" \
    "@figma/fpl-cli" "0.6.1" \
    "@figma/fpl-components" "0.6.0" \
    "@figma/fpl-icons" "0.6.0" \
    "@figma/fpl-tokens" "0.6.0" \
    "@figma/ppg-ai" "1.9.0" \
    "@figma/ppg-dev-tools" "1.9.0" \
    "@figma/ppg-eslint-config" "1.9.0" \
    "@figma/ppg-vite-config" "1.9.0"
}

assert_contains() {
  local file="$1" expected="$2" msg="$3"
  if grep -qF "$expected" "$file"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+=("FAIL: $msg — expected '$expected' in $file")
  fi
}

assert_file_unchanged() {
  local original="$1" current="$2" msg="$3"
  if diff -q "$original" "$current" > /dev/null 2>&1; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+=("FAIL: $msg — file was modified when it should not have been")
  fi
}

# --- Test 1: Catalog and overrides are updated correctly ---

test_versions_updated() {
  local tmpdir
  tmpdir=$(mktemp -d)
  trap 'rm -rf "$tmpdir"' RETURN

  setup_fixtures "$tmpdir"
  create_mock_all_upgraded "$tmpdir/mock-npm"

  NPM_CMD="$tmpdir/mock-npm" update_figma_versions \
    "$tmpdir/pnpm-workspace.yaml" "$tmpdir/package.json"

  assert_contains "$tmpdir/pnpm-workspace.yaml" "'@figma/fpl-cli': 0.7.0" \
    "fpl-cli catalog updated to 0.7.0"
  assert_contains "$tmpdir/pnpm-workspace.yaml" "'@figma/fpl-components': 0.7.0" \
    "fpl-components catalog updated to 0.7.0"

  assert_contains "$tmpdir/pnpm-workspace.yaml" "'@figma/ppg-ai': ^1.10.0" \
    "ppg-ai catalog updated with ^ prefix"
  assert_contains "$tmpdir/pnpm-workspace.yaml" "'@figma/ppg-dev-tools': ^1.10.0" \
    "ppg-dev-tools catalog updated with ^ prefix"

  assert_contains "$tmpdir/pnpm-workspace.yaml" "motion: 12.34.5" \
    "non-figma package not touched"

  assert_contains "$tmpdir/package.json" '"@figma/fpl-components": "0.7.0"' \
    "fpl-components override updated"
  assert_contains "$tmpdir/package.json" '"@figma/fpl-tokens": "0.7.0"' \
    "fpl-tokens override updated"
  assert_contains "$tmpdir/package.json" '"@figma/fpl-icons": "0.7.0"' \
    "fpl-icons override updated"
}

# --- Test 2: No-op when already at latest ---

test_noop_when_latest() {
  local tmpdir
  tmpdir=$(mktemp -d)
  trap 'rm -rf "$tmpdir"' RETURN

  setup_fixtures "$tmpdir"
  create_mock_already_latest "$tmpdir/mock-npm"

  cp "$tmpdir/pnpm-workspace.yaml" "$tmpdir/pnpm-workspace.yaml.orig"
  cp "$tmpdir/package.json" "$tmpdir/package.json.orig"

  NPM_CMD="$tmpdir/mock-npm" update_figma_versions \
    "$tmpdir/pnpm-workspace.yaml" "$tmpdir/package.json"

  assert_file_unchanged "$tmpdir/pnpm-workspace.yaml.orig" "$tmpdir/pnpm-workspace.yaml" \
    "workspace yaml unchanged when at latest"
  assert_file_unchanged "$tmpdir/package.json.orig" "$tmpdir/package.json" \
    "package.json unchanged when at latest"
}

# --- Test 3: Dry-run does not modify files ---

test_dry_run() {
  local tmpdir
  tmpdir=$(mktemp -d)
  trap 'rm -rf "$tmpdir"' RETURN

  setup_fixtures "$tmpdir"
  create_mock_all_upgraded "$tmpdir/mock-npm"

  cp "$tmpdir/pnpm-workspace.yaml" "$tmpdir/pnpm-workspace.yaml.orig"
  cp "$tmpdir/package.json" "$tmpdir/package.json.orig"

  NPM_CMD="$tmpdir/mock-npm" update_figma_versions \
    "$tmpdir/pnpm-workspace.yaml" "$tmpdir/package.json" --dry-run

  assert_file_unchanged "$tmpdir/pnpm-workspace.yaml.orig" "$tmpdir/pnpm-workspace.yaml" \
    "workspace yaml unchanged in dry-run"
  assert_file_unchanged "$tmpdir/package.json.orig" "$tmpdir/package.json" \
    "package.json unchanged in dry-run"
}

# --- Test 4: Partial update (only some packages changed) ---

test_partial_update() {
  local tmpdir
  tmpdir=$(mktemp -d)
  trap 'rm -rf "$tmpdir"' RETURN

  setup_fixtures "$tmpdir"
  create_mock_npm "$tmpdir/mock-npm" \
    "@figma/fpl-cli" "0.7.0" \
    "@figma/fpl-components" "0.7.0" \
    "@figma/fpl-icons" "0.6.0" \
    "@figma/fpl-tokens" "0.6.0" \
    "@figma/ppg-ai" "1.9.0" \
    "@figma/ppg-dev-tools" "1.9.0" \
    "@figma/ppg-eslint-config" "1.9.0" \
    "@figma/ppg-vite-config" "1.9.0"

  NPM_CMD="$tmpdir/mock-npm" update_figma_versions \
    "$tmpdir/pnpm-workspace.yaml" "$tmpdir/package.json"

  assert_contains "$tmpdir/pnpm-workspace.yaml" "'@figma/fpl-cli': 0.7.0" \
    "fpl-cli updated in partial"
  assert_contains "$tmpdir/pnpm-workspace.yaml" "'@figma/fpl-components': 0.7.0" \
    "fpl-components updated in partial"
  assert_contains "$tmpdir/package.json" '"@figma/fpl-components": "0.7.0"' \
    "fpl-components override updated in partial"

  assert_contains "$tmpdir/pnpm-workspace.yaml" "'@figma/fpl-icons': 0.6.0" \
    "fpl-icons stays at 0.6.0"
  assert_contains "$tmpdir/pnpm-workspace.yaml" "'@figma/ppg-ai': ^1.9.0" \
    "ppg-ai stays at ^1.9.0"
  assert_contains "$tmpdir/package.json" '"@figma/fpl-icons": "0.6.0"' \
    "fpl-icons override stays at 0.6.0"
}

# --- Run all tests ---

echo "Running update-figma-versions tests..."
echo ""

echo "--- Test: versions updated ---"
test_versions_updated

echo "--- Test: no-op when latest ---"
test_noop_when_latest

echo "--- Test: dry-run ---"
test_dry_run

echo "--- Test: partial update ---"
test_partial_update

# --- Summary ---

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [[ $FAIL -gt 0 ]]; then
  for err in "${ERRORS[@]}"; do
    echo "  $err"
  done
  exit 1
fi

echo "All tests passed."
exit 0
