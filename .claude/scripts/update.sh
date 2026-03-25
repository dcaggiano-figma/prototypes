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

UPDATE_VERSIONS_SCRIPT="$REPO_ROOT/.claude/scripts/update-figma-versions.sh"

if [[ "$DRY_RUN" == true ]]; then
  bash "$UPDATE_VERSIONS_SCRIPT" --dry-run
else
  bash "$UPDATE_VERSIONS_SCRIPT"
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
