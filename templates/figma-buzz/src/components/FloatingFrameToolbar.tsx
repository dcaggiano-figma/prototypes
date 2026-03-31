import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive, SearchInput } from '@figma/fpl-components';
import { Icon16ChevronDown, Icon24StrokeWeight } from '@figma/fpl-icons';
import { useSelection, useSceneGraph, useViewport, useViewportState, isGeometryNode, getWorldPosition, createPaint } from '../canvas';
import { useViewMode } from './ViewModeContext';
import type { AppearanceNode, NodeId } from '../canvas';

/** Fill color presets for the color popover */
const FRAME_COLORS = [
  { id: 'white', label: 'White', rgb: { r: 255, g: 255, b: 255 }, css: 'rgb(255, 255, 255)' },
  { id: 'light-gray', label: 'Light gray', rgb: { r: 242, g: 242, b: 242 }, css: 'rgb(242, 242, 242)' },
  { id: 'light-blue', label: 'Light blue', rgb: { r: 218, g: 236, b: 255 }, css: 'rgb(218, 236, 255)' },
  { id: 'light-green', label: 'Light green', rgb: { r: 218, g: 245, b: 223 }, css: 'rgb(218, 245, 223)' },
  { id: 'light-purple', label: 'Light purple', rgb: { r: 232, g: 222, b: 255 }, css: 'rgb(232, 222, 255)' },
  { id: 'light-pink', label: 'Light pink', rgb: { r: 255, g: 224, b: 238 }, css: 'rgb(255, 224, 238)' },
  { id: 'light-yellow', label: 'Light yellow', rgb: { r: 255, g: 243, b: 204 }, css: 'rgb(255, 243, 204)' },
  { id: 'light-orange', label: 'Light orange', rgb: { r: 255, g: 228, b: 204 }, css: 'rgb(255, 228, 204)' },
] as const;

interface SizePreset {
  name: string;
  width: number;
  height: number;
}

interface SizeSection {
  title: string;
  items: SizePreset[];
}

/** Standard social media size presets grouped by platform */
const SIZE_SECTIONS: SizeSection[] = [
  {
    title: 'Instagram',
    items: [
      { name: 'Instagram post (square)', width: 1080, height: 1080 },
      { name: 'Instagram post (portrait)', width: 1080, height: 1350 },
      { name: 'Instagram post (tall portrait)', width: 1080, height: 1440 },
      { name: 'Instagram story', width: 1080, height: 1920 },
      { name: 'Instagram ad (square)', width: 1440, height: 1440 },
      { name: 'Instagram ad (portrait)', width: 1440, height: 1800 },
      { name: 'Instagram Reel cover', width: 1080, height: 1920 },
    ],
  },
  {
    title: 'Facebook',
    items: [
      { name: 'Facebook post', width: 1200, height: 630 },
      { name: 'Facebook story', width: 1080, height: 1920 },
      { name: 'Facebook cover', width: 1640, height: 924 },
      { name: 'Facebook ad', width: 1200, height: 628 },
    ],
  },
  {
    title: 'TikTok',
    items: [
      { name: 'TikTok post', width: 1080, height: 1920 },
    ],
  },
  {
    title: 'YouTube',
    items: [
      { name: 'YouTube thumbnail', width: 1280, height: 720 },
      { name: 'YouTube banner', width: 2560, height: 1440 },
    ],
  },
  {
    title: 'X / Twitter',
    items: [
      { name: 'X/Twitter post', width: 1200, height: 675 },
      { name: 'X/Twitter header', width: 1500, height: 500 },
    ],
  },
  {
    title: 'LinkedIn',
    items: [
      { name: 'LinkedIn post', width: 1200, height: 627 },
      { name: 'LinkedIn cover', width: 1584, height: 396 },
    ],
  },
  {
    title: 'Pinterest',
    items: [
      { name: 'Pinterest pin', width: 1000, height: 1500 },
    ],
  },
];

