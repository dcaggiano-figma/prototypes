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

# Run the validation script
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)/ci-scripts"
OUTPUT=$("$SCRIPT_DIR/validate-share-metadata.sh" "$FILE_PATH" 2>&1)
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "$OUTPUT"
  exit 2
fi

exit 0
