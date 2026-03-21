#!/bin/bash
# Validate .share-metadata.json whenever Claude writes or edits it.

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# If there's no file_path, allow the call
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

FILENAME=$(basename "$FILE_PATH")

# Only validate .share-metadata.json
if [ "$FILENAME" != ".share-metadata.json" ]; then
  exit 0
fi

# For Edit, we need to validate after the edit is applied, but PreToolUse
# runs before. We can validate the new content for Write, but for Edit we
# need PostToolUse. Since this hook is on PostToolUse, validate the file on disk.
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Run the schema validation script
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT=$("$REPO_ROOT/ci-scripts/validate-share-metadata.sh" "$FILE_PATH" 2>&1)
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "$OUTPUT"
  exit 2
fi

# Check that provenance fields (author, base, $comment) were not modified.
# Compare current file against the last committed version.
REL_PATH="${FILE_PATH#$REPO_ROOT/}"

ORIGINAL=$(git -C "$REPO_ROOT" show "HEAD:$REL_PATH" 2>/dev/null || true)
if [ -z "$ORIGINAL" ]; then
  # No committed version — nothing to compare against
  exit 0
fi

# Compare all provenance fields in one pass (fast path: single jq per side)
ORIG_PROV=$(echo "$ORIGINAL" | jq -cS '{author, base, "\$comment": .["\$comment"]}')
CURR_PROV=$(jq -cS '{author, base, "\$comment": .["\$comment"]}' "$FILE_PATH")

if [ "$ORIG_PROV" != "$CURR_PROV" ]; then
  # Identify which fields changed for the error message
  ERRORS=()
  for field in author base '$comment'; do
    ORIG_VAL=$(echo "$ORIGINAL" | jq -cS ".[\"$field\"] // null")
    CURR_VAL=$(jq -cS ".[\"$field\"] // null" "$FILE_PATH")
    if [ "$ORIG_VAL" != "$CURR_VAL" ]; then
      ERRORS+=("Do not modify \"$field\" — it is provenance metadata set during scaffolding.")
    fi
  done
  echo "Provenance check failed for $FILE_PATH:"
  for err in "${ERRORS[@]}"; do
    echo "  - $err"
  done
  echo ""
  echo "Only \"description\" and \"tags\" should be updated. Restore the original values for author/base/\$comment."
  exit 2
fi

exit 0
