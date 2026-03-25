import { useCallback, useEffect, useRef } from 'react';
import { ButtonPrimitive, InputPrimitive } from '@figma/fpl-components';

import {
  useRootNodes,
  useSceneGraph,
  useCanvasId,
  useTextEditing,
  useSelection,
  useViewportState,
  useRendering,
  useNodeRef,
  getWorldPosition,
  isGeometryNode as isGeoNode,
  getRotatedEdgeAnchor,
  LINE_HIT_AREA,
  StickyNoteRenderer,
  ShapeTextOverlay,
  ConnectorRenderer,
  useLabelEditing,
  formatFontFamily,
} from '@prototype/shared/canvas';
import type {
  ConnectorNode,
  EllipseNode,
  FrameNode,
  GridSectionNode,
  GroupNode,
  LineNode,
  PolygonNode,
  RectangleNode,
  SceneNode,
  SectionNode,
  ShapeWithTextNode,
  SlideNode,
  StickyNoteNode,
  StarNode,
  TextNode,
  VectorNode,
} from '@prototype/shared/canvas';
import { useViewMode } from '../../components/ViewModeContext';
import { CURSORS } from '../cursors';
import {
  colorToCSS,
  getFirstVisibleFill,
  getFirstVisibleStroke,
  nodePosition,
  strokeStyles,
  svgStrokeWidth,
} from './render-helpers';

export function CanvasRenderer() {
  const canvasId = useCanvasId();
  const rootNodes = useRootNodes(canvasId);
  const store = useSceneGraph();
  const { viewMode, focusedFrameId, isAnimatingModeChange } = useViewMode();

  // In asset mode with a focused frame, only render that frame
  // (but render all nodes during mode-change animation so the grid is visible).
  // Focus-only animations keep rendering just the focused frame.
  // We wrap it in a container offset by the parent's world position so the
  // frame's local coordinates align with the world-space viewport target.
  if (viewMode === 'asset' && focusedFrameId && !isAnimatingModeChange) {
    const focusedNode = store.getNode(focusedFrameId);
    if (focusedNode && isGeoNode(focusedNode)) {
      const world = getWorldPosition(store, focusedNode);
      const offsetX = world.x - focusedNode.x;
      const offsetY = world.y - focusedNode.y;
      return (
        <div style={{ position: 'absolute', transform: `translate(${offsetX}px, ${offsetY}px)` }}>
          <SceneNodeRenderer node={focusedNode} store={store} isRoot />
        </div>
      );
    }
  }

  return (
    <>
      {rootNodes.map((node) => (
        <SceneNodeRenderer key={node.id} node={node} store={store} isRoot />
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
          {isRoot && <FrameLabel node={node} />}
          <FrameRenderer node={node} store={store} />
        </>
      );
    case 'SLIDE':
      return (
        <>
          <SlideSelectionContainer node={node as SlideNode} />
          <SlideRenderer node={node as SlideNode} store={store} />
        </>
      );
    case 'SECTION':
    case 'GRID_SECTION':
      return (
        <>
          <SectionLabel node={node as SectionNode | GridSectionNode} />
          <SectionRenderer node={node as SectionNode | GridSectionNode} store={store} />
        </>
      );
    case 'STICKY_NOTE':
      return <StickyNoteRenderer node={node as StickyNoteNode} />;
    case 'CONNECTOR':
      return <ConnectorRenderer node={node as ConnectorNode} />;
    case 'SHAPE_WITH_TEXT':
      return <ShapeWithTextRenderer node={node as ShapeWithTextNode} />;
    case 'GROUP':
      return <GroupRenderer node={node as GroupNode} store={store} />;
    default:
      return null;
  }
}

export function RectangleRenderer({ node }: { node: RectangleNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        ...nodePosition(node.x, node.y, node.rotation),
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
      }}
    />
  );
}

function TextRenderer({ node }: { node: TextNode }) {
  const { nodeRegistry } = useRendering();
  const fill = getFirstVisibleFill(node.fills);
  const store = useSceneGraph();
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
        position: 'absolute',
        width: node.textAutoResize === 'WIDTH_AND_HEIGHT' ? 'max-content' : node.width,
        minHeight: node.textAutoResize === 'NONE' ? node.height : 'auto',
        opacity: node.opacity,
        ...nodePosition(node.x, node.y, node.rotation),
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
      }}
    >
      {node.characters}
    </div>
  );
}

