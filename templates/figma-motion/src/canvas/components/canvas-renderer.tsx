import { useCallback, useEffect, useRef } from 'react';
import { ButtonPrimitive, InputPrimitive } from '@figma/fpl-components';

import {
  useRootNodes,
  useSceneGraph,
  useCanvasId,
  useCanvasColorScheme,
  useTextEditing,
  useSelection,
  useViewportState,
  useRendering,
  useNodeRef,
  useNode,
  getRotatedEdgeAnchor,
  LINE_HIT_AREA,
  nodePosition,
  StickyNoteRenderer,
  ShapeTextOverlay,
  ConnectorRenderer,
  useLabelEditing,
  formatFontFamily,
} from '@prototype/shared/canvas';
import type {
  Color,
  ConnectorNode,
  EllipseNode,
  FrameNode,
  GroupNode,
  GridSectionNode,
  LineNode,
  NodeId,
  Paint,
  PolygonNode,
  RectangleNode,
  SceneNode,
  SectionNode,
  ShapeWithTextNode,
  SlideNode,
  StickyNoteNode,
  StarNode,
  StrokeAlign,
  TextNode,
  VectorNode,
} from '@prototype/shared/canvas';
import { CURSORS } from '../cursors';
import { useAnimatedStyle, type BaseNodeForKf } from '../animation-utils';

function toBaseNode(node: { x: number; y: number; rotation: number; opacity: number; width: number; height: number }): BaseNodeForKf {
  return { x: node.x, y: node.y, rotation: node.rotation, opacity: node.opacity, width: node.width, height: node.height };
}

export function CanvasRenderer() {
  const canvasId = useCanvasId();
  const rootNodes = useRootNodes(canvasId);
  const sg = useSceneGraph();

  return (
    <>
      {rootNodes.map((node) => (
        <SceneNodeRenderer key={node.id} node={node} store={sg} isRoot />
      ))}
    </>
  );
}

// ── Node renderers ────────────────────────────────────────────────────

function SceneNodeRenderer({
  node,
  store,
  isRoot,
}: {
  node: SceneNode
  store: ReturnType<typeof useSceneGraph>
  isRoot?: boolean
}) {
  if (!node.visible) return null;

  switch (node.type) {
    case 'RECTANGLE':
      return <RectangleRenderer node={node} />;
    case 'ELLIPSE':
      return <EllipseRenderer node={node} />;
    case 'LINE':
      return <LineRenderer node={node} />;
    case 'POLYGON':
      return <PolygonRenderer node={node} />;
    case 'STAR':
      return <StarRenderer node={node} />;
    case 'TEXT':
      return <TextRenderer node={node as TextNode} />;
    case 'VECTOR':
      return <VectorRenderer node={node} />;
    case 'FRAME':
      return (
        <>
          <FrameRenderer node={node} store={store} />
          {isRoot && <FrameLabel nodeId={node.id} />}
        </>
      );
    case 'SECTION':
      return (
        <>
          <SectionRenderer node={node as SectionNode} store={store} />
          <SectionLabel node={node as SectionNode} />
        </>
      );
    case 'GRID_SECTION':
      return (
        <>
          <SectionRenderer node={node as GridSectionNode} store={store} />
          <SectionLabel node={node as GridSectionNode} />
        </>
      );
    case 'STICKY_NOTE':
      return <StickyNoteRenderer node={node as StickyNoteNode} />;
    case 'CONNECTOR':
      return <ConnectorRenderer node={node as ConnectorNode} />;
    case 'SHAPE_WITH_TEXT':
      return <ShapeWithTextRenderer node={node as ShapeWithTextNode} />;
    case 'SLIDE':
      return <SlideRenderer node={node as SlideNode} store={store} />;
    case 'GROUP':
      return <GroupRenderer node={node as GroupNode} store={store} />;
    default:
      return null;
  }
}

function RectangleRenderer({ node }: { node: RectangleNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const animStyle = useAnimatedStyle(node.id, toBaseNode(node));

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
        ...animStyle,
      }}
    />
  );
}

