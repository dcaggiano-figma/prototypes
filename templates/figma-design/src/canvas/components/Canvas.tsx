import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useAction } from '../../actions/provider';
import type { NodeType } from '../types';
import { usePageBackground, useSceneGraph } from '../scene-graph/provider';
import { getWorldPosition, isGeometryNode } from '../scene-graph/world-position';
import { SelectionOverlay } from '../selection/overlay';
import { useSelection } from '../selection/provider';
import { useActiveTool } from '../tools/provider';
import { useViewport } from '../viewport/provider';

import { CURSORS } from '../cursors';
import { useTextEditing } from '../text-editing/provider';
import { computeBounds, pointsToBezierPath, pointsToPolyline, simplifyRDP } from '../tools/path-smoothing';
import type { Point } from '../tools/path-smoothing';
import { applyNodeReparenting, applySectionReparenting } from '../scene-graph/section-reparenting';
import { findNodeAtWorldPoint } from '../scene-graph/selection-utils';
import { CanvasRenderer } from './canvas-renderer';
import { CommentPinLayer, useComments } from '@prototype/shared';

/** Shape tools that support click-drag-to-create */
const CREATION_TOOLS = new Set(['FRAME', 'SECTION', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR']);

/** Default fills for newly created shapes */
const SHAPE_FILL = { type: 'SOLID' as const, color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true };
const FRAME_FILL = { type: 'SOLID' as const, color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true };
const SECTION_FILL = { type: 'SOLID' as const, color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true };
const SECTION_STROKE = {
  paint: { type: 'SOLID' as const, color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true },
  weight: 1,
  position: 'INSIDE' as const,
};
const TEXT_FILL = { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true };
const DEFAULT_STROKE = {
  paint: { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true },
  weight: 1,
  position: 'CENTER' as const,
};

/** Minimum distance (world-space px) between recorded pencil points */
const PENCIL_MIN_DISTANCE = 2;

/** RDP simplification epsilon (world-space px) */
const PENCIL_RDP_EPSILON = 2.0;

interface CanvasProps {
  onOpenContextMenu?: (type: 'node' | 'canvas', x: number, y: number) => void;
}

export function Canvas({ onOpenContextMenu }: CanvasProps) {
  const viewport = useViewport();
  const { containerRef, transform, screenToWorld } = viewport;
  const selection = useSelection();
  const store = useSceneGraph();
  const pageBg = usePageBackground();
  const { effectiveTool, setActiveTool, drawColor, drawStrokeWeight, drawOpacity } = useActiveTool();
  const textEditing = useTextEditing();
  const { interaction, setInteraction, selectedThreadId, setSelectedThreadId, store: commentsStore } = useComments();

  /** Resolve the world position of a node by ID (for comment node-attachment) */
  const getNodePosition = useCallback(
    (nodeId: string): { x: number; y: number } | undefined => {
      const node = store.getNode(nodeId);
      if (!node || !isGeometryNode(node)) return undefined;
      return getWorldPosition(store, node);
    },
    [store],
  );

  /** Whether the hand tool is actively dragging (for cursor styling) */
  const [isPanning, setIsPanning] = useState(false);

  /** Screen-space drag box for box selection (null when not dragging on empty canvas) */
  const [dragBox, setDragBox] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null);

  /** Tracks the pointer-down position and drag state */
  const dragRef = useRef<{
    startX: number
    startY: number
    dragging: boolean
    /** World-space position at last pointer event */
    lastWorld: { x: number; y: number }
    /** IDs being dragged */
    nodeIds: string[]
    /** Whether the hit node was already selected before this pointerdown */
    wasAlreadySelected?: boolean
  } | null>(null);

  /** Tracks hand-tool panning state (screen-space) */
  const panRef = useRef<{ lastX: number; lastY: number } | null>(null);

  /** Tracks last click for manual double-click detection */
  const lastClickRef = useRef<{ time: number; clientX: number; clientY: number } | null>(null);

  /** Tracks active shape creation drag */
  const creationRef = useRef<{
    nodeId: string
    nodeType: NodeType
    startWorldX: number
    startWorldY: number
  } | null>(null);

  /** Skip the click-away text editing exit on the pointerup that follows text creation */
  const skipTextExitRef = useRef(false);

  /** Tracks pencil freehand drawing state */
  const pencilRef = useRef<{
    points: Point[]
    pathEl: SVGPathElement
  } | null>(null);

  /** SVG overlay for pencil live preview (in world-space) */
  const pencilOverlayRef = useRef<SVGSVGElement>(null);

  // Cancel any in-progress creation drag when the tool switches away
  useEffect(() => {
    if (!CREATION_TOOLS.has(effectiveTool)) {
      creationRef.current = null;
    }
  }, [effectiveTool]);

  // Clean up pencil preview when tool switches away from PENCIL
  useEffect(() => {
    if (effectiveTool !== 'PENCIL') {
      const pencil = pencilRef.current;
      if (pencil) {
        pencil.pathEl.remove();
        pencilRef.current = null;
      }
    }
  }, [effectiveTool]);

  // Register selection actions
  useAction(
    'select-all',
    useCallback(() => {
      for (const node of store.getRootNodes()) {
        selection.add(node.id);
      }
    }, [store, selection]),
  );

  useAction(
    'deselect',
    useCallback(() => {
      // If inside a frame, first Escape exits frame; second Escape deselects
      if (selection.enteredFrameId !== null) {
        selection.exitFrame();
      } else {
        selection.clear();
      }
    }, [selection]),
  );

  useAction(
    'delete',
    useCallback(() => {
      for (const id of selection.selectedIds) {
        store.deleteNode(id);
      }
      selection.clear();
    }, [store, selection]),
  );

  useAction(
    'zoom-to-fit',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      // Compute world-space bounding box of all nodes
      const roots = store.getRootNodes();
      if (roots.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const root of roots) {
        if (!isGeometryNode(root)) continue;
        const pos = getWorldPosition(store, root);
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + root.width);
        maxY = Math.max(maxY, pos.y + root.height);
      }

      if (!isFinite(minX)) return;

      const padding = 48;
      const rect = container.getBoundingClientRect();
      const availW = rect.width - padding * 2;
      const availH = rect.height - padding * 2;
      const contentW = maxX - minX;
      const contentH = maxY - minY;

      if (contentW <= 0 || contentH <= 0) return;

      const scale = Math.min(availW / contentW, availH / contentH, 4);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      viewport.setState({
        scale,
        origin: {
          x: rect.width / 2 - cx * scale,
          y: rect.height / 2 - cy * scale,
        },
      });
    }, [store, containerRef, viewport]),
  );

  const MIN_SCALE = 0.02;
  const MAX_SCALE = 256;

  useAction(
    'zoom-in',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      viewport.setState((prev) => {
        const newScale = Math.min(prev.scale * 2, MAX_SCALE);
        const worldX = (cx - prev.origin.x) / prev.scale;
        const worldY = (cy - prev.origin.y) / prev.scale;
        return { scale: newScale, origin: { x: cx - worldX * newScale, y: cy - worldY * newScale } };
      });
    }, [containerRef, viewport]),
  );

  useAction(
    'zoom-out',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      viewport.setState((prev) => {
        const newScale = Math.max(prev.scale / 2, MIN_SCALE);
        const worldX = (cx - prev.origin.x) / prev.scale;
        const worldY = (cy - prev.origin.y) / prev.scale;
        return { scale: newScale, origin: { x: cx - worldX * newScale, y: cy - worldY * newScale } };
      });
    }, [containerRef, viewport]),
  );

  useAction(
    'zoom-to-100',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      viewport.setState((prev) => {
        const worldX = (cx - prev.origin.x) / prev.scale;
        const worldY = (cy - prev.origin.y) / prev.scale;
        return { scale: 1, origin: { x: cx - worldX, y: cy - worldY } };
      });
    }, [containerRef, viewport]),
  );

  // Center content before first paint (useLayoutEffect fires before browser paints)
  const didCenter = useRef(false);
  useLayoutEffect(() => {
    if (didCenter.current) return;
    const container = containerRef.current;
    if (!container) return;

    const roots = store.getRootNodes();
    if (roots.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const root of roots) {
      if (!isGeometryNode(root)) continue;
      const pos = getWorldPosition(store, root);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + root.width);
      maxY = Math.max(maxY, pos.y + root.height);
    }

    if (!isFinite(minX)) return;

    const rect = container.getBoundingClientRect();
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    didCenter.current = true;
    viewport.setState({
      scale: 1,
      origin: {
        x: rect.width / 2 - cx,
        y: rect.height / 2 - cy,
      },
    });
  }, [store, containerRef, viewport]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      // Hit-test to determine if a node was right-clicked
      const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);

      if (hitId) {
        if (!selection.isSelected(hitId)) {
          selection.select(hitId);
        }
        onOpenContextMenu?.('node', e.clientX, e.clientY);
      } else {
        selection.clear();
        onOpenContextMenu?.('canvas', e.clientX, e.clientY);
      }
    },
    [selection, onOpenContextMenu],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only handle left-click (button 0) — right-clicks use the context menu
      if (e.button !== 0) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Hand tool: start panning
      if (effectiveTool === 'HAND') {
        panRef.current = { lastX: e.clientX, lastY: e.clientY };
        setIsPanning(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const world = screenToWorld(localX, localY);

      // Comment tool: click-to-place a comment pin
      if (effectiveTool === 'COMMENT') {
        const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);
        if (hitId) {
          const node = store.getNode(hitId);
          if (node && isGeometryNode(node)) {
            const nodeWorldPos = getWorldPosition(store, node);
            setInteraction({
              type: 'placing',
              worldX: world.x,
              worldY: world.y,
              nodeId: hitId,
              nodeOffsetX: world.x - nodeWorldPos.x,
              nodeOffsetY: world.y - nodeWorldPos.y,
            });
          }
        } else {
          setInteraction({
            type: 'placing',
            worldX: world.x,
            worldY: world.y,
          });
        }
        return;
      }

      // Pencil tool: start freehand drawing
      if (effectiveTool === 'PENCIL') {
        const overlay = pencilOverlayRef.current;
        if (!overlay) return;

        const rgb = parseHexColor(drawColor);
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', `M${world.x},${world.y}`);
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('stroke', `rgb(${rgb.r},${rgb.g},${rgb.b})`);
        pathEl.setAttribute('stroke-width', String(drawStrokeWeight));
        pathEl.setAttribute('opacity', String(drawOpacity / 100));
        pathEl.setAttribute('stroke-linecap', 'round');
        pathEl.setAttribute('stroke-linejoin', 'round');
        overlay.appendChild(pathEl);

        pencilRef.current = {
          points: [{ x: world.x, y: world.y }],
          pathEl,
        };

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // Text tool: click-to-place a text node and enter editing
      if (effectiveTool === 'TEXT') {
        const node = store.createNode('TEXT', {
          x: world.x,
          y: world.y,
          width: 120,
          height: 22,
          fills: [TEXT_FILL],
        });
        selection.select(node.id);
        textEditing.startEditing(node.id);
        setActiveTool('MOVE');
        skipTextExitRef.current = true;
        return;
      }

      // Shape creation tools: create a node at click position and start drag-to-resize
      if (CREATION_TOOLS.has(effectiveTool)) {
        const nodeType = effectiveTool as NodeType;
        const isLine = nodeType === 'LINE';
        const isSection = nodeType === 'SECTION';
        const fills = isLine ? [] : isSection ? [SECTION_FILL] : nodeType === 'FRAME' ? [FRAME_FILL] : [SHAPE_FILL];
        const extra: Record<string, unknown> = {};
        if (nodeType === 'FRAME') extra.clipsContent = true;
        if (isSection) { extra.strokes = [SECTION_STROKE]; extra.cornerRadius = 8; }
        if (isLine) extra.strokes = [DEFAULT_STROKE];
        const node = store.createNode(nodeType, {
          x: world.x,
          y: world.y,
          width: 0,
          height: 0,
          fills,
          ...extra,
        });
        creationRef.current = {
          nodeId: node.id,
          nodeType,
          startWorldX: world.x,
          startWorldY: world.y,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      if (effectiveTool === 'MOVE') {
        // If we have a multi-selection, check if click is inside the combined
        // bounding box — if so, start dragging all selected nodes
        if (selection.selectedIds.size > 1) {
          const bbox = getSelectionBBox(store, selection.selectedIds);
          if (bbox && pointInRect(world.x, world.y, bbox)) {
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              dragging: false,
              lastWorld: world,
              nodeIds: collectDraggableIds(store, selection.selectedIds),
            };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            return;
          }
        }

        // DOM hit-test with Figma-style frame resolution
        const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);
        if (hitId) {
          // Track whether the node was already selected (for click-to-edit behavior)
          const wasAlreadySelected = selection.isSelected(hitId);

          // If the hit node isn't selected, select it now
          if (!wasAlreadySelected) {
            if (e.shiftKey) {
              selection.toggle(hitId);
            } else {
              selection.select(hitId);
            }
          }

          // Use hitId directly — React state from select() hasn't committed yet
          const node = store.getNode(hitId);
          const dragIds = node && isGeometryNode(node) ? [hitId] : [];

          const nodeIds = selection.isSelected(hitId)
            ? collectDraggableIds(store, selection.selectedIds)
            : dragIds;

          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            dragging: false,
            lastWorld: world,
            nodeIds,
            wasAlreadySelected,
          };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }

      // No hit or not move tool — just record position for click detection
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        dragging: false,
        lastWorld: world,
        nodeIds: [],
      };

      // Start box selection when clicking empty canvas with move tool
      if (effectiveTool === 'MOVE') {
        setDragBox({
          startX: localX, startY: localY, currentX: localX, currentY: localY,
        });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [containerRef, screenToWorld, store, selection, effectiveTool, textEditing, setActiveTool, setInteraction, drawColor, drawStrokeWeight, drawOpacity],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Pencil drawing — append points to live preview
      const pencil = pencilRef.current;
      if (pencil) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Use coalesced events for high-fidelity input when available
        const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
        let updated = false;

        for (const evt of events) {
          const lx = evt.clientX - rect.left;
          const ly = evt.clientY - rect.top;
          const world = screenToWorld(lx, ly);
          const last = pencil.points[pencil.points.length - 1];
          const dx = world.x - last.x;
          const dy = world.y - last.y;

          // Distance filter: skip if too close to last point
          if (dx * dx + dy * dy < PENCIL_MIN_DISTANCE * PENCIL_MIN_DISTANCE) continue;

          pencil.points.push({ x: world.x, y: world.y });
          updated = true;
        }

        if (updated) {
          pencil.pathEl.setAttribute('d', pointsToPolyline(pencil.points));
        }
        return;
      }

      // Shape creation drag — resize the new node
      const creation = creationRef.current;
      if (creation) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        const world = screenToWorld(localX, localY);

        // LINE: compute width as distance, rotation as angle, height stays 0
        if (creation.nodeType === 'LINE') {
          const dx = world.x - creation.startWorldX;
          const dy = world.y - creation.startWorldY;
          let length = Math.sqrt(dx * dx + dy * dy);
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);

          // Shift-drag: snap to 45-degree increments
          if (e.shiftKey) {
            angle = Math.round(angle / 45) * 45;
            const rad = angle * (Math.PI / 180);
            length = Math.abs(dx * Math.cos(rad) + dy * Math.sin(rad));
          }

          store.updateNode(creation.nodeId, {
            x: creation.startWorldX,
            y: creation.startWorldY,
            width: length,
            height: 0,
            rotation: angle,
          });
          return;
        }

        let x = Math.min(creation.startWorldX, world.x);
        let y = Math.min(creation.startWorldY, world.y);
        let w = Math.abs(world.x - creation.startWorldX);
        let h = Math.abs(world.y - creation.startWorldY);

        // Shift-drag: constrain to square/circle
        if (e.shiftKey) {
          const size = Math.max(w, h);
          w = size;
          h = size;
          // Anchor from the original start point
          if (world.x < creation.startWorldX) x = creation.startWorldX - size;
          if (world.y < creation.startWorldY) y = creation.startWorldY - size;
        }

        store.updateNode(creation.nodeId, { x, y, width: w, height: h });
        return;
      }

      // Hand tool panning
      const pan = panRef.current;
      if (pan) {
        const dx = e.clientX - pan.lastX;
        const dy = e.clientY - pan.lastY;
        pan.lastX = e.clientX;
        pan.lastY = e.clientY;
        viewport.setState((prev) => ({
          ...prev,
          origin: { x: prev.origin.x + dx, y: prev.origin.y + dy },
        }));
        return;
      }

      const drag = dragRef.current;
      if (!drag) return;

      // Update box selection drag
      if (drag.nodeIds.length === 0 && dragBox) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setDragBox((prev) => (prev
            ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top }
            : null));
        }
        return;
      }

      if (drag.nodeIds.length === 0) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      // Start dragging once past threshold
      if (!drag.dragging && dx * dx + dy * dy > 9) {
        drag.dragging = true;
      }

      if (!drag.dragging) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const world = screenToWorld(localX, localY);
      const worldDx = world.x - drag.lastWorld.x;
      const worldDy = world.y - drag.lastWorld.y;
      drag.lastWorld = world;

      // Update all dragged nodes
      for (const id of drag.nodeIds) {
        const node = store.getNode(id);
        if (!node || !isGeometryNode(node)) continue;
        store.updateNode(id, {
          x: node.x + worldDx,
          y: node.y + worldDy,
        });
      }
    },
    [containerRef, screenToWorld, store, dragBox, viewport],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Finalize pencil drawing
      const pencil = pencilRef.current;
      if (pencil) {
        pencil.pathEl.remove();
        pencilRef.current = null;

        // Discard if too few points (click without drag)
        if (pencil.points.length < 2) return;

        // Compute bounding box, normalize points to local coords
        const bounds = computeBounds(pencil.points);
        // Add small padding to avoid zero-dimension nodes
        const minSize = drawStrokeWeight;
        const w = Math.max(bounds.width, minSize);
        const h = Math.max(bounds.height, minSize);

        const normalized = pencil.points.map((p) => ({
          x: p.x - bounds.x,
          y: p.y - bounds.y,
        }));

        // Simplify and smooth
        const simplified = simplifyRDP(normalized, PENCIL_RDP_EPSILON);
        const d = pointsToBezierPath(simplified);

        // Build stroke from draw tool state
        const rgb = parseHexColor(drawColor);
        const stroke = {
          paint: { type: 'SOLID' as const, color: rgb, opacity: drawOpacity / 100, visible: true },
          weight: drawStrokeWeight,
          position: 'CENTER' as const,
        };

        // Create the VectorNode
        const node = store.createNode('VECTOR', {
          x: bounds.x,
          y: bounds.y,
          width: w,
          height: h,
          fills: [],
          strokes: [stroke],
          paths: [{ d }],
        });

        selection.select(node.id);
        applyNodeReparenting(store, [node.id]);
        // Pencil stays active for consecutive draws — do NOT switch to MOVE
        return;
      }

      // Click-away exits text editing (skip on the pointerup from text creation)
      if (skipTextExitRef.current) {
        skipTextExitRef.current = false;
      } else if (textEditing.editingNodeId) {
        const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);
        if (hitId !== textEditing.editingNodeId) {
          textEditing.stopEditing();
        }
      }

      // Finalize shape creation
      const creation = creationRef.current;
      if (creation) {
        creationRef.current = null;
        const node = store.getNode(creation.nodeId);
        if (node && isGeometryNode(node)) {
          // If the shape is too small (click without meaningful drag), set a default size
          if (node.width < 2 && node.height < 2) {
            if (creation.nodeType === 'LINE') {
              store.updateNode(creation.nodeId, {
                x: creation.startWorldX,
                y: creation.startWorldY,
                width: 100,
                height: 0,
                rotation: 0,
              });
            } else {
              const defaultW = creation.nodeType === 'FRAME' ? 200 : creation.nodeType === 'SECTION' ? 300 : 100;
              const defaultH = creation.nodeType === 'FRAME' ? 150 : creation.nodeType === 'SECTION' ? 200 : 100;
              store.updateNode(creation.nodeId, {
                x: creation.startWorldX,
                y: creation.startWorldY,
                width: defaultW,
                height: defaultH,
              });
            }
          }
        }
        selection.select(creation.nodeId);
        if (creation.nodeType === 'SECTION') {
          applySectionReparenting(store, creation.nodeId);
        } else {
          applyNodeReparenting(store, [creation.nodeId]);
        }
        setActiveTool('MOVE');
        return;
      }

      // End hand tool panning
      if (panRef.current) {
        panRef.current = null;
        setIsPanning(false);
        return;
      }

      const drag = dragRef.current;
      dragRef.current = null;

      // Finalize box selection: select all nodes fully enclosed by the drag box
      if (dragBox && drag && drag.nodeIds.length === 0) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          // Convert screen-space drag box to world-space
          const boxMinX = Math.min(dragBox.startX, dragBox.currentX);
          const boxMinY = Math.min(dragBox.startY, dragBox.currentY);
          const boxMaxX = Math.max(dragBox.startX, dragBox.currentX);
          const boxMaxY = Math.max(dragBox.startY, dragBox.currentY);

          const wMinX = (boxMinX - viewport.state.origin.x) / viewport.state.scale;
          const wMinY = (boxMinY - viewport.state.origin.y) / viewport.state.scale;
          const wMaxX = (boxMaxX - viewport.state.origin.x) / viewport.state.scale;
          const wMaxY = (boxMaxY - viewport.state.origin.y) / viewport.state.scale;

          // Only finalize if the box has meaningful size
          if (boxMaxX - boxMinX > 2 || boxMaxY - boxMinY > 2) {
            // Get the candidate nodes: root-level, or children of entered frame
            const candidates = selection.enteredFrameId
              ? (store.getNode(selection.enteredFrameId)?.children ?? []).map((id) => store.getNode(id)).filter(Boolean)
              : store.getRootNodes();

            if (!e.shiftKey) {
              selection.clear();
            }

            for (const candidate of candidates) {
              if (!candidate || !isGeometryNode(candidate)) continue;
              const world = getWorldPosition(store, candidate);
              const nodeMaxX = world.x + candidate.width;
              const nodeMaxY = world.y + candidate.height;

              // Check if the node is fully enclosed
              if (world.x >= wMinX && world.y >= wMinY && nodeMaxX <= wMaxX && nodeMaxY <= wMaxY) {
                selection.add(candidate.id);
              }
            }
          }
        }
      }

      setDragBox(null);

      if (!drag) return;

      // If we were dragging, apply reparenting and don't do click-to-select
      if (drag.dragging) {
        lastClickRef.current = null;
        const sectionIds = drag.nodeIds.filter((id) => store.getNode(id)?.type === 'SECTION');
        const nonSectionIds = drag.nodeIds.filter((id) => store.getNode(id)?.type !== 'SECTION');
        for (const sid of sectionIds) applySectionReparenting(store, sid);
        applyNodeReparenting(store, nonSectionIds);
        return;
      }

      // Treat as click — do selection
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (dx * dx + dy * dy > 25) return;

      const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);

      if (hitId) {
        // Skip shift+click toggle if we already toggled this node on mouse down
        // (otherwise we'd double-toggle: add on down, remove on up)
        const alreadyHandled = e.shiftKey && !drag.wasAlreadySelected;
        if (!alreadyHandled) {
          if (e.shiftKey) {
            selection.toggle(hitId);
          } else {
            selection.select(hitId);
          }
        }
      } else if (selection.enteredFrameId !== null) {
        // Click outside entered frame → exit frame
        selection.exitFrame();
        selection.clear();
      } else {
        selection.clear();
      }

      // Manual double-click detection: check if this click is close in time and
      // position to the previous one
      const now = Date.now();
      const last = lastClickRef.current;
      if (
        last
        && now - last.time < 300
        && Math.abs(e.clientX - last.clientX) < 5
        && Math.abs(e.clientY - last.clientY) < 5
      ) {
        // Double-click detected — enter frame or edit text
        lastClickRef.current = null;
        if (effectiveTool === 'MOVE' && hitId) {
          if (selection.isSelected(hitId)) {
            const node = store.getNode(hitId);
            if (node?.type === 'TEXT') {
              textEditing.startEditing(hitId);
            } else if (node?.type === 'FRAME' || node?.type === 'SECTION') {
              selection.enterFrame(hitId);
              const childId = resolveHitNode(e.target as HTMLElement, hitId);
              selection.select(childId && childId !== hitId ? childId : hitId);
            }
          }
        }
      } else {
        lastClickRef.current = { time: now, clientX: e.clientX, clientY: e.clientY };
      }
    },
    [selection, effectiveTool, store, setActiveTool, textEditing, dragBox, containerRef, viewport, drawColor, drawStrokeWeight, drawOpacity],
  );

  // ── Comment pin drag handlers ──────────────────────────────────────────

  const handleCommentDragStart = useCallback(
    (threadId: string) => {
      setSelectedThreadId(null);
      setInteraction({ type: 'dragging', threadId, worldX: 0, worldY: 0 });
    },
    [setSelectedThreadId, setInteraction],
  );

  const handleCommentDragMove = useCallback(
    (threadId: string, worldX: number, worldY: number) => {
      setInteraction({ type: 'dragging', threadId, worldX, worldY });
    },
    [setInteraction],
  );

  const handleCommentDragEnd = useCallback(
    (threadId: string, worldX: number, worldY: number) => {
      const hitNodeId = findNodeAtWorldPoint(store, worldX, worldY);
      if (hitNodeId) {
        const node = store.getNode(hitNodeId);
        if (node && isGeometryNode(node)) {
          const nodeWorldPos = getWorldPosition(store, node);
          commentsStore.updateAnchor(threadId, {
            worldX,
            worldY,
            nodeId: hitNodeId,
            nodeOffsetX: worldX - nodeWorldPos.x,
            nodeOffsetY: worldY - nodeWorldPos.y,
          });
        }
      } else {
        commentsStore.updateAnchor(threadId, {
          worldX,
          worldY,
          nodeId: undefined,
          nodeOffsetX: undefined,
          nodeOffsetY: undefined,
        });
      }
      setInteraction({ type: 'none' });
    },
    [store, commentsStore, setInteraction],
  );

  // Cursor style based on active tool
  const cursorStyle = (() => {
    switch (effectiveTool) {
      case 'HAND': return isPanning ? CURSORS.grabbing : CURSORS.grab;
      case 'FRAME': return CURSORS.frame;
      case 'PEN': return CURSORS.pen;
      case 'PENCIL': return CURSORS.pencil;
      case 'SECTION': return CURSORS.crosshair;
      case 'TEXT':
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'LINE':
      case 'POLYGON':
      case 'STAR': return CURSORS.crosshair;
      case 'COMMENT': return CURSORS.commentNext;
      default: return CURSORS.default;
    }
  })();

  // Pixel grid at 400%+ zoom
  const { scale, origin } = viewport.state;
  const showPixelGrid = scale >= 4;
  const pixelGridStyle: React.CSSProperties | undefined = showPixelGrid
    ? {
      position: 'absolute',
      inset: 0,
      backgroundImage: [
        'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: `${scale}px ${scale}px`,
      backgroundPosition: `${origin.x % scale}px ${origin.y % scale}px`,
      pointerEvents: 'none',
    }
    : undefined;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: `rgb(${pageBg.color.r}, ${pageBg.color.g}, ${pageBg.color.b})`, cursor: cursorStyle }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={onContextMenu}
    >
      <div
        style={{
          transformOrigin: '0 0',
          transform,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <CanvasRenderer />
        <svg
          ref={pencilOverlayRef}
          className="absolute top-0 left-0 overflow-visible pointer-events-none"
        />
        <CommentPinLayer
          commentsStore={commentsStore}
          interaction={interaction}
          selectedThreadId={selectedThreadId}
          zoom={scale}
          getNodePosition={getNodePosition}
          onPinClick={(threadId) => {
            setSelectedThreadId(threadId);
            setInteraction({ type: 'viewing', threadId });
          }}
          onPinHoverStart={(threadId) => {
            if (interaction.type !== 'viewing' && interaction.type !== 'dragging') {
              setInteraction({ type: 'hovering', threadId });
            }
          }}
          onPinHoverEnd={() => {
            if (interaction.type === 'hovering') {
              setInteraction({ type: 'none' });
            }
          }}
          onDragStart={handleCommentDragStart}
          onDragMove={handleCommentDragMove}
          onDragEnd={handleCommentDragEnd}
          screenToWorld={screenToWorld}
          containerRef={containerRef}
          nodeStoreSubscribe={store.subscribe}
          nodeStoreGetSnapshot={store.getSnapshot}
        />
      </div>
      {showPixelGrid && <div style={pixelGridStyle} />}
      <SelectionOverlay dragBox={dragBox} />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Figma-style hit resolution.
 *
 * Walk up from the click target collecting all `data-node-id` values into a
 * chain (innermost first → reversed to outermost first).
 *
 * - `enteredFrameId === null` → return the outermost (root-level) node
 * - `enteredFrameId` is set  → return the direct child of the entered frame,
 *   or the entered frame itself if the click lands directly on it.
 */
function resolveHitNode(el: HTMLElement, enteredFrameId: string | null): string | null {
  // Collect all node IDs from innermost to outermost
  const chain: string[] = [];
  let cur: HTMLElement | null = el;
  while (cur) {
    const id = cur.dataset?.nodeId;
    if (id && !chain.includes(id)) {
      chain.push(id);
    }
    cur = cur.parentElement;
  }

  if (chain.length === 0) return null;

  // Reverse so chain[0] is outermost (root-level)
  chain.reverse();

  if (enteredFrameId === null) {
    // Not inside any frame — select the root-level node
    return chain[0];
  }

  // Find the entered frame in the chain
  const enteredIdx = chain.indexOf(enteredFrameId);
  if (enteredIdx === -1) {
    // Click is outside the entered frame entirely
    return null;
  }

  // Return the direct child of the entered frame (one level deeper)
  if (enteredIdx + 1 < chain.length) {
    return chain[enteredIdx + 1];
  }

  // Click landed directly on the entered frame (no deeper child)
  return enteredFrameId;
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Compute the combined world-space bounding box of all selected nodes */
function getSelectionBBox(
  store: ReturnType<typeof useSceneGraph>,
  selectedIds: Set<string>,
): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of selectedIds) {
    const node = store.getNode(id);
    if (!node || !isGeometryNode(node)) continue;
    const pos = getWorldPosition(store, node);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + node.width);
    maxY = Math.max(maxY, pos.y + node.height);
  }

  if (!isFinite(minX)) return null;
  return {
    x: minX, y: minY, w: maxX - minX, h: maxY - minY,
  };
}

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Collect IDs of all selected geometry nodes for dragging.
 *  Excludes nodes whose ancestor is also in the selection set
 *  (prevents double-moving children when parent+child are both selected). */
function collectDraggableIds(
  store: ReturnType<typeof useSceneGraph>,
  selectedIds: Set<string>,
): string[] {
  const ids: string[] = [];
  for (const id of selectedIds) {
    const node = store.getNode(id);
    if (!node || !isGeometryNode(node)) continue;
    const hasSelectedAncestor = store.getAncestors(id).some((a) => selectedIds.has(a.id));
    if (!hasSelectedAncestor) ids.push(id);
  }
  return ids;
}

/** Parse a CSS hex color (#RRGGBB or #RGB) to {r, g, b} (0–255) */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
