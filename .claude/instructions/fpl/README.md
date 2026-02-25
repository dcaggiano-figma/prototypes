# FPL (Figma Platform Library) Guidelines

## Quick Reference

### Essential Setup (main.tsx)
```tsx
import '@figma/fpl-tokens/index.css';     // MUST be first
import '@figma/fpl-components/fpl.css';   // MUST be second
```

### Critical Pattern: onChange
```tsx
// FPL pattern - pass the setter directly
<Input value={email} onChange={setEmail} />

// NOT the standard React event pattern
<Input value={email} onChange={(e) => setEmail(e.target.value)} />  // WRONG
```

### Discovery
```bash
pnpm fpl list    # List all components, hooks, and utilities
```

---

## When to Use FPL

- Building prototypes that need Figma-styled UI
- Creating high-fidelity mockups with authentic Figma components
- Rapid prototyping with pre-built, accessible components
- Any UI that should match Figma's design language

---

## Guideline Files Index

| File | Description |
|------|-------------|
| [components.md](./components.md) | Component APIs, props, and usage patterns |
| [tokens.md](./tokens.md) | Design tokens and CSS custom properties |
| [icons.md](./icons.md) | Icon library usage and available icons |
| [setup.md](./setup.md) | Project setup and configuration |

---

## Getting Help

| Need | Action |
|------|--------|
| Component list | Run `pnpm fpl list` |
| Component docs | Use the `fpl-docs` agent |
| Props/API info | Ask `fpl-docs` agent with component name |
| Example code | See `/workspace/apps/example-prototype/src/App.tsx` |

**For all FPL questions**: Use the `fpl-docs` sub-agent. It has access to full FPL documentation.

---

## MANDATORY: Invoke fpl-docs Before Implementing Components

**Before implementing any FPL component:**
1. Invoke the `fpl-docs` agent with your specific use case
2. Ask: "How do I use [ComponentName] for [your use case]?"
3. Get working code examples before writing any implementation

**Example workflow:**
```
1. Task: "Create a metadata editing modal"
2. FIRST: Invoke fpl-docs agent: "How do I use Modal to create a form dialog?"
3. Get example code showing correct pattern
4. THEN: Implement based on the example
```

**Modal Pattern (controlled via useModal hook):**
```tsx
const [isOpen, setIsOpen] = useState(false);
const manager = Modal.useModal({
  open: isOpen,
  onClose: () => setIsOpen(false),
});

<Button onClick={() => setIsOpen(true)}>Open</Button>
<Modal.Root manager={manager} width="md">
  <Modal.Contents>
    <Modal.Header><Modal.Title>Edit Metadata</Modal.Title></Modal.Header>
    <Modal.Body>...</Modal.Body>
    <Modal.Footer>
      <Modal.ActionStrip>
        <Button onClick={() => setIsOpen(false)}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save</Button>
      </Modal.ActionStrip>
    </Modal.Footer>
  </Modal.Contents>
</Modal.Root>
```

**Common mistake**: Implementing based on assumptions, then debugging for multiple iterations. Save time by asking fpl-docs first.

---

## Boundaries

### Always Do

1. Import `@figma/fpl-tokens/index.css` BEFORE `@figma/fpl-components/fpl.css`
2. Pass value setters directly to `onChange` (not event handlers)
3. Import components from `@figma/fpl-components` directly
4. Run `pnpm fpl list` to discover available components before creating custom ones
5. Use the `fpl-docs` agent for component documentation

### Never Do

1. Import component CSS without token CSS first
2. Use event handler pattern `onChange={(e) => setValue(e.target.value)}`
3. Create custom components when FPL provides them
4. Hardcode colors - use FPL design tokens instead
5. Skip peer dependencies: `react` (>=18), `react-dom` (>=18), `zod`

---

## Example: Minimal FPL App

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@figma/fpl-tokens/index.css';
import '@figma/fpl-components/fpl.css';
import { Button, Input } from '@figma/fpl-components';

function App() {
  const [value, setValue] = React.useState('');
  return (
    <div>
      <Input value={value} onChange={setValue} placeholder="Type here" />
      <Button variant="primary">Submit</Button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "@figma/fpl-components": "link:../../.fpl/components",
    "@figma/fpl-tokens": "link:../../.fpl/tokens",
    "@figma/fpl-icons": "link:../../.fpl/icons"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "zod": "^3.25.76"
  }
}
```
