import { useCallback, useEffect, useRef, useState } from 'react';
import { ButtonPrimitive, InputPrimitive } from '@figma/fpl-components';

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
  StarNode,
  TextNode,
  VectorNode,
} from '@prototype/shared/canvas';
import {
  useRootNodes,
  useCanvasId,
  useSceneGraph,
  useTextEditing,
  useSelection,
  useViewportState,
  useRendering,
  useNodeRef,
  getRotatedEdgeAnchor,
  LINE_HIT_AREA,
  nodePosition,
  colorToCSS,
  getFirstVisibleFill,
  getFirstVisibleStroke,
  svgStrokeWidth,
  strokeBoxShadow,
  StickyNoteRenderer,
  ShapeTextOverlay,
  ConnectorRenderer,
  useLabelEditing,
  formatFontFamily,
} from '@prototype/shared/canvas';
import type { FigJamStickyNoteNode, FigJamShapeWithTextNode } from '../text-types';
import { CURSORS } from '../cursors';


export function CanvasRenderer() {
  const canvasId = useCanvasId();
  const rootNodes = useRootNodes(canvasId);
  const sg = useSceneGraph();

  // Render connectors last so they always appear above other nodes (e.g. sections).
  // Connectors are cross-cutting elements that can span multiple containers.
  const nonConnectors = rootNodes.filter((n) => n.type !== 'CONNECTOR');
  const connectors = rootNodes.filter((n) => n.type === 'CONNECTOR');

  return (
    <>
      {nonConnectors.map((node) => (
        <SceneNodeRenderer key={node.id} node={node} sg={sg} isRoot />
      ))}
      {connectors.map((node) => (
        <SceneNodeRenderer key={node.id} node={node} sg={sg} isRoot />
      ))}
    </>
  );
}

// ── Node renderers ────────────────────────────────────────────────────

function SceneNodeRenderer({
  node,
  sg,
  isRoot,
}: {
  node: SceneNode
  sg: ReturnType<typeof useSceneGraph>
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
    case 'STICKY_NOTE':
      return <StickyNoteRenderer node={node as FigJamStickyNoteNode} />;
    case 'VECTOR':
      return <VectorRenderer node={node} />;
    case 'FRAME':
      return (
        <>
          {isRoot && <FrameLabel node={node} />}
          <FrameRenderer node={node} sg={sg} />
        </>
      );
    case 'SECTION':
      return (
        <>
          <SectionLabel node={node as SectionNode} />
          <SectionRenderer node={node as SectionNode} sg={sg} />
        </>
      );
    case 'CONNECTOR':
      return <ConnectorRenderer node={node as ConnectorNode} />;
    case 'SHAPE_WITH_TEXT':
      return <ShapeWithTextRenderer node={node as ShapeWithTextNode} />;
    case 'SLIDE':
      return <SlideContainerRenderer node={node as SlideNode} sg={sg} />;
    case 'GRID_SECTION':
      return (
        <>
          <SectionLabel node={node as GridSectionNode} />
          <SectionRenderer node={node as GridSectionNode} sg={sg} />
        </>
      );
    case 'GROUP':
      return <GroupRenderer node={node as GroupNode} sg={sg} />;
    default:
      return null;
  }
}

function RectangleRenderer({ node }: { node: RectangleNode }) {
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
        borderRadius: node.cornerRadius,
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        overflow: 'hidden',
        boxShadow: strokeBoxShadow(stroke, node.strokeWeight, node.strokeAlign),
      }}
    >
      <ShapeTextOverlay node={node as FigJamShapeWithTextNode} />
    </div>
  );
}

function TextRenderer({ node }: { node: TextNode }) {
  const { nodeRegistry } = useRendering();
  const fill = getFirstVisibleFill(node.fills);
  const sg = useSceneGraph();
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

  // Sync rendered DOM size back to the scene graph for auto-resized dimensions.
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
        sg.updateNode(node.id, updates);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [node.id, node.textAutoResize, node.width, node.height, sg]);

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
      sg.updateNode(node.id, { characters: text });
    } else {
      // Empty text → delete the node
      sg.deleteNode(node.id);
      selection.clear();
    }
    stopEditing();
  }, [sg, node.id, stopEditing, selection]);

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
      }}
    >
      {node.characters}
    </div>
  );
}


