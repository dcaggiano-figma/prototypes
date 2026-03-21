---
name: update
description: |
  Update your prototype to the latest components, tokens, and project setup.
---

# Update Skill

Update infrastructure packages and sync the `.claude/` folder from origin/main.

## Step 1: Run the update script

Run `bash .claude/scripts/updater.sh` via the Bash tool. This will:

1. Create a checkpoint commit (if working tree is dirty) so the update is revertible
2. Upgrade all `@figma/*` packages to their latest versions
3. Sync `.claude/` files from `origin/main`, **only overwriting files that have not been modified on this branch**
4. Run `./setup.sh` to handle auth, extensions, deps, and verification

Show the complete output to the user. Note the checkpoint commit SHA if one was created — mention it so the user knows how to revert (`git reset --hard <sha>`).

## Step 2: Handle skipped files

If the script reports skipped files (modified on this branch), for each one run a diff against `origin/main`:

```bash
git diff origin/main -- <file>
```

Review the diff and decide:
- **Apply upstream version** — if the upstream change is clearly infrastructure/tooling and the local change is minor or stale, overwrite with `git show origin/main:<file> > <file>`
- **Keep current version** — if the local change is intentional and the upstream change doesn't conflict meaningfully
- **Merge** — if both sides have meaningful changes, manually merge them

Explain each decision briefly to the user.

## Step 3: Verify and fix

1. Run `pnpm verify` (lint + typecheck) and fix any errors.
2. Run `pnpm build` and fix any build errors.
3. Report a summary of what was updated.
