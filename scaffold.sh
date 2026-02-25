#!/bin/bash
set -euo pipefail

# Usage: bash scaffold.sh <template_name>
# Copies a template from templates/ to the project root.

TEMPLATE_NAME="${1:-}"

if [ -z "$TEMPLATE_NAME" ]; then
  echo "Usage: bash scaffold.sh <template_name>"
  echo ""
  echo "Available templates:"
  for dir in templates/*/; do
    echo "  $(basename "$dir")"
  done
  exit 1
fi

TEMPLATE_DIR="templates/$TEMPLATE_NAME"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: Template '$TEMPLATE_NAME' not found in templates/"
  echo ""
  echo "Available templates:"
  for dir in templates/*/; do
    echo "  $(basename "$dir")"
  done
  exit 1
fi

# Check if src/ already exists (don't clobber an existing project)
if [ -d "src" ]; then
  echo "Error: src/ directory already exists. Remove it first if you want to re-scaffold."
  exit 1
fi

echo "Scaffolding from template: $TEMPLATE_NAME"

# Copy template files to root, excluding the template's package.json
# (we merge it instead)
for item in "$TEMPLATE_DIR"/*; do
  basename_item=$(basename "$item")
  if [ "$basename_item" = "package.json" ]; then
    continue
  fi
  cp -r "$item" .
done

# Copy hidden files (like .claude/)
for item in "$TEMPLATE_DIR"/.*; do
  basename_item=$(basename "$item")
  if [ "$basename_item" = "." ] || [ "$basename_item" = ".." ]; then
    continue
  fi
  cp -r "$item" .
done

# Merge template package.json into root package.json
# Add template's dependencies and devDependencies
if [ -f "$TEMPLATE_DIR/package.json" ]; then
  TEMP_FILE=$(mktemp)
  node -e "
    const root = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
    const tmpl = JSON.parse(require('fs').readFileSync('$TEMPLATE_DIR/package.json', 'utf8'));

    root.dependencies = { ...root.dependencies, ...tmpl.dependencies };
    root.devDependencies = { ...root.devDependencies, ...tmpl.devDependencies };

    require('fs').writeFileSync('$TEMP_FILE', JSON.stringify(root, null, 2) + '\n');
  "
  mv "$TEMP_FILE" package.json
fi

echo "Done! Run 'pnpm install' to install dependencies."
