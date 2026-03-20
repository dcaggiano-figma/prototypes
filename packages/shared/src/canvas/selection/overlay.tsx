import { useEffect, useRef } from 'react';

import { useRendering } from '../rendering';
import { useSceneGraph } from '../scene-graph/provider';
import { useSelection } from './provider';
import { computeGroupScreenBBox } from '../scene-graph/selection-utils';
import { getWorldPosition } from '../scene-graph/world-position';
import { isGeometryNode } from '../../scene-graph/types';
import type { FrameState } from '../rendering';
import { drawDimensionLabel } from './draw-helpers';

/**
 * Minimum screen-space dimension (px) before corner handles and dimension
 * labels are shown. When either axis is below this, only the selection
 * outline is drawn. Handles are 8px squares centered on corners (outset
 * by 4px), so they start overlapping at 8px — the handle size itself.
 */
export const HANDLE_VISIBILITY_THRESHOLD = 8;

/**
 * Selection overlay — registers a paint callback on the RAF render loop
 * to draw selection outlines, dimension labels, hover highlights, and
 * group bounding boxes on the shared canvas overlay (layer 2).
 *
 * Drag box rendering is handled by BoxSelectBehavior's drawOverlay method.
 *
 * Template-specific rendering (e.g. resize handles) is passed via children.
 */
