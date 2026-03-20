import { memo } from 'react';

import type { SceneGraph } from '@prototype/shared/canvas';
import type {
  EllipseNode,
  FrameNode,
  LineNode,
  PolygonNode,
  RectangleNode,
  SceneNode,
  SlideNode,
  StarNode,
  TextNode,
  VectorNode,
} from '@prototype/shared/canvas';
import {
  colorToCSS,
  getFirstVisibleFill,
  getFirstVisibleStroke,
  nodeTransform,
  strokeStyles,
  svgStrokeWidth,
} from './render-helpers';

interface ThumbnailRendererProps {
  frameNode: FrameNode | SlideNode
  store: SceneGraph
  /** Monotonic counter that increments on every store mutation — busts memo so thumbnails update when descendants change */
  storeVersion: number
}

/** Renders a frame's children as a static, non-interactive thumbnail */
export const ThumbnailRenderer = memo(function ThumbnailRenderer(
  props: ThumbnailRendererProps,
) {
  const { frameNode, store } = props;
  const childNodes = frameNode.children
    .map((id) => store.getNode(id))
    .filter(Boolean) as SceneNode[];

  return (
    <>
      {childNodes.map((child) => (
        <ThumbnailNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </>
  );
});

function ThumbnailNodeRenderer({
  node,
  store,
}: {
  node: SceneNode
  store: SceneGraph
}) {
  if (!node.visible) return null;

  switch (node.type) {
    case 'RECTANGLE':
      return <StaticRectangleRenderer node={node} />;
    case 'ELLIPSE':
      return <StaticEllipseRenderer node={node} />;
    case 'LINE':
      return <StaticLineRenderer node={node} />;
    case 'POLYGON':
      return <StaticPolygonRenderer node={node} />;
    case 'STAR':
      return <StaticStarRenderer node={node} />;
    case 'VECTOR':
      return <StaticVectorRenderer node={node} />;
    case 'TEXT':
      return <StaticTextRenderer node={node as TextNode} />;
    case 'FRAME':
      return <StaticFrameRenderer node={node as FrameNode} store={store} />;
    case 'SLIDE':
      return <StaticSlideRenderer node={node as SlideNode} store={store} />;
    default:
      return null;
  }
}

// ── Static shape renderers (no useRendering / useNodeRef) ──────────

function StaticRectangleRenderer({ node }: { node: RectangleNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);

  return (
    <div
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

function StaticEllipseRenderer({ node }: { node: EllipseNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const rx = node.width / 2;
  const ry = node.height / 2;
  const weight = node.strokeWeight;
  const inset = node.strokeAlign === 'INSIDE' ? weight : 0;

  return (
    <svg
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
        rx={rx - inset}
        ry={ry - inset}
        fill={fill ? colorToCSS(fill.color, fill.opacity) : 'none'}
        stroke={stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none'}
        strokeWidth={weight}
      />
    </svg>
  );
}

function StaticLineRenderer({ node }: { node: LineNode }) {
  const stroke = getFirstVisibleStroke(node.strokes);
  const weight = node.strokeWeight;
  const svgHeight = Math.max(node.height, weight * 2);

  return (
    <svg
      style={{
        position: 'absolute',
        width: node.width,
        height: svgHeight,
        opacity: node.opacity,
        overflow: 'visible',
        transform: nodeTransform(node.x, node.y - svgHeight / 2, node.rotation),
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

function StaticPolygonRenderer({ node }: { node: PolygonNode }) {
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

function StaticStarRenderer({ node }: { node: StarNode }) {
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
    const rxi = isOuter ? outerRx : innerRx;
    const ryi = isOuter ? outerRy : innerRy;
    pts.push(`${cx + rxi * Math.cos(angle)},${cy + ryi * Math.sin(angle)}`);
  }

  return (
    <svg
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

function StaticVectorRenderer({ node }: { node: VectorNode }) {
  const stroke = getFirstVisibleStroke(node.strokes);
  const fill = getFirstVisibleFill(node.fills);
  const hasStroke = !!stroke;
  const weight = node.strokeWeight;
  const padding = hasStroke ? weight / 2 : 0;
  const svgWidth = node.width + padding * 2;
  const svgHeight = node.height + padding * 2;

  return (
    <svg
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
          stroke={hasStroke ? colorToCSS(stroke.color, stroke.opacity) : 'none'}
          strokeWidth={hasStroke ? weight : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** Static text — no contentEditable, no ResizeObserver, no selection hooks */
function StaticTextRenderer({ node }: { node: TextNode }) {
  const fill = getFirstVisibleFill(node.fills);

  return (
    <div
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
        userSelect: 'none',
      }}
    >
      {node.characters}
    </div>
  );
}

/** Static frame — renders children recursively, no data-node-id for hit-testing */
function StaticFrameRenderer({
  node,
  store,
}: {
  node: FrameNode
  store: SceneGraph
}) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children
    .map((id) => store.getNode(id))
    .filter(Boolean) as SceneNode[];

  return (
    <div
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
        <ThumbnailNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}

/** Static slide — renders children recursively, no data-node-id for hit-testing */
function StaticSlideRenderer({
  node,
  store,
}: {
  node: SlideNode
  store: SceneGraph
}) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children
    .map((id) => store.getNode(id))
    .filter(Boolean) as SceneNode[];

  return (
    <div
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
        <ThumbnailNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}
