import { useState, useEffect, useRef } from 'react'
import {
  Icon16Connector,
  Icon16Ellipse,
  Icon16Frame,
  Icon16Group,
  Icon16Line,
  Icon16Polygon,
  Icon16Rectangle,
  Icon16Section,
  Icon16Star,
  Icon16Sticky,
  Icon16Text,
} from '@figma/fpl-icons'

import type { SceneNode, VectorNode } from '../scene-graph/types'

/** Icon for a scene graph node type, shown as lead graphic in the layers panel. */
export function NodeTypeIcon({ node }: { node: SceneNode }) {
  switch (node.type) {
    case 'RECTANGLE':
      return <Icon16Rectangle />
    case 'ELLIPSE':
      return <Icon16Ellipse />
    case 'FRAME':
    case 'SLIDE':
    case 'GRID_SECTION':
      return <Icon16Frame />
    case 'SECTION':
      return <Icon16Section />
    case 'TEXT':
      return <Icon16Text />
    case 'LINE':
      return <Icon16Line />
    case 'GROUP':
      return <Icon16Group />
    case 'STAR':
      return <Icon16Star />
    case 'POLYGON':
      return <Icon16Polygon />
    case 'VECTOR':
      return <VectorPreviewIcon node={node as VectorNode} />
    case 'STICKY_NOTE':
      return <Icon16Sticky />
    case 'CONNECTOR':
      return <Icon16Connector />
    case 'SHAPE_WITH_TEXT':
      return <Icon16Rectangle />
    default:
      return <Icon16Frame />
  }
}

/** Tiny SVG preview of a vector node's paths. */
function VectorPreviewIcon({ node }: { node: VectorNode }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState(`0 0 ${node.width} ${node.height}`)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const bbox = svg.getBBox()
    if (bbox.width === 0 || bbox.height === 0) return
    const pad = 0.5
    setViewBox(
      `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`,
    )
  }, [node.paths])

  return (
    <div className="flex items-center justify-center size-3">
      <svg
        ref={svgRef}
        width="10"
        height="10"
        viewBox={viewBox}
        fill="none"
        stroke="var(--color-icon-tertiary)"
        strokeWidth={1}
      >
        {node.paths.map((p, i) => (
          <path key={i} d={p.d} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  )
}
