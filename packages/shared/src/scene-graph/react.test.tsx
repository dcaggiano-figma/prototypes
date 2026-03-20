import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { SceneGraph } from './scene-graph'
import {
  SceneGraphProvider,
  useCanvases,
  useChildren,
  useNode,
  useNodeCount,
  useNodeOrThrow,
  useSceneGraph,
} from './react'

function createWrapper(sg: SceneGraph) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SceneGraphProvider sceneGraph={sg}>{children}</SceneGraphProvider>
    )
  }
}

describe('useSceneGraph', () => {
  it('returns the scene graph instance', () => {
    const sg = new SceneGraph()
    const { result } = renderHook(() => useSceneGraph(), {
      wrapper: createWrapper(sg),
    })
    expect(result.current).toBe(sg)
  })

  it('throws outside provider', () => {
    expect(() => {
      renderHook(() => useSceneGraph())
    }).toThrow('SceneGraphProvider')
  })
})

describe('useNode', () => {
  it('returns a node by ID', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page 1')
    const rect = sg.createNode('RECTANGLE', canvas.id)

    const { result } = renderHook(() => useNode(rect.id), {
      wrapper: createWrapper(sg),
    })
    expect(result.current?.id).toBe(rect.id)
    expect(result.current?.type).toBe('RECTANGLE')
  })

  it('returns undefined for non-existent node', () => {
    const sg = new SceneGraph()
    const { result } = renderHook(() => useNode(9999), {
      wrapper: createWrapper(sg),
    })
    expect(result.current).toBeUndefined()
  })

  it('updates when the node changes', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page 1')
    const rect = sg.createNode('RECTANGLE', canvas.id, { name: 'Rect' })

    const { result } = renderHook(() => useNode(rect.id), {
      wrapper: createWrapper(sg),
    })
    expect(result.current?.name).toBe('Rect')

    act(() => {
      sg.setNodeField(rect.id, 'name', 'Renamed')
    })
    expect(result.current?.name).toBe('Renamed')
  })

  it('does not update when a different node changes', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page 1')
    const rect = sg.createNode('RECTANGLE', canvas.id, { name: 'Rect' })
    const other = sg.createNode('LINE', canvas.id, { name: 'Line' })

    let renderCount = 0
    const { result } = renderHook(
      () => {
        renderCount++
        return useNode(rect.id)
      },
      { wrapper: createWrapper(sg) },
    )

    const initialCount = renderCount
    expect(result.current?.name).toBe('Rect')

    act(() => {
      sg.setNodeField(other.id, 'name', 'Changed Line')
    })

    // Should not have re-rendered for the other node's change
    expect(renderCount).toBe(initialCount)
    expect(result.current?.name).toBe('Rect')
  })
})

describe('useNodeOrThrow', () => {
  it('returns a node by ID', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page 1')
    const rect = sg.createNode('RECTANGLE', canvas.id)

    const { result } = renderHook(() => useNodeOrThrow(rect.id), {
      wrapper: createWrapper(sg),
    })
    expect(result.current.id).toBe(rect.id)
  })

  it('throws for non-existent node', () => {
    const sg = new SceneGraph()
    expect(() => {
      renderHook(() => useNodeOrThrow(9999), {
        wrapper: createWrapper(sg),
      })
    }).toThrow('not found')
  })
})

describe('useChildren', () => {
  it('returns children of a parent', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page 1')
    const a = sg.createNode('LINE', canvas.id)
    const b = sg.createNode('LINE', canvas.id)

    const { result } = renderHook(() => useChildren(canvas.id), {
      wrapper: createWrapper(sg),
    })
    expect(result.current).toEqual([a.id, b.id])
  })

  it('updates when a child is added', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page 1')

    const { result } = renderHook(() => useChildren(canvas.id), {
      wrapper: createWrapper(sg),
    })
    expect(result.current).toEqual([])

    let newNodeId: number
    act(() => {
      const node = sg.createNode('RECTANGLE', canvas.id)
      newNodeId = node.id
    })
    expect(result.current).toEqual([newNodeId!])
  })

  it('updates when a child is deleted', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page 1')
    const rect = sg.createNode('RECTANGLE', canvas.id)

    const { result } = renderHook(() => useChildren(canvas.id), {
      wrapper: createWrapper(sg),
    })
    expect(result.current).toEqual([rect.id])

    act(() => {
      sg.deleteNode(rect.id)
    })
    expect(result.current).toEqual([])
  })

  it('updates when a child is reparented in', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page 1')
    const frame1 = sg.createNode('FRAME', canvas.id)
    const frame2 = sg.createNode('FRAME', canvas.id)
    const rect = sg.createNode('RECTANGLE', frame1.id)

    const { result } = renderHook(() => useChildren(frame2.id), {
      wrapper: createWrapper(sg),
    })
    expect(result.current).toEqual([])

    act(() => {
      sg.reparentNode(rect.id, frame2.id, 0)
    })
    expect(result.current).toEqual([rect.id])
  })
})

describe('useCanvases', () => {
  it('returns all canvases', () => {
    const sg = new SceneGraph()
    const c1 = sg.createCanvas('Page 1')
    const c2 = sg.createCanvas('Page 2')

    const { result } = renderHook(() => useCanvases(), {
      wrapper: createWrapper(sg),
    })
    expect(result.current).toHaveLength(2)
    expect(result.current.map((c) => c.id)).toEqual([c1.id, c2.id])
  })

  it('updates when a canvas is added', () => {
    const sg = new SceneGraph()
    sg.createCanvas('Page 1')

    const { result } = renderHook(() => useCanvases(), {
      wrapper: createWrapper(sg),
    })
    expect(result.current).toHaveLength(1)

    act(() => {
      sg.createCanvas('Page 2')
    })
    expect(result.current).toHaveLength(2)
  })
})

describe('useNodeCount', () => {
  it('returns the node count', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page 1')

    const { result } = renderHook(() => useNodeCount(), {
      wrapper: createWrapper(sg),
    })
    // Document + Canvas = 2
    expect(result.current).toBe(2)

    act(() => {
      sg.createNode('RECTANGLE', canvas.id)
    })
    expect(result.current).toBe(3)
  })
})
