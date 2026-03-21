#!/usr/bin/env bash
set -euo pipefail

# Integration tests for update.sh
#
# Creates temporary git repos with controlled state and verifies the sync logic.
# Each test runs in isolation with its own temp directory.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_SCRIPT="$SCRIPT_DIR/../.claude/scripts/update.sh"
UPDATER_SCRIPT="$SCRIPT_DIR/../.claude/scripts/updater.sh"

PASSED=0
FAILED=0
FAILURES=()

# -- Helpers -------------------------------------------------------------------

setup_test() {
  local test_name="$1"
  TEST_DIR=$(mktemp -d)
  REMOTE_DIR="$TEST_DIR/remote.git"
  WORK_DIR="$TEST_DIR/work"
  STUB_DIR="$TEST_DIR/stubs"

  # Create stub binaries so pnpm/setup.sh are no-ops
  mkdir -p "$STUB_DIR"
  cat > "$STUB_DIR/pnpm" << 'STUB'
#!/usr/bin/env bash
exit 0
STUB
  chmod +x "$STUB_DIR/pnpm"

  # Create bare remote repo
  git init --bare "$REMOTE_DIR" --quiet

  # Create working clone, set up main branch with .claude/ files
  git clone "$REMOTE_DIR" "$WORK_DIR" --quiet 2>/dev/null
  cd "$WORK_DIR"
  git config user.email "test@test.com"
  git config user.name "Test"

  # Stub setup.sh at repo root
  cat > "$WORK_DIR/setup.sh" << 'STUB'
#!/usr/bin/env bash
exit 0
STUB
  chmod +x "$WORK_DIR/setup.sh"

  # Copy the update scripts into the test repo
  mkdir -p "$WORK_DIR/.claude/scripts"
  cp "$UPDATE_SCRIPT" "$WORK_DIR/.claude/scripts/update.sh"
  cp "$UPDATER_SCRIPT" "$WORK_DIR/.claude/scripts/updater.sh"
}

teardown_test() {
  rm -rf "$TEST_DIR"
}

assert_file_content() {
  local file="$1" expected="$2"
  local actual
  if [[ ! -f "$file" ]]; then
    echo "  FAIL: File $file does not exist"
    return 1
  fi
  actual=$(cat "$file")
  if [[ "$actual" != "$expected" ]]; then
    echo "  FAIL: $file content mismatch"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    return 1
  fi
  return 0
}

assert_file_missing() {
  local file="$1"
  if [[ -f "$file" ]]; then
    echo "  FAIL: File $file should not exist but does"
    return 1
  fi
  return 0
}

assert_output_contains() {
  local output="$1" pattern="$2"
  if ! echo "$output" | grep -q "$pattern"; then
    echo "  FAIL: Output does not contain '$pattern'"
    echo "  Output was:"
    echo "$output" | head -20
    return 1
  fi
  return 0
}

run_update() {
  local args="${1:-}"
  cd "$WORK_DIR"
  PATH="$STUB_DIR:$PATH" bash .claude/scripts/update.sh $args 2>&1
}

run_updater() {
  local args="${1:-}"
  cd "$WORK_DIR"
  PATH="$STUB_DIR:$PATH" bash .claude/scripts/updater.sh $args 2>&1
}

# Create a standard main branch with .claude/ files, then a feature branch
setup_standard_branches() {
  cd "$WORK_DIR"

  # Create initial .claude/ files on main
  mkdir -p .claude/instructions .claude/skills/update
  echo "main-instructions" > .claude/instructions/guide.md
  echo "main-settings" > .claude/settings.json
  echo "main-skill" > .claude/skills/update/SKILL.md
  git add -A
  git commit -m "initial .claude/ setup" --quiet
  git push origin main --quiet 2>/dev/null
}

create_feature_branch() {
  cd "$WORK_DIR"
  git checkout -b feature/test --quiet
}

update_main() {
  # Update files on main (via a detached commit pushed to origin)
  cd "$WORK_DIR"
  git stash --quiet 2>/dev/null || true
  git checkout main --quiet
  "$@"  # caller passes the modifications
  git add -A
  git commit -m "update main" --quiet
  git push origin main --quiet 2>/dev/null
  git checkout feature/test --quiet
  git stash pop --quiet 2>/dev/null || true
  git fetch origin main --quiet 2>/dev/null
}

