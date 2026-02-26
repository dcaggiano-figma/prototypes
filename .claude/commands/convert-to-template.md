---
disable-model-invocation: true
---

Convert the current prototype at `apps/prototype/` into a reusable template.

## Steps

### 1. Verify prototype exists

Check that `apps/prototype/` exists and has a `package.json`. If it doesn't exist, stop and tell the user there's nothing to convert.

### 2. Check for shared code changes

Run `git diff main -- packages/` to see if the prototype's branch has modified any shared workspace packages (e.g. `packages/shared/`).

**If there are no changes to `packages/`**, skip to step 3.

**If there are changes**, analyze them and present the user with a summary of what changed (new files added, existing files modified, etc.). Then use AskUserQuestion to ask:

- **"Update shared code"** — Keep the changes in `packages/shared/` as-is. All templates in the repo will pick up these changes. Choose this when the changes are general-purpose improvements (e.g. a new reusable component, a bug fix in an existing utility).
- **"Duplicate into template"** — Copy the modified/new shared files directly into the template's `src/` directory (e.g. `src/shared/`) and rewrite the template's imports from `@prototype/shared` to use the local copies instead. Then revert the changes to `packages/shared/` with `git checkout main -- packages/`. Choose this when the changes are prototype-specific and wouldn't make sense for other templates.

If the user chooses **"Duplicate into template"**, note the decision — the actual copying and import rewriting happens in step 4 after the template directory exists.

### 3. Ask for template details

Use AskUserQuestion to collect:
- **Directory name**: Must be `snake_case` (e.g. `my_cool_template`). This will be used as the directory name under `templates/` and as the template ID.
- **Display name**: Human-readable name (e.g. "My Cool Template"). This goes in `package.json` and `template.json`.

### 4. Copy prototype to templates

Copy `apps/prototype/` to `templates/<name>/`:

```bash
cp -r apps/prototype/ templates/<name>/
```

If the user chose **"Duplicate into template"** in step 2, now handle that:
1. Copy the changed/added files from `packages/shared/src/` into `templates/<name>/src/shared/`
2. Update all imports in the template from `@prototype/shared` to `@/shared` (or the appropriate relative path)
3. Remove `@prototype/shared` from the template's `package.json` dependencies if it's no longer used
4. Revert shared package changes: `git checkout main -- packages/`

### 5. Update `package.json`

In `templates/<name>/package.json`:
- Change `"name"` from whatever it is (likely `@apps/prototype`) to `@prototype/<name>`
- Add or update the `"template"` field: `{ "displayName": "<display_name>" }`
- Keep everything else (dependencies, scripts, etc.) as-is

### 6. Add `template.json`

Create `templates/<name>/template.json`:

```json
{
  "name": "<display_name>",
  "description": "<read from package.json description, or ask the user>",
  "id": "<name>"
}
```

### 7. Ensure `.claude/CLAUDE.md` exists

If `templates/<name>/.claude/CLAUDE.md` doesn't already exist, create it with the standard content:

```markdown
# Prototype Instructions

This prototype uses FPL components. See the root `.claude/instructions/fpl/` for component documentation.

## ESLint Warnings

ESLint warnings in prototype apps indicate you are straying from the design system or other best practices. You should conform to these whenever possible — use FPL components instead of native HTML elements, use design tokens instead of arbitrary values, and avoid inline styles. Consult the `fpl-docs` agent if you need help finding the right FPL component or pattern.
```

Also ensure `templates/<name>/.claude/instructions/.gitkeep` exists.

### 8. Delete `apps/prototype/`

Remove the original prototype directory:

```bash
rm -rf apps/prototype/
```

### 9. Clean up `.env.ports`

Read `.env.ports` at the repo root. If it contains an entry for the prototype (e.g. `PROTOTYPE_PORT=...`), remove that line. Leave other entries intact.

### 10. Run `pnpm install`

Run `pnpm install` to re-link the workspace with the new template location.

### 11. Validate

Run the following in the new template directory and fix any issues:

```bash
cd templates/<name> && pnpm build && pnpm lint && pnpm typecheck
```

If there are errors, fix them before continuing. Iterate until all three pass cleanly.

### 12. Screenshot

Use the `/screenshot` skill to take a screenshot of the template. The screenshot should be saved as `templates/<name>/screenshot.png`. This is required for non-hidden templates so they show a preview in the template picker.

### 13. Commit, push, and open a PR

1. Create a new branch: `git checkout -b template/<name>`
2. Stage the relevant files:
   - `templates/<name>/` (the new template)
   - Deletion of `apps/prototype/`
   - Changes to `packages/` (if "Update shared code" was chosen in step 2)
   - Any changes to `.env.ports` or `pnpm-lock.yaml`
3. Commit with a message like: `feat: add <display_name> template`
4. Push: `git push -u origin template/<name>`
5. Open a PR with `gh pr create`:
   - Title: `Add <display_name> template`
   - Body should summarize what the template is and include the screenshot
   - If shared code was updated, mention it in the PR body
6. Open the PR URL in the browser after creation.
