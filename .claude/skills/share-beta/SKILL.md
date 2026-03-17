Push the current branch and trigger a share workflow to deploy the prototype, with optional pinned snapshots.

Before running these steps, ensure all changes are committed and pushed. If not, help the user commit and push them.

Steps:

1. **Check for `.share-metadata.json`** in the prototype root (`apps/prototype/`). If it doesn't exist, create it with defaults:
   ```json
   {
     "pin": "",
     "summary": "",
     "hashtags": []
   }
   ```

2. **Ask the user if they want to pin this share.** If `.share-metadata.json` already exists, use its `pin` value as the default. Present options:
   - **No pin** (default) — deploy to `share/<branch>/latest/` only (overwritten each deploy)
   - **Pin with a name** — prompt for a name, then generate a URL-safe slug (lowercase, hyphenated, max 64 chars). This creates a permanent snapshot at `share/<branch>/<pin>/` in addition to the latest deploy.
   - If the user just wants to share quickly, skip pinning

3. **Analyze the prototype source code** to generate metadata:
   - Read the main source files (`apps/prototype/src/App.tsx` and any key components)
   - Generate a **summary**: 1-2 concise sentences describing what the prototype does and its key interactions
   - Generate **hashtags**: 3-7 lowercase, hyphenated tags prefixed with `#` (e.g., `#drag-and-drop`, `#file-browser`)

4. **Show the summary and hashtags to the user** for approval. Let them edit if they want changes.

5. **Write the finalized metadata** to `apps/prototype/.share-metadata.json`:
   ```json
   {
     "pin": "<pin-slug-or-empty>",
     "summary": "<generated-summary>",
     "hashtags": ["#tag-one", "#tag-two", "#tag-three"]
   }
   ```

6. **Commit, push, and trigger the workflow:**
   - Get the current branch name: `git branch --show-current`
   - Get the short commit hash: `git rev-parse --short=8 HEAD`
   - Run `pnpm install` to ensure the lockfile is up to date
   - Commit `.share-metadata.json` and any other uncommitted changes, then push: `git push -u origin HEAD`
   - Trigger the share workflow with the pin parameter: `gh workflow run share-pinned.yml --ref <branch> -f pin=<pin-slug>`
     (If no pin, omit the `-f pin=` flag or pass empty string)

7. **Wait for the workflow to complete:**
   - Wait a few seconds for GitHub to register the run
   - Get the run ID: `gh run list --workflow=share-pinned.yml --branch=<branch> --limit=1 --json databaseId --jq '.[0].databaseId'`
   - Watch the run: `gh run watch <run-id>` (use a long timeout since shares can take several minutes)

8. **Report the result:**
   - If **successful**: extract the share URL from the logs:
     ```
     gh run view <run-id> --log 2>&1 | grep -o 'https://protov2\.figma\.design/share/[^ "]*' | grep -v '\$'
     ```
     Show the user the EXACT URL from the command output as a clickable link. Do NOT modify, truncate, or reformat the URL — copy it character-for-character.
   - If **failed**: show the error output and link to the run with `gh run view <run-id> --web`