function EllipseRenderer({ node }: { node: EllipseNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const rx = node.width / 2;
  const ry = node.height / 2;

  // For inside strokes, we need to inset the ellipse
  const weight = stroke ? node.strokeWeight : 0;
  const inset = node.strokeAlign === 'INSIDE' ? weight : 0;

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
      }}
    >
      <svg
        style={{
          position: 'absolute',
          width: node.width,
          height: node.height,
          overflow: 'visible',
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
      <ShapeTextOverlay node={node as FigJamShapeWithTextNode} />
    </div>
  );
}

function FrameRenderer({
  node,
  sg,
}: {
  node: SceneNode & { type: 'FRAME' }
  sg: ReturnType<typeof useSceneGraph>
}) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => sg.getNode(id));

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
        boxShadow: strokeBoxShadow(stroke, node.strokeWeight, node.strokeAlign),
      }}
    >
      {childNodes.map((child) => child ? (
        <SceneNodeRenderer key={child.id} node={child} sg={sg} />
      ) : null)}
    </div>
  );
}

function SectionRenderer({
  node,
  sg,
}: {
  node: SectionNode | GridSectionNode
  sg: ReturnType<typeof useSceneGraph>
}) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => sg.getNode(id));

  const fill = getFirstVisibleFill(node.fills);

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        borderRadius: node.cornerRadius ? `${node.cornerRadius}px` : undefined,
        boxShadow: strokeBoxShadow(stroke, node.strokeWeight, node.strokeAlign),
      }}
    >
      {childNodes.map((child) => child ? (
        <SceneNodeRenderer key={child.id} node={child} sg={sg} />
      ) : null)}
    </div>
  );
}

/** Label rendered above sections as a colored pill with section icon */
function SectionLabel({ node: nodeProp }: { node: SectionNode | GridSectionNode }) {
  const { state } = useViewportState();
  const { isSelected } = useSelection();
  const sg = useSceneGraph();

  // Subscribe to scene graph changes so the label repositions during resize drag
  // (useRootNodes only fires on create/delete/reparent, not field changes).
  const [, bump] = useState(0);
  useEffect(() => sg.addListener(() => bump((n) => n + 1)), [sg]);
  const node = (sg.getNode(nodeProp.id) as SectionNode | GridSectionNode | undefined) ?? nodeProp;

  const selected = isSelected(node.id);
  const { editingLabelNodeId, startLabelEdit, stopLabelEdit } = useLabelEditing();
  const isEditing = editingLabelNodeId === node.id;
  const labelRef = useRef<HTMLInputElement>(null);
  const fontSize = 13 / state.scale;
  const pillPadY = 4 / state.scale;
  const pillPadX = 4 / state.scale;
  const iconLabelGap = 4 / state.scale;
  const pillRadius = 3 / state.scale;

  const fill = getFirstVisibleFill(node.fills);
  const pillBg = fill ? colorToCSS(fill.color, Math.min(fill.opacity, 0.6)) : 'rgba(255,255,255,0.6)';
  const textColor = selected ? 'var(--color-fsTextOnLightCanvas' : 'var(--color-fsTextOnLightCanvas)';

  const commitRename = useCallback(() => {
    if (!labelRef.current) return;
    const newName = labelRef.current.value.trim() || node.name;
    sg.updateNode(node.id, { name: newName });
    stopLabelEdit();
  }, [node.id, node.name, sg, stopLabelEdit]);

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
      data-node-id={node.id}
      style={{
        position: 'absolute',
        transform: `translate(${node.x}px, ${node.y - fontSize - 16 / state.scale}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: iconLabelGap,
        fontSize,
        lineHeight: 1,
        color: textColor,
        whiteSpace: 'nowrap',
        cursor: CURSORS.default,
        userSelect: 'none',
      }}
    >
      {/* Label container */}
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
            outline: 'solid 2px var(--color-border-selected)',
            minWidth: 80 / state.scale,
            border: 'none',
            font: 'inherit',
            color: 'inherit',
            lineHeight: 'inherit',
            height: '34px',
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
            minWidth: 8 / state.scale,
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

function ShapeWithTextRenderer({
  node,
}: {
  node: ShapeWithTextNode
}) {
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
        boxShadow: strokeBoxShadow(stroke, node.strokeWeight, node.strokeAlign),
        overflow: 'hidden',
      }}
    >
      <ShapeTextOverlay node={{ ...node, type: node.shapeType }} />
    </div>
  );
}

function SlideContainerRenderer({
  node,
  sg,
}: {
  node: SlideNode
  sg: ReturnType<typeof useSceneGraph>
}) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => sg.getNode(id));

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
        boxShadow: strokeBoxShadow(stroke, node.strokeWeight, node.strokeAlign),
      }}
    >
      {childNodes.map((child) => child ? (
        <SceneNodeRenderer key={child.id} node={child} sg={sg} />
      ) : null)}
    </div>
  );
}

function GroupRenderer({
  node,
  sg,
}: {
  node: GroupNode
  sg: ReturnType<typeof useSceneGraph>
}) {
  const childNodes = node.children.map((id) => sg.getNode(id));

  return (
    <>
      {childNodes.map((child) => child ? (
        <SceneNodeRenderer key={child.id} node={child} sg={sg} />
      ) : null)}
    </>
  );
}

function VectorRenderer({ node }: { node: VectorNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const stroke = getFirstVisibleStroke(node.strokes);
  const fill = getFirstVisibleFill(node.fills);
  const hasStroke = !!stroke;
  const weight = hasStroke ? node.strokeWeight : 0;
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
          strokeWidth={weight}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function renderLineCap(
  cap: string,
  x: number,
  cy: number,
  direction: 1 | -1, // 1 = pointing right (end), -1 = pointing left (start)
  strokeColor: string,
  weight: number,
) {
  if (cap === 'NONE') return null;
  const len = weight * 4;
  const half = weight * 3;

  if (cap === 'LINE_ARROW') {
    return (
      <polyline
        points={`${x - direction * len},${cy - half} ${x},${cy} ${x - direction * len},${cy + half}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={weight}
        strokeLinejoin="round"
      />
    );
  }
  if (cap === 'FILLED_ARROW') {
    return (
      <polygon
        points={`${x},${cy} ${x - direction * len},${cy - half} ${x - direction * len},${cy + half}`}
        fill={strokeColor}
        stroke="none"
      />
    );
  }
  if (cap === 'REVERSE_TRIANGLE') {
    return (
      <polygon
        points={`${x - direction * len},${cy} ${x},${cy - half} ${x},${cy + half}`}
        fill={strokeColor}
        stroke="none"
      />
    );
  }
  if (cap === 'CIRCLE') {
    const r = weight * 2;
    return <circle cx={x} cy={cy} r={r} fill={strokeColor} />;
  }
  if (cap === 'DIAMOND') {
    const size = weight * 2.5;
    return (
      <polygon
        points={`${x},${cy - size} ${x + size},${cy} ${x},${cy + size} ${x - size},${cy}`}
        fill={strokeColor}
        stroke="none"
      />
    );
  }
  return null;
}

