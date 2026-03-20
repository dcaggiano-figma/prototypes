/**
 * ShapeTextOverlay — renders editable text inside a shape node.
 *
 * Used for shapes (rectangle, ellipse, polygon, star) that support
 * inline text editing in FigJam-style canvases.
 *
 * Extracted from figma-figjam canvas-renderer for cross-template reuse.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { NodeId } from '../../scene-graph/node-id'
import type { Paint } from '../../scene-graph/types'
import { useSceneGraph } from '../scene-graph/provider'
import { useTextEditing } from '../text-editing/provider'
import { CURSORS } from '../../cursors'
import { getFirstVisibleFill } from './style-helpers'

/** Props expected on the shape node for text overlay rendering. */
export interface ShapeTextOverlayNode {
  id: NodeId
  type: string
  width: number
  height: number
  fills: Paint[]
  characters?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT'
}

/** Padding config for text inside shapes (as fraction of width/height or fixed px). */
function getShapeTextPadding(
  type: string,
  width: number,
  height: number,
): { horizontal: number; vertical: number } {
  switch (type) {
    case 'ELLIPSE':
      return { horizontal: width * 0.146, vertical: height * 0.146 }
    case 'POLYGON':
      return { horizontal: width * 0.2, vertical: height * 0.25 }
    case 'STAR':
      return { horizontal: width * 0.3, vertical: height * 0.3 }
    default: // RECTANGLE
      return { horizontal: 8, vertical: 8 }
  }
}

/** Returns black or white text color for best contrast against the fill. */
function autoContrastColor(fill: Paint | undefined): string {
  if (!fill || fill.type !== 'SOLID') return 'rgb(0, 0, 0)'
  const { r, g, b } = fill.color
  // Relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'
}

export function ShapeTextOverlay({ node }: { node: ShapeTextOverlayNode }) {
  const sg = useSceneGraph()
  const { editingNodeId, stopEditing, selectAllRef } = useTextEditing()
  const isEditing = editingNodeId === node.id
  const elRef = useRef<HTMLDivElement>(null)

  const [hasInput, setHasInput] = useState(false)

  useEffect(() => {
    if (isEditing) {
      setHasInput(!!node.characters)
    } else {
      setHasInput(false)
    }
  }, [isEditing, node.characters])

  useEffect(() => {
    if (!isEditing || !elRef.current) return
    const el = elRef.current
    const onInput = () => {
      setHasInput(!!el.textContent?.trim())
    }
    el.addEventListener('input', onInput)
    return () => el.removeEventListener('input', onInput)
  }, [isEditing])

  // Auto-focus when entering edit mode
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
          range.collapse(false)
        }
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      } else {
        // Insert a <br> so the empty flex container has a line box to
        // center, placing the cursor in the vertical middle of the shape.
        el.innerHTML = '<br>'
        const range = document.createRange()
        range.setStart(el, 0)
        range.collapse(true)
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

  const fill = getFirstVisibleFill(node.fills)
  const textColor = autoContrastColor(fill)
  const padding = getShapeTextPadding(node.type, node.width, node.height)
  const hasText = !!node.characters
  const showPlaceholder = !hasInput && !hasText

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
            lineHeight: 1.4,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Add text
        </div>
      )}
      {(isEditing || hasText) && (
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
            justifyContent:
              node.textAlignHorizontal === 'LEFT'
                ? 'flex-start'
                : node.textAlignHorizontal === 'RIGHT'
                  ? 'flex-end'
                  : 'center',
            padding: `${padding.vertical}px ${padding.horizontal}px`,
            fontFamily: node.fontFamily,
            fontSize: node.fontSize,
            fontWeight: node.fontWeight,
            textAlign: ((node.textAlignHorizontal ?? 'CENTER').toLowerCase()) as
              | 'left'
              | 'center'
              | 'right',
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
      )}
    </>
  )
}
