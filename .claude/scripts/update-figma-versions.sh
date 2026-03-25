#!/usr/bin/env bash
set -euo pipefail

# Updates @figma/* versions in pnpm-workspace.yaml catalog and package.json overrides.
#
# For each @figma/* package in the catalog, queries the npm registry for the latest
# version and updates:
#   1. pnpm-workspace.yaml catalog entries (preserving ^ prefix where present)
#   2. package.json pnpm.overrides entries (exact versions for FPL packages)
#
# Usage: update-figma-versions.sh [--dry-run] [--workspace <path>] [--package-json <path>]
#
# Environment:
#   NPM_CMD — override the command used to query versions (default: npm view).
#             Useful for testing with a mock.

DRY_RUN=false
WORKSPACE_YAML=""
PACKAGE_JSON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --workspace)
      WORKSPACE_YAML="$2"
      shift 2
      ;;
    --package-json)
      PACKAGE_JSON="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
WORKSPACE_YAML="${WORKSPACE_YAML:-$REPO_ROOT/pnpm-workspace.yaml}"
PACKAGE_JSON="${PACKAGE_JSON:-$REPO_ROOT/package.json}"

NPM_CMD="${NPM_CMD:-npm view}"

# --- Parse catalog entries from pnpm-workspace.yaml ---
# Use parallel arrays for bash 3 compatibility (macOS default)

PACKAGES=()
OLD_VERSIONS=()
PREFIXES=()

while IFS= read -r line; do
  if [[ "$line" =~ \'(@figma/[^\']+)\':\ +(\^?)([0-9][0-9a-zA-Z._-]*) ]]; then
    PACKAGES+=("${BASH_REMATCH[1]}")
    PREFIXES+=("${BASH_REMATCH[2]}")
    OLD_VERSIONS+=("${BASH_REMATCH[3]}")
  fi
done < "$WORKSPACE_YAML"

if [[ ${#PACKAGES[@]} -eq 0 ]]; then
  echo "No @figma/* packages found in catalog."
  exit 0
fi

# --- Query latest versions in parallel ---

RESULTS_DIR=$(mktemp -d)
trap 'rm -rf "$RESULTS_DIR"' EXIT

for i in "${!PACKAGES[@]}"; do
  ( $NPM_CMD "${PACKAGES[$i]}" version --registry https://npm.pkg.github.com > "$RESULTS_DIR/$i" 2>/dev/null || echo "" > "$RESULTS_DIR/$i" ) &
done
wait

NEW_VERSIONS=()
CHANGED=0

for i in "${!PACKAGES[@]}"; do
  latest=$(cat "$RESULTS_DIR/$i" | tr -d '[:space:]')
  old="${OLD_VERSIONS[$i]}"

  if [[ -z "$latest" ]]; then
    echo "  Warning: could not fetch latest version for ${PACKAGES[$i]}, skipping"
    NEW_VERSIONS+=("$old")
    continue
  fi

  NEW_VERSIONS+=("$latest")

  if [[ "$old" != "$latest" ]]; then
    echo "  ${PACKAGES[$i]}: ${PREFIXES[$i]}${old} -> ${PREFIXES[$i]}${latest}"
    CHANGED=$((CHANGED + 1))
  fi
done

if [[ $CHANGED -eq 0 ]]; then
  echo "  All @figma/* packages are already at their latest versions."
  exit 0
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "  (dry run) No files modified."
  exit 0
fi

# --- Build sed expressions and apply once per file ---

workspace_sed_args=()
json_sed_args=()

for i in "${!PACKAGES[@]}"; do
  old="${OLD_VERSIONS[$i]}"
  new="${NEW_VERSIONS[$i]}"
  if [[ "$old" == "$new" ]]; then
    continue
  fi

  old_escaped="${old//./\\.}"
  pkg="${PACKAGES[$i]}"
  prefix="${PREFIXES[$i]}"

  workspace_sed_args+=(-e "s|'${pkg}': ${prefix}${old_escaped}|'${pkg}': ${prefix}${new}|")
  # sed is a no-op when the pattern doesn't match, so no need to pre-check with grep
  json_sed_args+=(-e "s|\"${pkg}\": \"${old_escaped}\"|\"${pkg}\": \"${new}\"|")
done

if [[ ${#workspace_sed_args[@]} -gt 0 ]]; then
  sed -i '' "${workspace_sed_args[@]}" "$WORKSPACE_YAML"
fi

if [[ -f "$PACKAGE_JSON" ]] && [[ ${#json_sed_args[@]} -gt 0 ]]; then
  sed -i '' "${json_sed_args[@]}" "$PACKAGE_JSON"
fi

echo "  Updated $CHANGED package(s) in catalog and overrides."
