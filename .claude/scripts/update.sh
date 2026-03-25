#!/usr/bin/env bash
set -euo pipefail

# Update a prototype's infrastructure without touching user code.
#
# 1. Commits a checkpoint (if working tree is dirty) so updates are revertible
# 2. Upgrades all @figma/ppg-* packages to their latest versions
# 3. Syncs .claude/ folder from origin/main (only files unchanged on this branch)
# 4. Runs ./setup.sh (auth, extensions, deps, verification)
#
# Usage: .claude/scripts/update.sh [--dry-run]
# Note: Run via updater.sh, which fetches origin/main and pulls the latest
# version of this script before executing it.

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# -- Determine repo root and base branch --------------------------------------

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# The canonical source for .claude/ and infrastructure is origin/main
BASE_REF="origin/main"

# -- update_figma_versions function --------------------------------------------
# Queries the registry for the latest version of each @figma/* package in the
# catalog and updates pnpm-workspace.yaml + package.json overrides in-place.
#
# Globals: NPM_CMD (override for testing, defaults to "npm view")
# Args: workspace_yaml_path package_json_path [--dry-run]

update_figma_versions() {
  local workspace_yaml="$1"
  local package_json="$2"
  local dry_run=false
  if [[ "${3:-}" == "--dry-run" ]]; then
    dry_run=true
  fi

  local npm_cmd="${NPM_CMD:-npm view}"

  # Parse catalog — parallel arrays for bash 3 compatibility (macOS default)
  local packages=() old_versions=() prefixes=()

  while IFS= read -r line; do
    if [[ "$line" =~ \'(@figma/[^\']+)\':\ +(\^?)([0-9][0-9a-zA-Z._-]*) ]]; then
      packages+=("${BASH_REMATCH[1]}")
      prefixes+=("${BASH_REMATCH[2]}")
      old_versions+=("${BASH_REMATCH[3]}")
    fi
  done < "$workspace_yaml"

  if [[ ${#packages[@]} -eq 0 ]]; then
    echo "No @figma/* packages found in catalog."
    return 0
  fi

  # Query latest versions in parallel
  local results_dir
  results_dir=$(mktemp -d)

  for i in "${!packages[@]}"; do
    ( $npm_cmd "${packages[$i]}" version --registry https://npm.pkg.github.com > "$results_dir/$i" 2>/dev/null || echo "" > "$results_dir/$i" ) &
  done
  wait

  local new_versions=() changed=0

  for i in "${!packages[@]}"; do
    local latest old
    latest=$(tr -d '[:space:]' < "$results_dir/$i")
    old="${old_versions[$i]}"

    if [[ -z "$latest" ]]; then
      echo "  Warning: could not fetch latest version for ${packages[$i]}, skipping"
      new_versions+=("$old")
      continue
    fi

    new_versions+=("$latest")

    if [[ "$old" != "$latest" ]]; then
      echo "  ${packages[$i]}: ${prefixes[$i]}${old} -> ${prefixes[$i]}${latest}"
      changed=$((changed + 1))
    fi
  done

  rm -rf "$results_dir"

  if [[ $changed -eq 0 ]]; then
    echo "  All @figma/* packages are already at their latest versions."
    return 0
  fi

  if [[ "$dry_run" == true ]]; then
    echo "  (dry run) No files modified."
    return 0
  fi

  # Build sed expressions and apply once per file
  local workspace_sed_args=() json_sed_args=()

  for i in "${!packages[@]}"; do
    local old="${old_versions[$i]}" new="${new_versions[$i]}"
    if [[ "$old" == "$new" ]]; then
      continue
    fi

    local old_escaped="${old//./\\.}"
    local pkg="${packages[$i]}"
    local prefix="${prefixes[$i]}"

    workspace_sed_args+=(-e "s|'${pkg}': ${prefix}${old_escaped}|'${pkg}': ${prefix}${new}|")
    json_sed_args+=(-e "s|\"${pkg}\": \"${old_escaped}\"|\"${pkg}\": \"${new}\"|")
  done

  if [[ ${#workspace_sed_args[@]} -gt 0 ]]; then
    sed -i '' "${workspace_sed_args[@]}" "$workspace_yaml"
  fi

  if [[ -f "$package_json" ]] && [[ ${#json_sed_args[@]} -gt 0 ]]; then
    sed -i '' "${json_sed_args[@]}" "$package_json"
  fi

  echo "  Updated $changed package(s) in catalog and overrides."
}

# Allow tests to source just the function without running the full script
if [[ "${__UPDATE_SH_SOURCED:-}" == "true" ]]; then
  return 0 2>/dev/null || exit 0
fi

# -- Step 1: Checkpoint commit -------------------------------------------------

CHECKPOINT_SHA=""

if [[ "$DRY_RUN" == true ]]; then
  if ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet HEAD 2>/dev/null || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
    echo "(dry run) Would create checkpoint commit for dirty working tree"
  fi
else
  if ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet HEAD 2>/dev/null || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
    echo ""
    echo "=== Creating checkpoint commit ==="
    git add -A
    git commit -m "chore: checkpoint before update" --quiet
    CHECKPOINT_SHA=$(git rev-parse HEAD)
    echo "Checkpoint: $CHECKPOINT_SHA"
    echo "  To revert this update: git reset --hard $CHECKPOINT_SHA"
  fi
fi

# -- Find files changed on this branch ----------------------------------------

MERGE_BASE=$(git merge-base HEAD "$BASE_REF" 2>/dev/null || echo "")
if [[ -z "$MERGE_BASE" ]]; then
  echo "Warning: Could not find merge base with $BASE_REF. Will not overwrite any .claude/ files."
  CHANGED_FILES="__all__"
else
  CHANGED_FILES=$(git diff --name-only "$MERGE_BASE"...HEAD)
fi

# -- Step 2: Upgrade @figma packages ------------------------------------------

echo ""
echo "=== Upgrading @figma packages ==="

if [[ "$DRY_RUN" == true ]]; then
  update_figma_versions "$REPO_ROOT/pnpm-workspace.yaml" "$REPO_ROOT/package.json" --dry-run
else
  update_figma_versions "$REPO_ROOT/pnpm-workspace.yaml" "$REPO_ROOT/package.json"
  pnpm install
fi

# -- Step 3: Sync .claude/ from origin/main -----------------------------------

echo ""
echo "=== Syncing .claude/ folder ==="

SYNCED=0
SKIPPED=0
SYNCED_FILES=()
SKIPPED_FILES=()

# Get list of all .claude/ files from origin/main
CLAUDE_FILES=$(git ls-tree -r --name-only "$BASE_REF" -- .claude/)

while IFS= read -r file; do
  [[ -z "$file" ]] && continue

  # Check if this file was changed on the current branch
  if [[ "$CHANGED_FILES" == "__all__" ]] || echo "$CHANGED_FILES" | grep -qx "$file"; then
    SKIPPED=$((SKIPPED + 1))
    SKIPPED_FILES+=("$file")
    continue
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo "  Would sync: $file"
  else
    # Extract file from origin/main and write to working tree
    mkdir -p "$(dirname "$file")"
    git show "$BASE_REF:$file" > "$file"
    echo "  Synced: $file"
  fi
  SYNCED=$((SYNCED + 1))
  SYNCED_FILES+=("$file")
done <<< "$CLAUDE_FILES"

# Also remove .claude/ files that no longer exist in origin/main
if [[ -d .claude ]]; then
  while IFS= read -r local_file; do
    [[ -z "$local_file" ]] && continue
    # Check if this file exists in origin/main
    if ! git cat-file -e "$BASE_REF:$local_file" 2>/dev/null; then
      # File was removed from origin/main
      if echo "$CHANGED_FILES" | grep -qx "$local_file" 2>/dev/null; then
        SKIPPED=$((SKIPPED + 1))
        SKIPPED_FILES+=("$local_file (removed upstream, kept because modified locally)")
        continue
      fi
      if [[ "$DRY_RUN" == true ]]; then
        echo "  Would remove: $local_file"
      else
        rm -f "$local_file"
        echo "  Removed: $local_file"
      fi
    fi
  done < <(find .claude -type f | sort)
fi

# -- Step 4: Run setup.sh -----------------------------------------------------

echo ""
echo "=== Running setup.sh ==="

if [[ "$DRY_RUN" == true ]]; then
  echo "(dry run) Would run: ./setup.sh"
else
  ./setup.sh
fi

# -- Summary -------------------------------------------------------------------

echo ""
echo "=== Update summary ==="
echo "Synced $SYNCED files from $BASE_REF"
if [[ ${#SYNCED_FILES[@]} -gt 0 ]]; then
  for f in "${SYNCED_FILES[@]}"; do
    echo "  + $f"
  done
fi
if [[ $SKIPPED -gt 0 ]]; then
  echo "Skipped $SKIPPED files (modified on this branch):"
  for f in "${SKIPPED_FILES[@]}"; do
    echo "  - $f"
  done
fi
if [[ -n "$CHECKPOINT_SHA" ]]; then
  echo ""
  echo "Checkpoint commit: $CHECKPOINT_SHA"
  echo "  To revert everything: git reset --hard $CHECKPOINT_SHA"
fi

echo ""
echo "Update complete."
