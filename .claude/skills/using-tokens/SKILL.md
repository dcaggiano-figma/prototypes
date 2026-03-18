---
name: using-tokens
description: |
  Use this skill anytime someone needs to decide what tokens from `@figma/fpl-tokens` should be used when building interfaces or components using the FPL design system.

  Trigger scenarios:
  - User is building a new component and needs to know which color/spacing/typography tokens to use
  - User has hardcoded CSS values (colors, spacing, font sizes) that should use design tokens instead
  - User asks "what color should I use for..." or "what spacing/size/font should I use..."
  - User is styling a component and unsure about which semantic tokens to apply
  - Code review identifies hardcoded values that should be replaced with tokens
  - User is implementing a design from Figma and needs to map design values to FPL tokens

  DO NOT use this skill:
  - When designs from MCP already have tokens applied that clearly map to FPL tokens (just use those specified tokens)
  - When user explicitly specifies exact token names to use
  - For non-UI/styling questions
---

# Using FPL Design Tokens

Recommend the correct FPL design tokens for any UI styling question. Outputs both **Tailwind classes** (for DOM components) and **CSS variable names** (for canvas/scenegraph rendering).

## Two Rendering Contexts

| Context | Format | Example |
|---|---|---|
| **DOM (Tailwind)** | className strings | `className="text-text bg-bg p-16px rounded-md"` |
| **Canvas/Scenegraph** | CSS var → resolved value | `getComputedStyle(root).getPropertyValue('--color-text')` → hex |

Always provide **both formats** in your recommendations unless the user's context is unambiguous.

## Step 1: Determine the Input Type

Before consulting references, identify what you're working from:

### A) Figma MCP Structured Data

If the user has Figma MCP output (structured JSON with fill/stroke/effect data):

1. Parse the structured data and normalize into FPL token names
2. Validate against the reference files below
3. Present the mapped tokens to the user

### B) Screenshot or Visual Reference

Follow this visual analysis protocol:

1. **Identify elements**: List every visible UI element (text, backgrounds, borders, icons, spacing)
2. **Estimate proportions**: Compare spacing to known reference sizes (e.g., text height ~11px for body, ~24px for headings)
3. **Map to tokens**: For each element, assign a token with a confidence level:
   - **High**: Clear match to a known token (e.g., primary text on white bg → `text-text`)
   - **Medium**: Reasonable inference (e.g., "looks like ~16px padding" → `p-3`)
   - **Low**: Ambiguous (e.g., "could be secondary or tertiary text" — present both options)
4. **Flag uncertainty**: Always note low-confidence recommendations and ask the user to confirm

### C) Text Description

Proceed directly to Step 2.

## Step 2: Search for Existing Patterns

Before consulting reference files, search for matching patterns in the component gallery.

Search `packages/shared/src/pattern-library/recipeRegistry.tsx`:
- Grep for keywords matching the user's request (component names, UI element types, layout terms)
- Read **only** the matching recipe block — do NOT read the entire file
- Extract the `code` string — it contains correct token usage in context

**Evaluate match quality:**
- **Strong match** (same element type + layout + interaction states): Use the pattern directly → skip to Step 5
- **Partial match** (similar pattern, missing specific tokens): Note what was found → proceed to Step 3 for the gaps only
- **No match**: Proceed to Step 3

**Skip this step** for canvas/scenegraph questions or specific token name lookups — go directly to Step 3.

## Step 3: Identify Token Categories Needed

Determine which categories the query touches, and read **only** the relevant reference files:

| Query About | Read This File |
|---|---|
| Any token question (start here) | [tailwind-token-map.md](./references/tailwind-token-map.md) |
| Text, background, border, or icon colors | [color-tokens.md](./references/color-tokens.md) |
| Font size, weight, family, text styles | [typography-tokens.md](./references/typography-tokens.md) |
| Padding, margin, gap, radius, sizing | [spacing-and-layout-tokens.md](./references/spacing-and-layout-tokens.md) |

**Selective reading**: For a color-only question, read `tailwind-token-map.md` + `color-tokens.md`. Do NOT load all 4 files for every query. After a partial match from Step 2, read only the reference file for the missing token category.

## Step 4: Apply Decision Trees

Use the decision trees in the relevant reference file to select the right token:

1. **Start with the element type**: What is being styled? (text, background, border, icon, spacing)
2. **Consider hierarchy**: Primary, secondary, or tertiary?
3. **Check semantic role**: Brand, danger, warning, success, neutral?
4. **Check interaction state**: Default, hover, focus, disabled?

### Key Rules

- **Always use semantic tokens** (`text-text`, `bg-bg`) — never base ramps (`--ramp-black-800`)
- **Use the spacing scale** — never hardcode arbitrary pixel values
- **Pair tinted backgrounds with `-on` text**: `bg-bg-brand` + `text-text-onbrand`
- **Tertiary colors are below WCAG AA** — decorative/placeholder only, never for critical content

## Step 5: Provide Recommendations

When a recipe match was found in Step 2, cite the recipe name and ground recommendations in its actual code.

Format every recommendation with:

1. **Token name** in both formats:
   - Tailwind: `text-text-secondary`
   - CSS var: `--color-text-secondary`
2. **Why this token**: Brief explanation of the semantic match
3. **Context**: Show it in a realistic JSX snippet using real patterns from the templates
4. **Caveats**: Accessibility notes, theme behavior, or alternatives

### Example Output

> For the subtitle text under a card title:
>
> - **Tailwind**: `className="text-bodyMd text-text-secondary"`
> - **CSS var**: `font-size: var(--text-body-medium-font-size); color: var(--color-text-secondary);`
> - **Why**: Secondary text for supporting information below a primary heading. Meets WCAG AA contrast.
>
> ```tsx
> <div className="bg-bg border border-border rounded-lg p-3">
>   <h3 className="text-bodyLgStrong text-text">Card Title</h3>
>   <p className="text-bodyMd text-text-secondary">Supporting description</p>
> </div>
> ```

## Anti-Patterns to Flag

If you spot any of these in existing code, recommend fixes:

- Hardcoded hex colors or `rgb()` values → replace with semantic color tokens
- Off-scale spacing (e.g., `p-[14px]`) → snap to nearest scale value
- Custom font weights (e.g., `font-[475]`) → use `font-normal` (450) or `font-bold` (550)
- Native `<button>` elements → use FPL `<Button>` or `<IconButton>`
- Base ramp usage (`--ramp-*`) → replace with semantic token
- Tertiary colors on critical content → upgrade to primary/secondary
