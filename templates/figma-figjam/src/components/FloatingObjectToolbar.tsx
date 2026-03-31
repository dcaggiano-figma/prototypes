import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive, IconButton } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
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
import { useSelection, useSceneGraph, useCanvasId, useViewportState, useActiveTool, isShapeWithText, isTextCapableNode, isConnectorNode, useAlignHandler, wrapInSection, getTypeDefaults, createPaint } from '../canvas';
import type { AppearanceNode, ConnectorCap, ConnectorLineShape, ConnectorNode, LineNode } from '../canvas';
import { isGeometryNode, getWorldPosition, isConnectorNode as isConnectorType, resolveEndpointPosition } from '@prototype/shared/canvas';
import type { FigJamTextCapableNode } from '../canvas/text-types';
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
  const sg = useSceneGraph();
  const { state: viewportState } = useViewportState();
  const { setStickyColor, activeTool, sectionFillColor } = useActiveTool();
  const { manager: fontMenuManager, getTriggerProps: getFontTriggerProps } = MenuV2.useMenu();
  const { manager: sizeMenuManager, getTriggerProps: getSizeTriggerProps } = MenuV2.useMenu();
  // Call getTriggerProps unconditionally — they invoke hooks internally (useMergeRefs)
  const fontTriggerProps = getFontTriggerProps();
  const sizeTriggerProps = getSizeTriggerProps();
  // Subscribe to scene graph changes so toolbar updates when node properties change
  const [, bump] = useState(0);
  useEffect(() => sg.addListener(() => bump((n) => n + 1)), [sg]);
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
        sg={sg}
        isToolPreview
      />
    );
  }

  if (selection.selectedIds.size === 0 || selection.isDragging) return null;

  // Compute the bounding box of selected nodes in screen space.
  // Uses viewportState (reactive) so the toolbar repositions during zoom/pan.
  const { scale, origin } = viewportState;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;

  for (const id of selection.selectedIds) {
    const node = sg.getNode(id);
    if (!node || !isGeometryNode(node)) continue;

    // For connectors, derive bounds from resolved endpoints (which track connected nodes)
    if (isConnectorType(node)) {
      const startPt = resolveEndpointPosition(sg, node.startEndpoint);
      const endPt = resolveEndpointPosition(sg, node.endEndpoint);
      if (startPt && endPt) {
        const sx1 = startPt.x * scale + origin.x;
        const sy1 = startPt.y * scale + origin.y;
        const sx2 = endPt.x * scale + origin.x;
        const sy2 = endPt.y * scale + origin.y;
        minX = Math.min(minX, sx1, sx2);
        minY = Math.min(minY, sy1, sy2);
        maxX = Math.max(maxX, sx1, sx2);
      }
      continue;
    }

    const worldPos = getWorldPosition(sg, node);

    if (node.type === 'LINE') {
      const rad = (node.rotation ?? 0) * Math.PI / 180;
      const endWX = worldPos.x + node.width * Math.cos(rad);
      const endWY = worldPos.y + node.width * Math.sin(rad);
      const sx1x = worldPos.x * scale + origin.x;
      const sx1y = worldPos.y * scale + origin.y;
      const sx2x = endWX * scale + origin.x;
      const sx2y = endWY * scale + origin.y;
      minX = Math.min(minX, sx1x, sx2x);
      minY = Math.min(minY, sx1y, sx2y);
      maxX = Math.max(maxX, sx1x, sx2x);
      continue;
    }

    const topLeftX = worldPos.x * scale + origin.x;
    const topLeftY = worldPos.y * scale + origin.y;
    const topRightX = (worldPos.x + node.width) * scale + origin.x;

    minX = Math.min(minX, topLeftX);
    minY = Math.min(minY, topLeftY);
    maxX = Math.max(maxX, topRightX);
  }

  if (!isFinite(minX)) return null;

  const centerX = (minX + maxX) / 2;

  // Get fill color of first selected node for the swatch
  const firstId = selection.selectedIds.values().next().value;
  const firstNode = firstId ? sg.getNode(firstId) : undefined;
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
      if (sg.getNode(id)?.type !== firstType) return false;
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
  const isLineSelected = firstNode?.type === 'LINE';

  const topY = minY - 64;

  // Render mixed-type multi-selection toolbar
  if (isMultiSelect && !allSameType) {
    return (
      <MixedSelectionToolbar
        centerX={centerX}
        topY={topY}
        selection={selection}
        sg={sg}
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
        sg={sg}
      />
    );
  }

  // Render line-specific toolbar (same as connector minus shape section)
  if (isLineSelected && firstNode) {
    return (
      <LineToolbar
        centerX={centerX}
        topY={topY}
        node={firstNode as LineNode}
        selection={selection}
        sg={sg}
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
        sg={sg}
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
  const textCapableNode = firstNode && isTextCapableNode(firstNode) ? firstNode as FigJamTextCapableNode : undefined;
  const currentFontFamily = textCapableNode?.fontFamily ?? 'Inter';
  const currentFontSize = textCapableNode?.fontSize ?? 16;
  const currentAlign = isShapeSelected
    ? (firstNode as FigJamTextCapableNode).textAlignHorizontal
    : 'CENTER';

  const handleFontFamilyChange = (value: string) => {
    for (const id of selection.selectedIds) {
      const node = sg.getNode(id);
      if (node && isTextCapableNode(node)) {
        sg.updateNode(id, { fontFamily: value });
      }
    }
  };

  const handleFontSizeChange = (value: string) => {
    const size = Number(value);
    for (const id of selection.selectedIds) {
      const node = sg.getNode(id);
      if (node && isTextCapableNode(node)) {
        const updates: Record<string, unknown> = { fontSize: size };
        // TEXT nodes use absolute lineHeight (px), so scale it with fontSize
        if (node.type === 'TEXT') {
          updates.lineHeight = Math.round(size * 1.25);
        }
        sg.updateNode(id, updates);
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
      const node = sg.getNode(id);
      if (node && 'fills' in node) {
        sg.updateNode(id, {
          fills: [createPaint({ type: 'SOLID', color: entry.rgb, opacity: 1, visible: true })],
        });
      }
    }
  };

  const handleAlignChange = (align: 'LEFT' | 'CENTER' | 'RIGHT') => {
    for (const id of selection.selectedIds) {
      const node = sg.getNode(id);
      if (node && isShapeWithText(node)) {
        sg.updateNode(id, { textAlignHorizontal: align });
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
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed',
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
              {...fontTriggerProps}
              className="flex items-center gap-1 rounded-md h-5 pl-2 pr-1 hover:bg-bg-hover active:bg-bg-pressed text-headingMd text-text whitespace-nowrap"
            >
              <span style={{ fontFamily: FONT_FAMILY_PRESETS.find((p) => p.value === currentFontFamily)?.fontFamily }} className="w-3 text-center">Aa</span>
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <MenuV2.Root manager={fontMenuManager}>
              <MenuV2.RadioGroup
                aria-label="Font"
                value={currentFontFamily}
                onChange={handleFontFamilyChange}
              >
                {FONT_FAMILY_PRESETS.map(({ value, label, fontFamily }) => (
                  <MenuV2.RadioGroupItem key={value} value={value}>
                    <span style={{ fontFamily }}>{label}</span>
                  </MenuV2.RadioGroupItem>
                ))}
              </MenuV2.RadioGroup>
            </MenuV2.Root>
          </>
        ) : (
          <ButtonPrimitive className="flex items-center gap-1 rounded-md h-5 pl-2 pr-1 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap">
            Aa
            <Icon16ChevronDown />
          </ButtonPrimitive>
        )}
        

        {/* Size dropdown — functional for text-capable nodes */}
        {isTextCapable ? (
          <>
            <ButtonPrimitive
              {...sizeTriggerProps}
              className="flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap"
            >
              <span className="w-[120px]">{getFontSizeLabel(currentFontSize)}</span>
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <MenuV2.Root manager={sizeMenuManager}>
              <MenuV2.RadioGroup
                aria-label="Font size"
                value={String(currentFontSize)}
                onChange={handleFontSizeChange}
              >
                {FONT_SIZE_PRESETS.map(({ value, label }) => (
                  <MenuV2.RadioGroupItem key={value} value={value}>
                    {label}
                  </MenuV2.RadioGroupItem>
                ))}
              </MenuV2.RadioGroup>
            </MenuV2.Root>
          </>
        ) : (
          <ButtonPrimitive className="flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap">
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
                className="flex items-center justify-center w-32px h-32px rounded-md hover:bg-bg-hover active:bg-bg-pressed text-text"
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
                        'flex items-center justify-center w-32px h-32px rounded-md',
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
  sg: ReturnType<typeof useSceneGraph>
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
  sg,
  isToolPreview,
}: SectionToolbarProps) {
  const canvasId = useCanvasId();
  const { setSectionFillColor } = useActiveTool();
  const { manager: alignMenuManager, getTriggerProps: getAlignTriggerProps } = MenuV2.useMenu();
  const { manager: lockMenuManager, getTriggerProps: getLockTriggerProps } = MenuV2.useMenu();
  const { manager: layoutMenuManager, getTriggerProps: getLayoutTriggerProps } = MenuV2.useMenu();
  // Call getTriggerProps unconditionally — they invoke hooks internally (useMergeRefs)
  const alignTriggerMenuProps = getAlignTriggerProps();
  const lockTriggerMenuProps = getLockTriggerProps();
  const layoutTriggerMenuProps = getLayoutTriggerProps();
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
      const node = sg.getNode(id);
      if (node?.type === 'SECTION') {
        sg.updateNode(id, {
          fills: [createPaint({ type: 'SOLID', color: entry.rgb, opacity: 1, visible: true })],
        });
      }
    }
  };

  const handleDuplicate = () => {
    for (const id of selection.selectedIds) {
      const node = sg.getNode(id);
      if (!node || !isGeometryNode(node)) continue;
      const props: Record<string, unknown> = {
        ...node,
        name: `${node.name} copy`,
        x: node.x + 20,
        y: node.y + 20,
      };
      delete props.id;
      delete props.children;
      delete props.parentId;
      sg.createNode(node.type, canvasId, {
        ...getTypeDefaults(node.type),
        ...props,
      });
    }
  };

  const handleToggleVisibility = () => {
    for (const id of selection.selectedIds) {
      const node = sg.getNode(id);
      if (!node) continue;
      sg.updateNode(id, { visible: !node.visible });
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
          {...alignTriggerMenuProps}
          className="flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg whitespace-nowrap"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="2" y1="3" x2="14" y2="3" />
            <line x1="2" y1="7" x2="11" y2="7" />
            <line x1="2" y1="11" x2="14" y2="11" />
          </svg>
          <Icon16ChevronDown />
        </ButtonPrimitive>
        <MenuV2.Root manager={alignMenuManager}>
          <MenuV2.Item onClick={() => {}}>Align left</MenuV2.Item>
          <MenuV2.Item onClick={() => {}}>Align center</MenuV2.Item>
          <MenuV2.Item onClick={() => {}}>Align right</MenuV2.Item>
        </MenuV2.Root>

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
              {...lockTriggerMenuProps}
              className="flex items-center gap-1 rounded-md p-1 hover:bg-bg-hover active:bg-bg-pressed text-text"
            >
              <Icon24LockOpen />
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <MenuV2.Root manager={lockMenuManager}>
              <MenuV2.Item onClick={() => {
                for (const id of selection.selectedIds) {
                  sg.updateNode(id, { locked: true });
                }
              }}>Lock</MenuV2.Item>
              <MenuV2.Item onClick={() => {
                for (const id of selection.selectedIds) {
                  sg.updateNode(id, { locked: false });
                }
              }}>Unlock</MenuV2.Item>
            </MenuV2.Root>

            <div className="w-px h-5 bg-border" />

            {/* Layout dropdown */}
            <ButtonPrimitive
              {...layoutTriggerMenuProps}
              className="flex items-center gap-1 rounded-md p-1 hover:bg-bg-hover active:bg-bg-pressed text-text"
            >
              <Icon24AlLayoutGrid />
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <MenuV2.Root manager={layoutMenuManager}>
              <MenuV2.Item onClick={() => {}}>Auto layout</MenuV2.Item>
              <MenuV2.Item onClick={() => {}}>Grid layout</MenuV2.Item>
              <MenuV2.Item onClick={() => {}}>No layout</MenuV2.Item>
            </MenuV2.Root>
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
  sg: ReturnType<typeof useSceneGraph>;
}

/**
 * Floating toolbar for multi-selection with mixed node types.
 * Shows alignment trigger, distribute, and wrap-in-section buttons.
 * Clicking the alignment button opens a popover with 6 alignment options.
 */
function MixedSelectionToolbar({ centerX, topY, selection, sg }: MixedSelectionToolbarProps) {
  const canvasId = useCanvasId();
  const { handleAlign, handleDistribute } = useAlignHandler(sg, selection.selectedIds);
  const { manager: distributeMenuManager, getTriggerProps: getDistributeTriggerProps } = MenuV2.useMenu();
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
            onClick={() => handleAlign('left')}>
            <Icon24LayoutAlignLeft />
          </IconButton>
          <IconButton size="lg" aria-label="Align horizontal center" variant="ghost"
            onClick={() => handleAlign('center-h')}>
            <Icon24LayoutAlignHorizontalCenter />
          </IconButton>
          <IconButton size="lg" aria-label="Align right" variant="ghost"
            onClick={() => handleAlign('right')}>
            <Icon24LayoutAlignRight />
          </IconButton>
          <IconButton size="lg" aria-label="Align top" variant="ghost"
            onClick={() => handleAlign('top')}>
            <Icon24LayoutAlignTop />
          </IconButton>
          <IconButton size="lg" aria-label="Align vertical center" variant="ghost"
            onClick={() => handleAlign('center-v')}>
            <Icon24LayoutAlignVerticalCenter />
          </IconButton>
          <IconButton size="lg" aria-label="Align bottom" variant="ghost"
            onClick={() => handleAlign('bottom')}>
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
            'flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text',
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
          className="flex items-center gap-1 rounded-md p-1 pl-2 hover:bg-bg-hover active:bg-bg-pressed text-text"
        >
          <Icon24LayoutDistributeHorizontalSpacing />
          <Icon16ChevronDown />
        </ButtonPrimitive>
        <MenuV2.Root manager={distributeMenuManager}>
          <MenuV2.Item onClick={() => handleDistribute('horizontal')}>
            Distribute horizontal spacing
          </MenuV2.Item>
          <MenuV2.Item onClick={() => handleDistribute('vertical')}>
            Distribute vertical spacing
          </MenuV2.Item>
        </MenuV2.Root>

        <div className="w-px h-5 bg-border" />

        <IconButton size="lg" aria-label="Wrap in section" variant="ghost"
          onClick={() => wrapInSection(sg, selection.selectedIds, canvasId, (id) => selection.select(id))}>
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
  sg: ReturnType<typeof useSceneGraph>
}

function ConnectorToolbar({ centerX, topY, node, selection, sg }: ConnectorToolbarProps) {
  const color = usePopover();
  const lineStyle = usePopover();
  const startCap = usePopover();
  const connShape = usePopover();
  const endCap = usePopover();

  const strokeColor = node.strokes[0]?.color;
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

  const strokeWeight = node.strokeWeight ?? 2;
  const dashPattern = node.strokeDashPattern;
  const isDashed = dashPattern != null && dashPattern.length > 0;

  // ── Handlers ──

  const handleColorChange = (colorId: string) => {
    const entry = CONNECTOR_COLORS.find((c) => c.id === colorId);
    if (!entry) return;
    for (const id of selection.selectedIds) {
      const n = sg.getNode(id);
      if (n && isConnectorNode(n)) {
        const connector = n as ConnectorNode;
        sg.updateNode(id, {
          strokes: connector.strokes.map((s, i) =>
            i === 0 ? { ...s, color: entry.rgb, opacity: 1 } : s,
          ),
        });
      }
    }
  };

  const handleWeightChange = (weight: number) => {
    for (const id of selection.selectedIds) {
      const n = sg.getNode(id);
      if (n && isConnectorNode(n)) {
        sg.updateNode(id, { strokeWeight: weight });
      }
    }
  };

  const handleDashChange = (dash: number[] | undefined) => {
    for (const id of selection.selectedIds) {
      const n = sg.getNode(id);
      if (n && isConnectorNode(n)) {
        sg.updateNode(id, { strokeDashPattern: dash ?? [] });
      }
    }
  };

  const handleCapChange = (endpoint: 'startCap' | 'endCap', cap: ConnectorCap) => {
    for (const id of selection.selectedIds) {
      const n = sg.getNode(id);
      if (n && isConnectorNode(n)) {
        sg.updateNode(id, { [endpoint]: cap });
      }
    }
  };

  const handleLineShapeChange = (shape: ConnectorLineShape) => {
    for (const id of selection.selectedIds) {
      const n = sg.getNode(id);
      if (n && isConnectorNode(n)) {
        sg.updateNode(id, { lineShape: shape });
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
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed',
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
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
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
                  'flex items-center justify-center w-32px h-32px rounded-md',
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
                  'flex items-center justify-center w-32px h-32px rounded-md',
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
                  'flex items-center justify-center w-32px h-32px rounded-md',
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
                  'flex items-center justify-center w-32px h-32px rounded-md',
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
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
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
                    'flex items-center justify-center w-32px h-32px rounded-md',
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
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
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
                    'flex items-center justify-center w-32px h-32px rounded-md',
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
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
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
                    'flex items-center justify-center w-32px h-32px rounded-md',
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

// ── Line Toolbar ─────────────────────────────────────────────────────

interface LineToolbarProps {
  centerX: number
  topY: number
  node: LineNode
  selection: ReturnType<typeof useSelection>
  sg: ReturnType<typeof useSceneGraph>
}

function LineToolbar({ centerX, topY, node, selection, sg }: LineToolbarProps) {
  const color = usePopover();
  const lineStyle = usePopover();
  const startCap = usePopover();
  const endCap = usePopover();

  const strokeColor = node.strokes[0]?.color;
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

  const strokeWeight = node.strokeWeight ?? 2;
  const dashPattern = node.strokeDashPattern;
  const isDashed = dashPattern != null && dashPattern.length > 0;

  // ── Handlers ──

  const handleColorChange = (colorId: string) => {
    const entry = CONNECTOR_COLORS.find((c) => c.id === colorId);
    if (!entry) return;
    for (const id of selection.selectedIds) {
      const n = sg.getNode(id);
      if (n && n.type === 'LINE') {
        sg.updateNode(id, {
          strokes: (n as LineNode).strokes.map((s, i) =>
            i === 0 ? { ...s, color: entry.rgb, opacity: 1 } : s,
          ),
        });
      }
    }
  };

  const handleWeightChange = (weight: number) => {
    for (const id of selection.selectedIds) {
      const n = sg.getNode(id);
      if (n && n.type === 'LINE') {
        sg.updateNode(id, { strokeWeight: weight });
      }
    }
  };

  const handleDashChange = (dash: number[] | undefined) => {
    for (const id of selection.selectedIds) {
      const n = sg.getNode(id);
      if (n && n.type === 'LINE') {
        sg.updateNode(id, { strokeDashPattern: dash ?? [] });
      }
    }
  };

  const handleCapChange = (endpoint: 'startCap' | 'endCap', cap: ConnectorCap) => {
    for (const id of selection.selectedIds) {
      const n = sg.getNode(id);
      if (n && n.type === 'LINE') {
        sg.updateNode(id, { [endpoint]: cap });
      }
    }
  };

  // ── Current cap icons for triggers ──

  const CurrentStartCapIcon = CAP_OPTIONS.find((o) => o.cap === node.startCap)?.Icon ?? Icon24StrokeSolid;
  const CurrentEndCapIcon = CAP_OPTIONS.find((o) => o.cap === node.endCap)?.Icon ?? Icon24StrokeSolid;

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
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed',
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
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
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
                  'flex items-center justify-center w-32px h-32px rounded-md',
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
                  'flex items-center justify-center w-32px h-32px rounded-md',
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
                  'flex items-center justify-center w-32px h-32px rounded-md',
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
                  'flex items-center justify-center w-32px h-32px rounded-md',
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
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
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
                    'flex items-center justify-center w-32px h-32px rounded-md',
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

        {/* ── 4. End cap ── */}
        <div className="relative flex items-center p-1 border-l border-border">
          <ButtonPrimitive
            ref={endCap.triggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed text-text',
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
                    'flex items-center justify-center w-32px h-32px rounded-md',
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
