#!/bin/bash
set -e

# Install prerelease @figma/ppg-* packages from an ai-prototype-scaffold PR.
#
# Usage:
#   ./scripts/install-prerelease.sh <PR_NUMBER>
#   ./scripts/install-prerelease.sh clean

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_JSON="$REPO_ROOT/package.json"
SCAFFOLD_REPO="figma/ai-prototype-scaffold"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}→${NC} $1"; }
pass()  { echo -e "${GREEN}✓${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

# --- Clean mode: remove all ppg overrides ---

if [[ "${1:-}" == "clean" ]]; then
  info "Removing @figma/ppg-* overrides from package.json..."
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
    const overrides = pkg.pnpm?.overrides;
    if (!overrides) { console.log('No overrides found.'); process.exit(0); }
    const removed = [];
    for (const key of Object.keys(overrides)) {
      if (key.startsWith('@figma/ppg-')) {
        removed.push(key + '@' + overrides[key]);
        delete overrides[key];
      }
    }
    if (removed.length === 0) { console.log('No @figma/ppg-* overrides to remove.'); process.exit(0); }
    fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
    removed.forEach(r => console.log('  Removed: ' + r));
  "
  pass "Overrides cleaned"
  info "Running pnpm install..."
  cd "$REPO_ROOT" && pnpm install --no-frozen-lockfile
  pass "Done"
  exit 0
fi

# --- Install mode ---

PR_NUMBER="${1:-}"

if [[ -z "$PR_NUMBER" ]]; then
  echo "Usage: ./scripts/install-prerelease.sh <PR_NUMBER>"
  echo "       ./scripts/install-prerelease.sh clean"
  exit 1
fi

# Strip URL prefix if a full URL was passed
PR_NUMBER="${PR_NUMBER##*/}"

if ! command -v gh &>/dev/null; then
  fail "GitHub CLI (gh) is required. Install it from https://github.com/cli/cli"
fi

info "Fetching prerelease comment from PR #$PR_NUMBER..."

COMMENT_BODY="$(gh api "repos/$SCAFFOLD_REPO/issues/$PR_NUMBER/comments" \
  --jq '[.[] | select(.user.login == "github-actions[bot]") | select(.body | contains("Infra Packages Prerelease"))][0].body' 2>/dev/null || echo "")"

if [[ -z "$COMMENT_BODY" ]]; then
  fail "No prerelease comment found on PR #$PR_NUMBER. The PR may not have prerelease packages published yet."
fi

# Extract the JSON block from the comment (the ```json ... ``` fenced block)
OVERRIDES_JSON="$(echo "$COMMENT_BODY" | sed -n '/^```json$/,/^```$/p' | sed '1d;$d')"

if [[ -z "$OVERRIDES_JSON" ]]; then
  fail "Could not parse overrides JSON from the PR comment."
fi

# Extract just the overrides object from the nested pnpm.overrides structure
OVERRIDES="$(echo "$OVERRIDES_JSON" | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    const parsed = JSON.parse(chunks.join(''));
    const overrides = parsed.pnpm?.overrides || parsed;
    console.log(JSON.stringify(overrides));
  });
")"

echo
echo "Packages to install:"
echo "$OVERRIDES" | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    const o = JSON.parse(chunks.join(''));
    for (const [k, v] of Object.entries(o)) console.log('  ' + k + '@' + v);
  });
"
echo

info "Updating pnpm.overrides in package.json..."

node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
  const newOverrides = JSON.parse(process.argv[1]);

  if (!pkg.pnpm) pkg.pnpm = {};
  if (!pkg.pnpm.overrides) pkg.pnpm.overrides = {};

  for (const [key, value] of Object.entries(newOverrides)) {
    pkg.pnpm.overrides[key] = value;
  }

  fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
" "$OVERRIDES"

pass "Overrides applied"

info "Running pnpm install..."
cd "$REPO_ROOT" && pnpm install --no-frozen-lockfile

pass "Prerelease packages installed from PR #$PR_NUMBER"
echo
echo -e "${BLUE}Tip:${NC} Run './scripts/install-prerelease.sh clean' to remove overrides when done testing."
