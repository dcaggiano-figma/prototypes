/**
 * Decode Figma vector network blobs into SVG path strings.
 *
 * Ported from figma/figma fullscreen/ts/scenegraph/src/vector_networks.ts
 * and vector_paths.ts. The blob format is a flat packed binary buffer of
 * Int32 and Float32 values (not kiwi-encoded).
 */

interface Vec2 {
  x: number
  y: number
}

interface VectorVertex extends Vec2 {
  styleID: number
}

interface VectorSegment {
  start: number
  end: number
  tangentStart: Vec2
  tangentEnd: Vec2
}

interface VectorRegion {
  windingRule: 'NONZERO' | 'EVENODD'
  styleID: number
  loops: number[][]
}

interface VectorNetwork {
  vertices: VectorVertex[]
  segments: VectorSegment[]
  regions: VectorRegion[]
}

export interface VectorPath {
  windingRule: 'NONZERO' | 'EVENODD' | 'NONE'
  d: string
}

// ---------------------------------------------------------------------------
// Binary decoding
// ---------------------------------------------------------------------------

/**
 * Decode a vector network from the raw blob bytes.
 *
 * Binary layout (all little-endian):
 *   vertexCount(i32) | segmentCount(i32) | regionCount(i32)
 *   per vertex:  styleID(i32), x(f32), y(f32)
 *   per segment: styleID(i32), start(i32), txStart(f32), tyStart(f32),
 *                end(i32), txEnd(f32), tyEnd(f32)
 *   per region:  (windingRule|styleID<<1)(i32), loopCount(i32),
 *                per loop: indexCount(i32), indices(i32)...
 */
export function decodeVectorNetwork(bytes: Uint8Array): VectorNetwork {
  const vertices: VectorVertex[] = []
  const segments: VectorSegment[] = []
  const regions: VectorRegion[] = []

  if (bytes.length < 12) return { vertices, segments, regions }

  const ints = new Int32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
  const floats = new Float32Array(ints.buffer, ints.byteOffset, ints.length)
  let offset = 0

  const vertexCount = ints[offset++]!
  const segmentCount = ints[offset++]!
  const regionCount = ints[offset++]!

  for (let i = 0; i < vertexCount; i++) {
    const styleID = ints[offset++]!
    const x = floats[offset++]!
    const y = floats[offset++]!
    vertices.push({ styleID, x, y })
  }

  for (let i = 0; i < segmentCount; i++) {
    // Skip style ID for segments
    offset++
    const start = ints[offset++]!
    const txStart = floats[offset++]!
    const tyStart = floats[offset++]!
    const end = ints[offset++]!
    const txEnd = floats[offset++]!
    const tyEnd = floats[offset++]!
    segments.push({
      start,
      end,
      tangentStart: { x: txStart, y: tyStart },
      tangentEnd: { x: txEnd, y: tyEnd },
    })
  }

  for (let i = 0; i < regionCount; i++) {
    const value = ints[offset++]!
    const loopCount = ints[offset++]!
    const styleID = value >> 1
    const windingRule = value & 1 ? 'NONZERO' : 'EVENODD'
    const loops: number[][] = []
    for (let j = 0; j < loopCount; j++) {
      const indexCount = ints[offset++]!
      const indices: number[] = []
      for (let k = 0; k < indexCount; k++) {
        indices.push(ints[offset++]!)
      }
      loops.push(indices)
    }
    regions.push({ windingRule, styleID, loops })
  }

  return { vertices, segments, regions }
}

// ---------------------------------------------------------------------------
// Network → SVG path conversion
// ---------------------------------------------------------------------------

function isLine(seg: VectorSegment): boolean {
  return (
    seg.tangentStart.x === 0 &&
    seg.tangentStart.y === 0 &&
    seg.tangentEnd.x === 0 &&
    seg.tangentEnd.y === 0
  )
}

function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

function vecEq(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y
}

class PathBuilder {
  private parts: (string | number)[] = []
  lastPosition: Vec2 | null = null

  moveTo(p: Vec2) {
    this.parts.push('M', p.x, p.y)
    this.lastPosition = p
  }

  lineTo(p: Vec2) {
    this.parts.push('L', p.x, p.y)
    this.lastPosition = p
  }

  curveTo(cp1: Vec2, cp2: Vec2, end: Vec2) {
    this.parts.push('C', cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y)
    this.lastPosition = end
  }

  closePath() {
    this.parts.push('Z')
    this.lastPosition = null
  }

  toPathString(): string {
    return this.parts.join(' ')
  }
}

interface Run {
  startingVertex: number
  segments: number[]
  isClosed: boolean
}

function findStartingVertex(
  segments: readonly VectorSegment[],
  loop: readonly number[],
): number {
  if (loop.length === 1) return segments[loop[0]!]!.start

  const first = segments[loop[0]!]!
  const second = segments[loop[1]!]!
  let takeStart = second.start === first.end || second.end === first.end
  const takeEnd = second.start === first.start || second.end === first.start

  if (takeStart && takeEnd && loop.length > 2) {
    const third = segments[loop[2]!]!
    takeStart = third.start === first.start || third.end === first.start
  }

  if (takeStart) return first.start
  return first.end
}

