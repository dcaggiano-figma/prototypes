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

This skill helps you make informed decisions about which design tokens from `@figma/fpl-tokens` to use when building interfaces and components.

## When to Use This Skill

Use this skill proactively when:
1. Building new UI components or features
2. You encounter hardcoded CSS values (colors, px spacing, font sizes)
3. User asks for styling guidance
4. Implementing designs without explicit token specifications
5. Refactoring existing code to use the design system

## Instructions

### Step 1: Understand the Context

Identify what the user is trying to style:
- **Element type**: Button, card, text, icon, border, background, spacing?
- **Visual hierarchy**: Primary, secondary, tertiary, disabled?
- **Interactive state**: Default, hover, focus, active, disabled?
- **Semantic meaning**: Brand, success, error, warning, neutral?
- **Theme/mode**: Which theme (design, figjam, devmode) and mode (light, dark, EC)?

### Step 2: Consult the Token Guidelines

Read [TOKEN_GUIDELINES.md](./TOKEN_GUIDELINES.md) to find the appropriate token using decision trees for:
- **Colors**: Text, background, border, icon colors
- **Typography**: Font size, weight, family for different text types
- **Spacing**: Padding, margin, gap values
- **Border Radius**: Corner rounding for different component types
- **Sizing**: Component heights and widths

### Step 3: Apply Semantic Tokens

**Always prefer semantic tokens over base ramps:**
- ✅ `--color-text`, `--color-bg`, `--color-border`
- ❌ `--ramp-black-800`, `--ramp-white-1000`

**Why?** Semantic tokens automatically adapt to theme and mode changes.

### Step 4: Check for Existing Patterns

Before deciding, check if similar components exist in the codebase:
- Search for similar component types
- Look at existing FPL component usage
- Follow established patterns for consistency

### Step 5: Provide Clear Recommendations

When recommending tokens:
1. **Name the token**: `--color-text`, `--spacer-3`, `--text-body-medium-font-size`
2. **Explain why**: "This is for primary body text, so we use `--color-text` which meets WCAG AA contrast"
3. **Show the pattern**: Provide a complete example with related tokens
4. **Note any caveats**: Accessibility concerns, theme-specific behavior

### Step 6: Validate Accessibility

Ensure token choices meet accessibility requirements:
- Text colors must meet WCAG AA contrast (use `--color-text` or `--color-text-secondary`)
- Avoid `--color-text-tertiary` for critical content
- Provide focus indicators with sufficient contrast
- Don't rely on color alone for meaning

## Common Patterns

### Button
```css
padding: var(--spacer-1) var(--spacer-2);
background: var(--color-bg-brand);
color: var(--color-text-onbrand);
border-radius: var(--radius-medium);
font-size: var(--text-body-medium-font-size);
font-weight: var(--font-weight-strong);
```

### Card
```css
padding: var(--spacer-3);
background: var(--color-bg);
border: 1px solid var(--color-border);
border-radius: var(--radius-large);
```

### Input Field
```css
padding: var(--spacer-1) var(--spacer-2);
background: var(--color-bg-secondary);
border: 1px solid var(--color-border);
border-radius: var(--radius-medium);
font-size: var(--text-body-medium-font-size);
color: var(--color-text);
```

### Text Hierarchy
```css
/* Page title */
font-size: var(--text-heading-large-font-size);
font-weight: var(--text-heading-large-font-weight);
color: var(--color-text);

/* Card title */
font-size: var(--text-body-large-font-size);
font-weight: var(--text-body-large-strong-font-weight);
color: var(--color-text);

/* Body text */
font-size: var(--text-body-medium-font-size);
color: var(--color-text);

/* Supporting text */
font-size: var(--text-body-medium-font-size);
color: var(--color-text-secondary);
```

## Anti-Patterns to Avoid

❌ **Using base color ramps directly**
```css
color: var(--ramp-black-800); /* Breaks theming */
```

❌ **Hardcoding spacing values**
```css
padding: 14px; /* Inconsistent with design system */
```

❌ **Creating custom font weights**
```css
font-weight: 475; /* Not part of the design system */
```

❌ **Using tertiary colors for critical content**
```css
.error { color: var(--color-text-tertiary); } /* Fails accessibility */
```

## Additional Resources

- **Detailed Decision Trees**: [TOKEN_GUIDELINES.md](./TOKEN_GUIDELINES.md)
- **FPL Documentation**: `.claude/instructions/fpl/`
- **Common Mistakes**: `.claude/instructions/fpl/common-mistakes.md`

## Notes

- This skill should complete quickly - just provide clear token recommendations
- Always explain the "why" behind token choices
- When uncertain between two tokens, explain the tradeoffs and let the user decide
- Reference the TOKEN_GUIDELINES.md file for comprehensive decision trees