function TextRenderer({ node }: { node: TextNode }) {
  const { nodeRegistry } = useRendering();
  const fill = getFirstVisibleFill(node.fills);
  const store = useSceneGraph();
  const animStyle = useAnimatedStyle(node.id, toBaseNode(node));
  const { editingNodeId, stopEditing } = useTextEditing();
  const isEditing = editingNodeId === node.id;
  const elRef = useRef<HTMLDivElement>(null);

  // Register with NodeRegistry for imperative updates
  useEffect(() => {
    const el = elRef.current;
    if (el) nodeRegistry.register(node.id, el);
    return () => { nodeRegistry.unregister(node.id); };
  }, [node.id, nodeRegistry]);

  const selection = useSelection();

  // Sync rendered DOM size back to the store for auto-resized dimensions.
  // In WIDTH_AND_HEIGHT mode both dimensions are auto; in HEIGHT mode only
  // height is auto. ResizeObserver reports dimensions in the element's own
  // coordinate space (world-space), so no viewport scale conversion needed.
  useEffect(() => {
    const el = elRef.current;
    if (!el || node.textAutoResize === 'NONE') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: pxW, height: pxH } = entry.contentRect;
      const worldW = Math.round(pxW);
      const worldH = Math.round(pxH);
      const updates: Partial<TextNode> = {};

      if (node.textAutoResize === 'WIDTH_AND_HEIGHT') {
        if (worldW !== Math.round(node.width)) updates.width = worldW;
        if (worldH !== Math.round(node.height)) updates.height = worldH;
      } else if (node.textAutoResize === 'HEIGHT') {
        if (worldH !== Math.round(node.height)) updates.height = worldH;
      }

      if (Object.keys(updates).length > 0) {
        store.updateNode(node.id, updates);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [node.id, node.textAutoResize, node.width, node.height, store]);

  // Auto-focus and place cursor when entering edit mode.
  // Deferred via rAF so the browser's pointer-event sequence (pointerdown →
  // mousedown → pointerup → mouseup → click) has fully settled before we
  // move focus — otherwise the click's implicit focus handling can immediately
  // blur the contentEditable and trigger commitAndStop.
  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const id = requestAnimationFrame(() => {
      const el = elRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      if (el.textContent) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isEditing]);

  const commitAndStop = useCallback(() => {
    const text = elRef.current?.innerText.trim() ?? '';
    if (text) {
      store.updateNode(node.id, { characters: text });
    } else {
      // Empty text → delete the node
      store.deleteNode(node.id);
      selection.clear();
    }
    stopEditing();
  }, [store, node.id, stopEditing, selection]);

  // Handle Escape key via useEffect to avoid forbidden onKeyDown DOM prop
  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const el = elRef.current;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        commitAndStop();
      }
    }
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, commitAndStop]);

  return (
    <div
      ref={elRef}
      data-node-id={node.id}
      role={isEditing ? 'textbox' : undefined}
      aria-multiline={isEditing ? true : undefined}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onBlur={isEditing ? commitAndStop : undefined}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.textAutoResize === 'WIDTH_AND_HEIGHT' ? 'max-content' : node.width,
        minHeight: node.textAutoResize === 'NONE' ? node.height : 'auto',
        opacity: node.opacity,
        color: fill ? colorToCSS(fill.color, fill.opacity) : 'rgb(0,0,0)',
        fontFamily: formatFontFamily(node.fontFamily),
        fontSize: node.fontSize,
        fontWeight: node.fontWeight,
        textAlign: node.textAlignHorizontal.toLowerCase() as 'left' | 'center' | 'right',
        lineHeight: `${node.lineHeight}px`,
        letterSpacing: `${node.letterSpacing}px`,
        whiteSpace: node.textAutoResize === 'WIDTH_AND_HEIGHT' ? 'nowrap' : 'pre-wrap',
        wordBreak: 'break-word',
        outline: isEditing ? '1px solid var(--color-bgBrand)' : 'none',
        cursor: isEditing ? CURSORS.text : CURSORS.default,
        userSelect: isEditing ? 'text' : 'none',
        ...animStyle,
      }}
    >
      {node.characters}
    </div>
  );
}

