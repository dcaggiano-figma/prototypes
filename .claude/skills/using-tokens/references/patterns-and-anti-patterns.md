# Patterns & Anti-Patterns

## Real Tailwind Patterns from Templates

Extracted from `browser-shell/src/App.tsx` — a production-quality file manager UI.

### Page Shell

```tsx
{/* Full-height layout with sidebar */}
<div className="bg-bg min-h-screen flex">
  {/* Sidebar */}
  <aside className="w-[240px] bg-bg border-r border-border flex flex-col shrink-0">
    ...
  </aside>
  {/* Main area */}
  <div className="flex-1 flex flex-col">
    <header className="p-8px gap-4 border-b border-border flex items-center justify-between">
      ...
    </header>
    <main className="flex-1 p-24px overflow-auto">
      ...
    </main>
  </div>
</div>
```

Key tokens: `bg-bg`, `border-border`, `border-r`, `border-b`, `p-8px`, `p-24px`

### Navigation Link (Active/Inactive)

```tsx
const BASE_LINK = 'flex items-center gap-8px px-4px py-4px rounded-md text-bodyMd no-underline';

function navLinkClass(isActive: boolean) {
  return `${BASE_LINK} ${
    isActive
      ? 'bg-bg-selected text-text'
      : 'text-text hover:bg-bg-transparent-hover'
  }`;
}
```

Key tokens: `gap-8px`, `px-4px`, `py-4px`, `rounded-md`, `text-bodyMd`, `bg-bg-selected`, `text-text`, `hover:bg-bg-transparent-hover`

### Sidebar Section with Search

```tsx
<div className="px-8px pt-8px">
  <Input.Root size="lg">
    <div className="py-4px pl-4px pr-8px">
      <Icon24Search className="text-icon-tertiary shrink-0" />
    </div>
    <Input id="sidebar-search" placeholder="Search" size="lg" />
  </Input.Root>
</div>
```

Key tokens: `px-8px`, `pt-8px`, `py-4px`, `pl-4px`, `pr-8px`, `text-icon-tertiary`

### Nav Groups with Borders

```tsx
{/* Primary nav */}
<nav className="flex flex-col gap-4px px-8px pb-8px pt-4px">
  {items.map(item => (
    <NavLink className={({ isActive }) => navLinkClass(isActive)}>
      <item.icon />
      {item.label}
    </NavLink>
  ))}
</nav>

{/* Secondary nav (separated by border) */}
<nav className="flex flex-col gap-4px border-t border-border p-8px">
  ...
</nav>
```

Key tokens: `gap-4px`, `px-8px`, `pb-8px`, `pt-4px`, `border-t border-border`, `p-8px`

### Header Bar

```tsx
<header className="p-8px gap-4 border-b border-border flex items-center justify-between">
  <div className="flex items-center">
    <IconButton size="lg" aria-label="Back">
      <Icon24ChevronLeftLarge />
    </IconButton>
    <h1 className="text-bodyLg text-text pl-12px">{title}</h1>
  </div>
  <div className="flex items-center gap-8px">
    <Button size="lg" variant="secondary">Create new</Button>
    <IconButton size="lg" aria-label="Import">
      <Icon24Import />
    </IconButton>
  </div>
</header>
```

Key tokens: `p-8px`, `border-b border-border`, `text-bodyLg`, `text-text`, `pl-12px`, `gap-8px`

### User Menu / Dropdown

```tsx
<ButtonPrimitive className="flex items-center gap-1 p-1 py-1 rounded-md hover:bg-bg-transparent active:bg-bg-transparent-secondary">
  <Avatar size="md" />
  <span className="text-bodyLg text-text">Kelly Shin</span>
  <Icon16ChevronDown />
</ButtonPrimitive>

{/* Menu content */}
<div className="flex flex-col items-center justify-center px-2 pt-2 pb-3 w-[200px]">
  <Avatar size="xlg" />
  <span className="text-bodyMd text-text">Kelly Shin</span>
  <span className="text-bodyMd text-text-secondary">email@example.com</span>
</div>
```

