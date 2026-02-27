import { useCallback, useEffect, useRef, useState } from 'react';

import { useRootNodes, useSceneGraph } from '../scene-graph/provider';
import { useTextEditing } from '../text-editing/provider';
import type {
  Color,
  EllipseNode,
  FrameNode,
  LineNode,
  Paint,
  PolygonNode,
  RectangleNode,
  SceneNode,
  SectionNode,
  ShapeWithTextNode,
  StarNode,
  StickyNoteNode,
  Stroke,
  TextNode,
  VectorNode,
} from '../types';
import { CURSORS } from '../cursors';
import { useSelection } from '../selection/provider';
import { useViewport } from '../viewport/provider';

export function CanvasRenderer() {
  const rootNodes = useRootNodes();
  const store = useSceneGraph();

  return (
    <>
      {rootNodes.map((node) => (
        <SceneNodeRenderer key={node.id} node={node} store={store} isRoot />
      ))}
    </>
  );
}

// ── Node renderers ────────────────────────────────────────────────────

function SceneNodeRenderer({
  node,
  store,
  isRoot,
}: {
  node: SceneNode
  store: ReturnType<typeof useSceneGraph>
  isRoot?: boolean
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
    case 'TEXT':
      return <TextRenderer node={node as TextNode} />;
    case 'STICKY_NOTE':
      return <StickyNoteRenderer node={node as StickyNoteNode} />;
    case 'VECTOR':
      return <VectorRenderer node={node} />;
    case 'FRAME':
      return (
        <>
          {isRoot && <FrameLabel node={node} />}
          <FrameRenderer node={node} store={store} />
        </>
      );
    case 'SECTION':
      return (
        <>
          <SectionLabel node={node as SectionNode} />
          <SectionRenderer node={node as SectionNode} store={store} />
        </>
      );
    default:
      return null;
  }
}

function RectangleRenderer({ node }: { node: RectangleNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        transform: nodeTransform(node.x, node.y, node.rotation),
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        overflow: 'hidden',
        ...strokeStyles(stroke),
      }}
    >
      <ShapeTextOverlay node={node} />
    </div>
  );
}

function TextRenderer({ node }: { node: TextNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const store = useSceneGraph();
  const { editingNodeId, stopEditing } = useTextEditing();
  const isEditing = editingNodeId === node.id;
  const elRef = useRef<HTMLDivElement>(null);

  const selection = useSelection();

  // Sync rendered DOM size back to the store for auto-resized dimensions.
  // In WIDTH_AND_HEIGHT mode both dimensions are auto; in HEIGHT mode only
  // height is auto. ResizeObserver reports dimensions in the element's own
  // coordinate space (world-space), so no viewport scale conversion needed.
  useEffect(() => {
    const el = elRef.current;
    if (!el || node.textAutoResize === 'NONE') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: pxW, height: pxH } = entry.contentRect;
      const worldW = Math.round(pxW);
      const worldH = Math.round(pxH);
      const updates: Partial<TextNode> = {};

      if (node.textAutoResize === 'WIDTH_AND_HEIGHT') {
        if (worldW !== Math.round(node.width)) updates.width = worldW;
        if (worldH !== Math.round(node.height)) updates.height = worldH;
      } else if (node.textAutoResize === 'HEIGHT') {
        if (worldH !== Math.round(node.height)) updates.height = worldH;
      }

      if (Object.keys(updates).length > 0) {
        store.updateNode(node.id, updates);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [node.id, node.textAutoResize, node.width, node.height, store]);

  // Auto-focus and place cursor when entering edit mode.
  // Deferred via rAF so the browser's pointer-event sequence (pointerdown →
  // mousedown → pointerup → mouseup → click) has fully settled before we
  // move focus — otherwise the click's implicit focus handling can immediately
  // blur the contentEditable and trigger commitAndStop.
  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const id = requestAnimationFrame(() => {
      const el = elRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      if (el.textContent) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isEditing]);

  const commitAndStop = useCallback(() => {
    const text = elRef.current?.innerText.trim() ?? '';
    if (text) {
      store.updateNode(node.id, { characters: text });
    } else {
      // Empty text → delete the node
      store.deleteNode(node.id);
      selection.clear();
    }
    stopEditing();
  }, [store, node.id, stopEditing, selection]);

  // Handle Escape key via useEffect to avoid forbidden onKeyDown DOM prop
  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const el = elRef.current;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        commitAndStop();
      }
    }
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, commitAndStop]);

  return (
    <div
      ref={elRef}
      data-node-id={node.id}
      role={isEditing ? 'textbox' : undefined}
      aria-multiline={isEditing ? true : undefined}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onBlur={isEditing ? commitAndStop : undefined}
      style={{
        position: 'absolute',
        width: node.textAutoResize === 'WIDTH_AND_HEIGHT' ? 'max-content' : node.width,
        minHeight: node.textAutoResize === 'NONE' ? node.height : 'auto',
        opacity: node.opacity,
        transform: nodeTransform(node.x, node.y, node.rotation),
        color: fill ? colorToCSS(fill.color, fill.opacity) : 'rgb(0,0,0)',
        fontFamily: node.fontFamily,
        fontSize: node.fontSize,
        fontWeight: node.fontWeight,
        textAlign: node.textAlignHorizontal.toLowerCase() as 'left' | 'center' | 'right',
        lineHeight: `${node.lineHeight}px`,
        letterSpacing: `${node.letterSpacing}px`,
        whiteSpace: node.textAutoResize === 'WIDTH_AND_HEIGHT' ? 'nowrap' : 'pre-wrap',
        wordBreak: 'break-word',
        outline: isEditing ? '1px solid var(--color-bgBrand)' : 'none',
        cursor: isEditing ? CURSORS.text : CURSORS.default,
        userSelect: isEditing ? 'text' : 'none',
      }}
    >
      {node.characters}
    </div>
  );
}

