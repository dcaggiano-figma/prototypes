#!/usr/bin/env bash
set -euo pipefail

# Validates a .share-metadata.json file.
# Usage: ./ci-scripts/validate-share-metadata.sh <path>
#
# Exits 0 if valid, 1 with error details if not.

FILE="${1:-}"

if [ -z "$FILE" ]; then
  echo "Usage: validate-share-metadata.sh <path-to-.share-metadata.json>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Error: $FILE does not exist."
  echo "Run the /share-beta skill to generate share metadata before deploying."
  exit 1
fi

# Must be valid JSON
if ! jq empty "$FILE" 2>/dev/null; then
  echo "Error: $FILE is not valid JSON."
  exit 1
fi

ERRORS=()

# Required fields must exist
for field in pin summary hashtags; do
  if ! jq -e "has(\"$field\")" "$FILE" > /dev/null 2>&1; then
    ERRORS+=("Missing required field: \"$field\"")
  fi
done

# pin must be a string
if jq -e '.pin | type != "string"' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"pin\" must be a string")
fi

# If pin is non-empty, it must be a URL-safe slug (lowercase, hyphens, digits, max 64 chars)
PIN=$(jq -r '.pin // ""' "$FILE")
if [ -n "$PIN" ]; then
  if [ ${#PIN} -gt 64 ]; then
    ERRORS+=("\"pin\" must be 64 characters or fewer (got ${#PIN})")
  fi
  if ! echo "$PIN" | grep -qE '^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$'; then
    ERRORS+=("\"pin\" must be a URL-safe slug (lowercase letters, digits, hyphens, no leading/trailing hyphens). Got: \"$PIN\"")
  fi
fi

# summary must be a non-empty string
if jq -e '.summary | type != "string"' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"summary\" must be a string")
elif jq -e '.summary | length == 0' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"summary\" must not be empty")
fi

# hashtags must be an array of strings
if jq -e '.hashtags | type != "array"' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"hashtags\" must be an array")
elif jq -e '.hashtags | length == 0' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"hashtags\" must contain at least one tag")
else
  # Every element must be a string
  NON_STRINGS=$(jq -r '[.hashtags[] | select(type != "string")] | length' "$FILE")
  if [ "$NON_STRINGS" -gt 0 ]; then
    ERRORS+=("All hashtags must be strings, found $NON_STRINGS non-string element(s)")
  else
    # Every string must start with #
    BAD_TAGS=$(jq -r '.hashtags[] | select(startswith("#") | not)' "$FILE")
    if [ -n "$BAD_TAGS" ]; then
      ERRORS+=("All hashtags must start with \"#\". Invalid: $BAD_TAGS")
    fi
  fi
fi

# No unexpected fields
EXTRA=$(jq -r 'keys[] | select(. != "pin" and . != "summary" and . != "hashtags")' "$FILE" 2>/dev/null || true)
if [ -n "$EXTRA" ]; then
  ERRORS+=("Unexpected fields: $EXTRA")
fi

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "Validation failed for $FILE:"
  for err in "${ERRORS[@]}"; do
    echo "  - $err"
  done
  exit 1
fi

echo "Valid: $FILE"