export function SelectionOverlay({
  children,
  shouldSkipNode,
  showDimensionLabel = true,
  selectionLineWidth = 1,
}: {
  children?: React.ReactNode
  shouldSkipNode?: (nodeType: string, nodeId: number) => boolean
  /** Whether to show the "W × H" dimension label below selected nodes. Default true. */
  showDimensionLabel?: boolean
  /** Line width for selection outlines. Default 1. */
  selectionLineWidth?: number
}) {
  const { renderLoop, canvasOverlay } = useRendering();
  const sg = useSceneGraph();
  const { selectedIds, hoveredId, isDragging } = useSelection();

  // Store reactive values in refs so the paint callback always reads current state.
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const hoveredIdRef = useRef(hoveredId);
  hoveredIdRef.current = hoveredId;
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;
  const shouldSkipNodeRef = useRef(shouldSkipNode);
  shouldSkipNodeRef.current = shouldSkipNode;
  const showDimensionLabelRef = useRef(showDimensionLabel);
  showDimensionLabelRef.current = showDimensionLabel;
  const selectionLineWidthRef = useRef(selectionLineWidth);
  selectionLineWidthRef.current = selectionLineWidth;

  // Request a repaint when selection, hover, drag, or skip-node logic changes
  useEffect(() => {
    renderLoop.requestFrame();
  }, [renderLoop, selectedIds, hoveredId, isDragging, shouldSkipNode]);

  // Register the selection painter with the render loop
  useEffect(() => {
    return renderLoop.addCallback((frame: FrameState) => {
      const canvas = canvasOverlay.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // The canvas is already sized and cleared by CanvasLayers' prep callback.
      // DPR transform is set — we draw in CSS pixels.

      const curSelectedIds = selectedIdsRef.current;
      const curHoveredId = hoveredIdRef.current;

      // During move-drag, still show selection outlines but hide hover and
      // dimension labels so the node visually moves with its outline.
      const dragging = isDraggingRef.current;

      const vp = frame.viewport;
      const scale = vp.scale;
      const ox = vp.originX;
      const oy = vp.originY;

      // Resolve CSS variables for canvas 2D context
      const styles = getComputedStyle(document.documentElement);
      const selectionColor = styles.getPropertyValue('--color-border-selected').trim() || '#0d99ff';
      const labelTextColor = styles.getPropertyValue('--color-text-fs-ondesign').trim() || '#ffffff';

      // ── Hover outline (hidden during drag) ─────────────────────
      if (!dragging && curHoveredId && !curSelectedIds.has(curHoveredId)) {
        const hNode = frame.sg.getNode(curHoveredId);
        if (hNode && isGeometryNode(hNode) && hNode.type !== 'LINE'
          && !shouldSkipNodeRef.current?.(hNode.type, curHoveredId)) {
          const hWorld = getWorldPosition(frame.sg, hNode);
          const hsx = Math.round((hWorld.x * scale + ox) * 2) / 2;
          const hsy = Math.round((hWorld.y * scale + oy) * 2) / 2;
          const hsw = Math.round(hNode.width * scale * 2) / 2;
          const hsh = Math.round(hNode.height * scale * 2) / 2;
          const hRot = hNode.rotation ?? 0;

          ctx.strokeStyle = selectionColor;
          ctx.lineWidth = 2;

          if (hRot !== 0) {
            ctx.save();
            ctx.translate(hsx + hsw / 2, hsy + hsh / 2);
            ctx.rotate(hRot * Math.PI / 180);
            ctx.strokeRect(-hsw / 2, -hsh / 2, hsw, hsh);
            ctx.restore();
          } else {
            ctx.strokeRect(hsx, hsy, hsw, hsh);
          }
        }
      }

      // ── Selection outlines ───────────────────────────────────────
      const isMultiSelect = curSelectedIds.size > 1;

      // Track the label rect — single node or group bounding box
      let labelWorldW = 0;
      let labelWorldH = 0;
      let labelSx = 0;
      let labelSy = 0;
      let labelSw = 0;
      let labelSh = 0;
      let labelRotation = 0;

      for (const id of curSelectedIds) {
        const node = frame.sg.getNode(id);
        if (!node || !isGeometryNode(node)) continue;

        // Lines render their selection outline via DOM in ResizeHandles
        if (node.type === 'LINE') continue;

        if (shouldSkipNodeRef.current?.(node.type, id)) continue;

        const world = getWorldPosition(frame.sg, node);
        // Round to nearest half-pixel to match CSS subpixel snapping —
        // prevents jitter between canvas 2D outline and DOM node position.
        const sx = Math.round((world.x * scale + ox) * 2) / 2;
        const sy = Math.round((world.y * scale + oy) * 2) / 2;
        const sw = Math.round(node.width * scale * 2) / 2;
        const sh = Math.round(node.height * scale * 2) / 2;

        const nodeRotation = node.rotation ?? 0;
        ctx.strokeStyle = isMultiSelect ? `${selectionColor}66` : selectionColor;
        ctx.lineWidth = selectionLineWidthRef.current;

        if (nodeRotation !== 0) {
          ctx.save();
          ctx.translate(sx + sw / 2, sy + sh / 2);
          ctx.rotate(nodeRotation * Math.PI / 180);
          ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
          ctx.restore();
        } else {
          ctx.strokeRect(sx, sy, sw, sh);
        }

        // For single selection, use the node's own bounds for the label
        // (SLIDE nodes don't get dimension labels)
        if (!isMultiSelect && node.type !== 'SLIDE') {
          labelWorldW = node.width;
          labelWorldH = node.height;
          labelSx = sx;
          labelSy = sy;
          labelSw = sw;
          labelSh = sh;
          labelRotation = nodeRotation;
        }
      }

      // ── Group bounding box ───────────────────────────────────────
      if (isMultiSelect) {
        const vpState = { scale, origin: { x: ox, y: oy } };
        const groupBBox = computeGroupScreenBBox(frame.sg, curSelectedIds, vpState);
        if (groupBBox) {
          labelSw = groupBBox.maxX - groupBBox.minX;
          labelSh = groupBBox.maxY - groupBBox.minY;
          labelSx = groupBBox.minX;
          labelSy = groupBBox.minY;
          labelWorldW = labelSw / scale;
          labelWorldH = labelSh / scale;
          labelRotation = 0;

          ctx.strokeStyle = selectionColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(labelSx, labelSy, labelSw, labelSh);
        }
      }

      // ── Dimension label (hidden during drag) ─────────────────
      if (!dragging && showDimensionLabelRef.current && curSelectedIds.size > 0 && labelSw >= HANDLE_VISIBILITY_THRESHOLD && labelSh >= HANDLE_VISIBILITY_THRESHOLD) {
        drawDimensionLabel(ctx, labelWorldW, labelWorldH, labelSx, labelSy, labelSw, labelSh, labelRotation, selectionColor, labelTextColor);
      }
    });
  }, [renderLoop, canvasOverlay, sg]);

  return <>{children}</>;
}