const STICKY_PADDING = 20;
const STICKY_FOOTER_HEIGHT = 40;

function StickyNoteRenderer({ node }: { node: StickyNoteNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const store = useSceneGraph();
  const { editingNodeId, stopEditing, selectAllRef } = useTextEditing();
  const isEditing = editingNodeId === node.id;
  const elRef = useRef<HTMLDivElement>(null);

  // Track whether the user has typed (for placeholder visibility)
  const [hasInput, setHasInput] = useState(false);

  // Reset input tracking when editing state changes
  useEffect(() => {
    if (isEditing) {
      setHasInput(!!node.characters);
    } else {
      setHasInput(false);
    }
  }, [isEditing, node.characters]);

  // Track input events for placeholder hiding
  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const el = elRef.current;
    const onInput = () => {
      setHasInput(!!el.textContent?.trim());
    };
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [isEditing]);

  // Auto-height: observe the text content area and grow the node height if needed
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const contentH = Math.round(entry.contentRect.height);
      const footerH = node.showAuthor ? STICKY_FOOTER_HEIGHT : 0;
      const paddingBottom = node.showAuthor ? 16 : STICKY_PADDING;
      const totalNeeded = contentH + STICKY_PADDING + paddingBottom + footerH;
      const minH = node.width; // Square minimum
      const newH = Math.max(minH, totalNeeded);
      if (newH !== Math.round(node.height)) {
        store.updateNode(node.id, { height: newH });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [node.id, node.width, node.height, node.showAuthor, store]);

  // Auto-focus when entering edit mode (selectAllRef controls selection behavior)
  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const id = requestAnimationFrame(() => {
      const el = elRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      if (el.textContent) {
        const range = document.createRange();
        range.selectNodeContents(el);
        if (!selectAllRef.current) {
          range.collapse(false); // Cursor at end
        }
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isEditing, selectAllRef]);

  const commitAndStop = useCallback(() => {
    const text = elRef.current?.innerText.trim() ?? '';
    store.updateNode(node.id, { characters: text });
    stopEditing();
  }, [store, node.id, stopEditing]);

  // Handle Escape key
  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const el = elRef.current;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        commitAndStop();
      }
    }
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, commitAndStop]);

  const footerH = node.showAuthor ? STICKY_FOOTER_HEIGHT : 0;
  const showPlaceholder = isEditing && !hasInput;

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        minHeight: node.height,
        opacity: node.opacity,
        transform: nodeTransform(node.x, node.y, node.rotation),
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: isEditing ? 'text' : 'none',
      }}
    >
      {/* Placeholder for empty editing state */}
      {showPlaceholder && (
        <div
          style={{
            position: 'absolute',
            top: STICKY_PADDING,
            left: STICKY_PADDING,
            color: 'rgba(0, 0, 0, 0.3)',
            fontFamily: node.fontFamily,
            fontSize: node.fontSize,
            fontWeight: node.fontWeight,
            lineHeight: 1.4,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Add text
        </div>
      )}
      {/* Text body */}
      <div
        ref={elRef}
        role={isEditing ? 'textbox' : undefined}
        aria-multiline={isEditing ? true : undefined}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={isEditing ? commitAndStop : undefined}
        style={{
          padding: STICKY_PADDING,
          paddingBottom: node.showAuthor ? 16 : STICKY_PADDING,
          fontFamily: node.fontFamily,
          fontSize: node.fontSize,
          fontWeight: node.fontWeight,
          lineHeight: 1.4,
          color: 'rgb(0, 0, 0)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          outline: 'none',
          minHeight: node.width - STICKY_PADDING * 2 - footerH,
          cursor: isEditing ? CURSORS.text : CURSORS.default,
        }}
      >
        {node.characters}
      </div>
      {/* Author footer */}
      {node.showAuthor && (
        <div
          style={{
            marginTop: 'auto',
            height: STICKY_FOOTER_HEIGHT,
            padding: `0 ${STICKY_PADDING}px ${STICKY_PADDING}px`,
            display: 'flex',
            alignItems: 'center',
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
          }}
        >
          {node.authorName}
        </div>
      )}
    </div>
  );
}

