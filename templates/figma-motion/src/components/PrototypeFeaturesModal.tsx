import { useState } from 'react';
import { Button, Modal } from '@figma/fpl-components';

/** Editor shell */
const SHELL_FEATURES = [
  {
    name: 'Mode Switcher',
    summary:
      'Draw / Design / Dev modes that drive toolbar, theme, and panels.',
    file: 'src/components/ModeSwitcher.tsx',
  },
  {
    name: 'Toolbar',
    summary:
      'Mode-aware bottom toolbar with animated transitions and subtool dropdowns.',
    file: 'src/components/Toolbar.tsx',
  },
  {
    name: 'Quick Actions',
    summary: 'CMD+K command palette with tabbed search and keyboard nav.',
    file: 'src/components/QuickActions.tsx',
  },
  {
    name: 'Left Rail & Panels',
    summary:
      'Icon rail with main menu, resizable panels for pages and layers.',
    file: 'src/components/LeftRail.tsx',
  },
  {
    name: 'Right Panel',
    summary:
      'Mode-aware sidebar for design properties, draw tools, or dev inspect.',
    file: 'src/components/RightPanel.tsx',
  },
  {
    name: 'Theme System',
    summary:
      'Light / dark / system color scheme with per-mode brand theming.',
    file: 'src/helpers/theme.ts',
  },
  {
    name: 'Toasts',
    summary:
      'Global showToast() with icons, actions, auto-dismiss, and danger variants.',
    file: 'src/components/toast/',
  },
] as const;

/** Canvas & scene graph */
const CANVAS_FEATURES = [
  {
    name: 'Viewport',
    summary:
      'Affine transform with scroll/pinch zoom (2%–25,600%), space-bar panning, and world/screen coordinate conversion.',
    file: 'src/canvas/viewport/',
  },
  {
    name: 'Scene Graph',
    summary:
      '7 node types (Frame, Rectangle, Ellipse, Text, Line, Vector, Group) with fills, strokes, effects, and efficient defaults-only storage.',
    file: 'src/canvas/scene-graph/',
  },
  {
    name: 'DOM Rendering',
    summary:
      'Frames render as divs (flexbox/grid), shapes as SVG. GPU-optimized transforms, stroke positions, corner radius, and rotation.',
    file: 'src/canvas/components/',
  },
  {
    name: 'Selection & Hit Testing',
    summary:
      'Multi-select, shift-click toggle, hierarchical frame-aware hit testing, and double-click to enter frames for deep selection.',
    file: 'src/canvas/selection/',
  },
  {
    name: 'Resize Handles',
    summary:
      '8-point resize with shift-drag for proportional scaling and 1px minimum size enforcement.',
    file: 'src/canvas/selection/resize-handles.tsx',
  },
  {
    name: 'Tools',
    summary:
      'Move, Frame, Rectangle, Ellipse, Text, Pen, Hand, and Comment tools with keyboard modifier tracking.',
    file: 'src/canvas/tools/',
  },
  {
    name: 'Selection Overlay',
    summary:
      'DPI-aware 2D canvas layer for selection outlines, dimension labels, and box (marquee) selection.',
    file: 'src/canvas/selection/overlay.tsx',
  },
] as const;

function FeatureSection({
  title,
  features,
}: {
  title: string;
  features: ReadonlyArray<{ name: string; summary: string; file: string }>;
}) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <span className="text-text-tertiary text-bodyMdStrong uppercase tracking-wide">
        {title}
      </span>
      {features.map((f) => (
        <div key={f.name} className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-text text-bodyLgStrong">{f.name}</span>
            <span className="text-text-tertiary text-bodyMd font-mono">
              {f.file}
            </span>
          </div>
          <p className="text-text-secondary text-bodyMd leading-relaxed">
            {f.summary}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PrototypeFeaturesModal() {
  const [isOpen, setIsOpen] = useState(false);
  const manager = Modal.useModal({
    open: isOpen,
    onClose: () => setIsOpen(false),
  });

  return {
    trigger: () => setIsOpen(true),
    modal: (
      <Modal.Root manager={manager} width="lg">
        <Modal.Contents>
          <Modal.Header>
            <Modal.Title>Prototype features</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-2 pt-2 pb-4">
              <p className="text-text-secondary text-bodyLg">
                Built-in features for rapid prototyping within the Figma
                Design template.
              </p>
            </div>
            <FeatureSection title="Editor Shell" features={SHELL_FEATURES} />
            <FeatureSection title="Canvas" features={CANVAS_FEATURES} />
          </Modal.Body>
          <Modal.Footer>
            <Modal.ActionStrip>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </Modal.ActionStrip>
          </Modal.Footer>
        </Modal.Contents>
      </Modal.Root>
    ),
  };
}
