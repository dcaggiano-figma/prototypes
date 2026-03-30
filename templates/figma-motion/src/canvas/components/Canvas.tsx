import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addListener } from '@figma/fpl-components';

import { useAction } from '../../actions/provider';
import type { NodeId } from '@prototype/shared/canvas';
import {
  usePageBackground,
  isDefaultPageBackground,
  useSceneGraph,
  useCanvasId,
  useSelection,
  useTextEditing,
  useViewport,
  useViewportState,
  useUndoActions,
  useNudgeActions,
  useReorderActions,
  useUndoManager,
  useBehaviorManager,
  getWorldPosition,
  isGeometryNode,
  findNodeAtWorldPoint,
  CanvasLayers,
} from '@prototype/shared/canvas';
import { CommentPinLayer, useComments } from '@prototype/shared';
import { SelectionOverlay } from '../selection/overlay';
import { usePlaybackOptional } from '../../contexts/PlaybackContext';
import { useAnimationStoreOptional } from '../../contexts/AnimationStoreContext';
import { useActiveTool } from '../tools/provider';
import { useBehaviorChain } from '../behaviors';
import { CURSORS } from '../cursors';
import { CanvasRenderer } from './canvas-renderer';
import { copyNodes, cutNodes, pasteNodes, pasteExternalNodes, duplicateNodes, hasFigmaClipboardData, decodeFigmaClipboard, hasRecentInternalCopy, clearInternalCopyFlag } from '@prototype/shared/canvas';

interface CanvasProps {
  onOpenContextMenu?: (type: 'node' | 'canvas', x: number, y: number) => void;
}