function LineRenderer({ node }: { node: LineNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const stroke = getFirstVisibleStroke(node.strokes);
  const weight = stroke ? node.strokeWeight : 1;
  // Line height is 0; the SVG has a minimum height of the hit area so it's easily clickable
  const svgHeight = Math.max(node.height, weight * 2, LINE_HIT_AREA);
  const cy = svgHeight / 2;
  const strokeColor = stroke ? colorToCSS(stroke.color, stroke.opacity) : 'rgb(0,0,0)';
  const hasDash = node.strokeDashPattern.length > 0;

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
      <line
        x1={0}
        y1={cy}
        x2={node.width}
        y2={cy}
        stroke={strokeColor}
        strokeWidth={weight}
        strokeDasharray={hasDash ? node.strokeDashPattern.join(' ') : undefined}
      />
      {renderLineCap(node.startCap, 0, cy, -1, strokeColor, weight)}
      {renderLineCap(node.endCap, node.width, cy, 1, strokeColor, weight)}
    </svg>
  );
}

function PolygonRenderer({ node }: { node: PolygonNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
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
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
      }}
    >
      <svg
        style={{
          position: 'absolute',
          width: node.width,
          height: node.height,
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
      <ShapeTextOverlay node={node as FigJamShapeWithTextNode} />
    </div>
  );
}

function StarRenderer({ node }: { node: StarNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
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
    <div
      ref={ref}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        height: node.height,
        opacity: node.opacity,
      }}
    >
      <svg
        style={{
          position: 'absolute',
          width: node.width,
          height: node.height,
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
      <ShapeTextOverlay node={node as FigJamShapeWithTextNode} />
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
            marginTop: -(2 / state.scale + 2),
            marginBottom: -(2 / state.scale + 2),
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

