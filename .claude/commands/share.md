Share the current prototype by deploying it.

Steps:

1. **Make sure `.share-metadata.json` is up to date** at `apps/prototype/.share-metadata.json`. Update only `description` and `tags` — never modify `author`, `base`, or `$comment` (those are provenance fields set during scaffolding).

2. **Commit any uncommitted changes** (including `.share-metadata.json` and any lockfile changes from `pnpm install`). Push to the remote.

3. **Run `bash .claude/scripts/share-and-open.sh`** via the Bash tool with a 10-minute timeout. Show the complete output to the user verbatim. Do NOT summarize, reformat, or extract anything from the output — the script handles copying the URL to clipboard and opening it in the browser.
