import { useEffect, useState } from 'react';

import { useSceneGraph } from '../scene-graph/provider';
import { useSelection } from '../selection/provider';
import { useViewport } from '../viewport/provider';
import type { ConnectorNode, Stroke } from '../types';
import { resolveEndpointPosition } from './connector-resolve';
import type { ResolvedPoint } from './connector-resolve';
import { capInsetDistance, computeCurvePath, computeElbowPath, computeLinePath, computePathTangents, computeStraightPath } from './connector-paths';
import type { CapType } from './connector-paths';

const ENDPOINT_CIRCLE_SIZE = 12;
const ENDPOINT_CIRCLE_BORDER = 2;

function colorToCSS(color: { r: number; g: number; b: number }, opacity: number): string {
  if (opacity >= 1) return `rgb(${color.r}, ${color.g}, ${color.b})`;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

function getFirstVisibleStroke(strokes: Stroke[]): Stroke | undefined {
  for (const s of strokes) {
    if (s.paint.visible) return s;
  }
  return undefined;
}

/** Compute SVG path d string based on line shape and endpoint positions */
function computePathD(
  node: ConnectorNode,
  start: ResolvedPoint,
  end: ResolvedPoint,
): string {
  const startPt = { x: start.x, y: start.y, exitDirection: start.exitDirection };
  const endPt = { x: end.x, y: end.y, exitDirection: end.exitDirection };

  switch (node.lineShape) {
    case 'CURVE':
      return computeCurvePath(startPt, endPt);
    case 'ELBOW':
      return computeElbowPath(startPt, endPt, node.elbowMidpointOffset);
    case 'STRAIGHT':
      return computeStraightPath(startPt, endPt);
    case 'LINE':
      return computeLinePath(startPt, endPt);
    default:
      return computeStraightPath(startPt, endPt);
  }
}

/**
 * Compute a filled triangle arrow at the given endpoint.
 * @param point - The endpoint position (arrow tip)
 * @param tangent - The path tangent at this endpoint (direction the path travels INTO this point)
 */
function computeFilledArrowPath(
  point: ResolvedPoint,
  tangent: { dx: number; dy: number },
): string {
  const ux = -tangent.dx;
  const uy = -tangent.dy;
  const px = -uy;
  const py = ux;

  const arrowLen = 12;
  const arrowHalfWidth = 8;
  const nudge = 6;
  const tipX = point.x + ux * nudge;
  const tipY = point.y + uy * nudge;
  const baseX = tipX + ux * arrowLen;
  const baseY = tipY + uy * arrowLen;

  const leftX = baseX + px * arrowHalfWidth;
  const leftY = baseY + py * arrowHalfWidth;
  const rightX = baseX - px * arrowHalfWidth;
  const rightY = baseY - py * arrowHalfWidth;

  return `M${tipX},${tipY} L${leftX},${leftY} L${rightX},${rightY} Z`;
}

/** Open V-shaped line arrow (not filled) */
function computeLineArrowPath(
  point: ResolvedPoint,
  tangent: { dx: number; dy: number },
): string {
  const ux = -tangent.dx;
  const uy = -tangent.dy;
  const px = -uy;
  const py = ux;

  const arrowLen = 12;
  const arrowHalfWidth = 8;
  const nudge = 6;
  const tipX = point.x + ux * nudge;
  const tipY = point.y + uy * nudge;
  const baseX = tipX + ux * arrowLen;
  const baseY = tipY + uy * arrowLen;

  const leftX = baseX + px * arrowHalfWidth;
  const leftY = baseY + py * arrowHalfWidth;
  const rightX = baseX - px * arrowHalfWidth;
  const rightY = baseY - py * arrowHalfWidth;

  // Open V — no Z close
  return `M${leftX},${leftY} L${tipX},${tipY} L${rightX},${rightY}`;
}

/** Triangle pointing back toward the path (reverse of filled arrow) */
function computeReverseTrianglePath(
  point: ResolvedPoint,
  tangent: { dx: number; dy: number },
): string {
  const ux = -tangent.dx;
  const uy = -tangent.dy;
  const px = -uy;
  const py = ux;

  const arrowLen = 12;
  const arrowHalfWidth = 8;
  const nudge = 6;
  // Base at the endpoint, tip points back along the path
  const baseX = point.x + ux * nudge;
  const baseY = point.y + uy * nudge;
  const tipX = baseX + ux * arrowLen;
  const tipY = baseY + uy * arrowLen;

  const leftX = baseX + px * arrowHalfWidth;
  const leftY = baseY + py * arrowHalfWidth;
  const rightX = baseX - px * arrowHalfWidth;
  const rightY = baseY - py * arrowHalfWidth;

  return `M${tipX},${tipY} L${leftX},${leftY} L${rightX},${rightY} Z`;
}

/** Filled circle cap */
function computeCircleCapCenter(
  point: ResolvedPoint,
  tangent: { dx: number; dy: number },
): { cx: number; cy: number; r: number } {
  const nudge = 6;
  const ux = -tangent.dx;
  const uy = -tangent.dy;
  return {
    cx: point.x + ux * (nudge + 6),
    cy: point.y + uy * (nudge + 6),
    r: 6,
  };
}

/** Filled diamond cap */
function computeDiamondPath(
  point: ResolvedPoint,
  tangent: { dx: number; dy: number },
): string {
  const ux = -tangent.dx;
  const uy = -tangent.dy;
  const px = -uy;
  const py = ux;

  const nudge = 6;
  const halfLen = 8;
  const halfWidth = 8;
  const centerX = point.x + ux * (nudge + halfLen);
  const centerY = point.y + uy * (nudge + halfLen);

  const top = `${centerX - ux * halfLen},${centerY - uy * halfLen}`;
  const right = `${centerX + px * halfWidth},${centerY + py * halfWidth}`;
  const bottom = `${centerX + ux * halfLen},${centerY + uy * halfLen}`;
  const left = `${centerX - px * halfWidth},${centerY - py * halfWidth}`;

  return `M${top} L${right} L${bottom} L${left} Z`;
}


export function ConnectorRenderer({ node }: { node: ConnectorNode }) {
  const store = useSceneGraph();
  const { isSelected } = useSelection();
  const { state: viewport } = useViewport();

  // Subscribe to store changes to re-render when connected nodes move
  const [, bump] = useState(0);
  useEffect(() => store.subscribe(() => bump((n) => n + 1)), [store]);

  if (!node.visible) return null;

  const selected = isSelected(node.id);

  const startPt = resolveEndpointPosition(store, node.startEndpoint);
  const endPt = resolveEndpointPosition(store, node.endEndpoint);

  if (!startPt || !endPt) return null;

  const stroke = getFirstVisibleStroke(node.strokes);
  const strokeColor = stroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'rgb(100, 100, 100)';
  const strokeWeight = stroke ? stroke.weight : 2;

  const pathD = computePathD(node, startPt, endPt);

  // Compute bounding box for SVG viewBox
  const padding = 50;
  const minX = Math.min(startPt.x, endPt.x) - padding;
  const minY = Math.min(startPt.y, endPt.y) - padding;
  const maxX = Math.max(startPt.x, endPt.x) + padding;
  const maxY = Math.max(startPt.y, endPt.y) + padding;

  // Compute path tangents for arrow direction
  const startPathPt = { x: startPt.x, y: startPt.y, exitDirection: startPt.exitDirection };
  const endPathPt = { x: endPt.x, y: endPt.y, exitDirection: endPt.exitDirection };
  const tangents = computePathTangents(node.lineShape, startPathPt, endPathPt, node.elbowMidpointOffset);

  // Dash pattern from stroke
  const dashPattern = stroke?.dashPattern;
  const strokeDasharray = dashPattern && dashPattern.length > 0 ? dashPattern.join(' ') : undefined;

  // Shorten the visible line so it terminates at the center of each cap shape
  const startInset = capInsetDistance(node.startCap);
  const endInset = capInsetDistance(node.endCap);
  let lineStartPt = startPt;
  let lineEndPt = endPt;
  if (startInset > 0) {
    lineStartPt = {
      ...startPt,
      x: startPt.x + tangents.startTangent.dx * startInset,
      y: startPt.y + tangents.startTangent.dy * startInset,
    };
  }
  if (endInset > 0) {
    lineEndPt = {
      ...endPt,
      x: endPt.x - tangents.endTangent.dx * endInset,
      y: endPt.y - tangents.endTangent.dy * endInset,
    };
  }
  const linePathD = computePathD(node, lineStartPt, lineEndPt);

  // For start caps, negate the tangent so arrows sit on the connector line
  // (not inside the attached node) and point toward the start node.
  const startCapTangent = { dx: -tangents.startTangent.dx, dy: -tangents.startTangent.dy };

  // Compute cap SVG elements
  const startCircleCap = node.startCap === 'CIRCLE' ? computeCircleCapCenter(startPt, startCapTangent) : null;
  const endCircleCap = node.endCap === 'CIRCLE' ? computeCircleCapCenter(endPt, tangents.endTangent) : null;

  /** Render a cap shape given its type, position, and tangent */
  const renderCap = (cap: CapType, pt: ResolvedPoint, tangent: { dx: number; dy: number }, isCircle: { cx: number; cy: number; r: number } | null) => {
    const translate = `translate(${-minX}px, ${-minY}px)`;
    switch (cap) {
      case 'FILLED_ARROW':
        return (
          <path
            d={computeFilledArrowPath(pt, tangent)}
            stroke={strokeColor}
            strokeWidth={4}
            strokeLinejoin="round"
            fill={strokeColor}
            style={{ transform: translate }}
          />
        );
      case 'LINE_ARROW':
        return (
          <path
            d={computeLineArrowPath(pt, tangent)}
            stroke={strokeColor}
            strokeWidth={strokeWeight}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{ transform: translate }}
          />
        );
      case 'REVERSE_TRIANGLE':
        return (
          <path
            d={computeReverseTrianglePath(pt, tangent)}
            stroke={strokeColor}
            strokeWidth={4}
            strokeLinejoin="round"
            fill={strokeColor}
            style={{ transform: translate }}
          />
        );
      case 'CIRCLE':
        return isCircle ? (
          <circle
            cx={isCircle.cx - minX}
            cy={isCircle.cy - minY}
            r={isCircle.r}
            fill={strokeColor}
            stroke={strokeColor}
            strokeWidth={2}
          />
        ) : null;
      case 'DIAMOND':
        return (
          <path
            d={computeDiamondPath(pt, tangent)}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinejoin="round"
            fill={strokeColor}
            style={{ transform: translate }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <svg
      data-node-id={node.id}
      style={{
        position: 'absolute',
        left: minX,
        top: minY,
        width: maxX - minX,
        height: maxY - minY,
        overflow: 'visible',
        pointerEvents: 'none',
        opacity: node.opacity,
      }}
    >
      {/* Invisible wide hit area */}
      <path
        d={pathD}
        stroke="transparent"
        strokeWidth={Math.max(12, strokeWeight + 8)}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: 'stroke', transform: `translate(${-minX}px, ${-minY}px)` }}
      />
      {/* Visible connector path */}
      <path
        d={linePathD}
        stroke={strokeColor}
        strokeWidth={strokeWeight}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        style={{ transform: `translate(${-minX}px, ${-minY}px)` }}
      />
      {/* Start cap */}
      {renderCap(node.startCap, startPt, startCapTangent, startCircleCap)}
      {/* End cap */}
      {renderCap(node.endCap, endPt, tangents.endTangent, endCircleCap)}
      {/* Endpoint circles when selected */}
      {selected && (() => {
        const r = (ENDPOINT_CIRCLE_SIZE / 2) / viewport.scale;
        const sw = ENDPOINT_CIRCLE_BORDER / viewport.scale;
        return (
          <>
            <circle
              cx={startPt.x - minX}
              cy={startPt.y - minY}
              r={r}
              fill="#ffffff"
              stroke="#0d99ff"
              strokeWidth={sw}
            />
            <circle
              cx={endPt.x - minX}
              cy={endPt.y - minY}
              r={r}
              fill="#ffffff"
              stroke="#0d99ff"
              strokeWidth={sw}
            />
          </>
        );
      })()}
    </svg>
  );
}
