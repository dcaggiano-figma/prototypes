import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive, HiddenLabel, IconButton, Menu } from '@figma/fpl-components';
import {
  Icon16ChevronDown,
  Icon24Bold,
  Icon24StrikeThrough,
  Icon24Link,
  Icon24ListView,
  Icon24Duplicate,
  Icon24Eye,
  Icon24LockOpen,
  Icon24AlLayoutGrid,
} from '@figma/fpl-icons';
import { useSelection, useSceneGraph, useViewport, useActiveTool } from '../canvas';
import type { AppearanceNode, StickyNoteNode } from '../canvas';
import { isGeometryNode, getWorldPosition } from '../canvas/scene-graph/world-position';
import { STICKY_COLORS } from './FigJamToolbar';

const FONT_FAMILY_PRESETS = [
  { value: 'Inter', label: 'Simple', fontFamily: 'Inter, system-ui, sans-serif' },
  { value: 'Georgia', label: 'Bookish', fontFamily: 'Georgia, serif' },
  { value: 'monospace', label: 'Technical', fontFamily: 'monospace' },
  { value: 'Caveat', label: 'Scribbled', fontFamily: 'Caveat, cursive' },
] as const;

const FONT_SIZE_PRESETS = [
  { value: '16', label: 'Small' },
  { value: '24', label: 'Medium' },
  { value: '36', label: 'Large' },
  { value: '48', label: 'Extra large' },
  { value: '64', label: 'Huge' },
] as const;

/** Section fill color presets */
const SECTION_COLORS = [
  { id: 'white', label: 'White', rgb: { r: 255, g: 255, b: 255 }, css: 'rgb(255, 255, 255)' },
  { id: 'light-gray', label: 'Light gray', rgb: { r: 242, g: 242, b: 242 }, css: 'rgb(242, 242, 242)' },
  { id: 'light-blue', label: 'Light blue', rgb: { r: 218, g: 236, b: 255 }, css: 'rgb(218, 236, 255)' },
  { id: 'light-green', label: 'Light green', rgb: { r: 218, g: 245, b: 223 }, css: 'rgb(218, 245, 223)' },
  { id: 'light-purple', label: 'Light purple', rgb: { r: 232, g: 222, b: 255 }, css: 'rgb(232, 222, 255)' },
  { id: 'light-pink', label: 'Light pink', rgb: { r: 255, g: 224, b: 238 }, css: 'rgb(255, 224, 238)' },
  { id: 'light-yellow', label: 'Light yellow', rgb: { r: 255, g: 243, b: 204 }, css: 'rgb(255, 243, 204)' },
  { id: 'light-orange', label: 'Light orange', rgb: { r: 255, g: 228, b: 204 }, css: 'rgb(255, 228, 204)' },
] as const;

function getFontSizeLabel(size: number): string {
  return FONT_SIZE_PRESETS.find((p) => Number(p.value) === size)?.label ?? `${size}`;
}

/**
 * Dark floating toolbar that appears above selected objects.
 * Shows different controls based on node type:
 * - STICKY_NOTE: color, font, size, formatting
 * - SECTION: color, alignment, copy, visibility, lock, layout
 * - Default: color, font, size, formatting (non-functional)
 */
