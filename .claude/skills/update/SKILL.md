---
name: update
description: |
  Update your prototype to the latest components, tokens, and project setup.
---

# Update Skill

Update infrastructure packages and optionally sync config from the source template.

## Step 1: Determine the source template

Read `.prototype.json` in the current working directory to find `templateId`. This file is created when a prototype is scaffolded from a template:

```json
{
  "templateId": "blank-slate",
  "createdAt": "2025-01-15T00:00:00Z"
}
```

If `.prototype.json` does not exist, fall back: look at the current directory name and try to match it to a template in `templates/`. If no match is found, tell the user you couldn't detect the source template and default to a quick update (Step 3).

## Step 2: Ask the user what to update

Present two choices using AskUserQuestion:

1. **Quick update** — "Get the latest components and design tokens"
2. **Full update** — "Get the latest everything — components, tokens, and project setup"

Use these exact labels and descriptions:
- header: "Update type"
- Option 1 label: "Quick update"
  - description: "Updates FPL components, icons, tokens, and other packages to their latest versions"
- Option 2 label: "Full update (Recommended)"
  - description: "Updates packages AND syncs build config, linting rules, and other project setup from the latest template — keeps your code untouched"

If they choose Quick update, go to Step 3. If Full update, go to Step 4.

## Step 3: Infra-only update

1. Run `pnpm update @figma/*`
2. Run `pnpm install`
3. Report which packages were updated and to what versions (compare before/after).
4. Run `pnpm dev` briefly to verify the dev server starts. If there are issues, help the user fix them.
5. Done — skip remaining steps.

## Step 4: Infra + template sync

First, run `pnpm update @figma/*` and `pnpm install` (same as Step 3).

Then sync template-owned config files. The source template lives at `templates/<templateId>/` relative to the repo root. Determine the repo root by walking up from the current directory to find the directory containing the `templates/` folder.

### Template-owned files

These files are owned by the template and should be kept in sync:

| File | Special handling |
|------|-----------------|
| `vite.config.ts` | Direct copy |
| `tailwind.config.js` | Direct copy |
| `postcss.config.js` | Direct copy |
| `tsconfig.json` | Direct copy |
| `eslint.config.js` | Direct copy |
| `index.html` | Direct copy |
| `.claude/CLAUDE.md` | Direct copy |
| `package.json` | Merge (see below) |

### User-owned files (NEVER touch these)

- `src/**/*`
- `CLAUDE.md` (root-level, NOT `.claude/CLAUDE.md`)
- `docs/`
- Any other user-created files not in the template-owned list

### For each template-owned file:

1. Read both the prototype's version and the template's version.
2. If they are **identical**: skip, report "already up to date".
3. If the prototype **doesn't have the file**: copy from template.
4. If they **differ**: show the user a diff of the changes and ask how to resolve:
   - **Apply template version** — overwrite with the template's file
   - **Keep current version** — leave the prototype's file as-is
   - **Manual merge** — show both versions and let the user decide what to keep

### package.json merge strategy

Do NOT overwrite `package.json`. Instead, merge intelligently:

- **Preserve from prototype**: `name`, `version`, `description`, `scripts`, `template`, and any other non-dependency fields
- **Merge `dependencies`**: Add new deps from template, update version ranges for deps that exist in both, keep user-added deps that aren't in the template
- **Merge `devDependencies`**: Same logic as `dependencies`
- Show the user what changed in deps before applying

## Step 5: Verify

1. Run `pnpm install` to pick up any dependency changes from the template sync.
2. Run `pnpm dev` briefly to confirm the dev server starts.
3. Report a summary of everything that was updated:
   - Which `@figma/*` packages were updated
   - Which config files were synced/skipped/kept
   - Any dependency changes from the package.json merge
