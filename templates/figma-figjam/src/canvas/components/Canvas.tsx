import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useAction } from '../../actions/provider';
import type { NodeType } from '../types';
import { isTextCapableNode } from '../types';
import { usePageBackground, useSceneGraph } from '../scene-graph/provider';
import { getWorldPosition, isGeometryNode } from '../scene-graph/world-position';
import { SelectionOverlay } from '../selection/overlay';
import { useSelection } from '../selection/provider';
import { useActiveTool } from '../tools/provider';
import { useViewport } from '../viewport/provider';

import { CURSORS } from '../cursors';
import { useComments } from '@prototype/shared';
import { useTextEditing } from '../text-editing/provider';
import { CanvasRenderer } from './canvas-renderer';
import type { Point } from '../tools/path-smoothing';
import { computeBounds, pointsToBezierPath, pointsToPolyline, simplifyRDP } from '../tools/path-smoothing';
import { applyNodeReparenting, applySectionReparenting } from '../scene-graph/section-reparenting';
import { collectDraggableIds, getSelectionBBox, pointInRect } from '../scene-graph/selection-utils';
import type { ContextMenuState } from '../../components/CanvasContextMenu';

/** Shape tools that support click-drag-to-create */
const CREATION_TOOLS = new Set(['FRAME', 'SECTION', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR']);

/** Shape tools that show a ghost preview following the cursor */
const GHOST_SHAPE_TOOLS = new Set(['RECTANGLE', 'ELLIPSE', 'POLYGON']);

/** Default size for ghost shape previews */
const SHAPE_GHOST_SIZE = 100;

/** Default fills for newly created shapes */
const FRAME_FILL = { type: 'SOLID' as const, color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true };
const TEXT_FILL = { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true };

/** Default size for new sticky notes */
const STICKY_DEFAULT_SIZE = 240;
const DEFAULT_STROKE = {
  paint: { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true },
  weight: 1,
  position: 'CENTER' as const,
};

/** Marker stroke weight */
const MARKER_STROKE_WEIGHT = 4;
/** Highlighter stroke weight */
const HIGHLIGHTER_STROKE_WEIGHT = 20;
/** Highlighter opacity */
const HIGHLIGHTER_OPACITY = 0.5;
/** Minimum distance (world-space px) between recorded pen points */
const PEN_MIN_DISTANCE = 2;
/** RDP simplification epsilon */
const PEN_RDP_EPSILON = 2.0;

interface CanvasProps {
  onOpenContextMenu?: (state: ContextMenuState) => void;
}

export function Canvas({ onOpenContextMenu }: CanvasProps) {
  const viewport = useViewport();
  const { containerRef, transform, screenToWorld } = viewport;
  const selection = useSelection();
  const store = useSceneGraph();
  const pageBg = usePageBackground();
  const { effectiveTool, setActiveTool, stickyColor, sectionFillColor, shapeColor, markerColor, highlighterColor, markerSubType } = useActiveTool();
  const textEditing = useTextEditing();
  const { interaction, setInteraction } = useComments();

  /** Screen-space mouse position for sticky note ghost preview */
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);

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

  /** Tracks active pen/marker drawing */
  const penRef = useRef<{
    points: Point[]
    pathEl: SVGPathElement
    color: string
    subType: 'marker' | 'highlighter'
  } | null>(null);

  /** SVG overlay for live pen preview */
  const penOverlayRef = useRef<SVGSVGElement>(null);

  // Cancel any in-progress creation drag when the tool switches away
  useEffect(() => {
    if (!CREATION_TOOLS.has(effectiveTool)) {
      creationRef.current = null;
    }
    if (effectiveTool !== 'STICKY_NOTE' && !GHOST_SHAPE_TOOLS.has(effectiveTool)) {
      setGhostPos(null);
    }
    // Clean up any in-progress pen drawing
    if (effectiveTool !== 'PEN') {
      const pen = penRef.current;
      if (pen) {
        pen.pathEl.remove();
        penRef.current = null;
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
      // Always reset toolbar to the select tool on Escape
      setActiveTool('MOVE');
    }, [selection, setActiveTool]),
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
        // Select the node if not already selected
        if (!selection.isSelected(hitId)) {
          selection.select(hitId);
        }
        onOpenContextMenu?.({ x: e.clientX, y: e.clientY, type: 'node' });
      } else {
        selection.clear();
        onOpenContextMenu?.({ x: e.clientX, y: e.clientY, type: 'canvas' });
      }
    },
    [selection, onOpenContextMenu],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
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
          if (node && 'x' in node) {
            const nodeX = (node as { x: number }).x;
            const nodeY = (node as { y: number }).y;
            setInteraction({
              type: 'placing',
              worldX: world.x,
              worldY: world.y,
              nodeId: hitId,
              nodeOffsetX: world.x - nodeX,
              nodeOffsetY: world.y - nodeY,
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

      // Sticky note tool: click-to-place centered on cursor, then edit
      if (effectiveTool === 'STICKY_NOTE') {
        const node = store.createNode('STICKY_NOTE', {
          x: world.x - STICKY_DEFAULT_SIZE / 2,
          y: world.y - STICKY_DEFAULT_SIZE / 2,
          width: STICKY_DEFAULT_SIZE,
          height: STICKY_DEFAULT_SIZE,
          fills: [{ type: 'SOLID', color: stickyColor, opacity: 1, visible: true }],
        });
        selection.select(node.id);
        textEditing.startEditing(node.id);
        setActiveTool('MOVE');
        setGhostPos(null);
        skipTextExitRef.current = true;
        return;
      }

      // PEN tool: start marker/highlighter drawing
      if (effectiveTool === 'PEN') {
        const overlay = penOverlayRef.current;
        if (!overlay) return;

        const isHighlighter = markerSubType === 'highlighter';
        const strokeWeight = isHighlighter ? HIGHLIGHTER_STROKE_WEIGHT : MARKER_STROKE_WEIGHT;
        const activeColor = isHighlighter ? highlighterColor : markerColor;

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', `M${world.x},${world.y}`);
        pathEl.setAttribute('stroke', activeColor);
        pathEl.setAttribute('stroke-width', String(strokeWeight));
        pathEl.setAttribute('stroke-linecap', 'round');
        pathEl.setAttribute('stroke-linejoin', 'round');
        pathEl.setAttribute('fill', 'none');
        if (isHighlighter) {
          pathEl.setAttribute('opacity', String(HIGHLIGHTER_OPACITY));
        }
        overlay.appendChild(pathEl);

        penRef.current = {
          points: [{ x: world.x, y: world.y }],
          pathEl,
          color: activeColor,
          subType: isHighlighter ? 'highlighter' : 'marker',
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // Shape creation tools: create a node at click position and start drag-to-resize
      if (CREATION_TOOLS.has(effectiveTool)) {
        const nodeType = effectiveTool as NodeType;
        const isLine = nodeType === 'LINE';
        const isSection = nodeType === 'SECTION';
        const sectionFill = { type: 'SOLID' as const, color: sectionFillColor, opacity: 1, visible: true };
        const shapeFill = { type: 'SOLID' as const, color: shapeColor, opacity: 1, visible: true };
        const fills = isLine ? [] : isSection ? [sectionFill] : nodeType === 'FRAME' ? [FRAME_FILL] : [shapeFill];
        const extra: Record<string, unknown> = {};
        if (nodeType === 'FRAME') extra.clipsContent = true;
        if (isSection) {
          extra.cornerRadius = 8;
          extra.strokes = [{
            paint: { type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true },
            weight: 1,
            position: 'INSIDE',
          }];
        }
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
    [containerRef, screenToWorld, store, selection, effectiveTool, textEditing, setActiveTool, stickyColor, sectionFillColor, markerColor, highlighterColor, markerSubType, interaction, setInteraction],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Track mouse for sticky note and shape ghost previews
      if (effectiveTool === 'STICKY_NOTE' || GHOST_SHAPE_TOOLS.has(effectiveTool)) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setGhostPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }

      // Pen/marker drawing — accumulate points
      const pen = penRef.current;
      if (pen) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        // Use coalesced events for high-fidelity input
        const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
        for (const evt of events) {
          const world = screenToWorld(evt.clientX - rect.left, evt.clientY - rect.top);
          const last = pen.points[pen.points.length - 1];
          const distSq = (world.x - last.x) ** 2 + (world.y - last.y) ** 2;
          if (distSq < PEN_MIN_DISTANCE ** 2) continue;
          pen.points.push({ x: world.x, y: world.y });
        }
        // Update live preview polyline
        pen.pathEl.setAttribute('d', pointsToPolyline(pen.points));
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
        selection.setDragging(true);
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
    [containerRef, screenToWorld, store, selection, dragBox, viewport, effectiveTool],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Click-away exits text editing (skip on the pointerup from text creation)
      if (skipTextExitRef.current) {
        skipTextExitRef.current = false;
      } else if (textEditing.editingNodeId) {
        const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);
        if (hitId !== textEditing.editingNodeId) {
          textEditing.stopEditing();
        }
      }

      // Finalize pen/marker drawing
      const pen = penRef.current;
      if (pen) {
        pen.pathEl.remove();
        penRef.current = null;

        // Discard if too few points (click without drag)
        if (pen.points.length < 2) return;

        // Compute bounding box
        const bounds = computeBounds(pen.points);
        const isHighlighter = pen.subType === 'highlighter';
        const strokeWeight = isHighlighter ? HIGHLIGHTER_STROKE_WEIGHT : MARKER_STROKE_WEIGHT;
        const minSize = strokeWeight;
        const w = Math.max(bounds.width, minSize);
        const h = Math.max(bounds.height, minSize);

        // Normalize points to local coordinates
        const normalized = pen.points.map((p) => ({
          x: p.x - bounds.x,
          y: p.y - bounds.y,
        }));

        // Simplify with RDP then convert to smooth bezier
        const simplified = simplifyRDP(normalized, PEN_RDP_EPSILON);
        const d = pointsToBezierPath(simplified);

        // Parse the marker color (CSS hex/rgb) into an RGB color object
        const strokeColor = parseCSSColor(pen.color);

        const node = store.createNode('VECTOR', {
          x: bounds.x,
          y: bounds.y,
          width: w,
          height: h,
          fills: [],
          opacity: isHighlighter ? HIGHLIGHTER_OPACITY : 1,
          strokes: [{
            paint: { type: 'SOLID', color: strokeColor, opacity: 1, visible: true },
            weight: strokeWeight,
            position: 'CENTER',
          }],
          paths: [{ d }],
        });

        applyNodeReparenting(store, [node.id]);
        selection.select(node.id);
        // PEN tool stays active for consecutive draws
        return;
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
              const defaultW = (creation.nodeType === 'FRAME' || creation.nodeType === 'SECTION') ? 200 : 100;
              const defaultH = (creation.nodeType === 'FRAME' || creation.nodeType === 'SECTION') ? 150 : 100;
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
      setDragBox(null);

      if (!drag) return;

      // If we were dragging, don't do click-to-select
      if (drag.dragging) {
        selection.setDragging(false);
        const sectionIds = drag.nodeIds.filter((id) => store.getNode(id)?.type === 'SECTION');
        const nonSectionIds = drag.nodeIds.filter((id) => store.getNode(id)?.type !== 'SECTION');
        for (const sid of sectionIds) applySectionReparenting(store, sid);
        applyNodeReparenting(store, nonSectionIds);
        lastClickRef.current = null;
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

      // Click on already-selected text-capable node → enter text editing
      if (
        effectiveTool === 'MOVE'
        && hitId
        && drag?.wasAlreadySelected
        && !textEditing.editingNodeId
      ) {
        const node = store.getNode(hitId);
        if (node && isTextCapableNode(node)) {
          textEditing.startEditing(hitId, false);
        }
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
            } else if (node && isTextCapableNode(node)) {
              if (textEditing.editingNodeId === hitId) {
                // Already editing — select all text via DOM
                requestAnimationFrame(() => {
                  const el = document.querySelector(
                    `[data-node-id="${hitId}"] [contenteditable="true"]`,
                  ) as HTMLElement | null;
                  if (el) {
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  }
                });
              } else {
                textEditing.startEditing(hitId, true);
              }
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
    [selection, effectiveTool, store, setActiveTool, textEditing],
  );

  // Cursor style based on active tool
  const cursorStyle = (() => {
    switch (effectiveTool) {
      case 'HAND': return isPanning ? CURSORS.grabbing : CURSORS.grab;
      case 'FRAME': return CURSORS.frame;
      case 'SECTION': return CURSORS.crosshair;
      case 'PEN': return markerSubType === 'highlighter' ? CURSORS.highlighter : CURSORS.marker;
      case 'TEXT':
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'LINE':
      case 'POLYGON':
      case 'STAR': return CURSORS.crosshair;
      case 'STICKY_NOTE': return CURSORS.default;
      case 'COMMENT': return CURSORS.comment;
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

  // Adaptive dot grid: two cross-fading layers for smooth LOD transitions
  const BASE_GRID = 20;
  const MIN_SCREEN_PX = 10;
  const MAX_DOT_OPACITY = 0.12;

  const power = Math.max(0, Math.ceil(Math.log2(MIN_SCREEN_PX / (BASE_GRID * scale))));
  const fineSpacing = BASE_GRID * Math.pow(2, power);
  const coarseSpacing = fineSpacing * 2;

  const fineScreenSize = fineSpacing * scale;
  const fadeRatio = Math.min(1, Math.max(0, (fineScreenSize - MIN_SCREEN_PX) / MIN_SCREEN_PX));
  const fineOpacity = MAX_DOT_OPACITY * fadeRatio;
  const coarseOpacity = MAX_DOT_OPACITY * (1 - fadeRatio);

  const dotLayers: { image: string; size: string; position: string }[] = [];
  if (fineOpacity > 0.001) {
    dotLayers.push(makeDotLayer(fineSpacing, fineOpacity, scale, origin));
  }
  if (coarseOpacity > 0.001) {
    dotLayers.push(makeDotLayer(coarseSpacing, coarseOpacity, scale, origin));
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-auto"
      style={{
        backgroundColor: `rgb(${pageBg.color.r}, ${pageBg.color.g}, ${pageBg.color.b})`,
        backgroundImage: dotLayers.map((l) => l.image).join(', ') || 'none',
        backgroundSize: dotLayers.map((l) => l.size).join(', ') || 'auto',
        backgroundPosition: dotLayers.map((l) => l.position).join(', ') || '0 0',
        cursor: cursorStyle,
      }}
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
      </div>
      {showPixelGrid && <div style={pixelGridStyle} />}
      {/* Sticky note ghost preview */}
      {effectiveTool === 'STICKY_NOTE' && ghostPos && (
        <div
          style={{
            position: 'absolute',
            left: ghostPos.x - (STICKY_DEFAULT_SIZE * scale) / 2,
            top: ghostPos.y - (STICKY_DEFAULT_SIZE * scale) / 2,
            width: STICKY_DEFAULT_SIZE * scale,
            height: STICKY_DEFAULT_SIZE * scale,
            backgroundColor: `rgba(${stickyColor.r}, ${stickyColor.g}, ${stickyColor.b}, 0.3)`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Shape ghost preview (rectangle, ellipse, polygon) */}
      {GHOST_SHAPE_TOOLS.has(effectiveTool) && ghostPos && (
        <div
          style={{
            position: 'absolute',
            left: ghostPos.x - (SHAPE_GHOST_SIZE * scale) / 2,
            top: ghostPos.y - (SHAPE_GHOST_SIZE * scale) / 2,
            width: SHAPE_GHOST_SIZE * scale,
            height: SHAPE_GHOST_SIZE * scale,
            backgroundColor: 'rgba(217, 217, 217, 0.3)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: effectiveTool === 'ELLIPSE'
              ? '50%'
              : effectiveTool === 'POLYGON'
                ? '4px'
                : '2px',
            transform: effectiveTool === 'POLYGON' ? 'rotate(45deg)' : undefined,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* SVG overlay for live pen/marker drawing preview */}
      <svg
        ref={penOverlayRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible',
          pointerEvents: 'none',
          transformOrigin: '0 0',
          transform,
        }}
      />
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

/** Parse a CSS color string (#hex or rgb()) into an { r, g, b } object */
function parseCSSColor(css: string): { r: number; g: number; b: number } {
  // Handle hex (#RGB, #RRGGBB)
  if (css.startsWith('#')) {
    let hex = css.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  // Handle rgb(r, g, b)
  const match = css.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) {
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
  }
  return { r: 0, g: 0, b: 0 };
}

/** Build a single dot-grid CSS gradient layer */
function makeDotLayer(
  spacing: number,
  opacity: number,
  scale: number,
  origin: { x: number; y: number },
) {
  const sz = spacing * scale;
  return {
    image: `radial-gradient(circle, rgba(0,0,0,${opacity.toFixed(4)}) 1px, transparent 1px)`,
    size: `${sz}px ${sz}px`,
    position: `${origin.x % sz}px ${origin.y % sz}px`,
  };
}