/** Padding config for text inside shapes (as fraction of width/height or fixed px) */
function getShapeTextPadding(type: string, width: number, height: number): { horizontal: number; vertical: number } {
  switch (type) {
    case 'ELLIPSE':
      return { horizontal: width * 0.146, vertical: height * 0.146 };
    case 'POLYGON':
      return { horizontal: width * 0.2, vertical: height * 0.25 };
    case 'STAR':
      return { horizontal: width * 0.3, vertical: height * 0.3 };
    default: // RECTANGLE
      return { horizontal: 8, vertical: 8 };
  }
}

/** Returns black or white text color for best contrast against the fill */
function autoContrastColor(fill: Paint | undefined): string {
  if (!fill || fill.type !== 'SOLID') return 'rgb(0, 0, 0)';
  const { r, g, b } = fill.color;
  // Relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
}

function ShapeTextOverlay({ node }: { node: ShapeWithTextNode }) {
  const store = useSceneGraph();
  const { editingNodeId, stopEditing, selectAllRef } = useTextEditing();
  const isEditing = editingNodeId === node.id;
  const elRef = useRef<HTMLDivElement>(null);

  const [hasInput, setHasInput] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setHasInput(!!node.characters);
    } else {
      setHasInput(false);
    }
  }, [isEditing, node.characters]);

  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const el = elRef.current;
    const onInput = () => {
      setHasInput(!!el.textContent?.trim());
    };
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [isEditing]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const id = requestAnimationFrame(() => {
      const el = elRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      if (el.textContent) {
        const range = document.createRange();
        range.selectNodeContents(el);
        if (!selectAllRef.current) {
          range.collapse(false);
        }
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isEditing, selectAllRef]);

  const commitAndStop = useCallback(() => {
    const text = elRef.current?.innerText.trim() ?? '';
    store.updateNode(node.id, { characters: text });
    stopEditing();
  }, [store, node.id, stopEditing]);

  // Handle Escape key
  useEffect(() => {
    if (!isEditing || !elRef.current) return;
    const el = elRef.current;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        commitAndStop();
      }
    }
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, commitAndStop]);

  const fill = getFirstVisibleFill(node.fills);
  const textColor = autoContrastColor(fill);
  const padding = getShapeTextPadding(node.type, node.width, node.height);
  const showPlaceholder = isEditing && !hasInput;
  const hasText = !!node.characters;

  // Don't render anything if not editing and no text
  if (!isEditing && !hasText) return null;

  return (
    <>
      {showPlaceholder && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${padding.vertical}px ${padding.horizontal}px`,
            color: textColor,
            opacity: 0.3,
            fontFamily: node.fontFamily,
            fontSize: node.fontSize,
            fontWeight: node.fontWeight,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Add text
        </div>
      )}
      <div
        ref={elRef}
        role={isEditing ? 'textbox' : undefined}
        aria-multiline={isEditing ? true : undefined}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={isEditing ? commitAndStop : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: node.textAlignHorizontal === 'LEFT' ? 'flex-start' : node.textAlignHorizontal === 'RIGHT' ? 'flex-end' : 'center',
          padding: `${padding.vertical}px ${padding.horizontal}px`,
          fontFamily: node.fontFamily,
          fontSize: node.fontSize,
          fontWeight: node.fontWeight,
          textAlign: node.textAlignHorizontal.toLowerCase() as 'left' | 'center' | 'right',
          color: textColor,
          lineHeight: 1.4,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          outline: 'none',
          cursor: isEditing ? CURSORS.text : CURSORS.default,
          userSelect: isEditing ? 'text' : 'none',
        }}
      >
        {node.characters}
      </div>
    </>
  );
}

function EllipseRenderer({ node }: { node: EllipseNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const rx = node.width / 2;
  const ry = node.height / 2;

  // For inside strokes, we need to inset the ellipse
  const strokeWeight = stroke ? stroke.weight : 0;
  const inset = stroke?.position === 'INSIDE' ? strokeWeight : 0;

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        transform: nodeTransform(node.x, node.y, node.rotation),
      }}
    >
      <svg
        style={{
          position: 'absolute',
          width: node.width,
          height: node.height,
          overflow: 'visible',
        }}
      >
        <ellipse
          cx={rx}
          cy={ry}
          rx={rx - inset / 2}
          ry={ry - inset / 2}
          fill={fill ? colorToCSS(fill.color, fill.opacity) : 'none'}
          stroke={stroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'none'}
          strokeWidth={strokeWeight}
        />
      </svg>
      <ShapeTextOverlay node={node} />
    </div>
  );
}

function FrameRenderer({
  node,
  store,
}: {
  node: SceneNode & { type: 'FRAME' }
  store: ReturnType<typeof useSceneGraph>
}) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  return (
    <div
      data-node-id={node.id}
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
        <SceneNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}

function SectionRenderer({
  node,
  store,
}: {
  node: SectionNode
  store: ReturnType<typeof useSceneGraph>
}) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const childNodes = node.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[];

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        borderRadius: node.cornerRadius,
        overflow: 'visible',
        transform: nodeTransform(node.x, node.y, node.rotation),
        backgroundColor: fill ? colorToCSS(fill.color, fill.opacity) : undefined,
        ...strokeStyles(stroke),
      }}
    >
      {childNodes.map((child) => (
        <SceneNodeRenderer key={child.id} node={child} store={store} />
      ))}
    </div>
  );
}

/** Label rendered above sections as a colored pill with section icon */
function SectionLabel({ node }: { node: SectionNode }) {
  const { state } = useViewport();
  const { isSelected } = useSelection();
  const store = useSceneGraph();
  const selected = isSelected(node.id);
  const [isEditing, setIsEditing] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);
  const fontSize = 13 / state.scale;
  const iconSize = 12 / state.scale;
  const iconPad = 3 / state.scale;
  const pillPadY = 2 / state.scale;
  const pillPadX = 4 / state.scale;
  const iconLabelGap = 4 / state.scale;
  const pillRadius = 3 / state.scale;

  const fill = getFirstVisibleFill(node.fills);
  const pillBg = fill ? colorToCSS(fill.color, Math.min(fill.opacity, 0.6)) : 'rgba(255,255,255,0.6)';
  const textColor = selected ? 'var(--color-fsTextSelectedOnLightCanvas)' : 'var(--color-fsTextOnLightCanvasSecondary)';

  const commitRename = useCallback(() => {
    if (!labelRef.current) return;
    const newName = labelRef.current.textContent?.trim() || node.name;
    store.updateNode(node.id, { name: newName });
    setIsEditing(false);
  }, [node.id, node.name, store]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    // Select all text after the element becomes contentEditable
    requestAnimationFrame(() => {
      if (!labelRef.current) return;
      labelRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(labelRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (labelRef.current) labelRef.current.textContent = node.name;
      setIsEditing(false);
    }
  }, [commitRename, node.name]);

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        transform: `translate(${node.x}px, ${node.y - fontSize - 12 / state.scale}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: iconLabelGap,
        fontSize,
        lineHeight: 1,
        color: textColor,
        whiteSpace: 'nowrap',
        cursor: CURSORS.default,
        userSelect: 'none',
      }}
    >
      {/* Icon button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pillBg,
          borderRadius: pillRadius,
          padding: iconPad,
        }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        >
          <rect x="1" y="1" width="14" height="14" rx="2" />
        </svg>
      </div>
      {/* Label container */}
      <div
        ref={labelRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onDoubleClick={handleDoubleClick}
        onBlur={isEditing ? commitRename : undefined}
        onKeyDown={isEditing ? handleKeyDown : undefined}
        style={{
          backgroundColor: pillBg,
          borderRadius: pillRadius,
          padding: `${pillPadY}px ${pillPadX}px`,
          cursor: isEditing ? 'text' : CURSORS.default,
          userSelect: isEditing ? 'text' : 'none',
          outline: 'none',
          minWidth: 8 / state.scale,
        }}
      >
        {node.name}
      </div>
    </div>
  );
}

