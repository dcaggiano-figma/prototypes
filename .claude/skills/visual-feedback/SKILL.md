---
name: visual-feedback
description: |
  Launch a prototype in the browser for the user to visually annotate elements, then receive structured feedback to act on. Runs as a background task that exits on submit, so you get notified automatically.

  Trigger phrases: "get visual feedback", "show me the app and let me annotate", "visual feedback", "let me mark up the UI", "I want to point at things", "let me review the UI"
---

Connect to a running prototype for visual feedback. The CLI runs as a background task — it auto-opens the browser, waits for one submit (or picks up already-submitted feedback), outputs markdown, and exits (triggering a notification so you can act on it). Re-launch for the next cycle.

## Steps

### Step 1: Check if the dev server is already running

First, make sure you are in the working directory of the prototype app (where `vite.config.ts` lives).

**Before starting anything**, check whether the dev server is already running:

```bash
curl -sf http://localhost:<PORT>/ > /dev/null && echo "running" || echo "not running"
```

To find the port, read `vite.config.ts` for the `portEnvVar` name, then check `.env.ports` / `.env` for that variable's value.

- If the server **is** running — skip to Step 2.
- If the server is **not** running — start it as a background task: `pnpm dev` (in the app directory). Wait for it to be ready before continuing.

**IMPORTANT:** Do NOT start a new dev server if one is already running on the expected port. This is the most common mistake — check first.

### Step 2: Run the feedback CLI as a background task

**Before launching**, check if you already have a `visual-feedback` or `feedback-ui` background task running. If so, do NOT launch another one — the existing one will handle the next submit cycle.

```bash
pnpm visual-feedback
```

**Run this as a background task** (not blocking). The CLI will:
1. Auto-detect the dev server URL from `vite.config.ts` + `.env` files
2. Connect to the dev server
3. **Check for existing submitted annotations** — if found, output them immediately and exit
4. Otherwise, open a browser tab, signal the UI that it's listening, and wait for submit
5. Output structured markdown to stdout and **exit**

If the CLI finds already-submitted annotations (e.g. from a previous session where the agent didn't process them), it processes them right away without waiting.

Tell the user what to do:

> Your prototype is open in the browser. Here's what to do:
> 1. Press **Ctrl+Shift+I** (or click the "Inspect" badge) to activate the element inspector
> 2. **Click** on any elements you want to give feedback about
> 3. **Add notes** describing what you want changed
> 4. Click **"Submit"** when you're done
>
> I'll automatically process your feedback once you submit.

### Step 3: Act on the feedback, message per-annotation, and re-launch

When the background task completes, you'll be notified. Read the output — it's structured markdown. For each annotation:
1. **Read the note** — this is what the user wants changed
2. **Use the selector and component name** to find the relevant source file
3. **Make the requested change**
4. If a screenshot path is included, use the Read tool to view it for visual context

#### Agent-to-User Communication

As you process each annotation, **post messages back to the user** via the per-annotation message endpoint. This lets the user see progress and questions directly on the annotation pins in the browser — no need to check the terminal.

```bash
# When you finish an annotation:
curl -X POST http://localhost:<PORT>/__claude/annotations/message \
  -H 'Content-Type: application/json' \
  -d '{"id":"<annotation-id>","text":"Changed font-size to 14px as requested.","type":"done"}'

# When you have a question about an annotation:
curl -X POST http://localhost:<PORT>/__claude/annotations/message \
  -H 'Content-Type: application/json' \
  -d '{"id":"<annotation-id>","text":"What shade of red did you mean?","type":"question"}'

# For a status update while still working:
curl -X POST http://localhost:<PORT>/__claude/annotations/message \
  -H 'Content-Type: application/json' \
  -d '{"id":"<annotation-id>","text":"Found the component, making changes...","type":"info"}'
```

**Message types:**
- `"done"` — You've finished this annotation. The pin turns purple and the user can approve or re-open it. **Also transitions the annotation status to `done`.**
- `"question"` — You need clarification. The pin shows the question with an amber highlight.
- `"info"` — Progress update. The pin shows the message with a grey highlight.

**Per-annotation workflow:** For each annotation, post `type: "done"` when finished, or `type: "question"` when you need clarification. This is better than the bulk `POST /feedback/review` because the user gets incremental feedback as you work through each item.

**After processing all annotations**, signal that the batch is ready for review:

```bash
curl -X POST http://localhost:<PORT>/__claude/feedback/review
```

Replace `<PORT>` with the dev server port (from the auto-detected URL used by the CLI).

**Then re-launch for the next cycle.** Run as a background task so the user can approve annotations or submit follow-up notes:

```bash
pnpm visual-feedback:next
```

This skips reopening the browser (it's already open). The toolbar switches to review mode — the user can approve individual annotations, read your messages, or add follow-up notes. Follow-up notes transition annotations back to draft status, so they'll be included in the next submit.

### Step 4: Verify

After making changes, take a screenshot using the `/screenshot` skill to verify the changes look correct. Show the user the before/after.

## Reopening the browser

If the user closes the browser tab or wants to reopen it:

```bash
pnpm exec feedback-ui open
```

This opens a new browser tab (auto-detects the URL) and exits immediately.

## Persistence

Annotations are persisted to `.claude/feedback/annotations.json` inside the prototype app directory. This means:

- **Annotations survive dev server restarts and process crashes** — no data loss
- **On resume**, if there are annotations on disk, the dev server loads them automatically. The feedback CLI will detect existing submitted annotations and output them immediately.
- **Cleanup is automatic** — when all annotations are approved/resolved, the file is deleted

If the user has previously submitted feedback but it was never processed (e.g. the CLI wasn't running), simply running `pnpm visual-feedback` will pick it up.

## Tips

- Each `pnpm visual-feedback` invocation handles one submit cycle, then exits — this triggers a notification so you can respond immediately
- The dev server stays running independently — changes you make will hot-reload in the browser
- If Chrome has CDP (remote debugging) enabled, the CLI will attempt to capture screenshots as a bonus
- Annotations without notes are just "look at this" markers — ask the user what they want done with them
- You can also pass a URL explicitly: `pnpm exec feedback-ui serve http://localhost:5376`
- This skill is the interactive version of `/inspect` (which fetches annotations from an already-running server)
- **Never run more than one feedback CLI at a time** — one background task per cycle is all you need
