# FPL Common Mistakes and Troubleshooting

When FPL components don't work as expected, check this guide first.

---

## Critical Gotchas

### 1. Wrong onChange Pattern

**Symptom**: Input doesn't update, value stays empty, or throws type errors.

**Cause**: Using the standard React event handler pattern instead of FPL's value setter pattern.

**Fix**: Pass your state setter directly to `onChange` without wrapping it.

```tsx
// WRONG - Standard React pattern (does NOT work with FPL)
<Input onChange={(e) => setValue(e.target.value)} />
<Checkbox onChange={(e) => setChecked(e.target.checked)} />

// CORRECT - FPL pattern (pass setter directly)
<Input onChange={setValue} />
<Checkbox onChange={setChecked} />
```

FPL form components call `onChange(value)` directly, not `onChange(event)`.

---

### 2. Missing CSS Imports

**Symptom**: Components render but look completely unstyled or broken. Missing colors, wrong fonts, no spacing.

**Cause**: CSS files not imported in the application entry point.

**Fix**: Add both required imports to `main.tsx`:

```tsx
// main.tsx
import '@figma/fpl-tokens/index.css';
import '@figma/fpl-components/fpl.css';
```

Both files are required. Components will not display correctly without them.

---

### 3. Wrong CSS Import Order

**Symptom**: Some styles missing, CSS custom properties undefined, partial styling.

**Cause**: Component styles imported before design tokens.

**Fix**: Import tokens BEFORE components:

```tsx
// WRONG - Components before tokens
import '@figma/fpl-components/fpl.css';
import '@figma/fpl-tokens/index.css';

// CORRECT - Tokens first, then components
import '@figma/fpl-tokens/index.css';
import '@figma/fpl-components/fpl.css';
```

Token CSS defines custom properties that component CSS depends on.

---

### 4. Missing zod Dependency

**Symptom**: Build fails with "Cannot find module 'zod'" or runtime errors about zod.

**Cause**: zod is a peer dependency that must be installed explicitly.

**Fix**: Install zod in your project:

```bash
pnpm add zod
```

---

### 5. React Version < 18

**Symptom**: Various errors, hooks not working, hydration issues, component rendering failures.

**Cause**: FPL requires React 18 or higher.

**Fix**: Upgrade React to 18+:

```bash
pnpm add react@^18 react-dom@^18
```

---

### 6. Wrong Modal Pattern

**Symptom**: Confusion about Modal API, missing `manager` prop errors.

**Cause**: Assuming Modal works like other React modal libraries.

**Fix**: Use `Modal.useModal` hook for controlled state:

```tsx
const [isOpen, setIsOpen] = useState(false);
const manager = Modal.useModal({
  open: isOpen,
  onClose: () => setIsOpen(false),
});

<Modal.Root manager={manager} width="md">
  <Modal.Contents>
    <Modal.Header><Modal.Title>My Modal</Modal.Title></Modal.Header>
    <Modal.Body>Content</Modal.Body>
    <Modal.Footer>
      <Modal.ActionStrip>
        <Button onClick={() => setIsOpen(false)}>Close</Button>
      </Modal.ActionStrip>
    </Modal.Footer>
  </Modal.Contents>
</Modal.Root>
```

**ALWAYS invoke fpl-docs agent first** when implementing Modal or other complex components.

---

### 7. Using Native HTML Elements Instead of FPL Components

**Symptom**: Inconsistent styling, accessibility gaps.

**Fix**: Use FPL components for all UI elements:

```tsx
// WRONG - native elements
<button onClick={...}>Save</button>

// CORRECT - FPL components
<Button onClick={...}>Save</Button>
<IconButton icon={<Icon24Bold />} onClick={...} aria-label="Bold" />
```

---

## Anti-Patterns

### Do NOT Wrap onChange in Event Handlers

```tsx
// NEVER do this with FPL components
<Input onChange={(e) => {
  setValue(e.target.value);
  doSomethingElse();
}} />

// If you need side effects, handle them elsewhere
const handleChange = (value: string) => {
  setValue(value);
  doSomethingElse();
};
<Input onChange={handleChange} />
```

### Do NOT Import Styles in Components

```tsx
// WRONG - Styles should not be in components
function MyComponent() {
  import '@figma/fpl-tokens/index.css'; // NO
  return <Button>Click</Button>;
}

// CORRECT - Styles belong in entry point (main.tsx)
```

### Do NOT Use Direct File Imports

```tsx
// WRONG
import Button from '@figma/fpl-components/Button';
import { Button } from '@figma/fpl-components/src/Button';

// CORRECT
import { Button } from '@figma/fpl-components';
```

### Do NOT Skip TypeScript Verification

Always verify TypeScript autocomplete works for FPL props. If autocomplete is broken, the FPL setup may be incomplete.

---

## Troubleshooting

### Components Render But Look Wrong

1. Check browser DevTools > Elements > Computed styles
2. Look for `--btn-height`, `--color-bg-brand` CSS variables
3. If missing: CSS imports are wrong or missing
4. If present but wrong values: Import order may be reversed

### TypeScript Errors on FPL Components

1. Verify `@figma/fpl-components` is properly linked in `package.json`
2. Run `pnpm install` to ensure symlinks are created
3. Check that `.fpl` symlink exists and points to valid directory
4. Restart TypeScript server (VS Code: Cmd+Shift+P > "Restart TS Server")

### Input Value Not Updating

1. Confirm you're using the value setter pattern: `onChange={setValue}`
2. Check that `value` prop matches state variable
3. Verify component is controlled (has both `value` and `onChange`)

### Build Fails After Adding FPL

1. Check peer dependencies: `react >= 18`, `react-dom >= 18`, `zod`
2. Verify FPL symlinks exist: `ls -la node_modules/@fpl`
3. Run setup script: `pnpm setup`
4. Clear cache and reinstall: `rm -rf node_modules && pnpm install`

---

## Verification Checklist

Before reporting an FPL issue, verify:

- [ ] Both CSS imports present in `main.tsx`
- [ ] CSS import order correct (tokens before components)
- [ ] `zod` installed as dependency
- [ ] React version is 18+
- [ ] Using `onChange={setValue}` not `onChange={(e) => ...}`
- [ ] TypeScript autocomplete works for FPL props
- [ ] No console errors in browser DevTools
- [ ] CSS custom properties visible in DevTools (e.g., `--btn-height`)

---

## Getting Unstuck

### Resources

1. **FPL CLI**: Run `pnpm fpl list` to see available components
2. **Example prototype**: Check `/workspace/apps/example-prototype/` for working patterns
3. **FPL docs agent**: Use the fpl-docs subagent for component API questions

### Still Stuck?

1. Check the example prototype at `/workspace/apps/example-prototype/src/`
2. Compare your setup to the working example
3. Look for differences in imports, dependencies, and configuration

### Common Quick Fixes

```bash
# Reset FPL setup
pnpm setup

# Reinstall dependencies
rm -rf node_modules && pnpm install

# Verify FPL links
ls -la .fpl
ls -la node_modules/@fpl
```