function VectorRenderer({ node }: { node: VectorNode }) {
  const stroke = getFirstVisibleStroke(node.strokes);
  const fill = getFirstVisibleFill(node.fills);
  const hasStroke = !!stroke;
  const strokeWeight = hasStroke ? stroke.weight : 0;
  // Expand the SVG viewBox by the stroke weight so strokes aren't clipped
  const padding = hasStroke ? strokeWeight / 2 : 0;
  const svgWidth = node.width + padding * 2;
  const svgHeight = node.height + padding * 2;

  return (
    <svg
      data-node-id={node.id}
      viewBox={`${-padding} ${-padding} ${svgWidth} ${svgHeight}`}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        overflow: 'visible',
        transform: nodeTransform(node.x, node.y, node.rotation),
      }}
    >
      {node.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? (fill ? colorToCSS(fill.color, fill.opacity) : 'none')}
          stroke={hasStroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'none'}
          strokeWidth={strokeWeight}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function LineRenderer({ node }: { node: LineNode }) {
  const stroke = getFirstVisibleStroke(node.strokes);
  const strokeWeight = stroke ? stroke.weight : 1;
  // Line height is 0; the SVG has a minimum height of the stroke weight so the line is visible
  const svgHeight = Math.max(node.height, strokeWeight * 2);

  return (
    <svg
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: svgHeight,
        opacity: node.opacity,
        overflow: 'visible',
        transform: nodeTransform(node.x, node.y - svgHeight / 2, node.rotation),
        // Rotate around the start point of the line so (x,y) = visual start
        transformOrigin: '0 50%',
      }}
    >
      <line
        x1={0}
        y1={svgHeight / 2}
        x2={node.width}
        y2={svgHeight / 2}
        stroke={stroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'rgb(0,0,0)'}
        strokeWidth={strokeWeight}
      />
    </svg>
  );
}

