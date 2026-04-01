import { useState, useCallback, useMemo, useImperativeHandle, useEffect, forwardRef, type SetStateAction } from 'react'
import { IconButton } from '@figma/fpl-components'
import { TreeGrid } from '@figma/fpl-components/beta'
import { Icon16Hidden, Icon16Visible } from '@figma/fpl-icons'


import { useSceneGraph } from '../canvas/scene-graph/provider'
import { useSelection } from '../canvas/selection/provider'
import type { NodeId } from '../scene-graph/node-id'
import { useLayersTree } from './use-layers-tree'
import { NodeTypeIcon } from './NodeTypeIcon'

/** Convert a TreeGrid string ID back to a NodeId (number). */
function toNodeId(id: string): NodeId {
  return Number(id) as NodeId
}

export interface LayersPanelHandle {
  /** Collapse all expandable nodes. */
  collapseAll(): void
}

export interface LayersPanelProps {
  /** Root node whose children to display (canvasId or focusedFrameId). */
  rootId: NodeId
  className?: string
  /** Called when the expanded state of any node changes. */
  onHasExpandedChange?: (hasExpanded: boolean) => void
}

export const LayersPanel = forwardRef<LayersPanelHandle, LayersPanelProps>(function LayersPanel({ rootId, className, onHasExpandedChange }, ref) {
  const sg = useSceneGraph()
  const { selectedIds, selectMany } = useSelection()

  const [collapsedIds, setCollapsedIds] = useState<Set<NodeId>>(new Set())
  const [activeRow, setActiveRow] = useState(0)
  const [activeColumn, setActiveColumn] = useState<number | null>(null)

  const { items, nodeMap } = useLayersTree(sg, rootId, collapsedIds)

  // Determine which nodes are expandable (have children)
  const expandableIds = useMemo(
    () => [...nodeMap.entries()].filter(([, d]) => d.hasChildren).map(([id]) => toNodeId(id)),
    [nodeMap],
  )

  const hasExpanded = useMemo(
    () => expandableIds.some(id => !collapsedIds.has(id)),
    [expandableIds, collapsedIds],
  )

  useEffect(() => {
    onHasExpandedChange?.(hasExpanded)
  }, [hasExpanded, onHasExpandedChange])

  useImperativeHandle(ref, () => ({
    collapseAll() {
      setCollapsedIds(new Set(expandableIds))
    },
  }), [expandableIds])

  // When selection changes, expand ancestors so selected nodes are visible
  useEffect(() => {
    if (selectedIds.size === 0) return
    setCollapsedIds(prev => {
      let next: Set<NodeId> | undefined
      for (const nodeId of selectedIds) {
        for (const ancestor of sg.getAncestors(nodeId)) {
          if (prev.has(ancestor.id)) {
            if (!next) next = new Set(prev)
            next.delete(ancestor.id)
          }
        }
      }
      return next ?? prev
    })
  }, [selectedIds, sg])

  // Bridge selection: TreeGrid string[] <-> SelectionAPI Set<NodeId>
  const selectionArray = useMemo(
    () => items.filter(id => selectedIds.has(toNodeId(id))),
    [items, selectedIds],
  )

  const handleSelectionChange = useCallback(
    (action: SetStateAction<string[]>) => {
      const next = typeof action === 'function' ? action(selectionArray) : action
      selectMany(next.map(toNodeId))
    },
    [selectionArray, selectMany],
  )

  const handleToggle = useCallback(
    (id: string, { expandedState }: { expandedState: string }) => {
      setCollapsedIds(prev => {
        const next = new Set(prev)
        if (expandedState === 'collapsed') {
          next.add(toNodeId(id))
        } else {
          next.delete(toNodeId(id))
        }
        return next
      })
    },
    [],
  )

  const { manager } = TreeGrid.useControlledTree({
    items,
    activeRow,
    setActiveRow,
    activeColumn,
    setActiveColumn,
    handleToggle,
    rowHeightEstimate: 32,
    allowSelection: {
      selection: selectionArray,
      onSelectionChange: handleSelectionChange,
    },
  })

  return (
    <div className={`flex-1 min-h-0 overflow-hidden${className ? ` ${className}` : ''}`}>
      <TreeGrid.Root manager={manager}>
        <TreeGrid.Body>
          {({ id, index, style }) => {
            const data = nodeMap.get(id)
            if (!data) return null
            const { node, level, posInSet, setSize, hasChildren } = data

            const trail = (
              <TreeGrid.Trail>
                <TreeGrid.HoverTrail>
                  <TreeGrid.Cell index={2}>
                    <IconButton
                      aria-label={node.visible ? 'Hide layer' : 'Show layer'}
                      onClick={() =>
                        sg.updateNode(node.id, { visible: !node.visible })
                      }
                    >
                      {node.visible ? <Icon16Visible /> : <Icon16Hidden />}
                    </IconButton>
                  </TreeGrid.Cell>
                </TreeGrid.HoverTrail>
                {!node.visible && (
                  <TreeGrid.FixedTrail>
                    <TreeGrid.Cell index={2}>
                      <IconButton
                        aria-label="Show layer"
                        onClick={() =>
                          sg.updateNode(node.id, { visible: true })
                        }
                      >
                        <Icon16Hidden />
                      </IconButton>
                    </TreeGrid.Cell>
                  </TreeGrid.FixedTrail>
                )}
              </TreeGrid.Trail>
            )

            return (
              <TreeGrid.Row
                key={id}
                id={id}
                index={index}
                level={level}
                posInSet={posInSet}
                setSize={setSize}
                expandedState={
                  hasChildren
                    ? collapsedIds.has(toNodeId(id))
                      ? 'collapsed'
                      : 'expanded'
                    : 'not-expandable'
                }
                isSelected={selectedIds.has(toNodeId(id))}
                isRootSelection={selectedIds.has(toNodeId(id))}
                trail={trail}
                style={{ ...style, opacity: node.visible ? undefined : 0.5 }}
              >
                <TreeGrid.LeadGraphic index={0} aria-hidden={true}>
                  <NodeTypeIcon node={node} />
                </TreeGrid.LeadGraphic>
                <TreeGrid.Cell index={1}>
                  <TreeGrid.Label
                    labelName={node.name}
                    inputOptions={{
                      onSubmit: (value: string) => {
                        const trimmed = value.trim()
                        if (trimmed && trimmed !== node.name) {
                          sg.updateNode(node.id, { name: trimmed })
                        }
                      },
                      screenReaderLabel: 'Rename layer',
                    }}
                  />
                </TreeGrid.Cell>
              </TreeGrid.Row>
            )
          }}
        </TreeGrid.Body>
      </TreeGrid.Root>
    </div>
  )
})
