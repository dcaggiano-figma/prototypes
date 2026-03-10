import type { ScriptStep } from '@prototype/shared';

/* ------------------------------------------------------------------ */
/*  Mock code content for write-file steps                              */
/* ------------------------------------------------------------------ */

const SLIDE_LAYOUT_CODE = `import { forwardRef } from 'react';
import clsx from 'clsx';
import styles from './SlideLayout.module.css';

type SlideVariant = 'title' | 'content' | 'split';

interface SlideLayoutProps {
  variant?: SlideVariant;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export const SlideLayout = forwardRef<HTMLDivElement, SlideLayoutProps>(
  ({ variant = 'title', title, subtitle, children, className }, ref) => (
    <div
      ref={ref}
      className={clsx(styles.slide, styles[variant], className)}
    >
      <div className={styles.header}>
        {title && <h1 className={styles.title}>{title}</h1>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {children && <div className={styles.body}>{children}</div>}
    </div>
  ),
);

SlideLayout.displayName = 'SlideLayout';`;

const SLIDE_STYLES_CODE = `.slide {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 64px;
  box-sizing: border-box;
}

/* Variants */
.title {
  justify-content: center;
  align-items: center;
  text-align: center;
}

.content {
  justify-content: flex-start;
  gap: 32px;
}

.split {
  flex-direction: row;
  gap: 48px;
}

/* Header */
.header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title .header { align-items: center; }

/* Typography */
.title { font-size: 48px; font-weight: 700; }
.subtitle { font-size: 24px; color: rgba(0,0,0,0.6); }

/* Body */
.body { flex: 1; }`;

/* ------------------------------------------------------------------ */
/*  Default script – slide layout scenario                              */
/* ------------------------------------------------------------------ */

export const DEFAULT_SCRIPT: ScriptStep[] = [
  // 1. Working indicator
  { type: 'progress', label: 'Analyzing slide layout...', duration: 4000 },

  // 2. Reasoning
  {
    type: 'reasoning',
    content:
      "Looking at the current slide deck, I need to create a SlideLayout component that supports three layout variants — title, content, and split — for flexible slide composition. I'll use CSS modules for scoped styling. The component should forward refs and accept standard div attributes for flexibility.",
  },

  // 3. AI communicates plan
  {
    type: 'ai-message',
    content:
      "I'll create a SlideLayout component with title, content, and split variants for flexible slide composition. Let me start by reviewing the existing slide structure.",
  },

  // 4. Viewing files
  { type: 'view-file', fileName: 'components/index.ts', duration: 2500 },

  // 5. Todo list
  {
    type: 'todo-list',
    tasks: ['Create base SlideLayout component', 'Add variant styles for slide layouts'],
  },

  // 6–8. First task – SlideLayout.tsx
  { type: 'start-task', taskIndex: 0 },
  { type: 'write-file', fileName: 'SlideLayout.tsx', code: SLIDE_LAYOUT_CODE },
  { type: 'complete-task', taskIndex: 0, files: ['SlideLayout.tsx'] },

  // 9–11. Second task – SlideLayout.module.css
  { type: 'start-task', taskIndex: 1 },
  { type: 'write-file', fileName: 'SlideLayout.module.css', code: SLIDE_STYLES_CODE },
  { type: 'complete-task', taskIndex: 1, files: ['SlideLayout.module.css'] },

  // 12. AI summary
  {
    type: 'ai-message',
    content:
      "Done! I've created a SlideLayout component with three variants (title, content, split) for flexible slide composition. It uses CSS modules for scoped styling, forwards refs, and supports custom content in each layout.",
  },

  // 13. Version
  { type: 'version', label: 'Add slide layout' },

  // 14. Rating
  { type: 'rating' },

  // 15. Done
  { type: 'done' },
];