function EllipseRenderer({ node }: { node: EllipseNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const animStyle = useAnimatedStyle(node.id, toBaseNode(node));
  const rx = node.width / 2;
  const ry = node.height / 2;

  // For inside strokes, we need to inset the ellipse
  const strokeWeight = stroke ? node.strokeWeight : 0;
  const inset = node.strokeAlign === 'INSIDE' ? strokeWeight : 0;

  return (
    <svg
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        ...animStyle,
      }}
    >
      <ellipse
        cx={rx}
        cy={ry}
        rx={rx - inset / 2}
        ry={ry - inset / 2}
        fill={fill ? colorToCSS(fill.color, fill.opacity) : 'none'}
        stroke={stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none'}
        strokeWidth={strokeWeight}
      />
    </svg>
  );
}

function FrameRenderer({
  node,
  store,
}: {
  node: SceneNode & { type: 'FRAME' }
  store: ReturnType<typeof useSceneGraph>
}) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const animStyle = useAnimatedStyle(node.id, toBaseNode(node));
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        anchorName: `--node-${node.id}`,
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        overflow: node.clipsContent ? 'hidden' : undefined,
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
        ...animStyle,
      } as React.CSSProperties}
    >
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}

function SectionRenderer({
  node,
  store,
}: {
  node: SectionNode | GridSectionNode
  store: ReturnType<typeof useSceneGraph>
}) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        anchorName: `--node-${node.id}`,
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        overflow: 'visible',
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
      } as React.CSSProperties}
    >
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}

/** Label rendered above sections as a colored pill with section icon */
function SectionLabel({ node }: { node: SectionNode | GridSectionNode }) {
  const { state } = useViewportState();
  const { isSelected } = useSelection();
  const store = useSceneGraph();
  const canvasId = useCanvasId();
  const scheme = useCanvasColorScheme(canvasId);
  const selected = isSelected(node.id);
  const { editingLabelNodeId, startLabelEdit, stopLabelEdit } = useLabelEditing();
  const isEditing = editingLabelNodeId === node.id;
  const labelRef = useRef<HTMLInputElement>(null);
  const fontSize = 11 / state.scale;
  const pillPadY = 4 / state.scale;
  const pillPadX = 4 / state.scale;
  const pillRadius = 3 / state.scale;

  const fill = getFirstVisibleFill(node.fills);
  const pillBg = fill ? colorToCSS(fill.color, Math.min(fill.opacity, 0.6)) : 'rgba(255,255,255,0.6)';
  const suffix = scheme === 'dark' ? 'OnDarkCanvas' : 'OnLightCanvas';
  const textColor = selected ? `var(--color-fsTextSelected${suffix})` : `var(--color-fsText${suffix})`;

  const commitRename = useCallback(() => {
    if (!labelRef.current) return;
    const newName = labelRef.current.value.trim() || node.name;
    store.updateNode(node.id, { name: newName });
    stopLabelEdit();
  }, [node.id, node.name, store, stopLabelEdit]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    startLabelEdit(node.id);
    requestAnimationFrame(() => {
      if (!labelRef.current) return;
      labelRef.current.focus();
      labelRef.current.select();
    });
  }, [startLabelEdit, node.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      stopLabelEdit();
    }
  }, [commitRename, stopLabelEdit]);

  const gap = 16 / state.scale;

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        positionAnchor: `--node-${node.id}`,
        bottom: `anchor(top)`,
        left: `anchor(left)`,
        marginBottom: gap,
        fontSize,
        lineHeight: 1,
        color: textColor,
        whiteSpace: 'nowrap',
        cursor: CURSORS.default,
        userSelect: 'none',
      } as React.CSSProperties}
    >
      {/* Label — editable on double-click */}
      {isEditing ? (
        <InputPrimitive
          id={`section-rename-${node.id}`}
          ref={labelRef}
          defaultValue={node.name}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          style={{
            backgroundColor: pillBg,
            borderRadius: pillRadius,
            padding: `${pillPadY}px ${pillPadX}px`,
            cursor: 'text',
            outline: 'solid 1px var(--color-border-selected)',
            minWidth: 80 / state.scale,
            height: '19px',
            border: 'none',
            font: 'inherit',
            color: 'inherit',
            lineHeight: 'inherit',
          }}
        />
      ) : (
        <ButtonPrimitive
          onDoubleClick={handleDoubleClick}
          style={{
            backgroundColor: pillBg,
            borderRadius: pillRadius,
            padding: `${pillPadY}px ${pillPadX}px`,
            cursor: CURSORS.default,
            userSelect: 'none',
            outline: 'solid 1px rgba(0, 0, 0, 0.2)',
            border: 'none',
            font: 'inherit',
            color: 'inherit',
            lineHeight: 'inherit',
          }}
        >
          {node.name}
        </ButtonPrimitive>
      )}
    </div>
  );
}