export function EllipseRenderer({ node }: { node: EllipseNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const rx = node.width / 2;
  const ry = node.height / 2;

  // For inside strokes, we need to inset the ellipse
  const weight = node.strokeWeight;
  const inset = node.strokeAlign === 'INSIDE' ? weight : 0;

  return (
    <svg
      ref={ref}
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        ...nodePosition(node.x, node.y, node.rotation),
      }}
    >
      <ellipse
        cx={rx}
        cy={ry}
        rx={rx - inset / 2}
        ry={ry - inset / 2}
        fill={fill ? colorToCSS(fill.color, fill.opacity) : 'none'}
        stroke={stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none'}
        strokeWidth={weight}
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
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        overflow: node.clipsContent ? 'hidden' : undefined,
        ...nodePosition(node.x, node.y, node.rotation),
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

function SectionRenderer({
  node,
  store,
}: {
  node: SectionNode | GridSectionNode
  store: ReturnType<typeof useSceneGraph>
}) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const stroke = getFirstVisibleStroke(node.strokes);
  const { isSelected } = useSelection();
  const { state: viewport } = useViewportState();
  const { viewMode } = useViewMode();
  const selected = isSelected(node.id);
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  // Sections are not interactive in asset (focus) mode
  const isInteractive = viewMode === 'grid';

  const defaultBorderColor = stroke
    ? colorToCSS(stroke.color, stroke.opacity)
    : 'transparent';
  const borderColor = selected
    ? 'var(--color-border-selected)'
    : defaultBorderColor;

  // Always 2px on screen regardless of zoom — constant width avoids child shift on selection
  const borderWidth = 2 / viewport.scale;

  return (
    <div
      ref={ref}
      data-node-id={isInteractive ? node.id : undefined}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        ...nodePosition(node.x, node.y, node.rotation),
        borderTop: `${borderWidth}px solid ${borderColor}`,
      }}
    >
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} store={store} />
      ))}
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
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        overflow: node.clipsContent ? 'hidden' : undefined,
        ...nodePosition(node.x, node.y, node.rotation),
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
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.shapeType === 'ELLIPSE' ? '50%' : node.cornerRadius,
        ...nodePosition(node.x, node.y, node.rotation),
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
        overflow: 'hidden',
      }}
    >
      <ShapeTextOverlay node={{ ...node, type: node.shapeType }} />
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

