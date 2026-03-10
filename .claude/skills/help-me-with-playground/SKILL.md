---
name: help-me-with-playground
description: |
  Troubleshoot playground issues. Use when the user needs help with their
  prototyping environment — setup problems, build errors, dev server issues,
  or anything that's not working.

  Trigger phrases: "help me with playground", "playground not working",
  "can't start dev server", "build is broken", "setup issues", "something is broken"
---

Help the user troubleshoot their prototyping playground environment.

## Steps

### Step 1: Ask what's wrong

Ask the user to describe their issue. Present these common categories:

| Category | Description |
|----------|-------------|
| Setup / install issue | Dependencies won't install, setup.sh failed, missing tools |
| Dev server won't start | `pnpm dev` fails, port conflicts, Vite errors |
| Build errors | TypeScript errors, FPL import issues, missing packages |
| Something else | Anything not covered above |

If the user already described their issue in the conversation, skip this step and proceed to diagnostics.

### Step 2: Run diagnostics

Run these checks and collect the results:

```bash
# Check Node.js
node --version

# Check pnpm
pnpm --version

# Check if node_modules exists
test -d node_modules && echo "node_modules: OK" || echo "node_modules: MISSING"

# Check if FPL is built
test -f fpl/packages/components/dist/entry/public.js && echo "FPL packages: OK" || echo "FPL packages: NOT BUILT"

# Check if dev-tools is built
test -f proto/packages/dev-tools/dist/index.js && echo "dev-tools: OK" || echo "dev-tools: NOT BUILT"

# Check git status
git status --short | head -5
```

Also check for the specific issue category:
- **Setup/install**: Check if Homebrew is available, if `cursor` CLI is on PATH
- **Dev server**: Check if ports are in use (`lsof -i :<port>` for common ports 5173-5180)
- **Build errors**: Check recent TypeScript/ESLint output, try a dry-run build

### Step 3: Report findings

Present a clear summary of what's working and what's broken. Use a simple table:

```
| Check            | Status |
|------------------|--------|
| node_modules     | OK / MISSING |
| FPL packages     | OK / NOT BUILT |
| dev-tools        | OK / NOT BUILT |
```

### Step 4: Fix

Based on the diagnostics, suggest and execute fixes with user confirmation:

| Issue | Fix |
|-------|-----|
| node_modules missing | `pnpm install` |
| FPL not built | `pnpm build` |
| dev-tools not built | `pnpm build` |
| Port conflicts | Kill the process using the port |
| Everything broken | `./setup.sh` (full re-setup) |

Ask the user before running each fix. If multiple things are broken, suggest running `./setup.sh` which handles everything.

### Step 5: Verify

After applying fixes, re-run the diagnostics from Step 2 to confirm everything is resolved. If issues persist, try alternative fixes or escalate.

### Step 6: Submit feedback

Whether or not the issue was resolved, submit feedback so the team knows about it:

```bash
pnpm feedback --type <GID> --notes "<summary of issue, diagnostics, and outcome>"
```

Choose the feedback type based on the situation:
- Issue was a real bug → `1213241012704181` (Broken)
- User needed a missing feature → `1213241017619119` (Feature Required)
- Something was confusing/annoying → `1213241017619120` (Annoyance)
- User had a suggestion → `1213248061204181` (Suggestion or idea)

The notes should include:
1. What the user reported
2. What diagnostics found
3. What fix was applied (if any)
4. Whether it was resolved

### Tips

- If `./setup.sh` is suggested, warn the user it takes a few minutes
- For port conflicts, `lsof -ti :<port> | xargs kill` can free a port
- If the user is in a worktree, diagnostics should check the repo root (follow `.git` file)
- Always be honest about what you can and can't fix — some issues may need manual intervention
