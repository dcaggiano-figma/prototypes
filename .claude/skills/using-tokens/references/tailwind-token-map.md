# Tailwind-to-Token Mapping Reference

Every FPL design token has two formats. Choose based on rendering context:

- **DOM components (Tailwind)**: Use className strings directly — `className="text-text bg-bg p-16px"`
- **Canvas/scenegraph**: Use the CSS variable name to resolve at runtime — `getComputedStyle(root).getPropertyValue('--color-text')` returns a hex value

## Themes & Modes

Tokens auto-adapt when `data-theme` and `data-mode` attributes are set on `<html>`. No per-token overrides needed.

- **Themes**: `design` (default), `figjam`, `devmode`, `buzz`, `draw`, `make`, `sites`, `slides`
- **Modes**: `light` (default), `dark`, `light-ec`, `dark-ec` (enhanced contrast)

Set via: `document.documentElement.setAttribute('data-theme', 'design')`
Or use `<ThemeProvider>` from `@fpl/tokens`.

---

## Colors

Tailwind color utilities: `text-{name}`, `bg-{name}`, `border-{name}`

The color names below are kebab-cased versions of the CSS variable (minus `--color-` prefix).

### Text Colors

| Semantic Purpose | Tailwind Class | CSS Variable |
|---|---|---|
| Primary text | `text-text` | `--color-text` |
| Secondary text | `text-text-secondary` | `--color-text-secondary` |
| Tertiary text (low contrast) | `text-text-tertiary` | `--color-text-tertiary` |
| Disabled text | `text-text-disabled` | `--color-text-disabled` |
| Brand/link text | `text-text-brand` | `--color-text-brand` |
| Danger/error text | `text-text-danger` | `--color-text-danger` |
| Warning text | `text-text-warning` | `--color-text-warning` |
| Success text | `text-text-success` | `--color-text-success` |
| Text on brand bg | `text-text-onbrand` | `--color-text-onbrand` |
| Text on danger bg | `text-text-ondanger` | `--color-text-ondanger` |
| Text on disabled bg | `text-text-ondisabled` | `--color-text-ondisabled` |

### Background Colors

| Semantic Purpose | Tailwind Class | CSS Variable |
|---|---|---|
| Default bg | `bg-bg` | `--color-bg` |
| Secondary bg (inputs, chips) | `bg-bg-secondary` | `--color-bg-secondary` |
| Tertiary bg | `bg-bg-tertiary` | `--color-bg-tertiary` |
| Hover bg | `bg-bg-hover` | `--color-bg-hover` |
| Selected bg | `bg-bg-selected` | `--color-bg-selected` |
| Disabled bg | `bg-bg-disabled` | `--color-bg-disabled` |
| Brand bg (primary buttons) | `bg-bg-brand` | `--color-bg-brand` |
| Danger bg | `bg-bg-danger` | `--color-bg-danger` |
| Warning bg | `bg-bg-warning` | `--color-bg-warning` |
| Success bg | `bg-bg-success` | `--color-bg-success` |
| Elevated surface | `bg-bg-elevated` | `--color-bg-elevated` |
| Transparent hover | `bg-bg-transparent-hover` | `--color-bg-transparent-hover` |

### Border Colors

| Semantic Purpose | Tailwind Class | CSS Variable |
|---|---|---|
| Default border | `border-border` | `--color-border` |
| Strong border | `border-border-strong` | `--color-border-strong` |
| Selected/focus border | `border-border-selected` | `--color-border-selected` |
| Brand border | `border-border-brand` | `--color-border-brand` |
| Disabled border | `border-border-disabled` | `--color-border-disabled` |
| Danger border | `border-border-danger` | `--color-border-danger` |

### Icon Colors

| Semantic Purpose | Tailwind Class | CSS Variable |
|---|---|---|
| Primary icon | `text-icon` | `--color-icon` |
| Secondary icon | `text-icon-secondary` | `--color-icon-secondary` |
| Tertiary icon | `text-icon-tertiary` | `--color-icon-tertiary` |
| Disabled icon | `text-icon-disabled` | `--color-icon-disabled` |
| Brand icon | `text-icon-brand` | `--color-icon-brand` |
| On brand bg | `text-icon-onbrand` | `--color-icon-onbrand` |

---

## Typography

Typography uses a custom Tailwind plugin. Each class sets font-family, font-size, font-weight, line-height, and letter-spacing as a bundle.

