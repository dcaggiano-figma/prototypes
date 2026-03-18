---
name: designer
description: |
  Use this skill when building UI — whether from a text description, a screenshot, or Figma MCP design specs.

  Trigger scenarios:
  - User asks to "build", "design", or "create" a UI feature (no visual reference)
  - User provides a screenshot or image of a desired UI
  - Figma MCP has returned design specs to implement
  - You're about to write UI code

  DO NOT use this skill:
  - When the design is already fully specified with component mapping (just implement it)
---

# Designer Skill

Guide the user through a structured design process before writing UI code. Each phase produces a minimal artifact for feedback before proceeding.

## Core Principle

**Get feedback early and often.** Each phase should produce just enough to validate direction before investing more effort. It's cheaper to change a wireframe than refactor code.

## Input Mode

Determine your starting point based on what design input exists:

| Input | Start at | What changes |
|-------|----------|--------------|
| **No visual reference** — user described what they want | Phase 1 | Full flow — all 5 phases |
| **Screenshot/image provided** — static visual of desired UI | Phase 1b | Abbreviated discovery, skip wireframe, extract layout from image |
| **Figma MCP design specs** — structured design data with specs | Phase 1b | Abbreviated discovery, skip wireframe, extract layout + tokens from specs |

---

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

## Phase 1b: Design Analysis

> **Use this phase instead of Phases 1+2** when a screenshot or Figma MCP design is provided. Proceed directly to Phase 3 after.

**Goal:** Understand intent and extract structure from the provided design.

### Steps

1. **Ask targeted questions** (2 max):
   - "What interactions or states aren't visible in this static design?" (hover, loading, empty, error states)
   - "Any constraints I should know about?" (where it lives, responsive needs, data volume)

2. **Extract layout structure** from the design:
   - Identify containers (outer shell — page, modal, panel?)
   - Identify sections and hierarchy
   - Identify fixed vs scrollable areas
   - Note the user flow (what gets interacted with, in what order?)

3. **For Figma MCP specs**: extract exact design values (colors, spacing, typography, border radius) and use the `using-tokens` skill to map them to FPL tokens immediately. This front-loads work that would otherwise happen in Phase 4.

4. **For screenshots**: note visual elements that need component mapping — buttons, inputs, tables, sidebars, etc. Flag anything ambiguous.

### Output

A brief structural summary — confirm understanding with the user, then proceed directly to Phase 3.

---

## Phase 2: Layout

> **Skip this phase** if you entered via Phase 1b (design provided). The design itself serves as the layout reference.

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

**Goal:** Map the layout to existing recipes, shared components, and FPL components.

### Search for Matching Patterns

Now that you have a defined layout, search for existing recipes that match your design patterns.

Search `packages/shared/src/pattern-library/recipeRegistry.tsx`:
- Grep for keywords matching the UI patterns in your wireframe (component names, element types, layout terms)
- Read **only** the matching recipe block — do NOT read the entire file
- Extract the `code` string from matching examples — it contains working component compositions

**Evaluate match quality:**
- **Strong match** (same layout + interaction pattern): Use the recipe's component choices directly — adapt content to your design
- **Partial match** (similar pattern, different details): Use matched components, fill gaps with the process below
- **No match**: Proceed to full component selection below

### Process

1. **Discover FPL components** — invoke the `fpl-docs` agent. It has access to `pnpm fpl` commands:
   - `pnpm fpl list -d` — list all components with descriptions (use to find candidates)
   - `pnpm fpl info <Component>` — get props, compound children, types, and working code examples
   - `pnpm fpl info <Component> -s props,examples` — narrow to just props and examples

   Ask it: "I need components for [your wireframe elements]. List candidates with `fpl list -d`, then look up props/examples for the best matches."