/** Label rendered above sections as a colored pill with section icon */
function SectionLabel({ node }: { node: SectionNode | GridSectionNode }) {
  const { state } = useViewportState();
  const { isSelected } = useSelection();
  const { viewMode } = useViewMode();
  const store = useSceneGraph();
  const selected = isSelected(node.id);
  const { editingLabelNodeId, startLabelEdit, stopLabelEdit } = useLabelEditing();
  const isEditing = editingLabelNodeId === node.id;
  const labelRef = useRef<HTMLInputElement>(null);
  const fontSize = 11 / state.scale;
  const pillPadY = 4 / state.scale;
  const pillPadX = 4 / state.scale;
  const pillRadius = 3 / state.scale;

  // Sections are not interactive in asset (focus) mode
  const isInteractive = viewMode === 'grid';

  const fill = getFirstVisibleFill(node.fills);
  const defaultPillBg = fill ? colorToCSS(fill.color, Math.min(fill.opacity, 0.6)) : 'rgba(255,255,255,0.6)';
  const pillBg = selected ? 'var(--color-bg-selected-strong)' : defaultPillBg;
  const textColor = selected ? 'var(--color-text-onselected-strong)' : 'var(--color-fsTextOnLightCanvas)';

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

  return (
    <div
      data-node-id={isInteractive ? node.id : undefined}
      style={{
        position: 'absolute',
        transform: `translate(${node.x}px, ${node.y - fontSize - 16 / state.scale}px)`,
        fontSize,
        lineHeight: 1,
        color: textColor,
        whiteSpace: 'nowrap',
        cursor: CURSORS.default,
        userSelect: 'none',
        pointerEvents: isInteractive ? undefined : 'none',
      }}
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
            backgroundColor: 'var(--color-bg)',
            borderRadius: pillRadius,
            padding: `${pillPadY}px ${pillPadX}px`,
            cursor: 'text',
            outline: 'solid 1px var(--color-border-selected)',
            minWidth: 80 / state.scale,
            border: 'none',
            font: 'inherit',
            color: 'var(--color-text)',
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
            outline: selected ? 'none' : 'solid 1px rgba(0, 0, 0, 0.2)',
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

export function VectorRenderer({ node }: { node: VectorNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const stroke = getFirstVisibleStroke(node.strokes);
  const fill = getFirstVisibleFill(node.fills);
  const hasStroke = !!stroke;
  const weight = node.strokeWeight;

  // Use path-space dimensions for viewBox (falls back to node size for legacy vectors)
  const pw = node.pathWidth ?? node.width;
  const ph = node.pathHeight ?? node.height;
  // Expand the SVG viewBox by the stroke weight so strokes aren't clipped
  const padding = hasStroke ? weight / 2 : 0;
  const viewBoxW = pw + padding * 2;
  const viewBoxH = ph + padding * 2;

  return (
    <svg
      ref={ref}
      data-node-id={node.id}
      viewBox={`${-padding} ${-padding} ${viewBoxW} ${viewBoxH}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        ...nodePosition(node.x, node.y, node.rotation),
      }}
    >
      {node.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? (fill ? colorToCSS(fill.color, fill.opacity) : 'none')}
          stroke={hasStroke ? colorToCSS(stroke.color, stroke.opacity) : 'none'}
          strokeWidth={hasStroke ? weight : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export function LineRenderer({ node }: { node: LineNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const stroke = getFirstVisibleStroke(node.strokes);
  const weight = node.strokeWeight;
  // Line height is 0; the SVG has a minimum height of the hit area so it's easily clickable
  const svgHeight = Math.max(node.height, weight * 2, LINE_HIT_AREA);
  const cy = svgHeight / 2;

  return (
    <svg
      ref={ref}
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: svgHeight,
        opacity: node.opacity,
        overflow: 'visible',
        ...nodePosition(node.x, node.y - svgHeight / 2, node.rotation),
        // Rotate around the start point of the line so (x,y) = visual start
        transformOrigin: '0 50%',
      }}
    >
      {/* Invisible hit area for easier clicking */}
      <line x1={0} y1={cy} x2={node.width} y2={cy} stroke="transparent" strokeWidth={LINE_HIT_AREA} />
      <line x1={0} y1={cy} x2={node.width} y2={cy} stroke={stroke ? colorToCSS(stroke.color, stroke.opacity) : 'rgb(0,0,0)'} strokeWidth={weight} />
    </svg>
  );
}

export function PolygonRenderer({ node }: { node: PolygonNode }) {
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
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        ...nodePosition(node.x, node.y, node.rotation),
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

export function StarRenderer({ node }: { node: StarNode }) {
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
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        ...nodePosition(node.x, node.y, node.rotation),
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

/** Selection container for SLIDE nodes — grid mode shows a bg container, asset mode shows a label */
function SlideSelectionContainer({ node }: { node: SlideNode }) {
  const { state } = useViewportState();
  const { isSelected, hoveredId } = useSelection();
  const { viewMode } = useViewMode();
  const sg = useSceneGraph();
  const scale = state.scale;
  const selected = isSelected(node.id);
  const hovered = hoveredId === node.id && !selected;
  const { editingLabelNodeId, startLabelEdit, stopLabelEdit } = useLabelEditing();
  const isEditing = editingLabelNodeId === node.id;
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = useCallback(() => {
    if (!inputRef.current) return;
    const newName = inputRef.current.value.trim() || node.name;
    sg.updateNode(node.id, { name: newName });
    stopLabelEdit();
  }, [node.id, node.name, sg, stopLabelEdit]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    startLabelEdit(node.id);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.select();
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

  const outlineW = 2;
  const padY = 2 / scale;
  const padX = 4 / scale;
  const inputStyle: React.CSSProperties = {
    border: 'none',
    outline: `solid ${outlineW}px var(--color-border-selected)`,
    borderRadius: 2 / scale,
    padding: `${padY}px ${padX}px`,
    marginTop: -(padY + outlineW),
    marginBottom: -(padY + outlineW),
    minWidth: 60 / scale,
    font: 'inherit',
    color: 'inherit',
    lineHeight: 'inherit',
    background: 'var(--color-bg)',
    cursor: 'text',
  };

  if (viewMode === 'grid') {
    const pad = 8 / scale;
    const headerH = 24 / scale;
    const fontSize = 11 / scale;
    const borderRadius = 8 / scale;
    const visible = selected || hovered;

    const labelColor = visible
      ? 'var(--color-text-selected)'
      : 'var(--color-fsTextOnLightCanvasSecondary)';

    return (
      <>
        {/* Container — only on hover/selection */}
        {visible && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(${node.x - pad}px, ${node.y - headerH - pad}px)`,
              width: node.width + 2 * pad,
              height: node.height + headerH + 2 * pad,
              backgroundColor: 'var(--color-bg-selected)',
              borderRadius,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        )}
        {/* Header hit area — triggers hover and click-to-select */}
        <div
          data-node-id={node.id}
          style={{
            position: 'absolute',
            transform: `translate(${node.x - pad}px, ${node.y - headerH - pad}px)`,
            width: node.width + 2 * pad,
            height: headerH + pad,
            cursor: CURSORS.default,
          }}
        >
          {/* Label — always visible, on top of container */}
          <div
            style={{
              position: 'absolute',
              left: pad,
              top: pad,
              fontSize,
              lineHeight: isEditing ? 1 : 1.75,
              color: labelColor,
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {isEditing ? (
              <InputPrimitive
                id={`slide-rename-${node.id}`}
                ref={inputRef}
                defaultValue={node.name}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                style={inputStyle}
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
            )}
          </div>
        </div>
      </>
    );
  }

  // Asset/focus mode — simple label above the frame (mirrors FrameLabel)
  const fontSize = 11 / scale;
  const color = selected
    ? 'var(--color-fsTextSelectedOnLightCanvas)'
    : 'var(--color-fsTextOnLightCanvasSecondary)';

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        transform: `translate(${node.x}px, ${node.y - fontSize - 8 / scale}px)`,
        fontSize,
        lineHeight: 1,
        color,
        whiteSpace: 'nowrap',
        cursor: CURSORS.default,
        userSelect: 'none',
      }}
    >
      {isEditing ? (
        <InputPrimitive
          id={`slide-rename-asset-${node.id}`}
          ref={inputRef}
          defaultValue={node.name}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          style={inputStyle}
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
      )}
    </div>
  );
}

