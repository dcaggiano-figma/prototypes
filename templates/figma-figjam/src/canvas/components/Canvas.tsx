import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useAction } from '../../actions/provider';
import type { NodeId } from '@prototype/shared/canvas';
import {
  usePageBackground,
  isDefaultPageBackground,
  DEFAULT_PAGE_BG,
  useSceneGraph,
  useCanvasId,
  useUndoActions,
  useNudgeActions,
  useUndoManager,
  getWorldPosition,
  isGeometryNode,
  useSelection,
  useViewport,
  useViewportState,
  useTextEditing,
  useBehaviorManager,
  findNodeAtWorldPoint,
  CanvasLayers,
  ConnectorPointsOverlay,
  EndpointDragProvider,
  useEndpointDrag,
} from '@prototype/shared/canvas';
import { CommentPinLayer, useComments, useUserConfig } from '@prototype/shared';
import { SelectionOverlay } from '../selection/overlay';
import { useActiveTool } from '../tools/provider';
import { useBehaviorChain } from '../behaviors';
import { CURSORS } from '../cursors';
import { CanvasRenderer } from './canvas-renderer';
import { copyNodes, cutNodes, pasteNodes, duplicateNodes } from '../clipboard/clipboard';

/** Shape tools that show a ghost preview following the cursor */
const GHOST_SHAPE_TOOLS = new Set(['RECTANGLE', 'ELLIPSE', 'POLYGON']);

/** Default size for ghost shape previews */
const SHAPE_GHOST_SIZE = 100;

/** Default size for new sticky notes (used for ghost preview sizing) */
const STICKY_DEFAULT_SIZE = 240;

interface CanvasProps {
  onOpenContextMenu?: (type: 'node' | 'canvas', x: number, y: number) => void;
}

export function Canvas(props: CanvasProps) {
  return (
    <EndpointDragProvider>
      <CanvasInner {...props} />
    </EndpointDragProvider>
  );
}

