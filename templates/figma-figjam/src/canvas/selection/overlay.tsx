import { useEffect, useRef, useState } from 'react';

import { useSceneGraph } from '../scene-graph/provider';
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
  const { selectedIds } = useSelection();
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

    const isMultiSelect = selectedIds.size >= 2;

    for (const id of selectedIds) {
      const node = store.getNode(id);
      if (!node || !isGeometryNode(node)) continue;

      // Lines render their selection outline via DOM in ResizeHandles
      if (node.type === 'LINE') continue;
      // Connectors handle their own selection highlight in ConnectorRenderer
      if (node.type === 'CONNECTOR') continue;

      // Convert world-space bounds to screen-space
      const world = getWorldPosition(store, node);
      const sx = world.x * viewport.scale + viewport.origin.x;
      const sy = world.y * viewport.scale + viewport.origin.y;
      const sw = node.width * viewport.scale;
      const sh = node.height * viewport.scale;

      // Blue outline (rotated if node has rotation)
      // Use 40% opacity for individual outlines during multi-select
      const nodeRotation = node.rotation ?? 0;
      ctx.strokeStyle = isMultiSelect ? `${selectionColor}66` : selectionColor;
      ctx.lineWidth = 2;

      if (nodeRotation !== 0) {
        ctx.save();
        ctx.translate(sx + sw / 2, sy + sh / 2);
        ctx.rotate(nodeRotation * Math.PI / 180);
        ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
        ctx.restore();
      } else {
        ctx.strokeRect(sx, sy, sw, sh);
      }

      // Dimension labels hidden for FigJam
    }

    // Draw group bounding box for multi-selection
    if (isMultiSelect) {
      let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;

      for (const id of selectedIds) {
        const node = store.getNode(id);
        if (!node || !isGeometryNode(node)) continue;
        const world = getWorldPosition(store, node);

        if (node.type === 'LINE') {
          // Lines: compute AABB from endpoints
          const rad = (node.rotation ?? 0) * Math.PI / 180;
          const endWX = world.x + node.width * Math.cos(rad);
          const endWY = world.y + node.width * Math.sin(rad);
          const sMinX = Math.min(world.x, endWX) * viewport.scale + viewport.origin.x;
          const sMinY = Math.min(world.y, endWY) * viewport.scale + viewport.origin.y;
          const sMaxX = Math.max(world.x, endWX) * viewport.scale + viewport.origin.x;
          const sMaxY = Math.max(world.y, endWY) * viewport.scale + viewport.origin.y;
          gMinX = Math.min(gMinX, sMinX); gMinY = Math.min(gMinY, sMinY);
          gMaxX = Math.max(gMaxX, sMaxX); gMaxY = Math.max(gMaxY, sMaxY);
        } else {
          const nodeRotation = node.rotation ?? 0;
          const sx = world.x * viewport.scale + viewport.origin.x;
          const sy = world.y * viewport.scale + viewport.origin.y;
          const sw = node.width * viewport.scale;
          const sh = node.height * viewport.scale;

          if (nodeRotation !== 0) {
            const cx = sx + sw / 2, cy = sy + sh / 2;
            const rad = nodeRotation * Math.PI / 180;
            const cosA = Math.abs(Math.cos(rad)), sinA = Math.abs(Math.sin(rad));
            const aabbW = sw * cosA + sh * sinA;
            const aabbH = sw * sinA + sh * cosA;
            gMinX = Math.min(gMinX, cx - aabbW / 2); gMinY = Math.min(gMinY, cy - aabbH / 2);
            gMaxX = Math.max(gMaxX, cx + aabbW / 2); gMaxY = Math.max(gMaxY, cy + aabbH / 2);
          } else {
            gMinX = Math.min(gMinX, sx); gMinY = Math.min(gMinY, sy);
            gMaxX = Math.max(gMaxX, sx + sw); gMaxY = Math.max(gMaxY, sy + sh);
          }
        }
      }

      if (isFinite(gMinX)) {
        ctx.strokeStyle = selectionColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(gMinX, gMinY, gMaxX - gMinX, gMaxY - gMinY);
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
  }, [selectedIds, store, storeVersion, viewport, dragBox]);

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
