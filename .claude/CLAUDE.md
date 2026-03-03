# Project Instructions

## Repo Split — prototype-playground vs ai-prototyping

This repo was split from ai-prototyping. Check the memory file for disk paths.

**This repo (prototype-playground)** owns:
- Prototype templates: blank_slate, browser-shell, eval-starter, figma-design, figma-figjam, make
- Shared prototype UI components (`packages/shared/`)
- User-facing skills: designer, help-me-with-playground, inspect, screenshot, using-tokens, visual-feedback
- Claude agents: fpl-docs, devtools-code-verifier, icon-search, prototype-env-setup
- FPL instructions (`.claude/instructions/fpl/`)
- Hooks (block-eslint-config-edit, block-npm-npx)
- Setup script, share workflows, template verification
- All prototype worktree workspaces

**ai-prototyping** owns:
- Infrastructure packages published to GitHub Packages (`@figma/ppg-*`): dev-tools, element-inspector, vite-config, eslint-config, tailwind-config, tsconfig, ui, screenshot, eval-runner, experiment-runner, worktree-manager, feedback, proto-cli, fpl-cli
- VS Code extension source
- Tooling-specific skills: feature-implement, feature-new, feature-spec, feedback, new-template, new-worktree, start-prototype
- Package publishing CI
- FEATURE_SPECS for tooling development

Packages are published to GitHub Packages under the `@figma` scope and consumed here via `.npmrc`. The auth token for GitHub Packages must be set in `~/.npmrc` (the setup script handles this). When debugging dependency issues or understanding package APIs, ai-prototyping is the source of truth.

---

## FPL (Figma Platform Library) - MANDATORY

**BEFORE writing any code that uses FPL components, you MUST:**

1. Read `.claude/instructions/fpl/README.md` for quick reference
2. Read `.claude/instructions/fpl/common-mistakes.md` to avoid critical errors

**FPL Guidelines Location:** `.claude/instructions/fpl/`
- `README.md` - Start here. Quick reference and boundaries.
- `setup.md` - Project setup, dependencies, CSS configuration
- `components.md` - Component usage patterns and APIs
- `styling.md` - Design tokens and CSS imports
- `icons.md` - Icon package usage
- `common-mistakes.md` - Gotchas and troubleshooting

**Critical FPL Rules (always apply):**
- CSS imports in `main.tsx`: `@figma/fpl-tokens/index.css` FIRST, then `@figma/fpl-components/fpl.css`
- onChange pattern: Use `onChange={setValue}` NOT `onChange={(e) => setValue(e.target.value)}`
- Use `pnpm fpl list` to discover available components

**MANDATORY: Using fpl-docs Agent for Component Implementation**

Before implementing ANY FPL component (especially Modal, Dialog, Form, or complex components):

1. **Invoke `fpl-docs` agent FIRST** with your use case to get working examples
2. Ask: "How do I use [ComponentName] for [specific use case]?"
3. The agent will return correct API patterns and working code examples

Example invocation:
```
Use fpl-docs agent: "How do I use Modal to create a metadata editing dialog with form fields?"
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

**When building UI prototypes:** Always check if an FPL component exists before creating custom components. Use FPL Button/IconButton for ALL buttons - never use native `<button>` elements.

---

## ESLint Config — DO NOT EDIT

**NEVER modify any ESLint configuration file** (`eslint.config.*`, `.eslintrc*`). These are maintained by humans only. A hook will block any attempt to edit them.

When you encounter ESLint errors, **fix the source code to comply with the rules**. Most eslint errors are there to guide you to solving it in the **correct way** even when it's not obvious. If there's an eslint error that really seems like you NEED to disable it, explain why to the user, and ask them if there's a better way to solve the problem.

**ESLint warnings** mean you are straying from the design system or other best practices. You should conform to these whenever possible — use FPL components instead of native HTML elements, use design tokens instead of arbitrary values, and avoid inline styles. Consult the `fpl-docs` agent if you need help finding the right FPL component or pattern.

---

## Do Not Hack Around Type Errors or Lint Errors

**NEVER use refs, escape hatches, or workarounds to bypass TypeScript errors or ESLint rules.** Type errors and lint errors exist to guide you toward the correct API usage and better patterns. If a component's type doesn't expose a prop (e.g. `onBlur`), that's intentional — find the proper way to achieve the behavior, or ask the user.

Specifically:
- Do NOT use refs to attach event listeners that the component intentionally doesn't expose
- Do NOT use `eslint-disable` comments to suppress errors — fix the code instead
- Do NOT use type casts (`as any`, `as unknown`) to work around type mismatches
- If a component doesn't support what you need, consider using a different component or pattern entirely

---

## Updating Dependencies

This project consumes FPL and infrastructure packages from GitHub Packages under the `@figma` scope. To update to the latest versions:

```sh
pnpm update @figma/*
```

Or update specific packages:

```sh
pnpm update @figma/fpl-components @figma/fpl-tokens @figma/fpl-icons
```

---

## Animation with Motion

All templates include [`motion`](https://motion.dev/) (formerly Framer Motion) as a dependency. When the user asks for complex animations — transitions, spring physics, layout animations, gesture-driven interactions, or orchestrated sequences — use `motion` rather than hand-rolling CSS animations or `requestAnimationFrame` loops.

```tsx
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
  Content
</motion.div>
```

For simple one-off transitions (a single fade or color change), plain CSS transitions are fine. Reach for `motion` when you need spring physics, layout animations, `AnimatePresence` for exit animations, or coordinated multi-element sequences.

---

## Making Changes

After making changes, make sure to check the devtools-code-verifier subagent for any errors, and fix those errors before finishing up.
