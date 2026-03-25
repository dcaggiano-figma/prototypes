/**
 * StickyNoteRenderer — renders a sticky note node as a colored card
 * with editable text content and optional author footer.
 *
 * Extracted from figma-figjam canvas-renderer for cross-template reuse.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { NodeId } from '../../scene-graph/node-id'
import type { Paint } from '../../scene-graph/types'
import { useSceneGraph, useNode } from '../scene-graph/provider'
import { useTextEditing } from '../text-editing/provider'
import { CURSORS } from '../../cursors'
import { colorToCSS, getFirstVisibleFill, nodePosition } from './style-helpers'
import { formatFontFamily } from './font-utils'
import { useRendering } from './provider'
import { useNodeRef } from './use-node-ref'

const STICKY_PADDING = 20
const STICKY_FOOTER_HEIGHT = 40

/** Props expected on the sticky note node for rendering. */
export interface StickyNoteRenderNode {
  id: NodeId
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  fills: Paint[]
  characters?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  showAuthor: boolean
  authorName: string
}

export function StickyNoteRenderer({ node: nodeProp }: { node: StickyNoteRenderNode }) {
  // Subscribe to field changes so font/text/color updates propagate reactively
  // (useRootNodes only fires on structural changes, not field changes).
  const reactiveNode = useNode(nodeProp.id)
  const node = (reactiveNode as StickyNoteRenderNode | undefined) ?? nodeProp

  const { nodeRegistry } = useRendering()
  const outerRef = useNodeRef<HTMLDivElement>(node.id, nodeRegistry)
  const fill = getFirstVisibleFill(node.fills)
  const sg = useSceneGraph()
  const { editingNodeId, stopEditing, selectAllRef } = useTextEditing()
  const isEditing = editingNodeId === node.id
  const elRef = useRef<HTMLDivElement>(null)

  // Track whether the user has typed (for placeholder visibility)
  const [hasInput, setHasInput] = useState(false)

  // Reset input tracking when editing state changes
  useEffect(() => {
    if (isEditing) {
      setHasInput(!!node.characters)
    } else {
      setHasInput(false)
    }
  }, [isEditing, node.characters])

  // Track input events for placeholder hiding
  useEffect(() => {
    if (!isEditing || !elRef.current) return
    const el = elRef.current
    const onInput = () => {
      setHasInput(!!el.textContent?.trim())
    }
    el.addEventListener('input', onInput)
    return () => el.removeEventListener('input', onInput)
  }, [isEditing])

  // Auto-height: observe the text content area and grow the node height if needed
  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const contentH = Math.round(entry.contentRect.height)
      const footerH = node.showAuthor ? STICKY_FOOTER_HEIGHT : 0
      const paddingBottom = node.showAuthor ? 16 : STICKY_PADDING
      const totalNeeded = contentH + STICKY_PADDING + paddingBottom + footerH
      const minH = node.width // Square minimum
      const newH = Math.max(minH, totalNeeded)
      if (newH !== Math.round(node.height)) {
        sg.updateNode(node.id, { height: newH })
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [node.id, node.width, node.height, node.showAuthor, sg])

  // Auto-focus when entering edit mode (selectAllRef controls selection behavior)
  useEffect(() => {
    if (!isEditing || !elRef.current) return
    const id = requestAnimationFrame(() => {
      const el = elRef.current
      if (!el) return
      el.focus({ preventScroll: true })
      if (el.textContent) {
        const range = document.createRange()
        range.selectNodeContents(el)
        if (!selectAllRef.current) {
          range.collapse(false) // Cursor at end
        }
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    })
    return () => cancelAnimationFrame(id)
  }, [isEditing, selectAllRef])

  const commitAndStop = useCallback(() => {
    const text = elRef.current?.innerText.trim() ?? ''
    sg.updateNode(node.id, { characters: text })
    stopEditing()
  }, [sg, node.id, stopEditing])

  // Handle Escape key
  useEffect(() => {
    if (!isEditing || !elRef.current) return
    const el = elRef.current
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        commitAndStop()
      }
    }
    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, commitAndStop])

  const footerH = node.showAuthor ? STICKY_FOOTER_HEIGHT : 0
  const showPlaceholder = !hasInput && !node.characters

  return (
    <div
      ref={outerRef}
      data-node-id={node.id}
      style={{
        ...nodePosition(node.x, node.y, node.rotation),
        width: node.width,
        minHeight: node.height,
        opacity: node.opacity,
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
            fontFamily: formatFontFamily(node.fontFamily ?? 'Inter'),
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
          fontFamily: formatFontFamily(node.fontFamily ?? 'Inter'),
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
  )
}
