# Typography Token Reference

## Typography Decision Tree

```
"What text style?"
 |
 +-- Marketing/hero → <Heading size="display"> / text-display (48px)
 +-- Page title → <Heading size="lg"> / text-headingLg (24px)
 +-- Section header → <Heading size="md"> / text-headingMd (~16-18px)
 +-- Subsection header → <Heading size="sm"> / text-headingSm (~14px)
 +-- Card title (bold) → <Text size="lg" strong> / text-bodyLgStrong (13px)
 +-- Comfortable body → <Text size="lg"> / text-bodyLg (13px)
 +-- Form label (bold) → <Text strong> / text-bodyMdStrong (11px)
 +-- Default UI text → <Text> / text-bodyMd (11px)  [DEFAULT]
 +-- Legal text/metadata → <Text size="sm"> / text-bodySm (9px)
 +-- Small input label (bold) → <Text size="sm" strong> / text-bodySmStrong (9px)
```

## Prefer Shared Components

Use the shared `Text` and `Heading` components as the primary way to apply typography styles. Import from `@shared/components`.

```tsx
import { Text, Heading } from '@shared/components';

<Heading size="lg">Page Title</Heading>
<Text>Default body text</Text>
<Text size="sm" strong>Bold caption</Text>
<Text mono>Code snippet</Text>
```

Both components accept:
- `color` prop for semantic text colors (`secondary`, `tertiary`, `danger`, etc.)
- `truncate` prop for line clamping

Use raw classes only when applying typography to non-text elements, canvas/scenegraph contexts, or elements already rendered by other components.

## Tailwind Typography Classes (Fallback)

Use these when you can't use the shared components (e.g., styling non-text elements, canvas contexts).

Each class sets font-family, font-size, font-weight, line-height, and letter-spacing as a bundle.

| Tailwind Class | CSS Variable Prefix | Size | Use For |
|---|---|---|---|
| `text-display` | `--text-display-*` | 48px | Landing pages, marketing hero |
| `text-headingLg` | `--text-heading-large-*` | 24px | Page titles, dialog headers |
| `text-headingMd` | `--text-heading-medium-*` | ~16-18px | Section headers |
| `text-headingSm` | `--text-heading-small-*` | ~14px | Subsection headers |
| `text-bodyLg` | `--text-body-large-*` | 13px | Comfortable reading, forms, comments |
| `text-bodyLgStrong` | `--text-body-large-strong-*` | 13px | Card titles, sidebar sections |
| `text-bodyMd` | `--text-body-medium-*` | 11px | Default UI text, descriptions |
| `text-bodyMdStrong` | `--text-body-medium-strong-*` | 11px | Form labels, table headers |
| `text-bodySm` | `--text-body-small-*` | 9px | Timestamps, captions, helper text |
| `text-bodySmStrong` | `--text-body-small-strong-*` | 9px | Bold captions |

## CSS Variable Properties

Each text style has 5 individual properties for canvas/custom use:

```
--text-body-medium-font-family
--text-body-medium-font-size
--text-body-medium-font-weight
--text-body-medium-line-height
--text-body-medium-letter-spacing
```

Strong variants override font-weight: `--text-body-medium-strong-font-weight`

## Font Family

| Purpose | Tailwind | CSS Variable | Font |
|---|---|---|---|
| Default UI (99% of cases) | `font-sans` | `--font-family-default` | Inter |
| Code/technical | `font-mono` | `--font-family-mono` | Roboto Mono |
| Display/marketing | `font-display` | `--font-family-display` | Whyte (Figma only) |

## Font Weight

Only two weights exist. Never use arbitrary weight values.

| Purpose | Tailwind | CSS Variable | Value |
|---|---|---|---|
| Normal | `font-normal` | `--font-weight-default` | 450 |
| Strong/emphasis | `font-bold` | `--font-weight-strong` | 550 |

Prefer using the bundled typography classes (`text-bodyMdStrong`) over combining `text-bodyMd font-bold`.

## Canvas Usage

For scenegraph rendering, read individual CSS variable properties:

```typescript
const style = getComputedStyle(document.documentElement);
const fontSize = style.getPropertyValue('--text-body-medium-font-size').trim();
const fontWeight = style.getPropertyValue('--text-body-medium-font-weight').trim();
const lineHeight = style.getPropertyValue('--text-body-medium-line-height').trim();
```