function VectorRenderer({ node }: { node: VectorNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const stroke = getFirstVisibleStroke(node.strokes);
  const fill = getFirstVisibleFill(node.fills);
  const hasStroke = !!stroke;
  const strokeWeight = stroke ? node.strokeWeight : 0;

  // Use path-space dimensions for viewBox (falls back to node size for legacy vectors)
  const pw = node.pathWidth ?? node.width;
  const ph = node.pathHeight ?? node.height;
  // Expand the SVG viewBox by the stroke weight so strokes aren't clipped
  const padding = hasStroke ? strokeWeight / 2 : 0;
  const viewBoxW = pw + padding * 2;
  const viewBoxH = ph + padding * 2;

  return (
    <svg
      ref={ref}
      data-node-id={node.id}
      viewBox={`${-padding} ${-padding} ${viewBoxW} ${viewBoxH}`}
      preserveAspectRatio="none"
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
      }}
    >
      {node.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? (fill ? colorToCSS(fill.color, fill.opacity) : 'none')}
          stroke={hasStroke ? colorToCSS(stroke.color, stroke.opacity) : 'none'}
          strokeWidth={hasStroke ? strokeWeight : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function LineRenderer({ node }: { node: LineNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const stroke = getFirstVisibleStroke(node.strokes);
  const strokeWeight = stroke ? node.strokeWeight : 1;
  // Line height is 0; the SVG has a minimum height of the hit area so it's easily clickable
  const svgHeight = Math.max(node.height, strokeWeight * 2, LINE_HIT_AREA);
  const cy = svgHeight / 2;

  return (
    <svg
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y - svgHeight / 2, node.rotation),
        width: node.width,
        height: svgHeight,
        opacity: node.opacity,
        overflow: 'visible',
        // Rotate around the start point of the line so (x,y) = visual start
        transformOrigin: '0 50%',
      }}
    >
      {/* Invisible hit area for easier clicking */}
      <line x1={0} y1={cy} x2={node.width} y2={cy} stroke="transparent" strokeWidth={LINE_HIT_AREA} />
      <line
        x1={0}
        y1={cy}
        x2={node.width}
        y2={cy}
        stroke={stroke ? colorToCSS(stroke.color, stroke.opacity) : 'rgb(0,0,0)'}
        strokeWidth={strokeWeight}
      />
    </svg>
  );
}

function PolygonRenderer({ node }: { node: PolygonNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const cx = node.width / 2;
  const cy = node.height / 2;
  const rx = node.width / 2;
  const ry = node.height / 2;

  const pts: string[] = [];
  for (let i = 0; i < node.sides; i++) {
    const angle = (2 * Math.PI * i) / node.sides - Math.PI / 2;
    pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
  }

  return (
    <svg
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
      }}
    >
      <polygon
        points={pts.join(' ')}
        fill={fill ? colorToCSS(fill.color, fill.opacity) : 'none'}
        stroke={stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none'}
        strokeWidth={stroke ? svgStrokeWidth(node.strokeWeight, node.strokeAlign) : 0}
        paintOrder={node.strokeAlign === 'OUTSIDE' ? 'stroke' : undefined}
      />
    </svg>
  );
}

