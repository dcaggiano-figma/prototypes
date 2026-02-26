# FPL Setup Guidelines

Instructions for configuring FPL (Figma Platform Library) in prototype projects.

## 0. Build FPL First (Critical)

**Before running any prototype app, FPL packages must be built.**

```bash
# From the repository root
pnpm build
```

This builds the FPL components, icons, and tokens packages. Without this step:
- You'll see `Cannot find module '@figma/fpl-components'` errors
- Components will render without Figma styling
- TypeScript imports won't resolve

**When to rebuild:** After pulling changes that modify `fpl/packages/*`.

## 1. Prerequisites

- **Node.js**: Version 18+
- **React**: Version 18+
- **figma/figma repo**: Cloned locally at `~/figma/figma` (or custom path via `FPL_PATH`)

## 2. Dependencies

Add FPL packages to your `package.json`:

```json
{
  "dependencies": {
    "@figma/fpl-components": "link:../../.fpl/components",
    "@figma/fpl-icons": "link:../../.fpl/icons",
    "@figma/fpl-tokens": "link:../../.fpl/tokens"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "zod": "^3.25.76"
  }
}
```

Then run `pnpm install`.

## 3. CSS Configuration

FPL requires two CSS imports in your entry point. **Import order matters.**

### Complete main.tsx Example

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
// CSS imports: tokens FIRST, then components
import '@figma/fpl-tokens/index.css';
import '@figma/fpl-components/fpl.css';
import App from './App';
import './main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Why Order Matters

1. **Tokens first** (`@figma/fpl-tokens/index.css`): Defines CSS custom properties (`--btn-height`, `--color-bg-brand`, etc.)
2. **Components second** (`@figma/fpl-components/fpl.css`): Component styles that reference the tokens

Reversing the order or omitting either import will cause components to render without Figma styling.

## 4. FPL Symlink Setup

FPL packages are accessed via a `.fpl` symlink at the repository root pointing to `figma/figma`.

### How It Works

```
.fpl -> ~/figma/figma
         └── fpl/
             ├── components/  -> @figma/fpl-components
             ├── icons/       -> @figma/fpl-icons
             └── tokens/      -> @figma/fpl-tokens
```

### Setup Commands

```bash
# Standard setup (uses ~/figma/figma or FPL_PATH from .env.local)
pnpm setup

# Custom path via environment variable
FPL_PATH=/custom/path pnpm setup
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Broken `.fpl` symlink | Run `pnpm setup` |
| `fpl directory not found` | Set `FPL_PATH` to figma/figma root (not the `fpl/` subdirectory) |
| Packages not resolving | Run `pnpm install` after setup |

Verify symlink:
```bash
ls -la .fpl && ls .fpl/fpl/components
```

## 5. TypeScript Configuration

Extend from the shared React tsconfig:

```json
{
  "extends": "@figma/ppg-tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

The base config provides: `"jsx": "react-jsx"`, DOM types, and strict mode.

## 6. Verification Steps

1. **Check symlink**: `ls -la .fpl && ls .fpl/fpl/components`
2. **Verify packages**: `pnpm list @figma/fpl-components @figma/fpl-tokens @figma/fpl-icons`
3. **Start dev server**: `pnpm dev`
4. **Browser verification**: Components render with Figma styling, no CSS errors in console
5. **Inspect design tokens** (DevTools): Select an FPL component, verify CSS variables (`--btn-height`, `--color-bg-brand`) are applied
6. **TypeScript verification**: Autocomplete works for `@figma/fpl-components` imports, `pnpm typecheck` passes

## Quick Reference

| Task | Command |
|------|---------|
| Setup FPL symlink | `pnpm setup` |
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` |
| Type check | `pnpm typecheck` |
| List FPL exports | `pnpm fpl list` |