2. **Discover shared components** — read `packages/shared/src/index.ts` to see all available exports. For any component that looks relevant to your wireframe, read its source file to understand props/API. These are pre-built prototype building blocks that complement FPL.
3. **Map each UI element** using this priority order — **never use generic HTML elements** (`<button>`, `<input>`, `<table>`, `<div>` as interactive elements, etc.):

   | Priority | Source | When to use | Examples |
   |----------|--------|-------------|----------|
   | 1st | **FPL components** | Standard UI elements with design-system styling | `Button`, `Switch`, `Select`, `Modal`, `Tabs`, `SearchInput` |
   | 2nd | **Shared components** | Complex patterns already built for prototypes | `Table`, `LeftSidebar`, `Toolbar`, `AiChat`, `NavList` |
   | 3rd | **FPL primitives + custom styling** | When no high-level component fits but a primitive exists | `CardPrimitive`, `RadioLikePrimitive`, `ButtonPrimitive` with custom children/styles |
   | Never | **Generic HTML elements** | Do not use — there is always an FPL or shared alternative | ~~`<button>`~~, ~~`<input>`~~, ~~`<table>`~~ |

4. **Find icons** — for any component that needs an icon (IconButton, nav items, toolbar actions, etc.), invoke the `icon-search` agent with a description of what the icon should represent. It returns the correct FPL icon component names.
5. **Fill gaps with FPL primitives + tokens** (3rd priority from the table above) — when no high-level FPL or shared component fits:
   - Invoke the `using-tokens` skill to select the correct semantic tokens
   - Style with **Tailwind classes** using FPL design tokens (never inline styles or raw CSS)
   - Use **`clsx`** for conditional/dynamic classNames: `className={clsx("bg-bg p-3", isActive && "border-brand")}`
   - Document why no existing component worked

### Output

A component mapping table. For each component, include the props/configuration that the `fpl-docs` agent or source code revealed — variant, size, compound children, key props — so the implementation phase has everything it needs:

| UI Element | Component | Source | Configuration | Notes |
|------------|-----------|--------|---------------|-------|
| Save button | `Button` | FPL | `variant="primary"` | |
| Close button | `IconButton` | FPL | `icon={<CrossIcon />} variant="secondary" size="sm"` | Top-right corner |
| Data grid | `Table` | shared | `sortable`, `selectable`, columns config | See Table source for column API |
| Sidebar | `LeftSidebar` | shared | `items=[...]`, icon rail + expandable panel | Wraps page content |
| Settings form | `Modal.Root` > `Modal.Contents` > `Modal.Body` | FPL | Compound: `Modal.Header`, `Modal.Body`, `Modal.Footer` with `Modal.ActionStrip` | Controlled via `Modal.useModal` |
| Custom card | `CardPrimitive` + tokens | FPL primitive | Custom children, styled with Tailwind tokens | No high-level match — see gap notes |

Wait for confirmation of component choices before visual details.

---

## Phase 4: Visual Details

> **If entering from Phase 1b with Figma MCP specs**: token mapping was already done during design analysis. Review those mappings here and fill any gaps, but don't redo the work.

**Goal:** Define styling using design tokens.

### Reference the Token Guidelines

Invoke the `using-tokens` skill for:

- **Colors:** Background, text, borders
- **Spacing:** Padding, margins, gaps
- **Typography:** Font sizes, weights
- **Borders:** Radius, widths

### Styling Approach

- **Always use Tailwind classes** with FPL design tokens — never inline styles, CSS modules, or raw CSS
- **Use `clsx`** for conditional/dynamic classNames:
  ```tsx
  import clsx from 'clsx';

  <div className={clsx("bg-bg rounded-lg p-3", isSelected && "border border-brand")} />
  ```
- **Prefer token scale values** over arbitrary Tailwind values — if a value is close to an existing token (e.g., `p-[14px]` → `p-3`), snap to the scale. Arbitrary values are acceptable when the design genuinely falls outside the supported scale.

### Output

Key styling decisions as Tailwind classes using design tokens:

```tsx
{/* Container */}
<div className="bg-bg p-4 rounded-lg">

{/* Section spacing */}
<div className="flex flex-col gap-3">

{/* Text hierarchy */}
<Text variant="heading" size="md">Title</Text>
<Text variant="body" size="md" weight="strong">Section header</Text>
<Text variant="body" size="md">Body text</Text>
```

No need to ask for confirmation here.

---

## Phase 5: Implementation

**Goal:** Write the code.

### Process

1. **Read FPL common-mistakes.md** before coding
2. **If using shared components** — import from `@packages/shared` (check `packages/shared/src/index.ts` for available exports). Read the component source for props/API before using.
3. **Start with layout structure** - get containers rendering first. Set up overflow behavior early: identify which containers have fixed dimensions (sidebars, headers, modals) and which hold variable-length content (main body, lists, chat logs) — variable containers need `overflow-auto` so they scroll independently instead of blowing out the page layout.
4. **Add components** from the Phase 3 mapping — for FPL components, get examples from the `fpl-docs` agent before using them (FPL components have specific APIs). For shared components, read the source for props/API.
5. **Add custom styling** - Start adding in components that require custom touch

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

## Modifying Existing UI

When changing existing UI rather than building new:

- **If the change is clear** (e.g., "make this button primary", "add a loading state") — make the change directly. Still use the component priority (FPL → shared → primitives) and design tokens.
- **If the change is ambiguous or structural** (e.g., "redesign this section", "this doesn't feel right") — run a lightweight process:
  1. Ask what's not working and what the desired outcome is
  2. Search recipes and shared components for better patterns
  3. Propose the component/layout change before implementing

Don't skip component selection just because code already exists — an existing custom implementation might be replaceable with a shared component.

---

## Anti-Patterns

**Don't:**
- Skip discovery and start coding immediately
- Skip design analysis and jump straight to coding when a screenshot/Figma design is provided
- Ignore interactions and states not visible in a static mockup
- Design the entire thing before getting any feedback (unless in eval mode)
- Use hardcoded colors/spacing instead of tokens
- Create custom components when FPL has one
- Add features the user didn't ask for
- Use generic HTML elements (`<button>`, `<input>`, `<table>`, `<select>`, etc.) — always use FPL or shared components
- Use inline styles, CSS modules, or raw CSS — use Tailwind classes with design tokens
- Use arbitrary Tailwind values when a close token exists (`p-[14px]` → use `p-3`) — only use arbitrary values when genuinely outside the scale
- Build custom tables, sidebars, toolbars, or chat UIs when shared components exist
- Ignore recipe patterns that match the user's request

**Do:**
- Ask clarifying questions upfront (unless in eval mode)
- Ask about hidden states (hover, loading, empty, error) when working from a static design
- Map Figma design values to FPL tokens early (Phase 1b) rather than using raw values
- Show work incrementally
- Search component gallery recipes after wireframing, before selecting components
- Follow the component priority: FPL → shared → FPL primitives + tokens → never bare HTML
- Prefer shared components over custom implementations for complex patterns
- Use FPL components first
- Confirm any time you decide you think you can't use an FPL component.
- Keep scope minimal
- Wait for explicit "looks good" before moving phases (unless in eval mode)

---

## Quick Reference

| Phase | No Design | Design Provided | Wait for |
|-------|-----------|-----------------|----------|
| 1/1b | Full discovery (5 questions) | Abbreviated (2 questions + design analysis) | Confirm understanding |
| 2 | ASCII wireframe | *Skipped* — design is the layout | — |
| 3 | Component mapping | Component mapping (may have head start from design) | "Those components work" |
| 4 | Token decisions | Token decisions (may be pre-mapped from Figma) | — |
| 5 | Implementation | Implementation | Incremental feedback |

Total phases: 5 (no design) or 4 (design provided). Each requires explicit user approval before proceeding.
