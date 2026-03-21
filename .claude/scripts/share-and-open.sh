#!/usr/bin/env bash
set -euo pipefail

# Wrapper around `pnpm proto-cli share` that:
# 1. Passes through all output in real time
# 2. After completion, extracts the share URL
# 3. Copies it to clipboard and opens it in the browser

# Capture output while still streaming it to the terminal
OUTPUT_FILE=$(mktemp)
trap 'rm -f "$OUTPUT_FILE"' EXIT

# Run proto-cli share, tee output to both terminal and temp file
# Pass through all arguments
pnpm proto-cli share "$@" 2>&1 | tee "$OUTPUT_FILE"
EXIT_CODE=${PIPESTATUS[0]}

if [[ $EXIT_CODE -eq 0 ]]; then
  # Extract the share URL from the output
  SHARE_URL=$(grep -o 'https://protov2\.figma\.design/share/[^ "]*' "$OUTPUT_FILE" | tail -1 || true)

  if [[ -n "$SHARE_URL" ]]; then
    echo ""
    echo "Share URL: $SHARE_URL"
    echo "$SHARE_URL" | pbcopy
    echo "(Copied to clipboard)"
    open "$SHARE_URL"
  fi
fi

exit "$EXIT_CODE"