| Purpose | Tailwind Class | CSS Variable Prefix | Size |
|---|---|---|---|
| Marketing/hero | `text-display` | `--text-display-*` | 48px |
| Page title | `text-headingLg` | `--text-heading-large-*` | 24px |
| Section header | `text-headingMd` | `--text-heading-medium-*` | ~16-18px |
| Subsection header | `text-headingSm` | `--text-heading-small-*` | ~14px |
| Comfortable body | `text-bodyLg` | `--text-body-large-*` | 13px |
| Card title / bold body | `text-bodyLgStrong` | `--text-body-large-strong-*` | 13px |
| Default UI text | `text-bodyMd` | `--text-body-medium-*` | 11px |
| Labels / bold small | `text-bodyMdStrong` | `--text-body-medium-strong-*` | 11px |
| Caption / metadata | `text-bodySm` | `--text-body-small-*` | 9px |
| Bold caption | `text-bodySmStrong` | `--text-body-small-strong-*` | 9px |

For canvas: access individual properties like `--text-body-medium-font-size`, `--text-body-medium-font-weight`, etc.

### Font Family & Weight

| Purpose | Tailwind Class | CSS Variable |
|---|---|---|
| Default (Inter) | `font-sans` | `--font-family-default` |
| Display (Whyte) | `font-display` | `--font-family-display` |
| Monospace (Roboto Mono) | `font-mono` | `--font-family-mono` |
| Normal weight (450) | `font-normal` | `--font-weight-default` |
| Strong weight (550) | `font-bold` | `--font-weight-strong` |

---

## Spacing

Two spacing systems available. Use REM-based spacers for layout, pixel-based for precise control.

### REM-based Spacers

| Purpose | Tailwind Value | CSS Variable | Resolved |
|---|---|---|---|
| None | `0` | `--spacer-0` | 0 |
| Minimal | `1` | `--spacer-1` | 4px / 0.25rem |
| Tight | `2` | `--spacer-2` | 8px / 0.5rem |
| In-between | `2.5` | `--spacer-2-5` | 12px / 0.75rem |
| Standard | `3` | `--spacer-3` | 16px / 1rem |
| Medium | `4` | `--spacer-4` | 24px / 1.5rem |
| Large | `5` | `--spacer-5` | 32px / 2rem |
| Extra-large | `6` | `--spacer-6` | 40px / 2.5rem |

Usage: `p-3` (padding 16px), `gap-2` (gap 8px), `mx-4` (margin-x 24px)

### Pixel-based Spacers

| Tailwind Value | CSS Variable | Resolved |
|---|---|---|
| `0px` | `--spacer-0px` | 0px |
| `4px` | `--spacer-4px` | 4px |
| `8px` | `--spacer-8px` | 8px |
| `12px` | `--spacer-12px` | 12px |
| `16px` | `--spacer-16px` | 16px |
| `24px` | `--spacer-24px` | 24px |
| `32px` | `--spacer-32px` | 32px |
| `40px` | `--spacer-40px` | 40px |

Usage: `p-8px` (padding 8px), `gap-4px` (gap 4px), `pl-12px` (padding-left 12px)

---

## Border Radius

| Purpose | Tailwind Class | CSS Variable | Resolved |
|---|---|---|---|
| None | `rounded-none` | `--radius-none` | 0 |
| Subtle | `rounded-sm` | `--radius-small` | 2px |
| Standard | `rounded` or `rounded-md` | `--radius-medium` | 5px |
| Heavy | `rounded-lg` | `--radius-large` | 13px |
| Pill/circle | `rounded-full` | `--radius-full` | 9999px |

---

## Elevation (Box Shadow)

| Level | Tailwind Class | CSS Variable |
|---|---|---|
| Subtle | `shadow-100` | `--elevation-100` |
| Low | `shadow-200` | `--elevation-200` |
| Medium | `shadow-300` | `--elevation-300` |
| High | `shadow-400` | `--elevation-400` |
| Highest | `shadow-500` | `--elevation-500` |

---

## Transition Duration

| Speed | Tailwind Class | CSS Variable |
|---|---|---|
| None | `duration-0` | `--duration-none` |
| Fast | `duration-sm` | `--duration-sm` |
| Default | `duration-md` | `--duration-md` |
| Slow | `duration-lg` | `--duration-lg` |
