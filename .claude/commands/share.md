Push the current branch and trigger a share workflow to deploy the prototype, then wait for it to complete.

Before running these steps, ensure all changes are committed and pushed. If not, help the user commit and push them.

Steps:

1. Get the current branch name with `git branch --show-current`.
2. Get the short commit hash (first 8 chars): `git rev-parse --short=8 HEAD`.
3. Run `pnpm install` to ensure the lockfile is up to date (the agent may have added new files or dependencies). Commit the lockfile changes along with any other uncommitted changes, then push: `git push -u origin HEAD`.
4. Trigger the share workflow: `gh workflow run share-proto.yml --ref <branch>`.
5. Wait a few seconds for GitHub to register the run, then get the run ID: `gh run list --workflow=share-proto.yml --branch=<branch> --limit=1 --json databaseId --jq '.[0].databaseId'`.
6. Watch the run until it completes: `gh run watch <run-id>` (use a long timeout since shares can take several minutes).
7. Check the exit code of `gh run watch`. If it failed, show the user the failure logs with `gh run view <run-id> --log-failed`.
8. Tell the user the result:
   - If **successful**: extract the share URL programmatically with:
     ```
     gh run view <run-id> --log 2>&1 | grep 'Shared at:' | sed 's/.*Shared at: //'
     ```
     Show the extracted URL as a clickable link to the user.
   - If **failed**: show the error output and link to the run with `gh run view <run-id> --web`