export function FloatingObjectToolbar() {
  const selection = useSelection();
  const store = useSceneGraph();
  const viewport = useViewport();
  const { setStickyColor, activeTool, sectionFillColor } = useActiveTool();
  const { manager: fontMenuManager, getTriggerProps: getFontTriggerProps } = Menu.useMenu();
  const { manager: sizeMenuManager, getTriggerProps: getSizeTriggerProps } = Menu.useMenu();
  const [showColors, setShowColors] = useState(false);
  const colorPopoverRef = useRef<HTMLDivElement>(null);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);

  // Close color popover on click outside
  useEffect(() => {
    if (!showColors) return undefined;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        colorPopoverRef.current?.contains(target) ||
        colorTriggerRef.current?.contains(target)
      ) return;
      setShowColors(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [showColors]);

  // Show section toolbar when section tool is active but nothing placed yet
  if (activeTool === 'SECTION' && selection.selectedIds.size === 0) {
    const sectionSwatchBg = sectionFillColor
      ? `rgb(${sectionFillColor.r}, ${sectionFillColor.g}, ${sectionFillColor.b})`
      : 'rgb(255, 255, 255)';
    return (
      <SectionToolbar
        centerX={window.innerWidth / 2}
        topY={80}
        swatchBg={sectionSwatchBg}
        swatchColor={sectionFillColor}
        selection={selection}
        store={store}
        isToolPreview
      />
    );
  }

  if (selection.selectedIds.size === 0 || selection.isDragging) return null;

  // Compute the bounding box of selected nodes in screen space
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;

  for (const id of selection.selectedIds) {
    const node = store.getNode(id);
    if (!node || !isGeometryNode(node)) continue;
    const worldPos = getWorldPosition(store, node);
    const topLeft = viewport.worldToScreen(worldPos.x, worldPos.y);
    const topRight = viewport.worldToScreen(worldPos.x + node.width, worldPos.y);

    minX = Math.min(minX, topLeft.x);
    minY = Math.min(minY, topLeft.y);
    maxX = Math.max(maxX, topRight.x);
  }

  if (!isFinite(minX)) return null;

  const centerX = (minX + maxX) / 2;

  // Get fill color of first selected node for the swatch
  const firstId = selection.selectedIds.values().next().value;
  const firstNode = firstId ? store.getNode(firstId) : undefined;
  const swatchColor = firstNode && 'fills' in firstNode
    ? (firstNode as AppearanceNode).fills?.[0]?.color
    : undefined;
  const swatchBg = swatchColor
    ? `rgb(${swatchColor.r}, ${swatchColor.g}, ${swatchColor.b})`
    : 'rgb(196, 196, 196)';

  const isStickySelected = firstNode?.type === 'STICKY_NOTE';
  const isSectionSelected = firstNode?.type === 'SECTION';

  const topY = minY - 48;

  // Render section-specific toolbar
  if (isSectionSelected) {
    return (
      <SectionToolbar
        centerX={centerX}
        topY={topY}
        swatchBg={swatchBg}
        swatchColor={swatchColor}
        selection={selection}
        store={store}
      />
    );
  }

  const colorsOpen = showColors;

  // Find the active color id by matching the fill of the first selected node
  const activeColorId = STICKY_COLORS.find(
    (c) =>
      swatchColor &&
      c.rgb.r === swatchColor.r &&
      c.rgb.g === swatchColor.g &&
      c.rgb.b === swatchColor.b,
  )?.id;
  const currentFontFamily = isStickySelected
    ? (firstNode as StickyNoteNode).fontFamily
    : 'Inter';
  const currentFontSize = isStickySelected
    ? (firstNode as StickyNoteNode).fontSize
    : 16;

  const handleFontFamilyChange = (value: string) => {
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (node?.type === 'STICKY_NOTE') {
        store.updateNode(id, { fontFamily: value });
      }
    }
  };

  const handleFontSizeChange = (value: string) => {
    const size = Number(value);
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (node?.type === 'STICKY_NOTE') {
        store.updateNode(id, { fontSize: size });
      }
    }
  };

  const handleColorChange = (colorId: string) => {
    const entry = STICKY_COLORS.find((c) => c.id === colorId);
    if (!entry) return;
    // Sync sticky color in the tool provider for new sticky note creations
    if (isStickySelected) setStickyColor(entry.rgb);
    // Apply fill to all selected nodes that have fills
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (node && 'fills' in node) {
        store.updateNode(id, {
          fills: [{ type: 'SOLID', color: entry.rgb, opacity: 1, visible: true }],
        });
      }
    }
  };

  return (
    <div
      className="fixed z-nav pointer-events-auto"
      style={{
        left: centerX,
        top: topY,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Main toolbar */}
      <div
        data-preferred-theme="dark"
        className="flex items-center gap-1 bg-bg rounded-lg shadow-300 p-1"
      >
        {/* Color swatch — toggles color popover */}
        <div className="relative">
          <ButtonPrimitive
            ref={colorTriggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-md p-2 hover:bg-bg-hover active:bg-bg-pressed',
              colorsOpen && 'bg-bg-secondary',
            )}
            onClick={() => setShowColors((v) => !v)}
          >
            <div
              className="w-16px h-16px rounded-full border border-solid border-border"
              style={{ backgroundColor: swatchBg }}
            />
            <Icon16ChevronDown />
          </ButtonPrimitive>

          {/* Color popover — positioned above, centered on trigger */}
          {colorsOpen && (
            <div
              ref={colorPopoverRef}
              data-preferred-theme="dark"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-2 gap-2"
            >
              {STICKY_COLORS.map((c) => (
                <ButtonPrimitive
                  key={c.id}
                  aria-label={c.label}
                  aria-pressed={activeColorId === c.id}
                  onClick={() => handleColorChange(c.id)}
                  className={clsx(
                    'rounded-full w-4 h-4 shrink-0',
                    activeColorId === c.id
                      ? 'ring-2 ring-border-selected ring-offset-2 ring-offset-bg'
                      : '',
                  )} style={{ backgroundColor: c.css }}
                >
                  <span className="sr-only">{c.label}</span>
                </ButtonPrimitive>
              ))}
            </div>
          )}
        </div>

        {/* Font dropdown — functional for STICKY_NOTE */}
        {isStickySelected ? (
          <>
            <ButtonPrimitive
              {...getFontTriggerProps()}
              className="flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap"
            >
              Aa
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <Menu.Root manager={fontMenuManager}>
              <Menu.Container>
                <Menu.RadioGroup
                  title={<HiddenLabel>Font</HiddenLabel>}
                  value={currentFontFamily}
                  onChange={handleFontFamilyChange}
                >
                  {FONT_FAMILY_PRESETS.map(({ value, label, fontFamily }) => (
                    <Menu.RadioGroupItem key={value} value={value}>
                      <span style={{ fontFamily }}>{label}</span>
                    </Menu.RadioGroupItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Container>
            </Menu.Root>
          </>
        ) : (
          <ButtonPrimitive className="flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap">
            Aa
            <Icon16ChevronDown />
          </ButtonPrimitive>
        )}

        {/* Size dropdown — functional for STICKY_NOTE */}
        {isStickySelected ? (
          <>
            <ButtonPrimitive
              {...getSizeTriggerProps()}
              className="flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap"
            >
              {getFontSizeLabel(currentFontSize)}
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <Menu.Root manager={sizeMenuManager}>
              <Menu.Container>
                <Menu.RadioGroup
                  title={<HiddenLabel>Font size</HiddenLabel>}
                  value={String(currentFontSize)}
                  onChange={handleFontSizeChange}
                >
                  {FONT_SIZE_PRESETS.map(({ value, label }) => (
                    <Menu.RadioGroupItem key={value} value={value}>
                      {label}
                    </Menu.RadioGroupItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Container>
            </Menu.Root>
          </>
        ) : (
          <ButtonPrimitive className="flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap">
            Small
            <Icon16ChevronDown />
          </ButtonPrimitive>
        )}

        <div className="w-px h-5 bg-border" />

        {/* Formatting buttons */}
        <IconButton size="lg" aria-label="Bold" variant="ghost">
          <Icon24Bold />
        </IconButton>
        <IconButton size="lg" aria-label="Strikethrough" variant="ghost">
          <Icon24StrikeThrough />
        </IconButton>
        <IconButton size="lg" aria-label="Link" variant="ghost">
          <Icon24Link />
        </IconButton>
        <IconButton size="lg" aria-label="List" variant="ghost">
          <Icon24ListView />
        </IconButton>
      </div>
    </div>
  );
}

// ── Section Toolbar ──────────────────────────────────────────────────

interface SectionToolbarProps {
  centerX: number
  topY: number
  swatchBg: string
  swatchColor: { r: number; g: number; b: number } | undefined
  selection: ReturnType<typeof useSelection>
  store: ReturnType<typeof useSceneGraph>
  /** True when showing as a pre-creation toolbar (section tool active, nothing placed) */
  isToolPreview?: boolean
}

/**
 * Floating toolbar for selected section nodes.
 * Also shown as a preview when section tool is active but nothing placed yet.
 * Shows: color, alignment, copy, visibility, lock, layout
 */
function SectionToolbar({
  centerX,
  topY,
  swatchBg,
  swatchColor,
  selection,
  store,
  isToolPreview,
}: SectionToolbarProps) {
  const { setSectionFillColor } = useActiveTool();
  const { manager: alignMenuManager, getTriggerProps: getAlignTriggerProps } = Menu.useMenu();
  const { manager: lockMenuManager, getTriggerProps: getLockTriggerProps } = Menu.useMenu();
  const { manager: layoutMenuManager, getTriggerProps: getLayoutTriggerProps } = Menu.useMenu();
  const [showColors, setShowColors] = useState(false);
  const colorPopoverRef = useRef<HTMLDivElement>(null);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);

  // Close color popover on click outside
  useEffect(() => {
    if (!showColors) return undefined;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        colorPopoverRef.current?.contains(target) ||
        colorTriggerRef.current?.contains(target)
      ) return;
      setShowColors(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [showColors]);

  const activeSectionColorId = SECTION_COLORS.find(
    (c) =>
      swatchColor &&
      c.rgb.r === swatchColor.r &&
      c.rgb.g === swatchColor.g &&
      c.rgb.b === swatchColor.b,
  )?.id;

  const handleSectionColorChange = (colorId: string) => {
    const entry = SECTION_COLORS.find((c) => c.id === colorId);
    if (!entry) return;
    // Always update the tool provider so new sections use this color
    setSectionFillColor(entry.rgb);
    // Also update any selected sections
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (node?.type === 'SECTION') {
        store.updateNode(id, {
          fills: [{ type: 'SOLID', color: entry.rgb, opacity: 1, visible: true }],
        });
      }
    }
  };

  const handleDuplicate = () => {
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (!node || !isGeometryNode(node)) continue;
      store.createNode(node.type, {
        ...node,
        id: undefined,
        name: `${node.name} copy`,
        x: node.x + 20,
        y: node.y + 20,
        parentId: null,
        children: [],
      });
    }
  };

  const handleToggleVisibility = () => {
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (!node) continue;
      store.updateNode(id, { visible: !node.visible });
    }
  };

  return (
    <div
      className="fixed z-nav pointer-events-auto"
      style={{
        left: centerX,
        top: topY,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Main toolbar */}
      <div
        data-preferred-theme="dark"
        className="flex items-center gap-1 bg-bg rounded-lg shadow-300 p-1"
      >
        {/* Color swatch — toggles section color popover */}
        <div className="relative">
          <ButtonPrimitive
            ref={colorTriggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-md p-2 hover:bg-bg-hover active:bg-bg-pressed',
              showColors && 'bg-bg-secondary',
            )}
            onClick={() => setShowColors((v: boolean) => !v)}
          >
            <div
              className="w-16px h-16px rounded-full border border-solid border-border"
              style={{ backgroundColor: swatchBg }}
            />
            <Icon16ChevronDown />
          </ButtonPrimitive>

          {showColors && (
            <div
              ref={colorPopoverRef}
              data-preferred-theme="dark"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-2 gap-2"
            >
              {SECTION_COLORS.map((c) => (
                <ButtonPrimitive
                  key={c.id}
                  aria-label={c.label}
                  aria-pressed={activeSectionColorId === c.id}
                  onClick={() => handleSectionColorChange(c.id)}
                  className={clsx(
                    'rounded-full w-4 h-4 shrink-0',
                    activeSectionColorId === c.id
                      ? 'ring-2 ring-border-selected ring-offset-2 ring-offset-bg'
                      : '',
                    c.id === 'white' && 'border border-solid border-border',
                  )}
                  style={{ backgroundColor: c.css }}
                >
                  <span className="sr-only">{c.label}</span>
                </ButtonPrimitive>
              ))}
            </div>
          )}
        </div>

        {/* Alignment dropdown */}
        <ButtonPrimitive
          {...getAlignTriggerProps()}
          className="flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="2" y1="3" x2="14" y2="3" />
            <line x1="2" y1="7" x2="11" y2="7" />
            <line x1="2" y1="11" x2="14" y2="11" />
          </svg>
          <Icon16ChevronDown />
        </ButtonPrimitive>
        <Menu.Root manager={alignMenuManager}>
          <Menu.Container>
            <Menu.Item onClick={() => {}}>Align left</Menu.Item>
            <Menu.Item onClick={() => {}}>Align center</Menu.Item>
            <Menu.Item onClick={() => {}}>Align right</Menu.Item>
          </Menu.Container>
        </Menu.Root>

        {!isToolPreview && (
          <>
            <div className="w-px h-5 bg-border" />

            {/* Duplicate */}
            <IconButton size="lg" aria-label="Duplicate" variant="ghost" onClick={handleDuplicate}>
              <Icon24Duplicate />
            </IconButton>

            {/* Visibility */}
            <IconButton size="lg" aria-label="Toggle visibility" variant="ghost" onClick={handleToggleVisibility}>
              <Icon24Eye />
            </IconButton>

            {/* Lock dropdown */}
            <ButtonPrimitive
              {...getLockTriggerProps()}
              className="flex items-center gap-1 rounded-md p-1 hover:bg-bg-hover active:bg-bg-pressed text-text"
            >
              <Icon24LockOpen />
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <Menu.Root manager={lockMenuManager}>
              <Menu.Container>
                <Menu.Item onClick={() => {
                  for (const id of selection.selectedIds) {
                    store.updateNode(id, { locked: true });
                  }
                }}>Lock</Menu.Item>
                <Menu.Item onClick={() => {
                  for (const id of selection.selectedIds) {
                    store.updateNode(id, { locked: false });
                  }
                }}>Unlock</Menu.Item>
              </Menu.Container>
            </Menu.Root>

            <div className="w-px h-5 bg-border" />

            {/* Layout dropdown */}
            <ButtonPrimitive
              {...getLayoutTriggerProps()}
              className="flex items-center gap-1 rounded-md p-1 hover:bg-bg-hover active:bg-bg-pressed text-text"
            >
              <Icon24AlLayoutGrid />
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <Menu.Root manager={layoutMenuManager}>
              <Menu.Container>
                <Menu.Item onClick={() => {}}>Auto layout</Menu.Item>
                <Menu.Item onClick={() => {}}>Grid layout</Menu.Item>
                <Menu.Item onClick={() => {}}>No layout</Menu.Item>
              </Menu.Container>
            </Menu.Root>
          </>
        )}
      </div>
    </div>
  );
}
