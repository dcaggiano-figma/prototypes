# FPL Components Guide

FPL (Figma Platform Library) provides React components matching Figma's design system.

## Import Pattern

```tsx
import { Button, Input, Checkbox, Badge, Chip, Label, Description, Link, LoadingSpinner } from '@figma/fpl-components';
```

---

## CRITICAL: onChange Pattern

> **FPL uses a NON-STANDARD onChange pattern. This is the most common source of bugs.**

```tsx
// =============================================
// FPL PATTERN - onChange receives value directly
// =============================================
const [email, setEmail] = useState('');
<Input value={email} onChange={setEmail} />

const [checked, setChecked] = useState(false);
<Checkbox checked={checked} onChange={setChecked} />

// =============================================
// STANDARD REACT - DO NOT USE WITH FPL
// =============================================
<Input value={email} onChange={(e) => setEmail(e.target.value)} />       // WRONG
<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} /> // WRONG
```

| Component | FPL onChange receives | Standard React receives |
|-----------|----------------------|-------------------------|
| Input     | `string` (value)     | `ChangeEvent<HTMLInputElement>` |
| Checkbox  | `boolean` (state)    | `ChangeEvent<HTMLInputElement>` |

**Pass state setters directly** - no event destructuring needed.

---

## Component Reference

### Button
```tsx
<Button variant="primary" onClick={handleClick} disabled={loading}>Submit</Button>
<Button variant="secondary" onClick={handleReset}>Reset</Button>
<Button variant="ghost" onClick={handleCancel}>Cancel</Button>
```
Props: `variant` (`"primary"` | `"secondary"` | `"ghost"`), `onClick`, `disabled`, `children`

### Input
**onChange takes value directly, not event.**
```tsx
const [value, setValue] = useState('');
<Input id="email" type="email" value={value} onChange={setValue} placeholder="Enter email" />
```
Props: `id`, `type`, `value`, `onChange: (value: string) => void`, `placeholder`, `style`

### Checkbox
**onChange takes boolean directly, not event.**
```tsx
const [agreed, setAgreed] = useState(false);
<Checkbox label={<Label>I agree</Label>} checked={agreed} onChange={setAgreed} />
```
Props: `label` (JSX), `checked`, `onChange: (checked: boolean) => void`

### Badge
```tsx
<Badge variant="defaultFilled">Default</Badge>
<Badge variant="brandFilled">Brand</Badge>
<Badge variant="successFilled">Success</Badge>
<Badge variant="warningFilled">Warning</Badge>
<Badge variant="dangerFilled">Danger</Badge>
```
Props: `variant` (`"defaultFilled"` | `"brandFilled"` | `"successFilled"` | `"warningFilled"` | `"dangerFilled"`), `children`

### Chip
```tsx
<Chip>React</Chip>
<Chip>TypeScript</Chip>
```
Props: `children`

### Label
```tsx
<Label htmlFor="username">Username</Label>
<Input id="username" value={name} onChange={setName} />
```
Props: `htmlFor`, `children`

### Description
```tsx
<Description>Enter your email address to receive updates.</Description>
```
Props: `children`

### Link
```tsx
<Link href="/forgot-password">Forgot password?</Link>
```
Props: `href`, `children`

### LoadingSpinner
```tsx
{isLoading && <LoadingSpinner />}
```
No required props.

### Stack and Card (Layout)
Use `fpl-docs` agent for detailed documentation: `pnpm fpl docs Stack`

---

## Component Discovery

```bash
pnpm fpl list              # List all components, hooks, utilities
pnpm fpl docs <Component>  # Get component documentation
pnpm fpl search <query>    # Search FPL resources
```

Categories:
- **Components**: PascalCase (Button, TextField)
- **Hooks**: `use*` prefix (useToggle)
- **Utilities**: camelCase (formatDate)

For detailed docs, invoke the `fpl-docs` agent.

---

## Composition Patterns

### Example 1: Login Form

```tsx
import { useState } from 'react';
import { Button, Input, Checkbox, Label, Description, Link, LoadingSpinner } from '@figma/fpl-components';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    // ... authentication logic
  };

  return (
    <div>
      <Description>Sign in to your account</Description>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={setPassword} />
      </div>
      <Checkbox label={<Label>Remember me</Label>} checked={rememberMe} onChange={setRememberMe} />
      <Button variant="primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
      {loading && <LoadingSpinner />}
      <Link href="/forgot-password">Forgot password?</Link>
    </div>
  );
}
```

### Example 2: Status Dashboard

```tsx
import { Badge, Chip, Button, Label, Description } from '@figma/fpl-components';

function StatusCard({ status, tags, onAction }) {
  const badgeVariant = {
    active: 'successFilled',
    warning: 'warningFilled',
    error: 'dangerFilled',
    pending: 'brandFilled',
  }[status] || 'defaultFilled';

  return (
    <div>
      <Label>Status</Label>
      <Badge variant={badgeVariant}>{status}</Badge>
      <Label>Tags</Label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}
      </div>
      <Description>Last updated 5 minutes ago</Description>
      <Button variant="primary" onClick={onAction}>Take Action</Button>
      <Button variant="ghost">Dismiss</Button>
    </div>
  );
}
```

---

## Common Mistakes

| Mistake | Correction |
|---------|------------|
| `onChange={(e) => setValue(e.target.value)}` | `onChange={setValue}` |
| `onChange={(e) => setChecked(e.target.checked)}` | `onChange={setChecked}` |
| Importing from wrong path | Use `@figma/fpl-components` |
| Missing CSS imports | Add to entry file (see setup guide) |