Key tokens: `gap-1`, `p-1`, `rounded-md`, `hover:bg-bg-transparent`, `text-bodyLg`, `text-bodyMd`, `text-text`, `text-text-secondary`, `px-2`, `pt-2`, `pb-3`

---

## Common Component Patterns (Tailwind)

### Card

```tsx
<div className="bg-bg border border-border rounded-lg p-3 flex flex-col gap-3">
  <h3 className="text-bodyLgStrong text-text">Title</h3>
  <p className="text-bodyMd text-text-secondary">Description</p>
</div>
```

### List Item with Hover

```tsx
<div className="flex items-center gap-2 px-3 py-2 hover:bg-bg-hover rounded-md">
  <Icon24Page className="text-icon-secondary" />
  <span className="text-bodyMd text-text">Item label</span>
  <span className="text-bodySm text-text-secondary ml-auto">metadata</span>
</div>
```

### Error Banner

```tsx
<div className="bg-bg-danger-tertiary border border-border-danger rounded-md p-3 flex items-center gap-2">
  <Icon16Warning className="text-icon-danger" />
  <span className="text-bodyMd text-text-danger">Error message</span>
</div>
```

### Input with Label

```tsx
<div className="flex flex-col gap-1">
  <label className="text-bodyMdStrong text-text">Label</label>
  <Input placeholder="Placeholder" />
  <span className="text-bodySm text-text-secondary">Helper text</span>
</div>
```

---

## Anti-Patterns

### Never use base color ramps

```tsx
{/* BAD — breaks theming */}
<div className="text-[#1e1e1e] bg-[#ffffff]">

{/* GOOD — adapts to theme/mode */}
<div className="text-text bg-bg">
```

### Never hardcode spacing off-scale

```tsx
{/* BAD — 14px not in spacing scale */}
<div className="p-[14px] gap-[10px]">

{/* GOOD — use scale values */}
<div className="p-3 gap-2.5">
```

### Never create custom font weights

```tsx
{/* BAD — 475 not a defined weight */}
<span style={{ fontWeight: 475 }}>

{/* GOOD — use typography class or token */}
<span className="text-bodyMdStrong">
{/* or */}
<span className="font-bold">
```

### Never use tertiary colors for critical content

```tsx
{/* BAD — below WCAG AA contrast */}
<span className="text-text-tertiary">Error: invalid input</span>

{/* GOOD */}
<span className="text-text-danger">Error: invalid input</span>
```

### Never mix semantic levels

```tsx
{/* BAD — brand border on neutral card */}
<div className="bg-bg border border-border-brand">

{/* GOOD — matching levels */}
<div className="bg-bg border border-border">
```

### Never use native `<button>` elements

```tsx
{/* BAD — no FPL styling */}
<button onClick={handle}>Click</button>

{/* GOOD — use FPL components */}
<Button onClick={handle}>Click</Button>
<IconButton aria-label="Action"><Icon24Plus /></IconButton>
```

---

## Canvas/Scenegraph Patterns

For non-DOM rendering contexts where Tailwind classes don't apply:

### Resolving Tokens at Runtime

```typescript
function getTokenValue(token: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
}

// Usage
const textColor = getTokenValue('--color-text');       // → "#1e1e1e"
const bgColor = getTokenValue('--color-bg');           // → "#ffffff"
const fontSize = getTokenValue('--text-body-medium-font-size'); // → "11px"
const spacing = getTokenValue('--spacer-3');            // → "1rem"
```

### Listening for Theme Changes

```typescript
const observer = new MutationObserver(() => {
  // Re-read token values when theme/mode changes
  updateCanvasColors();
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme', 'data-mode'],
});
```

### Drawing with Tokens

```typescript
// On a canvas or scenegraph node
ctx.fillStyle = getTokenValue('--color-bg');
ctx.fillRect(0, 0, width, height);

ctx.fillStyle = getTokenValue('--color-text');
ctx.font = `${getTokenValue('--text-body-medium-font-weight')} ${getTokenValue('--text-body-medium-font-size')} Inter`;
ctx.fillText('Hello', x, y);
```
