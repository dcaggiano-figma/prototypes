import { createContext, useContext, type ReactNode } from 'react';
import type { NodeType } from './types';

/** Per-node-type selection behavior flags */
export interface NodeSelectionBehavior {
  /** Show hover outline on canvas overlay (default: true) */
  showHoverOutline?: boolean
  /** Show selection outline on canvas overlay (default: true) */
  showSelectionOutline?: boolean
  /** Show resize/rotation handles when selected (default: true) */
  showResizeHandles?: boolean
}

/** Map of node type to its selection behavior overrides */
export type NodeBehaviorConfig = Partial<Record<NodeType, NodeSelectionBehavior>>

const DEFAULT_BEHAVIOR: Required<NodeSelectionBehavior> = {
  showHoverOutline: true,
  showSelectionOutline: true,
  showResizeHandles: true,
};

/** Built-in overrides — SECTION always hides standard overlays */
const BUILTIN_OVERRIDES: NodeBehaviorConfig = {
  SECTION: { showHoverOutline: false, showSelectionOutline: false, showResizeHandles: false },
};

const NodeBehaviorContext = createContext<NodeBehaviorConfig>({});

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
  );
}

/** Get the resolved selection behavior for a node type */
export function useNodeBehavior(type: NodeType): Required<NodeSelectionBehavior> {
  const config = useContext(NodeBehaviorContext);
  const builtin = BUILTIN_OVERRIDES[type];
  const custom = config[type];
  return { ...DEFAULT_BEHAVIOR, ...builtin, ...custom };
}

/** Get the full resolved config (for use in loops over multiple node types) */
export function useNodeBehaviorConfig(): (type: NodeType) => Required<NodeSelectionBehavior> {
  const config = useContext(NodeBehaviorContext);
  return (type: NodeType) => {
    const builtin = BUILTIN_OVERRIDES[type];
    const custom = config[type];
    return { ...DEFAULT_BEHAVIOR, ...builtin, ...custom };
  };
}
