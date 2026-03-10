import { useCallback, useEffect, useRef, useState } from 'react';
import { ButtonPrimitive, InputPrimitive } from '@figma/fpl-components';

import { useRootNodes, useSceneGraph } from '../scene-graph/provider';
import { SLIDE_STYLE } from '../scene-graph/store';
import { useTextEditing } from '../text-editing/provider';
import { useViewMode } from '../../components/ViewModeContext';
import { getWorldPosition, isGeometryNode as isGeoNode } from '../scene-graph/world-position';
import type {
  EllipseNode,
  FrameNode,
  LineNode,
  PolygonNode,
  RectangleNode,
  SceneNode,
  SectionNode,
  SlideNode,
  StarNode,
  TextNode,
  VectorNode,
} from '../types';
import { CURSORS } from '../cursors';
import { useSelection } from '../selection/provider';
import { useViewport } from '../viewport/provider';
import {
  colorToCSS,
  getFirstVisibleFill,
  getFirstVisibleStroke,
  nodeTransform,
  strokeStyles,
  svgStrokeWidth,
} from './render-helpers';

export function CanvasRenderer() {
  const rootNodes = useRootNodes();
  const store = useSceneGraph();
  const { viewMode, focusedFrameId, isAnimatingViewMode } = useViewMode();

  // In asset mode with a focused frame, only render that frame
  // (but render all nodes during view-mode animation so the grid is visible).
  // We wrap it in a container offset by the parent's world position so the
  // frame's local coordinates align with the world-space viewport target.
  if (viewMode === 'asset' && focusedFrameId && !isAnimatingViewMode) {
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
          <SlideGridCard node={node as SlideNode} store={store} />
          <SlideRenderer node={node as SlideNode} store={store} />
        </>
      );
    case 'SECTION':
      return (
        <>
          <SectionLabel node={node as SectionNode} />
          <SectionRenderer node={node as SectionNode} store={store} />
        </>
      );
    default:
      return null;
  }
}

export function RectangleRenderer({ node }: { node: RectangleNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        transform: nodeTransform(node.x, node.y, node.rotation),
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke),
      }}
    />
  );
}

function TextRenderer({ node }: { node: TextNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const store = useSceneGraph();
  const { editingNodeId, stopEditing } = useTextEditing();
  const isEditing = editingNodeId === node.id;
  const elRef = useRef<HTMLDivElement>(null);

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

export function EllipseRenderer({ node }: { node: EllipseNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const rx = node.width / 2;
  const ry = node.height / 2;

  // For inside strokes, we need to inset the ellipse
  const strokeWeight = stroke ? stroke.weight : 0;
  const inset = stroke?.position === 'INSIDE' ? strokeWeight : 0;

  return (
    <svg
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
        stroke={stroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'none'}
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
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  return (
    <div
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
        ...strokeStyles(stroke),
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
  node: SectionNode
  store: ReturnType<typeof useSceneGraph>
}) {
  const stroke = getFirstVisibleStroke(node.strokes);
  const { isSelected, hoveredId } = useSelection();
  const selected = isSelected(node.id);
  const hovered = hoveredId === node.id;
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];
  const { state } = useViewport();

  const defaultBorderColor = stroke
    ? colorToCSS(stroke.paint.color, stroke.paint.opacity)
    : 'transparent';
  const borderColor = (selected || hovered)
    ? 'var(--color-border-selected)'
    : defaultBorderColor;

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        transform: nodeTransform(node.x, node.y, node.rotation),
        borderTop: `${(stroke?.weight ?? 1) / state.scale}px solid ${borderColor}`,
      }}
    >
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}

/** Compute a 1-based global slide index across all sections */
function getGlobalSlideIndex(store: ReturnType<typeof useSceneGraph>, slideId: string): number {
  let index = 0;
  for (const root of store.getRootNodes()) {
    if (root.type !== 'SECTION') continue;
    for (const childId of (root as SectionNode).children) {
      const child = store.getNode(childId);
      if (child?.type === 'SLIDE') {
        index++;
        if (child.id === slideId) return index;
      }
    }
  }
  return 0;
}

/** Card wrapper rendered behind slides in grid view with hover/selection states and a label */
function SlideGridCard({
  node,
  store,
}: {
  node: SlideNode
  store: ReturnType<typeof useSceneGraph>
}) {
  const { state } = useViewport();
  const { isSelected, hoveredId } = useSelection();
  const { viewMode } = useViewMode();

  if (viewMode === 'asset') return null;

  const selected = isSelected(node.id);
  const hovered = hoveredId === node.id;
  const active = selected || hovered;

  const labelHeight = 20 / state.scale;
  const padX = 8 / state.scale;
  const padTop = 8 / state.scale;
  const padBottom = 8 / state.scale;
  const borderRadius = 8 / state.scale;
  const borderWidth = 1 / state.scale;

  const label = `Slide ${getGlobalSlideIndex(store, node.id)}`;

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        transform: `translate(${node.x - padX}px, ${node.y - labelHeight - padTop}px)`,
        width: node.width + padX * 2,
        height: node.height + labelHeight + padTop + padBottom,
        borderRadius,
        backgroundColor: active ? 'var(--color-bg-selected)' : 'transparent',
        border: `${borderWidth}px solid ${active ? 'var(--color-border-selected)' : 'transparent'}`,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: padX,
          top: padTop,
          fontSize: 11 / state.scale,
          lineHeight: 1,
          color: active ? 'var(--color-border-selected)' : 'var(--color-fsTextOnLightCanvasSecondary)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {label}
      </div>
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
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  return (
    <div
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
        ...strokeStyles(stroke),
        boxShadow: SLIDE_STYLE.boxShadow,
      }}
    >
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}

