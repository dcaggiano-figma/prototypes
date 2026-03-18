# Color Token Reference

## Naming Convention

Color tokens follow: `--color-{type}-{role}-{prominence}-{interaction}`

| Segment | Values | Required? |
|---|---|---|
| **Type** | `text`, `bg`, `icon`, `border` | Yes |
| **Role** | `brand`, `danger`, `warning`, `success`, `selected`, `disabled`, `component`, `assistive`, `handoff`, `measure`, `info`, `inverse`, `elevated` | No (default = neutral) |
| **Prominence** | `-secondary`, `-tertiary`, `-strong` | No (default = primary) |
| **Interaction** | `-hover`, `-pressed` | No (default = rest) |

Canvas-specific tokens (prefix `fs`) don't follow this pattern.

---

## Text Color Decision Tree

```
"What text color?"
 |
 +-- Primary content → text-text / --color-text
 +-- Supporting/contextual → text-text-secondary / --color-text-secondary
 +-- Decorative/placeholder → text-text-tertiary / --color-text-tertiary
 |   (below WCAG AA — never for critical info)
 +-- Interactive/link → text-text-brand / --color-text-brand
 +-- Error state → text-text-danger / --color-text-danger
 +-- Warning state → text-text-warning / --color-text-warning
 +-- Success state → text-text-success / --color-text-success
 +-- On colored bg → text-text-on{role} / --color-text-on{role}
 |   (e.g. text-text-onbrand on bg-bg-brand)
 +-- Disabled → text-text-disabled / --color-text-disabled
 +-- On canvas (light) → --color-textonlightcanvas
 +-- On canvas (dark) → --color-textondarkcanvas
```

## Background Color Decision Tree

```
"What background color?"
 |
 +-- Main page/canvas → bg-bg / --color-bg
 +-- Cards/panels on bg → bg-bg / --color-bg (flat design)
 +-- Nested element (card in panel) → bg-bg-secondary / --color-bg-secondary
 +-- Input/chip background → bg-bg-secondary / --color-bg-secondary
 +-- Hover state → bg-bg-hover / --color-bg-hover
 |   or bg-bg-transparent-hover for ghost elements
 +-- Selected state → bg-bg-selected / --color-bg-selected
 +-- Primary action (button) → bg-bg-brand / --color-bg-brand
 |   (pair with text-text-onbrand)
 +-- Error surface → bg-bg-danger / --color-bg-danger
 +-- Warning surface → bg-bg-warning / --color-bg-warning
 +-- Success surface → bg-bg-success / --color-bg-success
 +-- Elevated (tooltip/menu) → bg-bg-elevated / --color-bg-elevated
 +-- Disabled → bg-bg-disabled / --color-bg-disabled
 +-- Subtle tinted → bg-bg-{role}-tertiary / --color-bg-{role}-tertiary
```

## Icon Color Decision Tree

```
"What icon color?"
 |
 +-- Primary icon → text-icon / --color-icon
 +-- Secondary icon → text-icon-secondary / --color-icon-secondary
 +-- Decorative (carets) → text-icon-tertiary / --color-icon-tertiary
 +-- Brand/interactive → text-icon-brand / --color-icon-brand
 +-- On colored bg → text-icon-on{role} / --color-icon-on{role}
 +-- Disabled → text-icon-disabled / --color-icon-disabled
 +-- On canvas (light) → --color-icononlightcanvas
 +-- On canvas (dark) → --color-iconondarkcanvas
```

## Border Color Decision Tree

```
"What border color?"
 |
 +-- Default (dividers, inputs) → border-border / --color-border
 +-- Strong (prominent outline) → border-border-strong / --color-border-strong
 +-- Focus/selected → border-border-selected / --color-border-selected
 +-- Brand accent → border-border-brand / --color-border-brand
 +-- Danger → border-border-danger / --color-border-danger
 +-- Disabled → border-border-disabled / --color-border-disabled
```

## Color Role Reference

| Role | Meaning | Text | Background | Border | Icon |
|---|---|---|---|---|---|
| (default) | Neutral | `text-text` | `bg-bg` | `border-border` | `text-icon` |
| `brand` | Accent/interactive | `text-text-brand` | `bg-bg-brand` | `border-border-brand` | `text-icon-brand` |
| `danger` | Error/destructive | `text-text-danger` | `bg-bg-danger` | `border-border-danger` | `text-icon-danger` |
| `warning` | Caution | `text-text-warning` | `bg-bg-warning` | — | `text-icon-warning` |
| `success` | Confirmation | `text-text-success` | `bg-bg-success` | — | `text-icon-success` |
| `selected` | Selection | `text-text-selected` | `bg-bg-selected` | `border-border-selected` | — |
| `disabled` | Inactive | `text-text-disabled` | `bg-bg-disabled` | `border-border-disabled` | `text-icon-disabled` |
| `component` | Figma component | `text-text-component` | `bg-bg-component` | `border-border-component` | `text-icon-component` |

## Pairing Rules

When using a tinted background, always pair with the `-on{role}` text/icon variant:

| Background | Text | Icon |
|---|---|---|
| `bg-bg-brand` | `text-text-onbrand` | `text-icon-onbrand` |
| `bg-bg-danger` | `text-text-ondanger` | `text-icon-ondanger` |
| `bg-bg-warning` | `text-text-onwarning` | `text-icon-onwarning` |
| `bg-bg-success` | `text-text-onsuccess` | `text-icon-onsuccess` |
| `bg-bg-disabled` | `text-text-ondisabled` | `text-icon-ondisabled` |

## Canvas Usage (Scenegraph)

For non-DOM rendering (canvas, WebGL, scenegraph), resolve CSS variable values at runtime:

```typescript
const root = document.documentElement;
const style = getComputedStyle(root);
const textColor = style.getPropertyValue('--color-text').trim(); // → "#1e1e1e"
const bgColor = style.getPropertyValue('--color-bg').trim();     // → "#ffffff"
```

This respects the current theme/mode. Cache values and re-read on theme change.

## Accessibility

- `--color-text` and `--color-text-secondary`: WCAG AA compliant on `--color-bg`
- `--color-text-tertiary` and `--color-text-disabled`: Below WCAG AA — decorative/placeholder only
- Enhanced contrast modes (`light-ec`, `dark-ec`): WCAG AAA compliant
- Never rely on color alone for meaning — add icons or text labels
