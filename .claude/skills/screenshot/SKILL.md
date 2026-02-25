---
name: screenshot
description: |
  Take a screenshot of a running prototype app using Playwright in headless mode. Use this when you need to visually verify what a prototype looks like, capture the current state of a UI, or check your work visually.

  Trigger phrases: "take a screenshot", "screenshot", "what does it look like", "show me the app", "capture the screen", "visual check", "how does it look", "look at it"
---

Take a headless screenshot of a running prototype app using the `@repo/screenshot` package.

## Prerequisites

- The prototype's dev server must already be running (via `pnpm dev` in the app directory)
- Playwright's Chromium must be installed: `pnpm --filter @repo/screenshot exec playwright install chromium`

## Steps

### Step 1: Determine the app and port

Read `.env.ports` at the repository root to find the port for the target app. Port variable names follow the pattern `<APP_NAME>_PORT` (e.g., `EXAMPLE_PROTOTYPE_PORT=5173`).

If it's unclear which app to screenshot, ask the user.

### Step 2: Take the screenshot

Use the `pnpm screenshot` CLI to capture a screenshot.

**Full page screenshot (default):**

```bash
pnpm screenshot http://localhost:<PORT> <OUTPUT_PATH>
```

**Screenshot of a specific element:**

```bash
pnpm screenshot http://localhost:<PORT> <OUTPUT_PATH> --selector "<CSS_SELECTOR>"
```

**Custom viewport size:**

```bash
pnpm screenshot http://localhost:<PORT> <OUTPUT_PATH> --width 1920 --height 1080
```

**Run arbitrary Playwright code** (for complex interactions like clicking, filling forms, etc.):

```bash
pnpm screenshot exec "
  await page.goto('http://localhost:<PORT>');
  await page.locator('.btn').click();
  await page.screenshot({ path: '<OUTPUT_PATH>' });
"
```

**Run a Playwright script from a file:**

```bash
pnpm screenshot exec ./my-script.js
```

In `exec` mode, `browser`, `context`, `page`, and `chromium` are pre-initialized globals. `page` starts blank — your code does everything. The argument can be either inline code or a path to a `.js`/`.ts` file.

Replace:
- `<PORT>` with the port from `.env.ports`
- `<OUTPUT_PATH>` with an absolute path like `<app-dir>/screenshot.png`

### Step 3: View the screenshot

Use the Read tool to view the screenshot image file. Claude can read PNG images directly.

### Tips

- If the dev server isn't running, start it first with `pnpm --filter @app/<name> dev` (run in background)
- For a specific viewport size, use `--width` and `--height` flags
- If the page has animations, increase wait time with `--wait 2000`
- Use `--selector` for element-specific screenshots
- Use `exec` mode for complex scenarios (multi-step interactions, filling forms, etc.)
