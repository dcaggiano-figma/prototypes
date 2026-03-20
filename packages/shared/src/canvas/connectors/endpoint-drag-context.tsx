import { createContext, useContext, useMemo, useState } from 'react';

import type { NodeId } from '../../scene-graph/node-id';

export interface EndpointDragState {
  isDragging: boolean
  hoverNodeId: NodeId | null
  mouseWorld: { x: number; y: number } | null
}

interface EndpointDragContextValue {
  state: EndpointDragState
  setDragging: (dragging: boolean) => void
  setHoverNodeId: (id: NodeId | null) => void
  setMouseWorld: (pos: { x: number; y: number } | null) => void
}

const EndpointDragContext = createContext<EndpointDragContextValue | null>(null);

export function EndpointDragProvider({ children }: { children: React.ReactNode }) {
  const [isDragging, setDragging] = useState(false);
  const [hoverNodeId, setHoverNodeId] = useState<NodeId | null>(null);
  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number } | null>(null);

  const value = useMemo(() => ({
    state: { isDragging, hoverNodeId, mouseWorld },
    setDragging,
    setHoverNodeId,
    setMouseWorld,
  }), [isDragging, hoverNodeId, mouseWorld]);

  return (
    <EndpointDragContext.Provider value={value}>
      {children}
    </EndpointDragContext.Provider>
  );
}

export function useEndpointDrag(): EndpointDragContextValue | null {
  return useContext(EndpointDragContext);
}
