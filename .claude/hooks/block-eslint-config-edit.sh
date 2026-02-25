#!/bin/bash
# Block Claude from modifying existing eslint config files.
# New configs (via Write) are allowed; editing existing ones is not.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# If there's no file_path, allow the call
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

FILENAME=$(basename "$FILE_PATH")

deny() {
  local reason="$1"
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$reason\"}}"
  exit 2
}

if [[ "$FILENAME" =~ ^eslint\.config\. ]] || [[ "$FILENAME" =~ ^\.eslintrc ]]; then
  deny "Do not modify ESLint configuration files. Instead, fix the source code to comply with the existing ESLint rules. If you believe a rule is genuinely wrong, tell the user and let them change it manually."
else
  exit 0
fi