export function Canvas(props: CanvasProps) {
  return (
    <CanvasInner {...props} />
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
  const { effectiveTool, setActiveTool, drawColor, drawStrokeWeight, drawOpacity, stickyColor, shapeColor, connectorLineShape } = useActiveTool();
  const textEditing = useTextEditing();
  const { interaction, setInteraction, selectedThreadId, setSelectedThreadId, store: commentsStore } = useComments();
  const playback = usePlaybackOptional();
  const animStore = useAnimationStoreOptional();

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

  /** Whether the hand tool is actively dragging (for cursor styling) */
  const [isPanning, setIsPanning] = useState(false);

  /** Skip the click-away text editing exit on the pointerup that follows text creation */
  const skipTextExitRef = useRef(false);

  /** SVG overlay for pencil live preview (in world-space) */
  const pencilOverlayRef = useRef<SVGSVGElement>(null);

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
    drawColor,
    drawStrokeWeight,
    drawOpacity,
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
        // In animate mode, pin the comment to the current playhead time
        ...(playback ? { timestampMs: playback.currentMs } : {}),
      });
    },
    stickyColor,
    shapeColor,
    connectorLineShape,
    onConnectorHoverNodeChange: () => {},
    onConnectorMouseWorldChange: () => {},
    selectedIds: selection.selectedIds,
    connectorHoverNodeId: null,
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

  // Register layer order actions
  const reorder = useReorderActions();
  useAction('bring-to-front', reorder.bringToFront);
  useAction('send-to-back', reorder.sendToBack);

  // Register selection actions
  useAction(
    'select-all',
    useCallback(() => {
      for (const id of sg.getNodeOrThrow(canvasId).children) {
        selection.add(id);
      }
    }, [sg, selection, canvasId]),
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

  // Handle all paste via the native event — Figma clipboard or internal
  useEffect(
    () => addListener(document, 'paste', (e: ClipboardEvent) => {
      // Don't intercept paste for text inputs — let the browser handle natively
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const center = screenToWorld(rect.width / 2, rect.height / 2);

      const html = e.clipboardData?.getData('text/html');
      if (html && hasFigmaClipboardData(html) && !hasRecentInternalCopy()) {
        e.preventDefault();
        clearInternalCopyFlag();
        decodeFigmaClipboard(html).then((result) => {
          if (!result) return;
          const newIds = pasteExternalNodes(
            sg,
            canvasId,
            result.nodes,
            selection.selectedIds,
            center,
          );
          if (newIds.length > 0) {
            selection.selectMany(newIds);
          }
          um.commit();
        });
        return;
      }

      // Internal clipboard paste
      const newIds = pasteNodes(sg, canvasId, selection.selectedIds, center);
      if (newIds.length > 0) {
        selection.selectMany(newIds);
      }
      um.commit();
    }),
    [sg, canvasId, selection, containerRef, screenToWorld, um],
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
    }, [sg, selection, um, canvasId]),
  );

  useAction(
    'zoom-to-fit',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      // Compute world-space bounding box of all nodes
      const roots = sg.getNodeOrThrow(canvasId).children.map((id) => sg.getNode(id)).filter((n): n is NonNullable<typeof n> => n != null);
      if (roots.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const root of roots) {
        if (!isGeometryNode(root)) continue;
        const pos = getWorldPosition(sg, root);
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + root.width);
        maxY = Math.max(maxY, pos.y + root.height);
      }

      if (!isFinite(minX)) return;

      const padding = 48;

      // Use the <main> element to get the visible canvas area between sidebars.
      // The canvas container is fixed inset-0 (full window), so its rect doesn't
      // account for sidebar overlap.
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
    }, [sg, containerRef, viewport, canvasId]),
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

  // Center content before first paint (useLayoutEffect fires before browser paints).
  const didCenter = useRef(false);
  useLayoutEffect(() => {
    if (didCenter.current) return;
    const container = containerRef.current;
    if (!container) return;

    const roots = sg.getNodeOrThrow(canvasId).children.map((id) => sg.getNode(id)).filter((n): n is NonNullable<typeof n> => n != null);
    if (roots.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const root of roots) {
      if (!isGeometryNode(root)) continue;
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
  }, [sg, containerRef, canvasId, viewport]);

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
      // Only handle left-click (button 0) and middle-click (button 1)
      if (e.button !== 0 && e.button !== 1) return;

      selection.setHovered(null);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      bm.onPointerDown(e);
    },
    [selection, bm],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      bm.onPointerMove(e);
    },
    [bm],
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
    [sg, commentsStore, setInteraction, canvasId],
  );

  // Cursor style based on active tool
  const cursorStyle = (() => {
    switch (effectiveTool) {
      case 'HAND': return isPanning ? CURSORS.grabbing : CURSORS.grab;
      case 'FRAME': return CURSORS.crosshair;
      case 'PEN': return CURSORS.pen;
      case 'PENCIL': return CURSORS.pencil;
      case 'SECTION': return CURSORS.crosshair;
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

  // ── Drag-and-drop video/audio files onto canvas ──────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((f) => f.type.startsWith('video/'));
    const audioFile = !videoFile ? files.find((f) => f.type.startsWith('audio/')) : undefined;

    const rect = containerRef.current?.getBoundingClientRect();
    const localX = rect ? e.clientX - rect.left : e.clientX;
    const localY = rect ? e.clientY - rect.top : e.clientY;

    if (videoFile) {
      const src = URL.createObjectURL(videoFile);
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.src = src;
      probe.onloadedmetadata = () => {
        const world = screenToWorld(localX, localY);
        const vw = probe.videoWidth || 320;
        const vh = probe.videoHeight || 240;
        const maxDim = 400;
        const s = Math.min(maxDim / vw, maxDim / vh, 1);
        const w = Math.round(vw * s);
        const h = Math.round(vh * s);
        const durationMs = Math.round(probe.duration * 1000) || 5000;

        const node = sg.createNode('VIDEO', canvasId, {
          x: world.x - w / 2, y: world.y - h / 2,
          width: w, height: h,
          src, videoDurationMs: durationMs, hasAudio: false,
          name: videoFile.name.replace(/\.[^.]+$/, ''),
          fills: [],
        } as Record<string, unknown>);
        selection.select(node.id);
        animStore?.addAnimation(String(node.id), 'video', durationMs, durationMs);

        videoFile.arrayBuffer().then((buf) => {
          const ctx = new AudioContext();
          return ctx.decodeAudioData(buf).then((ab) => {
            if (ab.numberOfChannels > 0 && ab.length > 0) {
              sg.updateNode(node.id, { hasAudio: true } as Record<string, unknown>);
            }
            void ctx.close();
          }).catch(() => void ctx.close());
        }).catch(() => {});
      };
    } else if (audioFile) {
      const src = URL.createObjectURL(audioFile);
      const audioCtx = new AudioContext();
      fetch(src)
        .then((r) => r.arrayBuffer())
        .then((buf) => audioCtx.decodeAudioData(buf))
        .then((audioBuffer) => {
          const world = screenToWorld(localX, localY);
          const durationMs = Math.round(audioBuffer.duration * 1000) || 5000;

          const node = sg.createNode('AUDIO', canvasId, {
            x: world.x - 150, y: world.y - 30,
            width: 300, height: 60,
            src, audioDurationMs: durationMs,
            name: audioFile.name.replace(/\.[^.]+$/, ''),
            fills: [],
          } as Record<string, unknown>);
          selection.select(node.id);
          animStore?.addAnimation(String(node.id), 'audio', durationMs, durationMs);
          void audioCtx.close();
        })
        .catch(() => {});
    }
  }, [containerRef, screenToWorld, sg, selection, animStore, canvasId]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden"
      data-tool={effectiveTool}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        backgroundColor: pageBg.visible
          ? (isDefaultPageBackground(pageBg) ? 'var(--color-fsCanvasDefaultFill)' : `rgb(${pageBg.color.r}, ${pageBg.color.g}, ${pageBg.color.b})`)
          : undefined,
        backgroundImage: pageBg.visible
          ? undefined
          : 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%)',
        backgroundSize: pageBg.visible ? undefined : '16px 16px',
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
            {/* ConnectorPointsOverlay intentionally omitted — design template has no connectors */}
            <svg
              ref={pencilOverlayRef}
              className="absolute top-0 left-0 overflow-visible pointer-events-none"
            />
            <CommentPinLayer
              currentMs={playback?.isPlaying || (playback?.currentMs ?? 0) > 0 ? playback?.currentMs : undefined}
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

