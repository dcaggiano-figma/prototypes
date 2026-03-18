# Spacing & Layout Token Reference

## Spacing Decision Tree

```
"What spacing value?"
 |
 +-- Minimal (icon padding, badge) → 1 / 4px / --spacer-1
 +-- Tight (button horiz, list padding) → 2 / 8px / --spacer-2
 +-- In-between (compact list) → 2.5 / 12px / --spacer-2-5
 +-- Standard (cards, form margins) → 3 / 16px / --spacer-3  [DEFAULT]
 +-- Medium (section/modal padding) → 4 / 24px / --spacer-4
 +-- Large (page sections) → 5 / 32px / --spacer-5
 +-- Extra-large (hero sections) → 6 / 40px / --spacer-6
```

## Spacing Scale

### REM-based (preferred for responsive layout)

| Tailwind Value | CSS Variable | Resolved | Common Uses |
|---|---|---|---|
| `0` | `--spacer-0` | 0 | Reset |
| `1` | `--spacer-1` | 4px / 0.25rem | Chip/badge padding, icon gaps |
| `2` | `--spacer-2` | 8px / 0.5rem | Button h-padding, list padding, small gaps |
| `2.5` | `--spacer-2-5` | 12px / 0.75rem | Compact lists, when 8px is too tight |
| `3` | `--spacer-3` | 16px / 1rem | Card padding, form margins, layout gaps |
| `4` | `--spacer-4` | 24px / 1.5rem | Section/modal padding, medium heights |
| `5` | `--spacer-5` | 32px / 2rem | Page sections, large component heights |
| `6` | `--spacer-6` | 40px / 2.5rem | Hero sections, max spacing |

Tailwind usage: `p-3`, `gap-2`, `mx-4`, `mt-1`, `space-y-3`

### Pixel-based (for precise control)

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

Tailwind usage: `p-8px`, `gap-4px`, `pl-12px`, `mt-16px`

Both systems resolve to the same pixel values. Use pixel-based when you want explicit control.

## Border Radius Decision Tree

```
"What border radius?"
 |
 +-- None (tables, edge-to-edge panels) → rounded-none / --radius-none (0)
 +-- Subtle (small elements <= 16px) → rounded-sm / --radius-small (2px)
 +-- Standard (buttons, inputs, cards) → rounded-md / --radius-medium (5px)  [DEFAULT]
 +-- Heavy (large cards, modals) → rounded-lg / --radius-large (13px)
 +-- Pill/circle → rounded-full / --radius-full (9999px)
```

**Size guideline**: Height <= 16px → `rounded-sm`, 17-40px → `rounded-md`, >40px or large containers → `rounded-lg`

## Component Target Sizes

| Component Type | Height | Spacer | Tailwind |
|---|---|---|---|
| Small non-interactive (badge, chip) | 16px | `--spacer-3` | `h-3` |
| Medium interactive (default button, input) | 24px | `--spacer-4` | `h-4` |
| Large interactive (prominent button) | 32px | `--spacer-5` | `h-5` |

Minimum touch target: 24px (`--spacer-4`). Recommended: 32px (`--spacer-5`).

## Elevation (Box Shadow)

| Level | Tailwind | CSS Variable | Use For |
|---|---|---|---|
| Subtle | `shadow-100` | `--elevation-100` | Subtle lift |
| Low | `shadow-200` | `--elevation-200` | Cards, dropdowns |
| Medium | `shadow-300` | `--elevation-300` | Popovers, menus |
| High | `shadow-400` | `--elevation-400` | Modals, dialogs |
| Highest | `shadow-500` | `--elevation-500` | Tooltips, overlays |

## Transition Duration

| Speed | Tailwind | CSS Variable |
|---|---|---|
| None | `duration-0` | `--duration-none` |
| Fast | `duration-sm` | `--duration-sm` |
| Default | `duration-md` | `--duration-md` |
| Slow | `duration-lg` | `--duration-lg` |

## Canvas Usage

For scenegraph rendering, resolve spacer and radius values:

```typescript
const style = getComputedStyle(document.documentElement);
const spacing = style.getPropertyValue('--spacer-3').trim();  // → "1rem" or "16px"
const radius = style.getPropertyValue('--radius-medium').trim(); // → "5px"
```