/** Label rendered above root-level frames, matching Figma's canvas chrome (FB-45) */
function FrameLabel({ node }: { node: FrameNode }) {
  const { state } = useViewportState();
  const { isSelected } = useSelection();
  const sg = useSceneGraph();
  const { editingLabelNodeId, startLabelEdit, stopLabelEdit } = useLabelEditing();
  const isEditing = editingLabelNodeId === node.id;
  const inputRef = useRef<HTMLInputElement>(null);

  // Render at a fixed screen-size by counter-scaling the viewport zoom
  const fontSize = 11 / state.scale;
  const gap = 8 / state.scale;

  const commitRename = useCallback(() => {
    if (!inputRef.current) return;
    const newName = inputRef.current.value.trim() || node.name;
    sg.updateNode(node.id, { name: newName });
    stopLabelEdit();
  }, [node.id, node.name, sg, stopLabelEdit]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    startLabelEdit(node.id);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.select();
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

  let labelX = node.x;
  let labelY = node.y - fontSize - gap;
  let rotateDeg = 0;
  if (node.rotation) {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const anchor = getRotatedEdgeAnchor(node.width, node.height, node.rotation);
    labelX = cx + anchor.topLeftEnd.x + anchor.topNormal.x * (gap + fontSize);
    labelY = cy + anchor.topLeftEnd.y + anchor.topNormal.y * (gap + fontSize);
    rotateDeg = anchor.topAngleDeg;
  }

  const selected = isSelected(node.id);
  const color = selected ? 'var(--color-fsTextSelectedOnLightCanvas)' : 'var(--color-fsTextOnLightCanvasSecondary)';

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        transform: `translate(${labelX}px, ${labelY}px)${rotateDeg ? ` rotate(${rotateDeg}deg)` : ''}`,
        transformOrigin: rotateDeg ? '0 100%' : undefined,
        fontSize,
        lineHeight: 1,
        color,
        whiteSpace: 'nowrap',
        cursor: CURSORS.default,
        userSelect: 'none',
      }}
    >
      {isEditing ? (
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
      )}
    </div>
  );
}