/** Label rendered above sections as a colored pill with section icon */
function SectionLabel({ node }: { node: SectionNode }) {
  const { state } = useViewport();
  const { isSelected } = useSelection();
  const store = useSceneGraph();
  const selected = isSelected(node.id);
  const [isEditing, setIsEditing] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);
  const fontSize = 11 / state.scale;
  const pillPadY = 4 / state.scale;
  const pillPadX = 4 / state.scale;
  const pillRadius = 3 / state.scale;

  const fill = getFirstVisibleFill(node.fills);
  const defaultPillBg = fill ? colorToCSS(fill.color, Math.min(fill.opacity, 0.6)) : 'rgba(255,255,255,0.6)';
  const pillBg = selected ? 'var(--color-bg-selected-strong)' : defaultPillBg;
  const textColor = selected ? 'var(--color-text-onselected-strong)' : 'var(--color-fsTextOnLightCanvas)';

  const commitRename = useCallback(() => {
    if (!labelRef.current) return;
    const newName = labelRef.current.value.trim() || node.name;
    store.updateNode(node.id, { name: newName });
    setIsEditing(false);
  }, [node.id, node.name, store]);

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
  const stroke = getFirstVisibleStroke(node.strokes);
  const fill = getFirstVisibleFill(node.fills);
  const hasStroke = !!stroke;
  const strokeWeight = stroke ? stroke.weight : 0;

  // Expand the SVG viewport to accommodate stroke that extends beyond bounds
  const padding = hasStroke ? strokeWeight / 2 : 0;
  const svgWidth = node.width + padding * 2;
  const svgHeight = node.height + padding * 2;

  return (
    <svg
      data-node-id={node.id}
      viewBox={`${-padding} ${-padding} ${svgWidth} ${svgHeight}`}
      style={{
        position: 'absolute',
        width: svgWidth,
        height: svgHeight,
        opacity: node.opacity,
        overflow: 'visible',
        transform: nodeTransform(node.x - padding, node.y - padding, node.rotation),
      }}
    >
      {node.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? (fill ? colorToCSS(fill.color, fill.opacity) : 'none')}
          stroke={hasStroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'none'}
          strokeWidth={hasStroke ? strokeWeight : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export function LineRenderer({ node }: { node: LineNode }) {
  const stroke = getFirstVisibleStroke(node.strokes);
  const strokeWeight = stroke ? stroke.weight : 1;
  // Line height is 0; the SVG has a minimum height of the stroke weight so the line is visible
  const svgHeight = Math.max(node.height, strokeWeight * 2);

  return (
    <svg
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
        stroke={stroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'rgb(0,0,0)'}
        strokeWidth={strokeWeight}
      />
    </svg>
  );
}

export function PolygonRenderer({ node }: { node: PolygonNode }) {
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
        stroke={stroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'none'}
        strokeWidth={stroke ? svgStrokeWidth(stroke) : 0}
        paintOrder={stroke?.position === 'OUTSIDE' ? 'stroke' : undefined}
      />
    </svg>
  );
}

export function StarRenderer({ node }: { node: StarNode }) {
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
        stroke={stroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'none'}
        strokeWidth={stroke ? svgStrokeWidth(stroke) : 0}
        paintOrder={stroke?.position === 'OUTSIDE' ? 'stroke' : undefined}
      />
    </svg>
  );
}

/** Label rendered above root-level frames, matching Figma's canvas chrome (FB-45) */
function FrameLabel({ node }: { node: FrameNode }) {
  const { state } = useViewport();
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