function CanvasInner({ onOpenContextMenu }: CanvasProps) {
  const viewport = useViewport();
  const { containerRef, screenToWorld } = viewport;
  const { state: viewportState } = useViewportState();
  const selection = useSelection();
  const sg = useSceneGraph();
  const canvasId = useCanvasId();
  const pageBg = usePageBackground(canvasId);
  const { effectiveTool, setActiveTool, stickyColor, sectionFillColor, shapeColor, markerColor, highlighterColor, markerSubType, connectorLineShape, polygonSides } = useActiveTool();
  const textEditing = useTextEditing();
  const { interaction, setInteraction, selectedThreadId, setSelectedThreadId, store: commentsStore } = useComments();
  const { config: userConfig } = useUserConfig();

  // Stable callbacks for CommentPinLayer's useSyncExternalStore.
  // The subscribe function must be referentially stable, and the snapshot
  // must return the same value (by Object.is) when nothing changed.
  // A monotonic counter avoids creating a new array each call.
  const nodeStoreVersionRef = useRef(0);
  const nodeStoreSubscribe = useCallback(
    (listener: () => void) => sg.addListener(() => { nodeStoreVersionRef.current++; listener(); }),
    [sg],
  );
  const nodeStoreGetSnapshot = useCallback(
    () => nodeStoreVersionRef.current,
    [],
  );

  /** Resolve the world position of a node by ID (for comment node-attachment) */
  const getNodePosition = useCallback(
    (nodeId: string): { x: number; y: number } | undefined => {
      const node = sg.getNode(Number(nodeId));
      if (!node || !isGeometryNode(node)) return undefined;
      return getWorldPosition(sg, node);
    },
    [sg],
  );

  /** Screen-space mouse position for sticky note ghost preview */
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);

  /** Whether the hand tool is actively dragging (for cursor styling) */
  const [isPanning, setIsPanning] = useState(false);

  /** Skip the click-away text editing exit on the pointerup that follows text creation */
  const skipTextExitRef = useRef(false);

  /** World-space mouse position for connector point overlay */
  const [connectorMouseWorld, setConnectorMouseWorld] = useState<{ x: number; y: number } | null>(null);

  /** Node ID currently hovered during connector tool (for showing connector points only on hovered/selected nodes) */
  const [connectorHoverNodeId, setConnectorHoverNodeId] = useState<NodeId | null>(null);

  /** Endpoint drag context for showing connector points during endpoint drag */
  const endpointDrag = useEndpointDrag();

  /** Set of node IDs whose connector points should be visible */
  const connectorVisibleNodeIds = useMemo(() => {
    const ids = new Set<NodeId>();
    // Always show points for selected non-connector nodes
    // TEXT and SECTION nodes only show connector points when the connector tool
    // is active and hovering over them, not when merely selected in MOVE mode.
    for (const id of selection.selectedIds) {
      const node = sg.getNode(id);
      if (node && node.type !== 'CONNECTOR' && node.type !== 'TEXT' && node.type !== 'SECTION') ids.add(id);
    }
    // When connector tool active or during drag, also show hovered node's points
    if (connectorHoverNodeId) ids.add(connectorHoverNodeId);
    // During endpoint drag, show points on the hovered node
    if (endpointDrag?.state.hoverNodeId) ids.add(endpointDrag.state.hoverNodeId);
    return ids.size > 0 ? ids : null;
  }, [connectorHoverNodeId, endpointDrag?.state.hoverNodeId, selection.selectedIds, sg]);

  /** SVG overlay for live pen preview */
  const pencilOverlayRef = useRef<SVGSVGElement>(null);

  // Cancel ghost preview when the tool switches away
  useEffect(() => {
    if (effectiveTool !== 'STICKY_NOTE' && !GHOST_SHAPE_TOOLS.has(effectiveTool)) {
      setGhostPos(null);
    }
    // Clean up connector tool state (but not for MOVE or CONNECTOR tools)
    if (effectiveTool !== 'CONNECTOR' && effectiveTool !== 'MOVE') {
      setConnectorMouseWorld(null);
      setConnectorHoverNodeId(null);
    }
  }, [effectiveTool]);

  // ── Behavior system (handles all tools) ─────────────────────────
  const isSpaceHeldRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') isSpaceHeldRef.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') isSpaceHeldRef.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const behaviors = useBehaviorChain({
    effectiveTool,
    isSpaceHeld: () => isSpaceHeldRef.current,
    onPanStart: () => setIsPanning(true),
    onPanEnd: () => setIsPanning(false),
    drawColor: markerSubType === 'highlighter' ? highlighterColor : markerColor,
    drawStrokeWeight: markerSubType === 'highlighter' ? 20 : 4,
    drawOpacity: markerSubType === 'highlighter' ? 50 : 100,
    pencilOverlayRef,
    onToolCreated: () => {
      setActiveTool('MOVE');
      skipTextExitRef.current = effectiveTool === 'TEXT';
    },
    onCommentPlace: (placement) => {
      setInteraction({
        type: 'placing',
        worldX: placement.worldX,
        worldY: placement.worldY,
        ...(placement.nodeId != null ? {
          nodeId: String(placement.nodeId),
          nodeOffsetX: placement.nodeOffsetX,
          nodeOffsetY: placement.nodeOffsetY,
        } : {}),
      });
    },
    stickyColor,
    sectionFillColor,
    shapeColor,
    authorName: userConfig.name,
    connectorLineShape,
    onConnectorHoverNodeChange: setConnectorHoverNodeId,
    onConnectorMouseWorldChange: setConnectorMouseWorld,
    selectedIds: selection.selectedIds,
    connectorHoverNodeId,
    polygonSides,
  });

  const bm = useBehaviorManager({
    behaviors,
    enteredFrameId: selection.enteredFrameId,
  });

  const um = useUndoManager();
  const { undo, redo } = useUndoActions();
  useAction('undo', undo);
  useAction('redo', redo);

  // Register nudge actions
  const nudge = useNudgeActions();
  useAction('nudge.up', nudge.nudgeUp);
  useAction('nudge.down', nudge.nudgeDown);
  useAction('nudge.left', nudge.nudgeLeft);
  useAction('nudge.right', nudge.nudgeRight);
  useAction('nudge.up.big', nudge.nudgeUpBig);
  useAction('nudge.down.big', nudge.nudgeDownBig);
  useAction('nudge.left.big', nudge.nudgeLeftBig);
  useAction('nudge.right.big', nudge.nudgeRightBig);

  // Register tool shortcuts
  useAction('tool.move', useCallback(() => setActiveTool('MOVE'), [setActiveTool]));
  useAction('tool.rectangle', useCallback(() => setActiveTool('RECTANGLE'), [setActiveTool]));
  useAction('tool.ellipse', useCallback(() => setActiveTool('ELLIPSE'), [setActiveTool]));
  useAction('tool.text', useCallback(() => setActiveTool('TEXT'), [setActiveTool]));
  useAction('tool.pen', useCallback(() => setActiveTool('PEN'), [setActiveTool]));
  useAction('tool.hand', useCallback(() => setActiveTool('HAND'), [setActiveTool]));
  useAction('tool.comment', useCallback(() => setActiveTool('COMMENT'), [setActiveTool]));
  useAction('tool.line', useCallback(() => setActiveTool('LINE'), [setActiveTool]));
  useAction('tool.sticky', useCallback(() => setActiveTool('STICKY_NOTE'), [setActiveTool]));
  useAction('tool.section', useCallback(() => setActiveTool('SECTION'), [setActiveTool]));

  // Register selection actions
  useAction(
    'select-all',
    useCallback(() => {
      for (const child of sg.getNodeOrThrow(canvasId).children) {
        const node = sg.getNode(child);
        if (node) selection.add(node.id);
      }
    }, [sg, canvasId, selection]),
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
        sg.deleteNode(id);
      }
      selection.clear();
      um.commit();
    }, [sg, selection, um]),
  );

  useAction(
    'copy',
    useCallback(() => {
      if (selection.selectedIds.size === 0) return;
      copyNodes(sg, selection.selectedIds);
    }, [sg, selection]),
  );

  useAction(
    'cut',
    useCallback(() => {
      if (selection.selectedIds.size === 0) return;
      cutNodes(sg, selection.selectedIds);
      selection.clear();
      um.commit();
    }, [sg, selection, um]),
  );

  useAction(
    'paste',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const center = screenToWorld(rect.width / 2, rect.height / 2);
      const newIds = pasteNodes(sg, canvasId, selection.selectedIds, center);
      if (newIds.length > 0) {
        selection.selectMany(newIds);
      }
      um.commit();
    }, [sg, canvasId, selection, containerRef, screenToWorld, um]),
  );

  useAction(
    'duplicate',
    useCallback(() => {
      if (selection.selectedIds.size === 0) return;
      const newIds = duplicateNodes(sg, canvasId, selection.selectedIds);
      if (newIds.length > 0) {
        selection.selectMany(newIds);
      }
      um.commit();
    }, [sg, canvasId, selection, um]),
  );

  useAction(
    'zoom-to-fit',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      // Compute world-space bounding box of all nodes
      const childIds = sg.getNodeOrThrow(canvasId).children;
      if (childIds.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const id of childIds) {
        const root = sg.getNode(id);
        if (!root || !isGeometryNode(root)) continue;
        const pos = getWorldPosition(sg, root);
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + root.width);
        maxY = Math.max(maxY, pos.y + root.height);
      }

      if (!isFinite(minX)) return;

      const padding = 48;
      // Use <main> to get visible canvas area between sidebars
      const mainEl = document.querySelector('main');
      const visible = mainEl ? mainEl.getBoundingClientRect() : container.getBoundingClientRect();
      const availW = visible.width - padding * 2;
      const availH = visible.height - padding * 2;
      const contentW = maxX - minX;
      const contentH = maxY - minY;

      if (contentW <= 0 || contentH <= 0) return;

      const scale = Math.min(availW / contentW, availH / contentH, 4);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      viewport.setState({
        scale,
        origin: {
          x: visible.left + visible.width / 2 - cx * scale,
          y: visible.top + visible.height / 2 - cy * scale,
        },
      });
    }, [sg, canvasId, containerRef, viewport]),
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

    const childIds = sg.getNodeOrThrow(canvasId).children;
    if (childIds.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const id of childIds) {
      const root = sg.getNode(id);
      if (!root || !isGeometryNode(root)) continue;
      const pos = getWorldPosition(sg, root);
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
  }, [sg, canvasId, containerRef, viewport]);

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
        onOpenContextMenu?.('node', e.clientX, e.clientY);
      } else {
        selection.clear();
        onOpenContextMenu?.('canvas', e.clientX, e.clientY);
      }
    },
    [selection, onOpenContextMenu],
  );

  // ── Pointer handlers (delegated to behavior manager) ────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      selection.setHovered(null);
      // Hide ghost preview once the user starts clicking to create
      if (effectiveTool === 'STICKY_NOTE' || GHOST_SHAPE_TOOLS.has(effectiveTool)) {
        setGhostPos(null);
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      bm.onPointerDown(e);
    },
    [selection, bm, effectiveTool],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      bm.onPointerMove(e);
      // Track mouse for sticky note and shape ghost previews (UI only)
      // Only show ghost when hovering (no button pressed), not during drag-to-create
      if ((effectiveTool === 'STICKY_NOTE' || GHOST_SHAPE_TOOLS.has(effectiveTool)) && e.buttons === 0) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setGhostPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }
    },
    [bm, effectiveTool, containerRef],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      bm.onPointerUp(e);
      // Click-away exits text editing (skip on the pointerup from text creation)
      if (skipTextExitRef.current) {
        skipTextExitRef.current = false;
      } else if (textEditing.editingNodeId) {
        const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);
        if (hitId !== textEditing.editingNodeId) {
          textEditing.stopEditing();
        }
      }
    },
    [bm, textEditing, selection],
  );

  // ── Comment pin drag handlers ──────────────────────────────────────────

  const handleCommentDragStart = useCallback(
    (threadId: string) => {
      // Close any open thread/popover
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
      const hitNodeId = findNodeAtWorldPoint(sg, canvasId, worldX, worldY);
      if (hitNodeId) {
        const node = sg.getNode(hitNodeId);
        if (node && isGeometryNode(node)) {
          const nodeWorldPos = getWorldPosition(sg, node);
          commentsStore.updateAnchor(threadId, {
            worldX,
            worldY,
            nodeId: String(hitNodeId),
            nodeOffsetX: worldX - nodeWorldPos.x,
            nodeOffsetY: worldY - nodeWorldPos.y,
          });
        }
      } else {
        // Dropped on empty canvas — detach from any node
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
    [sg, canvasId, commentsStore, setInteraction],
  );

  // Cursor style based on active tool
  const cursorStyle = (() => {
    switch (effectiveTool) {
      case 'HAND': return isPanning ? CURSORS.grabbing : CURSORS.grab;
      case 'SECTION': return CURSORS.crosshair;
      case 'PEN': return markerSubType === 'highlighter' ? CURSORS.highlighter : CURSORS.marker;
      case 'TEXT':
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'LINE':
      case 'POLYGON':
      case 'STAR':
      case 'CONNECTOR': return CURSORS.crosshair;
      case 'STICKY_NOTE': return CURSORS.default;
      case 'COMMENT': return CURSORS.commentNext;
      default: return CURSORS.default;
    }
  })();

  // Pixel grid at 400%+ zoom
  const { scale, origin } = viewportState;
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
        backgroundColor: isDefaultPageBackground(pageBg)
          ? `rgb(${DEFAULT_PAGE_BG.color.r}, ${DEFAULT_PAGE_BG.color.g}, ${DEFAULT_PAGE_BG.color.b})`
          : `rgb(${pageBg.color.r}, ${pageBg.color.g}, ${pageBg.color.b})`,
        backgroundImage: dotLayers.map((l) => l.image).join(', ') || 'none',
        backgroundSize: dotLayers.map((l) => l.size).join(', ') || 'auto',
        backgroundPosition: dotLayers.map((l) => l.position).join(', ') || '0 0',
        cursor: cursorStyle,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => selection.setHovered(null)}
      onContextMenu={onContextMenu}
    >
      <CanvasLayers
        nodeLayer={
          <>
            <CanvasRenderer />
            <ConnectorPointsOverlay
              active={connectorVisibleNodeIds != null}
              connectorToolActive={effectiveTool === 'CONNECTOR' || (endpointDrag?.state.isDragging ?? false)}
              mouseWorldX={endpointDrag?.state.mouseWorld?.x ?? connectorMouseWorld?.x}
              mouseWorldY={endpointDrag?.state.mouseWorld?.y ?? connectorMouseWorld?.y}
              visibleNodeIds={connectorVisibleNodeIds}
            />
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
              nodeStoreSubscribe={nodeStoreSubscribe}
              nodeStoreGetSnapshot={nodeStoreGetSnapshot}
            />
          </>
        }
        reactOverlay={<SelectionOverlay />}
      />
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
        effectiveTool === 'POLYGON' ? (
          <PolygonGhost
            x={ghostPos.x}
            y={ghostPos.y}
            size={SHAPE_GHOST_SIZE * scale}
            sides={polygonSides}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              left: ghostPos.x - (SHAPE_GHOST_SIZE * scale) / 2,
              top: ghostPos.y - (SHAPE_GHOST_SIZE * scale) / 2,
              width: SHAPE_GHOST_SIZE * scale,
              height: SHAPE_GHOST_SIZE * scale,
              backgroundColor: 'rgba(217, 217, 217, 0.3)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: effectiveTool === 'ELLIPSE' ? '50%' : '2px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              pointerEvents: 'none',
            }}
          />
        )
      )}
    </div>
  );
}

