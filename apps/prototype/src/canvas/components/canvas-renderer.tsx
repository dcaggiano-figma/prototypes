import { useCallback, useEffect, useRef, useState } from 'react';
import { ButtonPrimitive, InputPrimitive } from '@figma/fpl-components';

import type {
  Color,
  EllipseNode,
  FrameNode,
  LineNode,
  Paint,
  PolygonNode,
  RectangleNode,
  SceneNode,
  SectionNode,
  StarNode,
  StrokeAlign,
  TextNode,
  VectorNode,
} from '@prototype/shared/canvas';
import {
  useCanvasId,
  useRootNodes,
  useSceneGraph,
  useTextEditing,
  useSelection,
  useViewportState,
  useRendering,
  useNodeRef,
} from '@prototype/shared/canvas';

import { CURSORS } from '../cursors';

export function CanvasRenderer() {
  const canvasId = useCanvasId();
  const rootNodes = useRootNodes(canvasId);
  const sg = useSceneGraph();

  return (
    <>
      {rootNodes.map((node) => (
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
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        transform: nodeTransform(node.x, node.y, node.rotation),
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
      }}
    />
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
        position: 'absolute',
        width: node.textAutoResize === 'WIDTH_AND_HEIGHT' ? 'max-content' : node.width,
        minHeight: node.textAutoResize === 'NONE' ? node.height : 'auto',
        opacity: node.opacity,
        transform: nodeTransform(node.x, node.y, node.rotation),
        color: fill ? colorToCSS(fill.color, fill.opacity) : 'rgb(0,0,0)',
        fontFamily: `"${node.fontFamily}"`,
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
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const rx = node.width / 2;
  const ry = node.height / 2;

  // For inside strokes, we need to inset the ellipse
  const weight = stroke ? node.strokeWeight : 0;
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
        transform: nodeTransform(node.x, node.y, node.rotation),
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
  sg,
}: {
  node: SceneNode & { type: 'FRAME' }
  sg: ReturnType<typeof useSceneGraph>
}) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => sg.getNode(id)).filter(Boolean) as SceneNode[];

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
        transform: nodeTransform(node.x, node.y, node.rotation),
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
      }}
    >
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} sg={sg} />
      ))}
    </div>
  );
}

function SectionRenderer({
  node,
  sg,
}: {
  node: SectionNode
  sg: ReturnType<typeof useSceneGraph>
}) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<HTMLDivElement>(node.id, nodeRegistry);
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => sg.getNode(id)).filter(Boolean) as SceneNode[];

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
        overflow: 'visible',
        transform: nodeTransform(node.x, node.y, node.rotation),
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke, node.strokeWeight, node.strokeAlign),
      }}
    >
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} sg={sg} />
      ))}
    </div>
  );
}

/** Label rendered above sections as a colored pill with section icon */
function SectionLabel({ node }: { node: SectionNode }) {
  const { state } = useViewportState();
  const { isSelected } = useSelection();
  const sg = useSceneGraph();
  const selected = isSelected(node.id);
  const [isEditing, setIsEditing] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);
  const fontSize = 11 / state.scale;
  const pillPadY = 4 / state.scale;
  const pillPadX = 4 / state.scale;
  const pillRadius = 3 / state.scale;

  const fill = getFirstVisibleFill(node.fills);
  const pillBg = fill ? colorToCSS(fill.color, Math.min(fill.opacity, 0.6)) : 'rgba(255,255,255,0.6)';
  const textColor = selected ? 'var(--color-fsTextOnLightCanvas' : 'var(--color-fsTextOnLightCanvas)';

  const commitRename = useCallback(() => {
    if (!labelRef.current) return;
    const newName = labelRef.current.value.trim() || node.name;
    sg.updateNode(node.id, { name: newName });
    setIsEditing(false);
  }, [node.id, node.name, sg]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    requestAnimationFrame(() => {
      if (!labelRef.current) return;
      labelRef.current.focus();
      labelRef.current.select();
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
    }
  }, [commitRename]);

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        transform: `translate(${node.x}px, ${node.y - fontSize - 16 / state.scale}px)`,
        fontSize,
        lineHeight: 1,
        color: textColor,
        whiteSpace: 'nowrap',
        cursor: CURSORS.default,
        userSelect: 'none',
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
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        transform: nodeTransform(node.x, node.y, node.rotation),
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

function LineRenderer({ node }: { node: LineNode }) {
  const { nodeRegistry } = useRendering();
  const ref = useNodeRef<SVGSVGElement>(node.id, nodeRegistry);
  const stroke = getFirstVisibleStroke(node.strokes);
  const weight = stroke ? node.strokeWeight : 1;
  // Line height is 0; the SVG has a minimum height of the stroke weight so the line is visible
  const svgHeight = Math.max(node.height, weight * 2);

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
        transform: nodeTransform(node.x, node.y - svgHeight / 2, node.rotation),
        // Rotate around the start point of the line so (x,y) = visual start
        transformOrigin: '0 50%',
      }}
    >
      <line
        x1={0}
        y1={svgHeight / 2}
        x2={node.width}
        y2={svgHeight / 2}
        stroke={stroke ? colorToCSS(stroke.color, stroke.opacity) : 'rgb(0,0,0)'}
        strokeWidth={weight}
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
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        transform: nodeTransform(node.x, node.y, node.rotation),
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
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        transform: nodeTransform(node.x, node.y, node.rotation),
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

/** Label rendered above root-level frames, matching Figma's canvas chrome (FB-45) */
function FrameLabel({ node }: { node: FrameNode }) {
  const { state } = useViewportState();
  const { isSelected } = useSelection();
  // Render at a fixed screen-size by counter-scaling the viewport zoom
  const fontSize = 11 / state.scale;

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        transform: `translate(${node.x}px, ${node.y - fontSize - 8 / state.scale}px)`,
        fontSize,
        lineHeight: 1,
        color: isSelected(node.id) ? 'var(--color-fsTextSelectedOnLightCanvas)' : 'var(--color-fsTextOnLightCanvasSecondary)',
        whiteSpace: 'nowrap',
        cursor: CURSORS.default,
        userSelect: 'none',
      }}
    >
      {node.name}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Build a GPU-composited transform for node positioning (avoids layout thrash) */
function nodeTransform(x: number, y: number, rotation: number): string {
  if (rotation) return `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
  return `translate(${x}px, ${y}px)`;
}

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

/** SVG stroke width adjusted for align (OUTSIDE/INSIDE double to compensate for clipping) */
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