function StarRenderer({ node }: { node: StarNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const cx = node.width / 2;
  const cy = node.height / 2;
  const outerRx = node.width / 2;
  const outerRy = node.height / 2;
  const innerRx = outerRx * node.innerRadius;
  const innerRy = outerRy * node.innerRadius;

  const pts: string[] = [];
  for (let i = 0; i < node.points * 2; i++) {
    const angle = (Math.PI * i) / node.points - Math.PI / 2;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? outerRx : innerRx;
    const ry = isOuter ? outerRy : innerRy;
    pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
  }

  return (
    <svg
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
      }}
    >
      <polygon
        points={pts.join(' ')}
        fill={fill ? colorToCSS(fill.color, fill.opacity) : 'none'}
        stroke={stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none'}
        strokeWidth={stroke ? svgStrokeWidth(node.strokeWeight, node.strokeAlign) : 0}
        paintOrder={node.strokeAlign === 'OUTSIDE' ? 'stroke' : undefined}
      />
    </svg>
  );
}

/** Minimum screen-space width (px) before the frame label is hidden entirely */
const FRAME_LABEL_MIN_WIDTH = 16;

/**
 * Label rendered above root-level frames, matching Figma's canvas chrome.
 * Subscribes directly to the node via useNode so it updates live during
 * shape creation drag (useRootNodes only fires on structural changes).
 */
function FrameLabel({ nodeId }: { nodeId: NodeId }) {
  const node = useNode(nodeId) as FrameNode | undefined;
  const { state } = useViewportState();
  const { isSelected, hoveredId } = useSelection();
  const sg = useSceneGraph();
  const canvasId = useCanvasId();
  const scheme = useCanvasColorScheme(canvasId);
  const { editingLabelNodeId, startLabelEdit, stopLabelEdit } = useLabelEditing();
  const isEditing = node ? editingLabelNodeId === node.id : false;
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = useCallback(() => {
    if (!inputRef.current || !node) return;
    const newName = inputRef.current.value.trim() || node.name;
    sg.updateNode(node.id, { name: newName });
    stopLabelEdit();
  }, [node, sg, stopLabelEdit]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!node) return;
    e.stopPropagation();
    startLabelEdit(node.id);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.select();
    });
  }, [startLabelEdit, node]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      stopLabelEdit();
    }
  }, [commitRename, stopLabelEdit]);

  if (!node) return null;

  const fontSize = 11 / state.scale;
  const gap = 8 / state.scale;

  // Constrain label to the frame's screen-space width
  const screenW = node.width * state.scale;
  if (screenW < FRAME_LABEL_MIN_WIDTH) return null;

  const suffix = scheme === 'dark' ? 'OnDarkCanvas' : 'OnLightCanvas';
  const selected = isSelected(node.id);
  const hovered = hoveredId === node.id;
  const color = selected || hovered
    ? `var(--color-fsTextSelected${suffix})`
    : `var(--color-fsText${suffix}Secondary)`;

  const labelContent = isEditing ? (
    <InputPrimitive
      id={`frame-rename-${node.id}`}
      ref={inputRef}
      defaultValue={node.name}
      onBlur={commitRename}
      onKeyDown={handleKeyDown}
      style={{
        border: 'none',
        outline: 'solid 2px var(--color-border-selected)',
        borderRadius: 2 / state.scale,
        padding: `${2 / state.scale}px ${4 / state.scale}px`,
        minWidth: 60 / state.scale,
        font: 'inherit',
        color: 'inherit',
        lineHeight: 'inherit',
        background: 'var(--color-bg)',
        cursor: 'text',
      }}
    />
  ) : (
    <ButtonPrimitive
      onDoubleClick={handleDoubleClick}
      style={{
        border: 'none',
        background: 'none',
        padding: 0,
        font: 'inherit',
        color: 'inherit',
        lineHeight: 'inherit',
        cursor: CURSORS.default,
        userSelect: 'none',
      }}
    >
      {node.name}
    </ButtonPrimitive>
  );

  // When rotated, CSS anchor positioning uses the AABB (not the visual edge),
  // so we compute the top-left endpoint of the visual top edge manually and
  // rotate the label to match the edge angle.
  if (node.rotation) {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const anchor = getRotatedEdgeAnchor(node.width, node.height, node.rotation);
    const labelX = cx + anchor.topLeftEnd.x + anchor.topNormal.x * (gap + fontSize);
    const labelY = cy + anchor.topLeftEnd.y + anchor.topNormal.y * (gap + fontSize);

    return (
      <div
        data-frame-label={node.id}
        data-node-id={node.id}
        style={{
          position: 'absolute',
          transform: `translate(${labelX}px, ${labelY}px) rotate(${anchor.topAngleDeg}deg)`,
          transformOrigin: '0 100%',
          fontSize,
          lineHeight: 1,
          color,
          whiteSpace: 'nowrap',
          cursor: CURSORS.default,
          userSelect: 'none',
        }}
      >
        {labelContent}
      </div>
    );
  }

  return (
    <div
      data-frame-label={nodeId}
      data-node-id={node.id}
      style={{
        position: 'absolute',
        positionAnchor: `--node-${nodeId}`,
        bottom: `anchor(top)`,
        left: `anchor(left)`,
        marginBottom: gap,
        maxWidth: isEditing ? undefined : node.width,
        fontSize,
        lineHeight: 1,
        color,
        whiteSpace: 'nowrap',
        overflow: isEditing ? 'visible' : 'hidden',
        textOverflow: isEditing ? undefined : 'ellipsis',
        cursor: CURSORS.default,
        userSelect: 'none',
      } as React.CSSProperties}
    >
      {labelContent}
    </div>
  );
}

