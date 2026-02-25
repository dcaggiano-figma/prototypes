#!/bin/bash
# Block npm and npx commands, redirect to pnpm.

INPUT=$(cat)
echo "$INPUT" >> /tmp/block-npm-npx-hook.log
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi


deny() {
  local reason="$1"
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$reason\"}}"
  exit 2
}

# Match a standalone command name anywhere in a shell command string
# (at start, or after a shell operator like &&, ||, ;, |, &)
command_matches() {
  local cmd="$1"
  echo "$COMMAND" | grep -qE "(^|[[:space:]]|;|&&|\|\||[|&])[[:space:]]*${cmd}([[:space:]]|$)"
}

# Specific npx commands with tailored guidance
if command_matches "npx tsc"; then
  deny "Do not use npx tsc. Run 'pnpm typecheck' instead."
elif command_matches "npx eslint"; then
  deny "Do not use npx eslint. Run 'pnpm lint' instead."
# General npx/npm fallback
elif command_matches "npx"; then
  deny "Do not use npx. This project uses pnpm with pinned dependencies. Use the already-installed packages via pnpm exec, or add the dependency with pnpm add if it is missing."
elif command_matches "npm"; then
  deny "Do not use npm. This project uses pnpm. Use pnpm instead."
elif command_matches "yarn"; then
  deny "Do not use yarn. This project uses pnpm. Use pnpm instead."
fi
