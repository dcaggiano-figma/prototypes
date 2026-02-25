---
name: designer
description: |
  Use this skill when building UI and no visual reference exists (no screenshot, no Figma MCP response).

  Trigger scenarios:
  - User asks to "build", "design", or "create" a UI feature
  - User describes a UI they want but provides no visual reference
  - You're about to write UI code but haven't seen a design

  DO NOT use this skill:
  - When user provides a screenshot or image
  - When Figma MCP has returned design specs
  - When implementing an already-specified design
---

# Designer Skill

Guide the user through a structured design process before writing UI code. Each phase produces a minimal artifact for feedback before proceeding.

## Core Principle

**Get feedback early and often.** Each phase should produce just enough to validate direction before investing more effort. It's cheaper to change a wireframe than refactor code.

## Phase 1: Discovery

**Goal:** Understand what we're building and why.

### Ask These Questions

1. **What problem does this solve?** (User need, not feature description)
2. **Who uses this?** (User role, context, frequency)
3. **What's the happy path?** (Primary flow, 3-5 steps max)
4. **What are the constraints?** (Where does this live? Mobile? Desktop? Both?)
5. **What does success look like?** (How will we know it works?)

### Output

A brief summary (3-5 bullets) confirming understanding. Wait for user confirmation before proceeding.

**Example:**
> Before I design, let me confirm I understand:
> - This is a settings panel for configuring notification preferences
> - Users access it from their profile menu
> - Primary action: toggle notifications on/off per channel
> - Secondary: customize frequency/timing
> - Constraints: Must fit in existing sidebar pattern
>
> Does this capture it?

---

## Phase 2: Layout

**Goal:** Define the structure and information hierarchy.

### Define These Elements

1. **Container** - Where does this live? (modal, page, panel, popover)
2. **Sections** - What groups of content exist?
3. **Hierarchy** - What's primary, secondary, tertiary?
4. **Flow** - How does the user move through it?

### Output

A text-based wireframe using ASCII or simple description. No visual polish yet.

**Example:**
```
+---------------------------+
|  [Title]           [X]    |
+---------------------------+
|                           |
|  Section: Email           |
|  [ ] Marketing updates    |
|  [ ] Product news         |
|                           |
|  Section: In-App          |
|  [ ] Comments on my work  |
|  [ ] @mentions            |
|                           |
+---------------------------+
|        [Cancel] [Save]    |
+---------------------------+
```

Wait for feedback on structure before proceeding to components.

---

## Phase 3: Component Selection

**Goal:** Map the layout to specific FPL components.

### Process

1. **Run `pnpm fpl list`** to see available components
2. **Match each UI element** to an FPL component
3. **Identify gaps** - what needs custom styling? 

### Output

A component mapping table:

| UI Element | FPL Component | Notes |
|------------|---------------|-------|
| Title | `Text` (heading variant) | |
| Close button | `IconButton` | Use `cross` icon |
| Section headers | `Text` (label variant) | |
| Toggles | `Switch` | |
| Primary action | `Button` (primary) | |
| Secondary action | `Button` (secondary) | |

If a component doesn't exist, note what custom styling is needed.

Wait for confirmation of component choices before visual details.

---

## Phase 4: Visual Details

**Goal:** Define styling using design tokens.

### Reference the Token Guidelines

Use the `using-tokens` skill or consult `.claude/skills/using-tokens/TOKEN_GUIDELINES.md` for:

- **Colors:** Background, text, borders
- **Spacing:** Padding, margins, gaps
- **Typography:** Font sizes, weights
- **Borders:** Radius, widths

### Output

Key styling decisions with token names:

```css
/* Container */
background: var(--color-bg);
padding: var(--spacer-4);
border-radius: var(--radius-large);

/* Section spacing */
gap: var(--spacer-3);

/* Text hierarchy */
title: var(--text-heading-medium-font-size)
section-header: var(--text-body-medium-font-size), --font-weight-strong
body: var(--text-body-medium-font-size)
```

No need to ask for confirmation here.

---

## Phase 5: Implementation

**Goal:** Write the code.

### Process

1. **Read FPL common-mistakes.md** before coding
2. **Start minimal** - get the structure rendering first
3. **Add components** - Add in the relevant FPL components, make sure you get examples of the component before you add it in, FPL components use very specific APIs.
4. **Add custom styling** - Start adding in components that require custom touch

### Checkpoints

After each sub-step, show the user what you built and ask:
- "Here's the basic structure. Does this match what you expected?"
- "I've added the toggle behavior. Try clicking them - does this feel right?"

---

## Eval Mode (Automated Runs)

**If you are running in an eval context (eval system prompt is present):**

- **DO NOT wait for user confirmation** - there is no user to respond
- Complete each phase output, then immediately proceed to the next phase
- Make reasonable design decisions without asking
- Skip phrases like "Does this capture it?" or "Let me know if this looks good"
- Go straight through all 5 phases to working code

This override exists because evals run autonomously without user interaction.

---

## Anti-Patterns

**Don't:**
- Skip discovery and start coding immediately
- Design the entire thing before getting any feedback (unless in eval mode)
- Use hardcoded colors/spacing instead of tokens
- Create custom components when FPL has one
- Add features the user didn't ask for

**Do:**
- Ask clarifying questions upfront (unless in eval mode)
- Show work incrementally
- Use FPL components first
- Confirm any time you decide you think you can't use an FPL component.
- Keep scope minimal
- Wait for explicit "looks good" before moving phases (unless in eval mode)

---

## Quick Reference

| Phase | Output | Wait for |
|-------|--------|----------|
| 1. Discovery | 3-5 bullet summary | "Yes, that's right" |
| 2. Layout | ASCII wireframe | "Layout looks good" |
| 3. Components | Component mapping table | "Those components work" |
| 4. Visual | Token decisions | "Styling approved" |
| 5. Implement | Working code | Incremental feedback |

Total phases: 5. Each requires explicit user approval before proceeding.