function ShapeWithTextRenderer({ node }: { node: ShapeWithTextNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.shapeType === 'ELLIPSE' ? '50%' : node.cornerRadius,
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
        overflow: 'hidden',
      }}
    >
      <ShapeTextOverlay node={{ ...node, type: node.shapeType }} />
    </div>
  );
}

function SlideRenderer({
  node,
  store,
}: {
  node: SlideNode
  store: ReturnType<typeof useSceneGraph>
}) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        overflow: node.clipsContent ? 'hidden' : undefined,
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
      }}
    >
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}

function GroupRenderer({
  node,
  store,
}: {
  node: GroupNode
  store: ReturnType<typeof useSceneGraph>
}) {
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  return (
    <>
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────


function colorToCSS(color: Color, opacity: number): string {
  if (opacity >= 1) return `rgb(${color.r}, ${color.g}, ${color.b})`;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

function getFirstVisibleFill(fills: Paint[]): Paint | undefined {
  // Fills render bottom to top, but for a single fill we just take the last visible one
  for (let i = fills.length - 1; i >= 0; i--) {
    if (fills[i].visible) return fills[i];
  }
  return undefined;
}

function getFirstVisibleStroke(strokes: Paint[]): Paint | undefined {
  for (const s of strokes) {
    if (s.visible) return s;
  }
  return undefined;
}

/** SVG stroke width adjusted for position (OUTSIDE/INSIDE double to compensate for clipping) */
function svgStrokeWidth(weight: number, align: StrokeAlign): number {
  return align === 'CENTER' ? weight : weight * 2;
}

function strokeStyles(stroke: Paint | undefined, weight: number, align: StrokeAlign): React.CSSProperties {
  if (!stroke) return {};

  const color = colorToCSS(stroke.color, stroke.opacity);

  if (align === 'INSIDE') {
    return {
      boxShadow: `inset 0 0 0 ${weight}px ${color}`,
    };
  }

  if (align === 'OUTSIDE') {
    return {
      boxShadow: `0 0 0 ${weight}px ${color}`,
    };
  }

  // CENTER — half inside, half outside (matches Figma behavior)
  const half = weight / 2;
  return {
    boxShadow: `inset 0 0 0 ${half}px ${color}, 0 0 0 ${half}px ${color}`,
  };
}
