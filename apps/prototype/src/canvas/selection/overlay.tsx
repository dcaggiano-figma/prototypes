import { useEffect, useRef, useState } from 'react';

import { useSceneGraph } from '../scene-graph/provider';
import { computeGroupScreenBBox } from '../scene-graph/selection-utils';
import { getWorldPosition, isGeometryNode } from '../scene-graph/world-position';
import { useViewport } from '../viewport/provider';

import { useSelection } from './provider';
import { ResizeHandles } from './resize-handles';

interface DragBox {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

interface SelectionOverlayProps {
  dragBox?: DragBox | null
}

/** 2D canvas overlay that draws selection outlines, resize handles, and dimension labels */
export function SelectionOverlay({ dragBox }: SelectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedIds, hoveredId } = useSelection();
  const store = useSceneGraph();
  const { state: viewport } = useViewport();

  // Subscribe to store changes so overlay repaints when node properties change
  const [storeVersion, bumpStoreVersion] = useState(0);
  useEffect(() => store.subscribe(() => bumpStoreVersion((n) => n + 1)), [store]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Match canvas size to parent
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Resolve CSS variables for canvas 2D context (can't use var() directly)
    const styles = getComputedStyle(document.documentElement);
    const selectionColor = styles.getPropertyValue('--color-border-selected').trim() || '#0d99ff';
    const labelTextColor = styles.getPropertyValue('--color-text-fs-ondesign').trim() || '#ffffff';

    // Draw hover outline (before selection so selection draws on top)
    if (hoveredId && !selectedIds.has(hoveredId)) {
      const hNode = store.getNode(hoveredId);
      if (hNode && isGeometryNode(hNode) && hNode.type !== 'LINE') {
        const hWorld = getWorldPosition(store, hNode);
        const hsx = hWorld.x * viewport.scale + viewport.origin.x;
        const hsy = hWorld.y * viewport.scale + viewport.origin.y;
        const hsw = hNode.width * viewport.scale;
        const hsh = hNode.height * viewport.scale;
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

    const isMultiSelect = selectedIds.size > 1;

    for (const id of selectedIds) {
      const node = store.getNode(id);
      if (!node || !isGeometryNode(node)) continue;

      // Lines render their selection outline via DOM in ResizeHandles
      if (node.type === 'LINE') continue;

      // Convert world-space bounds to screen-space
      const world = getWorldPosition(store, node);
      const sx = world.x * viewport.scale + viewport.origin.x;
      const sy = world.y * viewport.scale + viewport.origin.y;
      const sw = node.width * viewport.scale;
      const sh = node.height * viewport.scale;

      // Blue outline — 40% opacity for multi-select, full for single
      const nodeRotation = node.rotation ?? 0;
      ctx.strokeStyle = isMultiSelect ? `${selectionColor}66` : selectionColor;
      ctx.lineWidth = 1;

      if (nodeRotation !== 0) {
        ctx.save();
        ctx.translate(sx + sw / 2, sy + sh / 2);
        ctx.rotate(nodeRotation * Math.PI / 180);
        ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
        ctx.restore();
      } else {
        ctx.strokeRect(sx, sy, sw, sh);
      }

      // Dimension label — only for single selection
      if (!isMultiSelect) {
        // For rotated nodes, position below the rotated bounding box
        const label = `${Math.round(node.width)} \u00D7 ${Math.round(node.height)}`;
        const fontSize = 11;
        ctx.font = `${fontSize}px "Inter", system-ui, sans-serif`;
        const textMetrics = ctx.measureText(label);
        const textW = textMetrics.width + 8;
        const textH = fontSize + 6;

        let labelCenterX: number;
        let labelTopY: number;

        if (nodeRotation !== 0) {
          // Compute the lowest point of the rotated rectangle to position label below it
          const rad = nodeRotation * Math.PI / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const hw = sw / 2;
          const hh = sh / 2;
          // The 4 corners relative to center
          const cornerOffsets = [
            { dx: -hw, dy: -hh },
            { dx: hw, dy: -hh },
            { dx: hw, dy: hh },
            { dx: -hw, dy: hh },
          ];
          let maxY = -Infinity;
          for (const c of cornerOffsets) {
            const ry = c.dx * sin + c.dy * cos;
            if (ry > maxY) maxY = ry;
          }
          labelCenterX = sx + sw / 2;
          labelTopY = sy + sh / 2 + maxY + 8;
        } else {
          labelCenterX = sx + sw / 2;
          labelTopY = sy + sh + 8;
        }

        const textX = labelCenterX - textW / 2;
        const textY = labelTopY;

        // Label background
        ctx.fillStyle = selectionColor;
        ctx.beginPath();
        ctx.roundRect(textX, textY, textW, textH, 3);
        ctx.fill();

        // Label text
        ctx.fillStyle = labelTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelCenterX, textY + textH / 2);
      }
    }

    // Draw group bounding box for multi-selection
    if (isMultiSelect) {
      const groupBBox = computeGroupScreenBBox(store, selectedIds, viewport);
      if (groupBBox) {
        ctx.strokeStyle = selectionColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          groupBBox.minX,
          groupBBox.minY,
          groupBBox.maxX - groupBBox.minX,
          groupBBox.maxY - groupBBox.minY,
        );
      }
    }

    // Draw box selection rectangle
    if (dragBox) {
      const bx = Math.min(dragBox.startX, dragBox.currentX);
      const by = Math.min(dragBox.startY, dragBox.currentY);
      const bw = Math.abs(dragBox.currentX - dragBox.startX);
      const bh = Math.abs(dragBox.currentY - dragBox.startY);

      if (bw > 1 || bh > 1) {
        ctx.fillStyle = selectionColor.startsWith('#') ? `${selectionColor}1a` : selectionColor;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = selectionColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
      }
    }
  }, [selectedIds, hoveredId, store, storeVersion, viewport, dragBox]);

  // Resize observer to keep canvas size in sync
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;

    const observer = new ResizeObserver(() => {
      // Trigger a rerender by dispatching a state change
      // The dependency on viewport in the paint effect handles this
    });
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-[10]"
      />
      <ResizeHandles />
    </>
  );
}
