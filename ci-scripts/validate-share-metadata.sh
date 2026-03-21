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
  echo "Create a .share-metadata.json with a description and tags before deploying."
  exit 1
fi

# Must be valid JSON
if ! jq empty "$FILE" 2>/dev/null; then
  echo "Error: $FILE is not valid JSON."
  exit 1
fi

ERRORS=()

# description must be a non-empty string
if ! jq -e 'has("description")' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("Missing required field: \"description\"")
elif jq -e '.description | type != "string"' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"description\" must be a string")
elif jq -e '.description | length == 0' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"description\" must not be empty")
fi

# author must exist and be a string
if ! jq -e 'has("author")' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("Missing required field: \"author\"")
elif jq -e '.author | type != "string"' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"author\" must be a string")
fi

# tags must be an array of strings
if ! jq -e 'has("tags")' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("Missing required field: \"tags\"")
elif jq -e '.tags | type != "array"' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"tags\" must be an array")
else
  NON_STRINGS=$(jq -r '[.tags[] | select(type != "string")] | length' "$FILE")
  if [ "$NON_STRINGS" -gt 0 ]; then
    ERRORS+=("All tags must be strings, found $NON_STRINGS non-string element(s)")
  fi
fi

# base must be an object with branch, commit, timestamp strings
if ! jq -e 'has("base")' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("Missing required field: \"base\"")
elif jq -e '.base | type != "object"' "$FILE" > /dev/null 2>&1; then
  ERRORS+=("\"base\" must be an object with branch, commit, and timestamp")
else
  for key in branch commit timestamp; do
    if jq -e ".base.${key} | type != \"string\"" "$FILE" > /dev/null 2>&1; then
      ERRORS+=("\"base.${key}\" must be a string")
    fi
  done
fi

# No unexpected fields
EXTRA=$(jq -r 'keys[] | select(. != "$comment" and . != "description" and . != "tags" and . != "base" and . != "author")' "$FILE" 2>/dev/null || true)
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
