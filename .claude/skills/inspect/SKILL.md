---
name: inspect
description: |
  Fetch element annotations from a running prototype's Element Inspector. Use when the user has annotated UI elements and wants you to act on them — fix styling, refactor components, or understand what they're pointing at.

  Trigger phrases: "look at my annotations", "check the annotations", "what did I annotate", "inspect", "get annotations", "fix what I marked", "see my feedback"
---

Fetch and act on Element Inspector annotations from a running prototype.

## Background

The Element Inspector is part of the DevOverlay (`@figma/ppg-element-inspector`). Users activate it with the "Inspect" badge or `Ctrl+Shift+I`, then click on elements to annotate them with notes. Annotations include CSS selectors, React component names, bounding boxes, and computed styles.

Annotations are synced to the Vite dev server and accessible via HTTP.

## Steps

### Step 1: Determine the port

Read `.env.ports` at the repository root (and `.env` for any offset) to find the Vite dev server port for the running prototype. Port variable names follow the pattern `<APP_NAME>_PORT`.

If it's unclear which app is running, ask the user.

### Step 2: Fetch annotations

```bash
curl -s http://localhost:<PORT>/__claude/annotations
```

This returns JSON:
```json
{
  "annotations": [
    {
      "id": "ann-1-...",
      "element": {
        "selector": "h1.text-headingLg",
        "componentName": "HomePage",
        "rect": { "x": 470, "y": 428, "width": 119, "height": 32 },
        "computedStyles": { "color": "rgba(0,0,0,0.9)", "font-size": "24px", ... }
      },
      "note": "Change the font to blue",
      "timestamp": 1771526093497
    }
  ]
}
```

### Step 3: Interpret and act

For each annotation:
1. **Find the code** — use the `selector` and `componentName` to locate the relevant source file and element
2. **Read the note** — the user's note describes what they want changed
3. **Apply the change** — make the requested modification

If there are no notes on an annotation, ask the user what they'd like done with it.

### Step 4: Clear annotations (optional)

After acting on all annotations, offer to clear them:

```bash
curl -s -X DELETE http://localhost:<PORT>/__claude/annotations
```

## Tips

- If the endpoint returns an empty array, the user hasn't annotated anything yet — remind them to activate the inspector (`Ctrl+Shift+I`) and click on elements
- The `componentName` field maps to React component names — use it to find source files quickly
- The `selector` field is a unique CSS selector you can grep for in the codebase
- `computedStyles` shows current styles — useful context for styling changes
