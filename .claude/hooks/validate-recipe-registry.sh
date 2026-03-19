#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only intercept git commit commands
if ! echo "$COMMAND" | grep -qE '^\s*git\s+commit'; then
  exit 0
fi

# Check if recipeRegistry.tsx is in staged changes
if ! git diff --cached --name-only | grep -q 'recipeRegistry.tsx'; then
  exit 0
fi

REASON=$(printf '%s\n\n%s\n%s\n%s\n%s\n%s\n\n%s' \
  "recipeRegistry.tsx has staged changes — audit required before committing." \
  "Auto-fix the affected recipe(s):" \
  "1. COMPONENTS: Ensure every component used in the demo render function is in the components array. Remove any not actually used." \
  "2. SOURCE: Imports from @figma/fpl-components → source: 'fpl' with docsUrl: FPL_DOCS. Local/shared imports → source: 'shared', no docsUrl." \
  "3. CODE EXAMPLE: Update the code string to reflect the actual demo implementation (imports, state, JSX)." \
  "4. METADATA: Ensure id, name, description, example label, and tags are consistent and accurate." \
  "Fix any issues, re-stage the file, then retry the commit.")

echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":$(echo "$REASON" | jq -Rs .)}}"
exit 2