function PolygonRenderer({ node }: { node: PolygonNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const cx = node.width / 2;
  const cy = node.height / 2;
  const rx = node.width / 2;
  const ry = node.height / 2;

  const pts: string[] = [];
  for (let i = 0; i < node.sides; i++) {
    const angle = (2 * Math.PI * i) / node.sides - Math.PI / 2;
    pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
  }

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        transform: nodeTransform(node.x, node.y, node.rotation),
      }}
    >
      <svg
        style={{
          position: 'absolute',
          width: node.width,
          height: node.height,
          overflow: 'visible',
        }}
      >
        <polygon
          points={pts.join(' ')}
          fill={fill ? colorToCSS(fill.color, fill.opacity) : 'none'}
          stroke={stroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'none'}
          strokeWidth={stroke ? svgStrokeWidth(stroke) : 0}
          paintOrder={stroke?.position === 'OUTSIDE' ? 'stroke' : undefined}
        />
      </svg>
      <ShapeTextOverlay node={node} />
    </div>
  );
}

function StarRenderer({ node }: { node: StarNode }) {
  const fill = getFirstVisibleFill(node.fills);
  const stroke = getFirstVisibleStroke(node.strokes);
  const cx = node.width / 2;
  const cy = node.height / 2;
  const outerRx = node.width / 2;
  const outerRy = node.height / 2;
  const innerRx = outerRx * node.innerRadius;
  const innerRy = outerRy * node.innerRadius;

  const pts: string[] = [];
  for (let i = 0; i < node.points * 2; i++) {
    const angle = (Math.PI * i) / node.points - Math.PI / 2;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? outerRx : innerRx;
    const ry = isOuter ? outerRy : innerRy;
    pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
  }

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        transform: nodeTransform(node.x, node.y, node.rotation),
      }}
    >
      <svg
        style={{
          position: 'absolute',
          width: node.width,
          height: node.height,
          overflow: 'visible',
        }}
      >
        <polygon
          points={pts.join(' ')}
          fill={fill ? colorToCSS(fill.color, fill.opacity) : 'none'}
          stroke={stroke ? colorToCSS(stroke.paint.color, stroke.paint.opacity) : 'none'}
          strokeWidth={stroke ? svgStrokeWidth(stroke) : 0}
          paintOrder={stroke?.position === 'OUTSIDE' ? 'stroke' : undefined}
        />
      </svg>
      <ShapeTextOverlay node={node} />
    </div>
  );
}