# -- Tests ---------------------------------------------------------------------

test_unchanged_files_are_synced() {
  setup_test "unchanged_files_are_synced"

  setup_standard_branches

  # Update a file on main after branching
  create_feature_branch
  # Make some unrelated change on the feature branch
  echo "feature work" > app.txt
  git add -A
  git commit -m "feature work" --quiet

  # Now update .claude/ on main
  update_main bash -c 'echo "updated-instructions" > .claude/instructions/guide.md'

  # Run update — guide.md should be synced since feature branch didn't touch it
  local output
  output=$(run_update)

  assert_file_content "$WORK_DIR/.claude/instructions/guide.md" "updated-instructions" && \
  assert_output_contains "$output" "Synced: .claude/instructions/guide.md"
}

test_changed_files_are_skipped() {
  setup_test "changed_files_are_skipped"

  setup_standard_branches
  create_feature_branch

  # Modify a .claude/ file on the feature branch
  echo "my-custom-settings" > .claude/settings.json
  git add -A
  git commit -m "customize settings" --quiet

  # Update the same file on main
  update_main bash -c 'echo "new-main-settings" > .claude/settings.json'

  local output
  output=$(run_update)

  # settings.json should NOT be overwritten
  assert_file_content "$WORK_DIR/.claude/settings.json" "my-custom-settings" && \
  assert_output_contains "$output" "Skipped" && \
  assert_output_contains "$output" ".claude/settings.json"
}

test_new_upstream_files_are_added() {
  setup_test "new_upstream_files_are_added"

  setup_standard_branches
  create_feature_branch
  echo "feature work" > app.txt
  git add -A
  git commit -m "feature work" --quiet

  # Add a new file to .claude/ on main
  update_main bash -c 'echo "new-hook" > .claude/hooks.md'

  local output
  output=$(run_update)

  assert_file_content "$WORK_DIR/.claude/hooks.md" "new-hook" && \
  assert_output_contains "$output" "Synced: .claude/hooks.md"
}

test_deleted_upstream_files_are_removed() {
  setup_test "deleted_upstream_files_are_removed"

  setup_standard_branches
  create_feature_branch
  echo "feature work" > app.txt
  git add -A
  git commit -m "feature work" --quiet

  # Remove a file from .claude/ on main
  update_main bash -c 'rm .claude/skills/update/SKILL.md'

  local output
  output=$(run_update)

  assert_file_missing "$WORK_DIR/.claude/skills/update/SKILL.md" && \
  assert_output_contains "$output" "Removed: .claude/skills/update/SKILL.md"
}

test_deleted_upstream_but_locally_modified() {
  setup_test "deleted_upstream_but_locally_modified"

  setup_standard_branches
  create_feature_branch

  # Modify the file on the branch
  echo "my-custom-skill" > .claude/skills/update/SKILL.md
  git add -A
  git commit -m "customize skill" --quiet

  # Remove the same file on main
  update_main bash -c 'rm .claude/skills/update/SKILL.md'

  local output
  output=$(run_update)

  # File should be kept because it was modified locally
  assert_file_content "$WORK_DIR/.claude/skills/update/SKILL.md" "my-custom-skill" && \
  assert_output_contains "$output" "removed upstream, kept because modified locally"
}

test_dry_run_mode() {
  setup_test "dry_run_mode"

  setup_standard_branches
  create_feature_branch
  echo "feature work" > app.txt
  git add -A
  git commit -m "feature work" --quiet

  update_main bash -c 'echo "updated-instructions" > .claude/instructions/guide.md'

  local output
  output=$(run_update "--dry-run")

  # File should NOT be changed in dry run
  assert_file_content "$WORK_DIR/.claude/instructions/guide.md" "main-instructions" && \
  assert_output_contains "$output" "Would sync: .claude/instructions/guide.md" && \
  assert_output_contains "$output" "(dry run)"
}

test_checkpoint_commit_created() {
  setup_test "checkpoint_commit_created"

  setup_standard_branches
  create_feature_branch

  # Create uncommitted changes (dirty working tree)
  echo "uncommitted work" > dirty.txt

  local output
  output=$(run_update)

  assert_output_contains "$output" "Checkpoint:" && \
  assert_output_contains "$output" "To revert this update: git reset --hard"
}