/** SVG-based ghost preview for polygon shapes (triangle, diamond, etc.) */
function PolygonGhost({ x, y, size, sides }: { x: number; y: number; size: number; sides: number }) {
  const half = size / 2;
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    pts.push(`${half + half * Math.cos(angle)},${half + half * Math.sin(angle)}`);
  }
  return (
    <svg
      style={{
        position: 'absolute',
        left: x - half,
        top: y - half,
        width: size,
        height: size,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <polygon
        points={pts.join(' ')}
        fill="rgba(217, 217, 217, 0.3)"
        stroke="rgba(0, 0, 0, 0.1)"
        strokeWidth={1}
      />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Figma-style hit resolution.
 *
 * Walk up from the click target collecting all `data-node-id` values into a
 * chain (innermost first -> reversed to outermost first).
 *
 * - `enteredFrameId === null` -> return the outermost (root-level) node
 * - `enteredFrameId` is set  -> return the direct child of the entered frame,
 *   or the entered frame itself if the click lands directly on it.
 */
function resolveHitNode(el: HTMLElement, enteredFrameId: NodeId | null): NodeId | null {
  // Collect all node IDs from innermost to outermost
  const chain: NodeId[] = [];
  let cur: HTMLElement | null = el;
  while (cur) {
    const raw = cur.dataset?.nodeId;
    if (raw) {
      const id = Number(raw);
      if (!chain.includes(id)) {
        chain.push(id);
      }
    }
    cur = cur.parentElement;
  }

  if (chain.length === 0) return null;

  // Reverse so chain[0] is outermost (root-level)
  chain.reverse();

  if (enteredFrameId === null) {
    // Select the innermost (deepest) node so children are directly clickable
    return chain[chain.length - 1];
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