/** Label rendered above root-level frames, matching Figma's canvas chrome (FB-45) */
function FrameLabel({ node }: { node: FrameNode }) {
  const { state } = useViewport();
  const { isSelected } = useSelection();
  // Render at a fixed screen-size by counter-scaling the viewport zoom
  const fontSize = 11 / state.scale;

  return (
    <div
      data-node-id={node.id}
      style={{
        position: 'absolute',
        transform: `translate(${node.x}px, ${node.y - fontSize - 8 / state.scale}px)`,
        fontSize,
        lineHeight: 1,
        color: isSelected(node.id) ? 'var(--color-fsTextSelectedOnLightCanvas)' : 'var(--color-fsTextOnLightCanvasSecondary)',
        whiteSpace: 'nowrap',
        cursor: CURSORS.default,
        userSelect: 'none',
      }}
    >
      {node.name}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Build a GPU-composited transform for node positioning (avoids layout thrash) */
function nodeTransform(x: number, y: number, rotation: number): string {
  if (rotation) return `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
  return `translate(${x}px, ${y}px)`;
}

function colorToCSS(color: Color, opacity: number): string {
  if (opacity >= 1) return `rgb(${color.r}, ${color.g}, ${color.b})`;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

function getFirstVisibleFill(fills: Paint[]): Paint | undefined {
  // Fills render bottom to top, but for a single fill we just take the last visible one
  for (let i = fills.length - 1; i >= 0; i--) {
    if (fills[i].visible) return fills[i];
  }
  return undefined;
}

function getFirstVisibleStroke(strokes: Stroke[]): Stroke | undefined {
  for (const s of strokes) {
    if (s.paint.visible) return s;
  }
  return undefined;
}

/** SVG stroke width adjusted for position (OUTSIDE/INSIDE double to compensate for clipping) */
function svgStrokeWidth(stroke: Stroke): number {
  return stroke.position === 'CENTER' ? stroke.weight : stroke.weight * 2;
}

function strokeStyles(stroke: Stroke | undefined): React.CSSProperties {
  if (!stroke) return {};

  const color = colorToCSS(stroke.paint.color, stroke.paint.opacity);

  if (stroke.position === 'INSIDE') {
    return {
      boxShadow: `inset 0 0 0 ${stroke.weight}px ${color}`,
    };
  }

  if (stroke.position === 'OUTSIDE') {
    return {
      boxShadow: `0 0 0 ${stroke.weight}px ${color}`,
    };
  }

  // CENTER — half inside, half outside (matches Figma behavior)
  const half = stroke.weight / 2;
  return {
    boxShadow: `inset 0 0 0 ${half}px ${color}, 0 0 0 ${half}px ${color}`,
  };
}