/** Filter sections by search query, removing empty sections */
function filterSections(sections: SizeSection[], query: string): SizeSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.name.toLowerCase().includes(q)),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Dark floating toolbar that appears above the selected frame in asset view.
 * Closely mirrors FigJam's FloatingObjectToolbar positioning and styling.
 */
export function FloatingFrameToolbar() {
  const selection = useSelection();
  const store = useSceneGraph();
  const viewport = useViewport();
  const { viewMode, isAnimatingViewMode, focusedFrameId } = useViewMode();
  useViewportState(); // re-render on pan/zoom so toolbar tracks the frame
  const [showSizes, setShowSizes] = useState(false);
  const [sizeSearch, setSizeSearch] = useState('');
  const sizePopoverRef = useRef<HTMLDivElement>(null);
  const sizeTriggerRef = useRef<HTMLButtonElement>(null);
  const [showColors, setShowColors] = useState(false);
  const colorPopoverRef = useRef<HTMLDivElement>(null);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState(0);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return undefined;

    const updateToolbarWidth = () => {
      const nextWidth = toolbar.offsetWidth;
      setToolbarWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    };

    updateToolbarWidth();
    const observer = new ResizeObserver(updateToolbarWidth);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  // Subscribe to store changes so toolbar updates when node properties change
  const [, bump] = useState(0);
  useEffect(() => store.addListener(() => bump((n) => n + 1)), [store]);

  // Filter size presets by search query
  const filteredSections = useMemo(
    () => filterSections(SIZE_SECTIONS, sizeSearch),
    [sizeSearch],
  );

  // Close size popover on click outside
  useEffect(() => {
    if (!showSizes) return undefined;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        sizePopoverRef.current?.contains(target) ||
        sizeTriggerRef.current?.contains(target)
      ) return;
      setShowSizes(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [showSizes]);

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

  // Only show in asset view when a frame is selected and not animating
  if (viewMode !== 'asset') return null;
  if (isAnimatingViewMode) return null;
  if (selection.selectedIds.size === 0) return null;

  // In asset mode, only consider nodes that are the focused frame or its descendants.
  // Stale selections (e.g. sections from grid view) should not trigger the toolbar.
  const relevantIds = new Set<NodeId>();
  if (focusedFrameId != null) {
    for (const id of selection.selectedIds) {
      if (id === focusedFrameId) {
        relevantIds.add(id);
        continue;
      }
      let cur = store.getNode(id);
      while (cur && cur.parentId != null) {
        if (cur.parentId === focusedFrameId) {
          relevantIds.add(id);
          break;
        }
        cur = store.getNode(cur.parentId);
      }
    }
  }
  if (relevantIds.size === 0) return null;

  // Compute bounding box of selected nodes in screen space (same as FigJam)
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;

  for (const id of relevantIds) {
    const n = store.getNode(id);
    if (!n || !isGeometryNode(n)) continue;
    const worldPos = getWorldPosition(store, n);

    if (n.type === 'LINE') {
      const rad = (n.rotation ?? 0) * Math.PI / 180;
      const endWX = worldPos.x + n.width * Math.cos(rad);
      const endWY = worldPos.y + n.width * Math.sin(rad);
      const sx1 = viewport.worldToScreen(worldPos.x, worldPos.y);
      const sx2 = viewport.worldToScreen(endWX, endWY);
      minX = Math.min(minX, sx1.x, sx2.x);
      minY = Math.min(minY, sx1.y, sx2.y);
      maxX = Math.max(maxX, sx1.x, sx2.x);
      continue;
    }

    const topLeft = viewport.worldToScreen(worldPos.x, worldPos.y);
    const topRight = viewport.worldToScreen(worldPos.x + n.width, worldPos.y);

    minX = Math.min(minX, topLeft.x);
    minY = Math.min(minY, topLeft.y);
    maxX = Math.max(maxX, topRight.x);
  }

  if (!isFinite(minX)) return null;

  // Compute visible canvas bounds for clamping
  const container = viewport.containerRef.current;

  // worldToScreen returns container-local coords; offset to screen coords for fixed positioning
  if (container) {
    const containerRect = container.getBoundingClientRect();
    minX += containerRect.left;
    minY += containerRect.top;
    maxX += containerRect.left;
  }

  let canvasBounds: { left: number; top: number; right: number; bottom: number } | null = null;
  if (container) {
    const full = container.getBoundingClientRect();
    const main = container.parentElement?.querySelector('main');
    if (main) {
      const mainRect = main.getBoundingClientRect();
      canvasBounds = { left: mainRect.left, top: full.top, right: mainRect.right, bottom: full.top + full.height };
    } else {
      canvasBounds = { left: full.left, top: full.top, right: full.left + full.width, bottom: full.top + full.height };
    }
  }

  const TOOLBAR_GAP = 32;     // gap between toolbar bottom and frame top
  const EDGE_PADDING = 24;    // minimum distance from canvas edges
  const TOOLBAR_HEIGHT = 40;  // approximate height of toolbar

  const rawCenterX = (minX + maxX) / 2;
  const frameTopY = minY;

  // Vertical: above frame if visible, otherwise anchor to canvas top
  let top: number;
  if (canvasBounds && frameTopY - TOOLBAR_GAP - TOOLBAR_HEIGHT < canvasBounds.top + EDGE_PADDING) {
    top = canvasBounds.top + EDGE_PADDING;
  } else {
    top = frameTopY - TOOLBAR_GAP - TOOLBAR_HEIGHT;
  }

  // Horizontal: centered on frame, clamped to canvas edges
  const halfWidth = toolbarWidth / 2;
  let left: number;
  if (canvasBounds && toolbarWidth > 0) {
    left = Math.max(
      canvasBounds.left + EDGE_PADDING,
      Math.min(rawCenterX - halfWidth, canvasBounds.right - EDGE_PADDING - toolbarWidth),
    );
  } else {
    left = rawCenterX - halfWidth;
  }

  // Get first relevant selected node for name + fill
  const firstId = relevantIds.values().next().value;
  const firstNode = firstId ? store.getNode(firstId) : undefined;
  if (!firstNode || !isGeometryNode(firstNode)) return null;

  // Show size picker only when the asset frame itself is selected, not a child
  const isFrameSelected = focusedFrameId != null && selection.selectedIds.has(focusedFrameId);

  // Determine size label: match against presets, otherwise show "Custom"
  const frameW = firstNode.width;
  const frameH = firstNode.height;
  const matchedPreset = SIZE_SECTIONS
    .flatMap((s) => s.items)
    .find((p) => p.width === frameW && p.height === frameH);
  const sizeLabel = matchedPreset
    ? matchedPreset.name
    : `${frameW} \u00d7 ${frameH}`;

  // Get fill color for swatch
  const fillColor = 'fills' in firstNode
    ? (firstNode as AppearanceNode).fills?.[0]?.color
    : undefined;
  const swatchBg = fillColor
    ? `rgb(${fillColor.r}, ${fillColor.g}, ${fillColor.b})`
    : 'rgb(255, 255, 255)';

  // Find active color preset
  const activeColorId = FRAME_COLORS.find(
    (c) =>
      fillColor &&
      c.rgb.r === fillColor.r &&
      c.rgb.g === fillColor.g &&
      c.rgb.b === fillColor.b,
  )?.id;

  const handleColorChange = (colorId: string) => {
    const entry = FRAME_COLORS.find((c) => c.id === colorId);
    if (!entry) return;
    for (const id of selection.selectedIds) {
      const node = store.getNode(id);
      if (node && 'fills' in node) {
        store.updateNode(id, {
          fills: [createPaint({ type: 'SOLID', color: entry.rgb, opacity: 1, visible: true })],
        });
      }
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-nav pointer-events-auto"
      style={{ left, top }}
    >
      <div
        data-preferred-theme="dark"
        className="flex items-center bg-bg rounded-lg shadow-300"
      >
        {/* Size preset dropdown — only when the asset frame itself is selected */}
        {isFrameSelected && (
          <div className="relative flex items-center p-1">
            <ButtonPrimitive
              ref={sizeTriggerRef}
              className={clsx(
                'flex items-center gap-1 rounded-md h-5 pl-2 pr-1 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyMd whitespace-nowrap',
                showSizes && 'bg-bg-secondary',
              )}
              onClick={() => {
                setSizeSearch('');
                setShowSizes((v) => !v);
              }}
            >
              {sizeLabel}
              <Icon16ChevronDown />
            </ButtonPrimitive>

            {showSizes && (
              <div
                ref={sizePopoverRef}
                className="absolute top-full mt-2 left-0 w-[280px] bg-bg rounded-lg shadow-300 py-1 text-bodyMd text-text"
              >
                {/* Search */}
                <div className="px-2 py-1">
                  <SearchInput
                    id="size-search"
                    value={sizeSearch}
                    onChange={setSizeSearch}
                    placeholder="Search"
                  />
                </div>

                <div className="max-h-[360px] overflow-y-auto">
                  {/* Custom size */}
                  <ButtonPrimitive
                    className="flex items-center w-full px-3 h-5 hover:bg-bg-hover active:bg-bg-pressed"
                    onClick={() => setShowSizes(false)}
                  >
                    Custom size
                  </ButtonPrimitive>

                  {/* Grouped presets */}
                  {filteredSections.length === 0 ? (
                    <div className="px-3 py-2 text-bodyMd text-text-secondary">
                      No results
                    </div>
                  ) : (
                    filteredSections.map((section) => (
                      <div key={section.title} className="border-t border-border pb-2">
                        <div className="px-3 pt-2.5 pb-1 text-bodyMd text-text-secondary">
                          {section.title}
                        </div>
                        {section.items.map((preset) => (
                          <ButtonPrimitive
                            key={preset.name}
                            className="flex items-center justify-between w-full px-3 h-4 hover:bg-bg-hover active:bg-bg-pressed"
                            onClick={() => {
                              for (const id of selection.selectedIds) {
                                store.updateNode(id, {
                                  width: preset.width,
                                  height: preset.height,
                                });
                              }
                              setShowSizes(false);
                            }}
                          >
                            <span>{preset.name}</span>
                            <span className="text-text-secondary text-bodyMd">
                              {preset.width} &times; {preset.height}
                            </span>
                          </ButtonPrimitive>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Color swatch — toggles color popover */}
        <div className={clsx("relative p-1 flex items-center", isFrameSelected && "border-l border-border")}>
          <ButtonPrimitive
            ref={colorTriggerRef}
            className={clsx(
              'flex items-center gap-1 rounded-md px-2 h-5 hover:bg-bg-hover active:bg-bg-pressed',
              showColors && 'bg-bg-secondary',
            )}
            onClick={() => setShowColors((v) => !v)}
          >
            <div
              className="w-3 h-3 rounded-sm border border-solid border-border"
              style={{ backgroundColor: swatchBg }}
            />
            <Icon16ChevronDown />
          </ButtonPrimitive>

          {/* Color popover — positioned above, centered on trigger */}
          {showColors && (
            <div
              ref={colorPopoverRef}
              data-preferred-theme="dark"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-2 gap-2"
            >
              {FRAME_COLORS.map((c) => (
                <ButtonPrimitive
                  key={c.id}
                  aria-label={c.label}
                  aria-pressed={activeColorId === c.id}
                  onClick={() => handleColorChange(c.id)}
                  className={clsx(
                    'rounded-sm w-4 h-4 shrink-0',
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

        {/* Border style button */}
        <div className="flex items-center p-1 border-l border-border">
          <ButtonPrimitive
            className="flex items-center gap-1 rounded-md h-5 px-1 hover:bg-bg-hover active:bg-bg-pressed"
          >
            <Icon24StrokeWeight />
            <Icon16ChevronDown />
          </ButtonPrimitive>
        </div>
      </div>
    </div>
  );
}
