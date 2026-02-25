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
    const labelTextColor = styles.getPropertyValue('--color-text-fs-ondesign').trim() || '#ffffff';

    for (const id of selectedIds) {
      const node = store.getNode(id);
      if (!node || !isGeometryNode(node)) continue;

      // Convert world-space bounds to screen-space
      const world = getWorldPosition(store, node);
      const sx = world.x * viewport.scale + viewport.origin.x;
      const sy = world.y * viewport.scale + viewport.origin.y;
      const sw = node.width * viewport.scale;
      const sh = node.height * viewport.scale;

      // Blue outline
      ctx.strokeStyle = selectionColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, sw, sh);

      // Dimension label below selection
      const label = `${Math.round(node.width)} \u00D7 ${Math.round(node.height)}`;
      const fontSize = 11;
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      const textMetrics = ctx.measureText(label);
      const textW = textMetrics.width + 8;
      const textH = fontSize + 6;
      const textX = sx + sw / 2 - textW / 2;
      const textY = sy + sh + 8;

      // Label background
      ctx.fillStyle = selectionColor;
      ctx.beginPath();
      ctx.roundRect(textX, textY, textW, textH, 3);
      ctx.fill();

      // Label text
      ctx.fillStyle = labelTextColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sx + sw / 2, textY + textH / 2);
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
