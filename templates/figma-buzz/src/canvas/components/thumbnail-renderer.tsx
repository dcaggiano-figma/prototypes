import { memo } from 'react';

import type { SceneGraphStore } from '../scene-graph/store';
import type { FrameNode, SceneNode, TextNode } from '../types';
import {
  colorToCSS,
  getFirstVisibleFill,
  getFirstVisibleStroke,
  nodeTransform,
  strokeStyles,
} from './render-helpers';
import {
  EllipseRenderer,
  LineRenderer,
  PolygonRenderer,
  RectangleRenderer,
  StarRenderer,
  VectorRenderer,
} from './canvas-renderer';

interface ThumbnailRendererProps {
  frameNode: FrameNode
  store: SceneGraphStore
}

/** Renders a frame's children as a static, non-interactive thumbnail */
export const ThumbnailRenderer = memo(function ThumbnailRenderer({
  frameNode,
  store,
}: ThumbnailRendererProps) {
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
  store: SceneGraphStore
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
    case 'VECTOR':
      return <VectorRenderer node={node} />;
    case 'TEXT':
      return <StaticTextRenderer node={node as TextNode} />;
    case 'FRAME':
      return <StaticFrameRenderer node={node as FrameNode} store={store} />;
    default:
      return null;
  }
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
  store: SceneGraphStore
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
        ...strokeStyles(stroke),
      }}
    >
      {childNodes.map((child) => (
        <ThumbnailNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}
