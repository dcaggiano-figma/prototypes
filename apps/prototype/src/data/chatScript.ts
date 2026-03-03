import type { ScriptStep } from '@prototype/shared';

/* ------------------------------------------------------------------ */
/*  Mock code content for write-file steps                              */
/* ------------------------------------------------------------------ */

const BUTTON_COMPONENT_CODE = `import { forwardRef } from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, children, className, ...rest }, ref) => (
    <button
      ref={ref}
      className={clsx(styles.button, styles[variant], styles[size], className)}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';`;

const BUTTON_STYLES_CODE = `.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, box-shadow 150ms ease;
}

/* Variants */
.primary {
  background: var(--color-bg-brand);
  color: var(--color-text-onbrand);
}
.primary:hover { background: var(--color-bg-brand-hover); }

.secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text);
  box-shadow: inset 0 0 0 1px var(--color-border);
}
.secondary:hover { background: var(--color-bg-secondary-hover); }

.ghost {
  background: transparent;
  color: var(--color-text);
}
.ghost:hover { background: var(--color-bg-hover); }

/* Sizes */
.sm { height: 28px; padding: 0 10px; font-size: 12px; }
.md { height: 36px; padding: 0 14px; font-size: 14px; }
.lg { height: 44px; padding: 0 20px; font-size: 16px; }

/* Icon slot */
.icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}`;

/* ------------------------------------------------------------------ */
/*  Default script – button component scenario                          */
/* ------------------------------------------------------------------ */

export const DEFAULT_SCRIPT: ScriptStep[] = [
  // 1. Working indicator
  { type: 'progress', label: 'Analyzing design system...', duration: 4000 },

  // 2. Reasoning
  {
    type: 'reasoning',
    content:
      "Looking at the current design system, I need to create a Button component that supports three visual variants — primary, secondary, and ghost — along with three sizes. I'll use CSS modules with design tokens for consistent theming. The component should forward refs and accept standard button HTML attributes for flexibility.",
  },

  // 3. AI communicates plan
  {
    type: 'ai-message',
    content:
      "I'll create a Button component with primary, secondary, and ghost variants in three sizes (sm, md, lg). Let me start by reviewing the existing component structure.",
  },

  // 4. Viewing files
  { type: 'view-file', fileName: 'components/index.ts', duration: 2500 },

  // 5. Todo list
  {
    type: 'todo-list',
    tasks: ['Create base Button component', 'Add variant styles with design tokens'],
  },

  // 6–8. First task – Button.tsx
  { type: 'start-task', taskIndex: 0 },
  { type: 'write-file', fileName: 'Button.tsx', code: BUTTON_COMPONENT_CODE },
  { type: 'complete-task', taskIndex: 0, files: ['Button.tsx'] },

  // 9–11. Second task – Button.module.css
  { type: 'start-task', taskIndex: 1 },
  { type: 'write-file', fileName: 'Button.module.css', code: BUTTON_STYLES_CODE },
  { type: 'complete-task', taskIndex: 1, files: ['Button.module.css'] },

  // 12. AI summary
  {
    type: 'ai-message',
    content:
      "Done! I've created a Button component with three variants (primary, secondary, ghost) and three sizes (sm, md, lg). It uses CSS modules with your design tokens for consistent theming, forwards refs, and accepts all standard button attributes.",
  },

  // 13. Version
  { type: 'version', label: 'Add Button component' },

  // 14. Rating
  { type: 'rating' },

  // 15. Done
  { type: 'done' },
];
