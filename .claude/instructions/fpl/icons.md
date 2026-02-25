# FPL Icons

## Overview

Icons are in a **separate package**: `@figma/fpl-icons` (not `@figma/fpl-components`).

- Icons are React components
- No separate CSS import required
- Icons render as inline SVG

## Import Pattern

```tsx
import { IconPlus, IconSettings, IconEye } from '@figma/fpl-icons';
```

## Naming Convention

Icons use PascalCase with `Icon` prefix:

- `IconPlus`
- `IconSettings`
- `IconEye`
- `IconChevronDown`
- `IconSwatch`

## Common Icons

Based on project usage patterns:

| Icon | Use Case |
|------|----------|
| `IconPlus` | Add actions, create buttons |
| `IconSettings` | Settings, configuration |
| `IconEye` | Visibility toggle |
| `IconChevronDown` | Dropdowns, expandable sections |
| `IconSwatch` | Color/style selection |

**Note**: This is not a complete list. See Discovery section below.

## Discovery

The full icon list requires access to the FPL source. To find available icons:

1. **Use the fpl-docs agent** - Ask it for the complete icon list
2. **Run CLI** - `pnpm fpl list` shows all FPL exports including icons

## Usage Examples

### Icon Button

```tsx
import { Button } from '@figma/fpl-components';
import { IconPlus } from '@figma/fpl-icons';

<Button variant="ghost">
  <IconPlus />
</Button>
```

### Icon with Text

```tsx
import { IconSettings } from '@figma/fpl-icons';

<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <IconSettings />
  <span>Settings</span>
</div>
```

## Limitations

The FPL icons source is not directly accessible in this environment. For complete documentation:

- Use the `fpl-docs` agent for icon queries
- Consult the FPL docs at `~/figma/figma/fpl/apps/docs/`
- Run `pnpm fpl list` when FPL packages are installed
