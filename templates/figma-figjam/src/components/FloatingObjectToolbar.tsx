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
  Icon24TextAlignLeft,
  Icon24TextAlignCenter,
  Icon24TextAlignRight,
  Icon24LayoutAlignLeft,
  Icon24LayoutAlignHorizontalCenter,
  Icon24LayoutAlignRight,
  Icon24LayoutAlignTop,
  Icon24LayoutAlignVerticalCenter,
  Icon24LayoutAlignBottom,
  Icon24LayoutDistributeHorizontalSpacing,
  Icon24Section,
  Icon24ConnectorCurveLarge,
  Icon24ConnectorElbowLarge,
  Icon24ConnectorStraightLarge,
  Icon24FigjamStroke,
  Icon24FigjamStrokeThick,
  Icon24StrokeSolid,
  Icon24StrokeDashed,
  Icon24StrokeWeight,
  Icon24StrokeLineArrow,
  Icon24StrokeTriangleArrow,
  Icon24StrokeReversedTriangle,
  Icon24StrokeCircleArrow,
  Icon24StrokeDiamondArrow,
} from '@figma/fpl-icons';
import { useSelection, useSceneGraph, useViewport, useActiveTool, isShapeWithText, isTextCapableNode, isConnectorNode, alignNodes, distributeNodes, wrapInSection } from '../canvas';
import type { AppearanceNode, ConnectorCap, ConnectorLineShape, ConnectorNode, ShapeWithTextNode, TextCapableNode } from '../canvas';
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
  // Subscribe to store changes so toolbar updates when node properties change
  const [, bump] = useState(0);
  useEffect(() => store.subscribe(() => bump((n) => n + 1)), [store]);
  const [showColors, setShowColors] = useState(false);
  const colorPopoverRef = useRef<HTMLDivElement>(null);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);
  const [showAlign, setShowAlign] = useState(false);
  const alignPopoverRef = useRef<HTMLDivElement>(null);
  const alignTriggerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!showAlign) return undefined;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        alignPopoverRef.current?.contains(target) ||
        alignTriggerRef.current?.contains(target)
      ) return;
      setShowAlign(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [showAlign]);

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

  const allSameType = (() => {
    if (selection.selectedIds.size <= 1) return true;
    const firstType = firstNode?.type;
    if (!firstType) return false;
    for (const id of selection.selectedIds) {
      if (store.getNode(id)?.type !== firstType) return false;
    }
    return true;
  })();
  const isMultiSelect = selection.selectedIds.size >= 2;

  const isStickySelected = firstNode?.type === 'STICKY_NOTE';
  const isShapeSelected = firstNode ? isShapeWithText(firstNode) : false;
  const isTextSelected = firstNode?.type === 'TEXT';
  const isTextCapable = isStickySelected || isShapeSelected || isTextSelected;
  const isSectionSelected = firstNode?.type === 'SECTION';
  const isConnectorSelected = firstNode ? isConnectorNode(firstNode) : false;

  const topY = minY - 48;

  // Render mixed-type multi-selection toolbar
  if (isMultiSelect && !allSameType) {
    return (
      <MixedSelectionToolbar
        centerX={centerX}
        topY={topY}
        selection={selection}
        store={store}
      />
    );
  }

  // Render connector-specific toolbar
  if (isConnectorSelected && firstNode) {
    return (
      <ConnectorToolbar
        centerX={centerX}
        topY={topY}
        node={firstNode as ConnectorNode}
        selection={selection}
        store={store}
      />
    );
  }

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
  const currentFontFamily = isTextCapable
    ? (firstNode as TextCapableNode).fontFamily
    : 'Inter';
  const currentFontSize = isTextCapable
    ? (firstNode as TextCapableNode).fontSize
    : 16;
  const currentAlign = isShapeSelected
    ? (firstNode as ShapeWithTextNode).textAlignHorizontal
    : 'CENTER';

  const handleFontFamilyChange = (value: string) => {
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (node && isTextCapableNode(node)) {
        store.updateNode(id, { fontFamily: value });
      }
    }
  };

  const handleFontSizeChange = (value: string) => {
    const size = Number(value);
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (node && isTextCapableNode(node)) {
        const updates: Record<string, unknown> = { fontSize: size };
        // TEXT nodes use absolute lineHeight (px), so scale it with fontSize
        if (node.type === 'TEXT') {
          updates.lineHeight = Math.round(size * 1.25);
        }
        store.updateNode(id, updates);
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

  const handleAlignChange = (align: 'LEFT' | 'CENTER' | 'RIGHT') => {
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (node && isShapeWithText(node)) {
        store.updateNode(id, { textAlignHorizontal: align });
      }
    }
    setShowAlign(false);
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
        className="flex items-center bg-bg rounded-lg shadow-300"
      >
        {/* Color swatch — toggles color popover */}
        <div className="relative p-1 flex items-center">
          <ButtonPrimitive
            ref={colorTriggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-[8px] px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed',
              colorsOpen && 'bg-bg-secondary',
            )}
            onClick={() => setShowColors((v) => !v)}
          >
            <div
              className="w-3 h-3 rounded-full border border-solid border-border"
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

        <div className="flex items-center gap-1 p-1 border-l border-border">
        {/* Font dropdown — functional for text-capable nodes */}
        {isTextCapable ? (
          <>
            <ButtonPrimitive
              {...getFontTriggerProps()}
              className="flex items-center gap-1 rounded-[8px] h-5 pl-2 pr-1 hover:bg-bg-hover active:bg-bg-pressed text-headingMd text-text whitespace-nowrap"
            >
              <span style={{ fontFamily: FONT_FAMILY_PRESETS.find((p) => p.value === currentFontFamily)?.fontFamily }} className="w-3 text-center">Aa</span>
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
          <ButtonPrimitive className="flex items-center gap-1 rounded-[8px] h-5 pl-2 pr-1 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap">
            Aa
            <Icon16ChevronDown />
          </ButtonPrimitive>
        )}
        

        {/* Size dropdown — functional for text-capable nodes */}
        {isTextCapable ? (
          <>
            <ButtonPrimitive
              {...getSizeTriggerProps()}
              className="flex items-center gap-1 rounded-[8px] p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap"
            >
              <span className="w-[120px]">{getFontSizeLabel(currentFontSize)}</span>
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
          <ButtonPrimitive className="flex items-center gap-1 rounded-[8px] p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap">
            Small
            <Icon16ChevronDown />
          </ButtonPrimitive>
        )}
        </div>

        <div className="flex items-center gap-1 p-1 border-l border-border">

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

        <div className="flex items-center p-1 border-l border-border">

        {/* Text alignment — shapes only */}
        {isShapeSelected && (
          <>
            <div className="relative">
              <ButtonPrimitive
                ref={alignTriggerRef}
                aria-label="Text alignment"
                className="flex items-center justify-center w-32px h-32px rounded-[8px] hover:bg-bg-hover active:bg-bg-pressed text-text"
                onClick={() => setShowAlign((v) => !v)}
              >
                {currentAlign === 'LEFT' ? <Icon24TextAlignLeft /> : currentAlign === 'RIGHT' ? <Icon24TextAlignRight /> : <Icon24TextAlignCenter />}
              </ButtonPrimitive>
              {showAlign && (
                <div
                  ref={alignPopoverRef}
                  data-preferred-theme="dark"
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-1 gap-1"
                >
                  {([
                    { value: 'LEFT' as const, Icon: Icon24TextAlignLeft },
                    { value: 'CENTER' as const, Icon: Icon24TextAlignCenter },
                    { value: 'RIGHT' as const, Icon: Icon24TextAlignRight },
                  ]).map(({ value, Icon }) => (
                    <ButtonPrimitive
                      key={value}
                      aria-label={`Align ${value.toLowerCase()}`}
                      aria-pressed={currentAlign === value}
                      onClick={() => handleAlignChange(value)}
                      className={clsx(
                        'flex items-center justify-center w-32px h-32px rounded-[8px]',
                        currentAlign === value
                          ? 'bg-bg-brand text-text-onbrand'
                          : 'hover:bg-bg-hover active:bg-bg-pressed text-text',
                      )}
                    >
                      <Icon />
                    </ButtonPrimitive>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        </div>
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
              'flex items-center gap-1 rounded-[8px] p-2 hover:bg-bg-hover active:bg-bg-pressed',
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
          className="flex items-center gap-1 rounded-[8px] p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap"
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
              className="flex items-center gap-1 rounded-[8px] p-1 hover:bg-bg-hover active:bg-bg-pressed text-text"
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
              className="flex items-center gap-1 rounded-[8px] p-1 hover:bg-bg-hover active:bg-bg-pressed text-text"
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

// ── Mixed-Selection Toolbar ─────────────────────────────────────────

interface MixedSelectionToolbarProps {
  centerX: number;
  topY: number;
  selection: ReturnType<typeof useSelection>;
  store: ReturnType<typeof useSceneGraph>;
}

/**
 * Floating toolbar for multi-selection with mixed node types.
 * Shows alignment trigger, distribute, and wrap-in-section buttons.
 * Clicking the alignment button opens a popover with 6 alignment options.
 */
function MixedSelectionToolbar({ centerX, topY, selection, store }: MixedSelectionToolbarProps) {
  const { manager: distributeMenuManager, getTriggerProps: getDistributeTriggerProps } = Menu.useMenu();
  const [showAlign, setShowAlign] = useState(false);
  const alignPopoverRef = useRef<HTMLDivElement>(null);
  const alignTriggerRef = useRef<HTMLButtonElement>(null);

  // Close alignment popover on click outside
  useEffect(() => {
    if (!showAlign) return undefined;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        alignPopoverRef.current?.contains(target) ||
        alignTriggerRef.current?.contains(target)
      ) return;
      setShowAlign(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [showAlign]);

  return (
    <div
      className="fixed z-nav pointer-events-auto flex flex-col items-center gap-2"
      style={{ left: centerX, top: topY, transform: 'translateX(-50%)' }}
    >
      {/* Alignment popover — shown above the toolbar when triggered */}
      {showAlign && (
        <div
          ref={alignPopoverRef}
          data-preferred-theme="dark"
          className="flex items-center gap-1 bg-bg rounded-lg shadow-300 p-1"
        >
          <IconButton size="lg" aria-label="Align left" variant="ghost"
            onClick={() => alignNodes(store, selection.selectedIds, 'left')}>
            <Icon24LayoutAlignLeft />
          </IconButton>
          <IconButton size="lg" aria-label="Align horizontal center" variant="ghost"
            onClick={() => alignNodes(store, selection.selectedIds, 'center-h')}>
            <Icon24LayoutAlignHorizontalCenter />
          </IconButton>
          <IconButton size="lg" aria-label="Align right" variant="ghost"
            onClick={() => alignNodes(store, selection.selectedIds, 'right')}>
            <Icon24LayoutAlignRight />
          </IconButton>
          <IconButton size="lg" aria-label="Align top" variant="ghost"
            onClick={() => alignNodes(store, selection.selectedIds, 'top')}>
            <Icon24LayoutAlignTop />
          </IconButton>
          <IconButton size="lg" aria-label="Align vertical center" variant="ghost"
            onClick={() => alignNodes(store, selection.selectedIds, 'center-v')}>
            <Icon24LayoutAlignVerticalCenter />
          </IconButton>
          <IconButton size="lg" aria-label="Align bottom" variant="ghost"
            onClick={() => alignNodes(store, selection.selectedIds, 'bottom')}>
            <Icon24LayoutAlignBottom />
          </IconButton>
        </div>
      )}

      {/* Main toolbar: alignment trigger + distribute + wrap in section */}
      <div
        data-preferred-theme="dark"
        className="flex items-center gap-1 bg-bg rounded-lg shadow-300 p-1"
      >
        {/* Alignment trigger */}
        <ButtonPrimitive
          ref={alignTriggerRef}
          className={clsx(
            'flex items-center gap-1 rounded-[8px] p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text',
            showAlign && 'bg-bg-secondary',
          )}
          onClick={() => setShowAlign((v) => !v)}
        >
          <Icon24LayoutAlignHorizontalCenter />
          <Icon16ChevronDown />
        </ButtonPrimitive>

        <div className="w-px h-5 bg-border" />

        {/* Distribute dropdown */}
        <ButtonPrimitive
          {...getDistributeTriggerProps()}
          className="flex items-center gap-1 rounded-[8px] p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text"
        >
          <Icon24LayoutDistributeHorizontalSpacing />
          <Icon16ChevronDown />
        </ButtonPrimitive>
        <Menu.Root manager={distributeMenuManager}>
          <Menu.Container>
            <Menu.Item onClick={() => distributeNodes(store, selection.selectedIds, 'horizontal')}>
              Distribute horizontal spacing
            </Menu.Item>
            <Menu.Item onClick={() => distributeNodes(store, selection.selectedIds, 'vertical')}>
              Distribute vertical spacing
            </Menu.Item>
          </Menu.Container>
        </Menu.Root>

        <div className="w-px h-5 bg-border" />

        <IconButton size="lg" aria-label="Wrap in section" variant="ghost"
          onClick={() => wrapInSection(store, selection)}>
          <Icon24Section />
        </IconButton>
      </div>
    </div>
  );
}

// ── Connector Toolbar ────────────────────────────────────────────────

const CONNECTOR_COLORS = [
  { id: 'dark-gray', label: 'Dark gray', rgb: { r: 100, g: 100, b: 100 }, css: 'rgb(100, 100, 100)' },
  { id: 'black', label: 'Black', rgb: { r: 0, g: 0, b: 0 }, css: 'rgb(0, 0, 0)' },
  { id: 'red', label: 'Red', rgb: { r: 224, g: 49, b: 49 }, css: 'rgb(224, 49, 49)' },
  { id: 'orange', label: 'Orange', rgb: { r: 253, g: 126, b: 20 }, css: 'rgb(253, 126, 20)' },
  { id: 'green', label: 'Green', rgb: { r: 55, g: 178, b: 77 }, css: 'rgb(55, 178, 77)' },
  { id: 'blue', label: 'Blue', rgb: { r: 34, g: 139, b: 230 }, css: 'rgb(34, 139, 230)' },
  { id: 'purple', label: 'Purple', rgb: { r: 132, g: 94, b: 247 }, css: 'rgb(132, 94, 247)' },
  { id: 'pink', label: 'Pink', rgb: { r: 230, g: 73, b: 128 }, css: 'rgb(230, 73, 128)' },
];

const LINE_SHAPE_OPTIONS: { shape: ConnectorLineShape; Icon: React.ComponentType; label: string }[] = [
  { shape: 'CURVE', Icon: Icon24ConnectorCurveLarge, label: 'Curve' },
  { shape: 'ELBOW', Icon: Icon24ConnectorElbowLarge, label: 'Elbow' },
  { shape: 'STRAIGHT', Icon: Icon24ConnectorStraightLarge, label: 'Straight' },
];

const CAP_OPTIONS: { cap: ConnectorCap; Icon: React.ComponentType; label: string }[] = [
  { cap: 'NONE', Icon: Icon24StrokeSolid, label: 'None' },
  { cap: 'LINE_ARROW', Icon: Icon24StrokeLineArrow, label: 'Line arrow' },
  { cap: 'FILLED_ARROW', Icon: Icon24StrokeTriangleArrow, label: 'Triangle arrow' },
  { cap: 'REVERSE_TRIANGLE', Icon: Icon24StrokeReversedTriangle, label: 'Reverse triangle' },
  { cap: 'CIRCLE', Icon: Icon24StrokeCircleArrow, label: 'Circle' },
  { cap: 'DIAMOND', Icon: Icon24StrokeDiamondArrow, label: 'Diamond' },
];

/** Hook that manages a popover with click-outside-to-close */
function usePopover() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  return { open, setOpen, triggerRef, popoverRef };
}

interface ConnectorToolbarProps {
  centerX: number
  topY: number
  node: ConnectorNode
  selection: ReturnType<typeof useSelection>
  store: ReturnType<typeof useSceneGraph>
}

function ConnectorToolbar({ centerX, topY, node, selection, store }: ConnectorToolbarProps) {
  const color = usePopover();
  const lineStyle = usePopover();
  const startCap = usePopover();
  const connShape = usePopover();
  const endCap = usePopover();

  const strokeColor = node.strokes[0]?.paint?.color;
  const swatchBg = strokeColor
    ? `rgb(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b})`
    : 'rgb(100, 100, 100)';
  const activeColorId = CONNECTOR_COLORS.find(
    (c) =>
      strokeColor &&
      c.rgb.r === strokeColor.r &&
      c.rgb.g === strokeColor.g &&
      c.rgb.b === strokeColor.b,
  )?.id;

  const strokeWeight = node.strokes[0]?.weight ?? 2;
  const dashPattern = node.strokes[0]?.dashPattern;
  const isDashed = dashPattern != null && dashPattern.length > 0;

  // ── Handlers ──

  const handleColorChange = (colorId: string) => {
    const entry = CONNECTOR_COLORS.find((c) => c.id === colorId);
    if (!entry) return;
    for (const id of selection.selectedIds) {
      const n = store.getNode(id);
      if (n && isConnectorNode(n)) {
        const connector = n as ConnectorNode;
        store.updateNode(id, {
          strokes: [{
            ...connector.strokes[0],
            paint: { type: 'SOLID', color: entry.rgb, opacity: 1, visible: true },
          }],
        });
      }
    }
  };

  const handleWeightChange = (weight: number) => {
    for (const id of selection.selectedIds) {
      const n = store.getNode(id);
      if (n && isConnectorNode(n)) {
        const connector = n as ConnectorNode;
        store.updateNode(id, {
          strokes: [{ ...connector.strokes[0], weight }],
        });
      }
    }
  };

  const handleDashChange = (dash: number[] | undefined) => {
    for (const id of selection.selectedIds) {
      const n = store.getNode(id);
      if (n && isConnectorNode(n)) {
        const connector = n as ConnectorNode;
        store.updateNode(id, {
          strokes: [{ ...connector.strokes[0], dashPattern: dash }],
        });
      }
    }
  };

  const handleCapChange = (endpoint: 'startCap' | 'endCap', cap: ConnectorCap) => {
    for (const id of selection.selectedIds) {
      const n = store.getNode(id);
      if (n && isConnectorNode(n)) {
        store.updateNode(id, { [endpoint]: cap });
      }
    }
  };

  const handleLineShapeChange = (shape: ConnectorLineShape) => {
    for (const id of selection.selectedIds) {
      const n = store.getNode(id);
      if (n && isConnectorNode(n)) {
        store.updateNode(id, { lineShape: shape });
      }
    }
  };

  // ── Current cap icons for triggers ──

  const CurrentStartCapIcon = CAP_OPTIONS.find((o) => o.cap === node.startCap)?.Icon ?? Icon24StrokeSolid;
  const CurrentEndCapIcon = CAP_OPTIONS.find((o) => o.cap === node.endCap)?.Icon ?? Icon24StrokeSolid;
  const CurrentShapeIcon = LINE_SHAPE_OPTIONS.find((o) => o.shape === node.lineShape)?.Icon ?? Icon24ConnectorCurveLarge;

  return (
    <div
      className="fixed z-nav pointer-events-auto"
      style={{
        left: centerX,
        top: topY,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        data-preferred-theme="dark"
        className="flex items-center bg-bg rounded-lg shadow-300"
      >
        {/* ── 1. Color swatch ── */}
        <div className="relative p-1 flex items-center">
          <ButtonPrimitive
            ref={color.triggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-[8px] px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed',
              color.open && 'bg-bg-secondary',
            )}
            onClick={() => color.setOpen((v) => !v)}
          >
            <div
              className="w-3 h-3 rounded-full border border-solid border-border"
              style={{ backgroundColor: swatchBg }}
            />
            <Icon16ChevronDown />
          </ButtonPrimitive>

          {color.open && (
            <div
              ref={color.popoverRef}
              data-preferred-theme="dark"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-2 gap-2"
            >
              {CONNECTOR_COLORS.map((c) => (
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
                  )}
                  style={{ backgroundColor: c.css }}
                >
                  <span className="sr-only">{c.label}</span>
                </ButtonPrimitive>
              ))}
            </div>
          )}
        </div>

        {/* ── 2. Line style (thickness + dash) ── */}
        <div className="relative flex items-center p-1 border-l border-border">
          <ButtonPrimitive
            ref={lineStyle.triggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-[8px] px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
              lineStyle.open && 'bg-bg-secondary',
            )}
            onClick={() => lineStyle.setOpen((v) => !v)}
          >
            <Icon24StrokeWeight />
            <Icon16ChevronDown />
          </ButtonPrimitive>

          {lineStyle.open && (
            <div
              ref={lineStyle.popoverRef}
              data-preferred-theme="dark"
              data-editor-theme="whiteboard"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-1 gap-1"
            >
              <ButtonPrimitive
                aria-label="Thin stroke"
                aria-pressed={strokeWeight <= 2}
                onClick={() => handleWeightChange(2)}
                className={clsx(
                  'flex items-center justify-center w-32px h-32px rounded-[8px]',
                  strokeWeight <= 2
                    ? 'bg-bg-brand text-text-onbrand'
                    : 'hover:bg-bg-hover active:bg-bg-pressed text-text',
                )}
              >
                <Icon24FigjamStroke />
              </ButtonPrimitive>
              <ButtonPrimitive
                aria-label="Thick stroke"
                aria-pressed={strokeWeight > 2}
                onClick={() => handleWeightChange(4)}
                className={clsx(
                  'flex items-center justify-center w-32px h-32px rounded-[8px]',
                  strokeWeight > 2
                    ? 'bg-bg-brand text-text-onbrand'
                    : 'hover:bg-bg-hover active:bg-bg-pressed text-text',
                )}
              >
                <Icon24FigjamStrokeThick />
              </ButtonPrimitive>
              <div className="w-px h-5 bg-border" />
              <ButtonPrimitive
                aria-label="Solid line"
                aria-pressed={!isDashed}
                onClick={() => handleDashChange(undefined)}
                className={clsx(
                  'flex items-center justify-center w-32px h-32px rounded-[8px]',
                  !isDashed
                    ? 'bg-bg-brand text-text-onbrand'
                    : 'hover:bg-bg-hover active:bg-bg-pressed text-text',
                )}
              >
                <Icon24StrokeSolid />
              </ButtonPrimitive>
              <ButtonPrimitive
                aria-label="Dashed line"
                aria-pressed={isDashed}
                onClick={() => handleDashChange([8, 6])}
                className={clsx(
                  'flex items-center justify-center w-32px h-32px rounded-[8px]',
                  isDashed
                    ? 'bg-bg-brand text-text-onbrand'
                    : 'hover:bg-bg-hover active:bg-bg-pressed text-text',
                )}
              >
                <Icon24StrokeDashed />
              </ButtonPrimitive>
            </div>
          )}
        </div>

        {/* ── 3. Start cap ── */}
        <div className="relative flex items-center p-1 border-l border-border">
          <ButtonPrimitive
            ref={startCap.triggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-[8px] px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
              startCap.open && 'bg-bg-secondary',
            )}
            onClick={() => startCap.setOpen((v) => !v)}
          >
            <span><CurrentStartCapIcon /></span>
            <Icon16ChevronDown />
          </ButtonPrimitive>

          {startCap.open && (
            <div
              ref={startCap.popoverRef}
              data-preferred-theme="dark"
              data-editor-theme="whiteboard"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-1 gap-1"
            >
              {CAP_OPTIONS.map(({ cap, Icon, label }) => (
                <ButtonPrimitive
                  key={cap}
                  aria-label={label}
                  aria-pressed={node.startCap === cap}
                  onClick={() => handleCapChange('startCap', cap)}
                  className={clsx(
                    'flex items-center justify-center w-32px h-32px rounded-[8px]',
                    node.startCap === cap
                      ? 'bg-bg-brand text-text-onbrand'
                      : 'hover:bg-bg-hover active:bg-bg-pressed text-text',
                  )}
                >
                  <span><Icon /></span>
                </ButtonPrimitive>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. Connection shape ── */}
        <div className="relative flex items-center p-1 border-l border-border">
          <ButtonPrimitive
            ref={connShape.triggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-[8px] px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
              connShape.open && 'bg-bg-secondary',
            )}
            onClick={() => connShape.setOpen((v) => !v)}
          >
            <CurrentShapeIcon />
            <Icon16ChevronDown />
          </ButtonPrimitive>

          {connShape.open && (
            <div
              ref={connShape.popoverRef}
              data-preferred-theme="dark"
              data-editor-theme="whiteboard"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-1 gap-1"
            >
              {LINE_SHAPE_OPTIONS.map(({ shape, Icon, label }) => (
                <ButtonPrimitive
                  key={shape}
                  aria-label={label}
                  aria-pressed={node.lineShape === shape}
                  onClick={() => handleLineShapeChange(shape)}
                  className={clsx(
                    'flex items-center justify-center w-32px h-32px rounded-[8px]',
                    node.lineShape === shape
                      ? 'bg-bg-brand text-text-onbrand'
                      : 'hover:bg-bg-hover active:bg-bg-pressed text-text',
                  )}
                >
                  <Icon />
                </ButtonPrimitive>
              ))}
            </div>
          )}
        </div>

        {/* ── 5. End cap ── */}
        <div className="relative flex items-center p-1 border-l border-border">
          <ButtonPrimitive
            ref={endCap.triggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-[8px] px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
              endCap.open && 'bg-bg-secondary',
            )}
            onClick={() => endCap.setOpen((v) => !v)}
          >
            <span className="rotate-180"><CurrentEndCapIcon /></span>
            <Icon16ChevronDown />
          </ButtonPrimitive>

          {endCap.open && (
            <div
              ref={endCap.popoverRef}
              data-preferred-theme="dark"
              data-editor-theme="whiteboard"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-1 gap-1"
            >
              {CAP_OPTIONS.map(({ cap, Icon, label }) => (
                <ButtonPrimitive
                  key={cap}
                  aria-label={label}
                  aria-pressed={node.endCap === cap}
                  onClick={() => handleCapChange('endCap', cap)}
                  className={clsx(
                    'flex items-center justify-center w-32px h-32px rounded-[8px]',
                    node.endCap === cap
                      ? 'bg-bg-brand text-text-onbrand'
                      : 'hover:bg-bg-hover active:bg-bg-pressed text-text',
                  )}
                >
                  <span className="rotate-180"><Icon /></span>
                </ButtonPrimitive>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
