# FPL Styling Guidelines

This document covers styling setup, design tokens, and custom CSS for FPL components.

---

## 1. CSS Imports (Required)

FPL requires two CSS imports in your entry point file. The order matters.

```tsx
// In main.tsx or entry point
import '@figma/fpl-tokens/index.css';   // FIRST: CSS custom properties (design tokens)
import '@figma/fpl-components/fpl.css'; // SECOND: Component styles
```

### Why Order Matters

1. **Tokens first**: `@figma/fpl-tokens/index.css` defines CSS custom properties (variables) on `:root`
2. **Components second**: `@figma/fpl-components/fpl.css` contains component styles that reference those tokens via `var(--token-name)`

If you import components before tokens, components will render with missing or default values for CSS variables.

### Complete Entry Point Example

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@figma/fpl-tokens/index.css';   // Design tokens
import '@figma/fpl-components/fpl.css'; // Component styles

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

---

## 2. Design Tokens

FPL design tokens are CSS custom properties that define the visual design language (colors, spacing, sizing, etc.).

### How Tokens Work

- Tokens are defined in `@figma/fpl-tokens/index.css`
- They are set on `:root` and available globally
- FPL components consume these tokens internally via `var(--token-name)`
- You can use the same tokens in your custom CSS

### Known Token Patterns

| Category | Pattern | Example |
|----------|---------|---------|
| Colors | `--color-{purpose}-{variant}` | `--color-bg-brand` |
| Button | `--btn-{property}` | `--btn-height` |

### Using Tokens in Custom CSS

```css
/* Using tokens in custom CSS */
.my-custom-element {
  background: var(--color-bg-brand);
  height: var(--btn-height);
}

.custom-panel {
  /* Use color tokens for theming support */
  background-color: var(--color-bg-brand);
  border: 1px solid var(--color-border-default);
}
```

### Token Guidelines

- Always use semantic tokens, not raw values
- Use `var(--token-name)` syntax to reference tokens
- Tokens automatically support theme changes when implemented

---

## 3. Styling Architecture

FPL uses **Vanilla Extract** for CSS-in-JS internally. This means:

- Component styles are generated at build time
- Styles are type-safe and scoped
- The `@figma/fpl-components/fpl.css` file contains all generated component styles
- You do not need to configure Vanilla Extract in your project to use FPL

### What This Means for You

- Import the pre-built CSS file (`@figma/fpl-components/fpl.css`)
- Do not try to import individual component `.css.ts` files
- Component class names are auto-generated and stable

---

## 4. Custom Styling

### Inline Styles on FPL Components

FPL components accept a `style` prop for inline styles:

```tsx
<Input
  style={{ width: '100%', marginTop: '0.25rem' }}
  value={email}
  onChange={setEmail}
/>

<Button
  variant="primary"
  style={{ marginLeft: 'auto' }}
>
  Submit
</Button>
```

### When to Use Custom Styles

- **Layout adjustments**: width, margin, padding, flex properties
- **Positioning**: position, top, left, etc.
- **One-off overrides**: specific spacing for a particular context

### When NOT to Use Custom Styles

- **Colors**: Use design tokens or component variants instead
- **Typography**: Rely on component defaults
- **Component internals**: Do not override internal component styles

### Wrapper Elements for Complex Layouts

For complex layouts, wrap FPL components:

```tsx
<div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
  <Input style={{ flex: 1 }} value={firstName} onChange={setFirstName} />
  <Input style={{ flex: 1 }} value={lastName} onChange={setLastName} />
</div>
```

---

## 5. Verification

### How to Verify Tokens Are Applied

1. **Open browser DevTools** (F12 or right-click > Inspect)

2. **Select an FPL component** (e.g., a Button)

3. **Check the Computed styles tab** for CSS variable values:
   - `--btn-height` should have a value (e.g., `32px`)
   - `--color-bg-brand` should have a color value

4. **Check the Elements panel** for `:root` CSS variables:
   - Expand `:root` in the styles panel
   - Verify token definitions are present

### Verification Checklist

- [ ] Both CSS imports present in entry file
- [ ] Imports in correct order (tokens before components)
- [ ] No CSS-related errors in browser console
- [ ] Components render with proper Figma styling
- [ ] DevTools shows token values on component elements

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Unstyled components | Missing CSS imports | Add both CSS imports to entry file |
| Wrong colors/sizing | Import order reversed | Put tokens import before components import |
| Partial styling | Only one CSS file imported | Ensure both token and component CSS are imported |

---

## Quick Reference

```tsx
// Entry point imports (correct order)
import '@figma/fpl-tokens/index.css';
import '@figma/fpl-components/fpl.css';

// Using tokens in custom CSS
.custom { background: var(--color-bg-brand); }

// Inline styles on components
<Input style={{ width: '100%' }} />
```
