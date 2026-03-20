import { createContext, useContext, type ReactNode } from 'react'
import type { NodeType } from '../scene-graph/types'

export interface NodeSelectionBehavior {
  showHoverOutline?: boolean
  showSelectionOutline?: boolean
  showResizeHandles?: boolean
}

export type NodeBehaviorConfig = Partial<Record<NodeType, NodeSelectionBehavior>>

const DEFAULT_BEHAVIOR: Required<NodeSelectionBehavior> = {
  showHoverOutline: true,
  showSelectionOutline: true,
  showResizeHandles: true,
}

const BUILTIN_OVERRIDES: NodeBehaviorConfig = {
  SECTION: { showHoverOutline: false, showSelectionOutline: false, showResizeHandles: false },
}

const NodeBehaviorContext = createContext<NodeBehaviorConfig>({})

export function NodeBehaviorProvider({
  config,
  children,
}: {
  config: NodeBehaviorConfig
  children: ReactNode
}) {
  return (
    <NodeBehaviorContext.Provider value={config}>
      {children}
    </NodeBehaviorContext.Provider>
  )
}

export function useNodeBehavior(type: NodeType): Required<NodeSelectionBehavior> {
  const config = useContext(NodeBehaviorContext)
  const builtin = BUILTIN_OVERRIDES[type]
  const custom = config[type]
  return { ...DEFAULT_BEHAVIOR, ...builtin, ...custom }
}

export function useNodeBehaviorConfig(): (type: NodeType) => Required<NodeSelectionBehavior> {
  const config = useContext(NodeBehaviorContext)
  return (type: NodeType) => {
    const builtin = BUILTIN_OVERRIDES[type]
    const custom = config[type]
    return { ...DEFAULT_BEHAVIOR, ...builtin, ...custom }
  }
}