function getOrderedLoop(
  segments: readonly VectorSegment[],
  loop: readonly number[],
): { segment: VectorSegment; segmentIndex: number }[] {
  if (loop.length === 0) return []

  const result: { segment: VectorSegment; segmentIndex: number }[] = []
  let vertex = findStartingVertex(segments, loop)

  for (const segmentIndex of loop) {
    const segment = segments[segmentIndex]!
    if (segment.start === vertex) {
      result.push({ segmentIndex, segment })
      vertex = segment.end
    } else {
      result.push({
        segmentIndex,
        segment: {
          start: segment.end,
          end: segment.start,
          tangentStart: segment.tangentEnd,
          tangentEnd: segment.tangentStart,
        },
      })
      vertex = segment.start
    }
  }

  return result
}

/**
 * Convert a decoded vector network into SVG path strings.
 * Each region becomes one path, remaining segments become additional paths.
 */
export function convertNetworkToPaths(network: VectorNetwork): VectorPath[] {
  const { vertices, segments, regions } = network
  if (vertices.length === 0) return []

  const emitted = new Array<boolean>(segments.length).fill(false)
  const result: { builder: PathBuilder; windingRule: VectorPath['windingRule'] }[] = []

  // Process regions — each region is one path
  for (const region of regions) {
    const builder = new PathBuilder()
    for (const loop of region.loops) {
      let startPosition: Vec2 | null = null
      for (const { segment, segmentIndex } of getOrderedLoop(segments, loop)) {
        emitted[segmentIndex] = true
        const start = vertices[segment.start]!
        const end = vertices[segment.end]!
        if (startPosition === null) {
          builder.moveTo(start)
          startPosition = start
        }
        if (isLine(segment)) {
          builder.lineTo(end)
        } else {
          builder.curveTo(
            vecAdd(start, segment.tangentStart),
            vecAdd(end, segment.tangentEnd),
            end,
          )
        }
      }
      if (builder.lastPosition && startPosition && vecEq(builder.lastPosition, startPosition)) {
        builder.closePath()
      }
    }
    result.push({ builder, windingRule: region.windingRule })
  }

  // Process remaining segments not covered by regions
  const segmentsForVertex: number[][] = []
  for (let i = 0; i < vertices.length; i++) {
    segmentsForVertex[i] = []
  }
  for (let i = 0; i < segments.length; i++) {
    if (!emitted[i]) {
      segmentsForVertex[segments[i]!.start]!.push(i)
      segmentsForVertex[segments[i]!.end]!.push(i)
    }
  }

  const runs: Run[] = []

  // Two passes: first from vertices with degree != 2, then from degree == 2
  for (let pass = 0; pass < 2; pass++) {
    for (let startVtx = 0; startVtx < vertices.length; startVtx++) {
      if (pass === 0 && segmentsForVertex[startVtx]!.length === 2) continue

      for (const startSeg of segmentsForVertex[startVtx]!) {
        if (emitted[startSeg]) continue

        let currentVertex = startVtx
        let currentSegment = startSeg
        const run: Run = { segments: [], isClosed: false, startingVertex: currentVertex }
        runs.push(run)

        while (true) {
          if (emitted[currentSegment]) break
          emitted[currentSegment] = true

          const seg = segments[currentSegment]!
          currentVertex = seg.start === currentVertex ? seg.end : seg.start
          run.segments.push(currentSegment)

          const adj = segmentsForVertex[currentVertex]!
          if (adj.length === 2) {
            currentSegment = adj[0] === currentSegment ? adj[1]! : adj[0]!
          } else {
            break
          }
        }

        if (currentVertex === startVtx) {
          run.isClosed = true
        }
      }
    }
  }

  if (runs.length > 0) {
    const builder = new PathBuilder()
    for (const run of runs) {
      let vtx = run.startingVertex
      let start = vertices[vtx]!
      builder.moveTo(start)
      for (const segIdx of run.segments) {
        const seg = segments[segIdx]!
        vtx = seg.start === vtx ? seg.end : seg.start
        const end = vertices[vtx]!
        if (isLine(seg)) {
          builder.lineTo(end)
        } else if (vtx === seg.end) {
          builder.curveTo(
            vecAdd(start, seg.tangentStart),
            vecAdd(end, seg.tangentEnd),
            end,
          )
        } else {
          builder.curveTo(
            vecAdd(start, seg.tangentEnd),
            vecAdd(end, seg.tangentStart),
            end,
          )
        }
        start = end
      }
      if (run.isClosed) {
        builder.closePath()
      }
    }
    result.push({ builder, windingRule: 'NONE' })
  }

  return result.map(({ builder, windingRule }) => ({
    windingRule,
    d: builder.toPathString(),
  }))
}

/**
 * Decode a vector network blob and convert it to SVG path strings,
 * scaled to the given node size.
 */
export function vectorBlobToPaths(
  blob: Uint8Array,
  normalizedSize: Vec2,
  nodeSize: Vec2,
): VectorPath[] {
  const network = decodeVectorNetwork(blob)

  // Vector network coordinates are in normalized space (0..normalizedSize),
  // scale to actual node size
  const sx = normalizedSize.x > 0 ? nodeSize.x / normalizedSize.x : 1
  const sy = normalizedSize.y > 0 ? nodeSize.y / normalizedSize.y : 1

  for (const v of network.vertices) {
    v.x *= sx
    v.y *= sy
  }
  for (const s of network.segments) {
    s.tangentStart.x *= sx
    s.tangentStart.y *= sy
    s.tangentEnd.x *= sx
    s.tangentEnd.y *= sy
  }

  return convertNetworkToPaths(network)
}
