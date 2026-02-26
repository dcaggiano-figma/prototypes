# Setting Up Git SSH Authentication

**Important**: This guide requires **Claude Code** — Cursor's built-in agent locks down shell commands, so SSH key generation won't work there.

## Install the Claude Code extension (if needed)

1. Open Cursor and go to **Extensions** (`Cmd+Shift+X`)
2. Search for **"Claude Code"**
3. Install the extension by Anthropic
4. Open the Claude Code panel from the sidebar or with `Cmd+Shift+P` → "Claude Code: Open"
5. Follow the prompts to sign in to your Anthropic account

## Paste this into Claude Code

```
Help me set up SSH authentication for GitHub. Walk me through it step by step, and wait between each step for questions and confirmation.

1. First run ssh -T git@github.com to see if I already have github access, if so, let me know I am already set up, and skip the rest.
2. Ask me for my GitHub email address.
3. Generate an SSH key by running: ssh-keygen -t ed25519 -C "<my email>" -f ~/.ssh/id_ed25519 -N ""
   If the key already exists, skip generating and just use the existing one.
4. Open the GitHub "add SSH key" page for me by running: open "https://github.com/settings/ssh/new"
5. Print the public key contents (cat ~/.ssh/id_ed25519.pub) so I can copy it.
6. Tell me to paste the key there, give it a title like "Cursor - <my machine name>", and click "Add SSH key".
7. Once I confirm I've added it, verify it works by running: ssh -T git@github.com
8. Show me the result and confirm whether it worked.

Do each step one at a time — wait for me to confirm before moving to the next one.
```

Once you see `Hi <username>! You've successfully authenticated`, you're all set — go back to the [Getting Started guide](../README.md#getting-started).