test_clean_working_tree_no_checkpoint() {
  setup_test "clean_working_tree_no_checkpoint"

  setup_standard_branches
  create_feature_branch
  echo "feature work" > app.txt
  git add -A
  git commit -m "feature work" --quiet

  local output
  output=$(run_update)

  # Should NOT have a checkpoint line
  if echo "$output" | grep -q "Checkpoint:"; then
    echo "  FAIL: Checkpoint created for clean working tree"
    return 1
  fi
  return 0
}

test_updater_pulls_latest_from_main() {
  setup_test "updater_pulls_latest_from_main"

  setup_standard_branches

  # Put a v1 update.sh on main that prints a known marker
  cd "$WORK_DIR"
  mkdir -p .claude/scripts
  cat > .claude/scripts/update.sh << 'SCRIPT'
#!/usr/bin/env bash
echo "UPDATE_V1_MARKER"
SCRIPT
  # Also commit updater.sh to main so the repo has both
  cp "$UPDATER_SCRIPT" .claude/scripts/updater.sh
  git add -A
  git commit -m "add v1 update script" --quiet
  git push origin main --quiet 2>/dev/null

  create_feature_branch

  # Now update main with a v2 update.sh that prints a different marker
  update_main bash -c 'cat > .claude/scripts/update.sh << "SCRIPT"
#!/usr/bin/env bash
echo "UPDATE_V2_MARKER"
SCRIPT'

  # The local .claude/scripts/update.sh still has v1, but updater should
  # pull v2 from origin/main and run that instead
  local output
  output=$(run_updater)

  assert_output_contains "$output" "UPDATE_V2_MARKER" && \
  if echo "$output" | grep -q "UPDATE_V1_MARKER"; then
    echo "  FAIL: Updater ran local v1 instead of pulling v2 from main"
    return 1
  fi
  return 0
}

test_updater_falls_back_to_local() {
  setup_test "updater_falls_back_to_local"

  cd "$WORK_DIR"

  # Remove the scripts that setup_test copied, so main doesn't have them
  rm -rf .claude/scripts

  # Set up main WITHOUT .claude/scripts/update.sh
  mkdir -p .claude/instructions
  echo "main-instructions" > .claude/instructions/guide.md
  git add -A
  git commit -m "initial setup without update script" --quiet
  git push origin main --quiet 2>/dev/null

  create_feature_branch

  # Add the scripts only on the feature branch (local copy)
  mkdir -p .claude/scripts
  cp "$UPDATE_SCRIPT" .claude/scripts/update.sh
  cp "$UPDATER_SCRIPT" .claude/scripts/updater.sh
  git add -A
  git commit -m "add scripts locally" --quiet

  local output
  output=$(run_updater)

  # Should contain fallback message and still run successfully
  assert_output_contains "$output" "Falling back to local copy"
}

# -- Runner --------------------------------------------------------------------

run_test() {
  local test_fn="$1"
  local test_name="${test_fn#test_}"
  printf "  %-50s " "$test_name"

  # Run test in a subshell that handles its own cleanup
  local output
  if output=$(
    $test_fn
    rc=$?
    teardown_test
    exit $rc
  ) 2>&1; then
    echo "PASS"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL"
    FAILED=$((FAILED + 1))
    FAILURES+=("$test_name: $output")
  fi
}

echo "Running update.sh tests..."
echo ""

run_test test_unchanged_files_are_synced
run_test test_changed_files_are_skipped
run_test test_new_upstream_files_are_added
run_test test_deleted_upstream_files_are_removed
run_test test_deleted_upstream_but_locally_modified
run_test test_dry_run_mode
run_test test_checkpoint_commit_created
run_test test_clean_working_tree_no_checkpoint
run_test test_updater_pulls_latest_from_main
run_test test_updater_falls_back_to_local

echo ""
echo "Results: $PASSED passed, $FAILED failed"

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo ""
  echo "Failures:"
  for failure in "${FAILURES[@]}"; do
    echo "  $failure"
  done
  exit 1
fi
