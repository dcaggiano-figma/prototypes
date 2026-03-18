# FPL Icons

Icons are in a **separate package**: `@figma/fpl-icons` (not `@figma/fpl-components`). No separate CSS import required.

## Import Pattern

```tsx
import { Icon24Plus, Icon16Checkmark } from '@figma/fpl-icons';
```

## Naming Convention

Icons follow the pattern `Icon{size}{Name}{Variant}`:

- **`Icon16*`** — 16px icons. Use in small containers (Badge `iconPrefix`, tight layouts)
- **`Icon24*`** (default) — 24px icons. Use for most components (Button `iconPrefix`, Select `iconLead`, Chip `leading`/`trailing`)
- **`Icon24*Large`** — Larger 24px icons. Use with `IconButton size="lg"`

Examples: `Icon24Plus`, `Icon24Checkmark`, `Icon24SettingsLarge`, `Icon16ChevronDown`

## Icon Placement by Component

```
Button:     iconPrefix={<Icon24Plus />}       (NOT icon as child)
Badge:      iconPrefix={<Icon16Checkmark />}   (use Icon16 size)
Chip:       leading={<Icon24Component />}            (before text)
            trailing={<Icon16ChevronDown />}    (after text)
Select:     iconLead={<Icon24Folder />}         (on Trigger and/or Option)
IconButton: <IconButton aria-label="Add"><Icon24Plus /></IconButton>
            (icon IS the child, aria-label REQUIRED)
```

## Discovery

```bash
pnpm fpl icons search <keywords>   # Semantic search for icons by description
```

Examples:
```bash
pnpm fpl icons search "plus add"
pnpm fpl icons search "settings gear"
pnpm fpl icons search "arrow right"
```

Also available: the `icon-search` agent for natural language icon queries.
