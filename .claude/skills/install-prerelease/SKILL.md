---
name: install-prerelease
description: |
  Install prerelease infrastructure packages from an ai-prototype-scaffold PR for local testing. Takes a PR number or URL and applies pnpm.overrides to the root package.json.

  Trigger phrases: "install prerelease", "test prerelease", "prerelease packages", "scaffold PR", "test infra PR", "install from PR"
---

# Install Prerelease Packages

Install prerelease `@figma/ppg-*` packages published from an `ai-prototype-scaffold` PR into this prototype-playground workspace for testing.

## Step 1: Get the PR number

If the user provided a URL like `https://github.com/figma/ai-prototype-scaffold/pull/211`, extract the PR number (211). If they gave just a number, use that directly. If neither, ask for it.

## Step 2: Run the install script

```bash
./scripts/install-prerelease.sh <PR_NUMBER>
```

The script will:
1. Fetch the `github-actions` bot comment from the PR
2. Parse the `pnpm.overrides` JSON block
3. Merge the overrides into the root `package.json`
4. Run `pnpm install --no-frozen-lockfile`

If it fails because no prerelease comment was found, tell the user the PR doesn't have prerelease packages published yet — the workflow only runs when the PR touches infra package source files.

## Step 3: Verify

Run the dev server briefly to confirm nothing is broken. Report which packages were installed.

## Cleanup

When the user is done testing, run:

```bash
./scripts/install-prerelease.sh clean
```

This removes all `@figma/ppg-*` overrides from `package.json` and re-runs `pnpm install`.
