import { ByteBuffer, compileSchemaJS, decodeBinarySchema } from 'kiwi-schema'

import type { StrokeAlign } from '../../scene-graph/types'
import { createPaint } from '../../scene-graph/types'
import type { ExternalNode } from './clipboard'
import { vectorBlobToPaths } from './vector-network'

const MAGIC_START = '<!--(figma)'
const MAGIC_END = '(/figma)-->'
const ESCAPED_MAGIC_START = '&lt;!--(figma)'
const ESCAPED_MAGIC_END = '(/figma)--&gt;'

const META_MAGIC_START = '<!--(figmeta)'
const META_MAGIC_END = '(/figmeta)-->'
const ESCAPED_META_MAGIC_START = '&lt;!--(figmeta)'
const ESCAPED_META_MAGIC_END = '(/figmeta)--&gt;'

const FIG_KIWI_HEADER = 'fig-kiwi'
const HEADER_SIZE = 8
const UINT32_SIZE = 4

interface FigMeta {
  fileKey: string
  pasteID: number
  dataType: string
}

interface FigmaNodeChange {
  guid: { sessionID: number; localID: number }
  phase: string
  parentIndex?: {
    guid: { sessionID: number; localID: number }
    position: string
  }
  type: string
  name: string
  visible: boolean
  opacity: number
  size?: { x: number; y: number }
  transform?: {
    m00: number
    m01: number
    m02: number
    m10: number
    m11: number
    m12: number
  }
  cornerRadius?: number
  rectangleCornerRadii?: number[]
  fillPaints?: FigmaPaint[]
  strokePaints?: FigmaPaint[]
  strokeWeight?: number
  strokeAlign?: string
  characters?: string
  textData?: { characters: string }
  fontSize?: number
  fontName?: { family: string; style: string }
  textAlignHorizontal?: string
  textAlignVertical?: string
  textAutoResize?: string
  lineHeight?: { value: number; units: string }
  letterSpacing?: { value: number; units: string }
  arcData?: { startingAngle: number; endingAngle: number; innerRadius: number }
  vectorData?: {
    vectorNetworkBlob: number
    normalizedSize: { x: number; y: number }
    styleOverrideTable?: unknown[]
  }
  starInnerScale?: number
  count?: number
  proportionsConstrained?: boolean
  symbolData?: {
    symbolID: { sessionID: number; localID: number }
    symbolOverrides?: unknown[]
  }
  clipsContent?: boolean
  stackMode?: string
  itemSpacing?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
}

interface FigmaPaint {
  type: string
  color?: { r: number; g: number; b: number; a: number }
  opacity?: number
  visible?: boolean
  blendMode?: string
}

interface FigmaBlob {
  bytes: Uint8Array
}

interface FigmaMessage {
  type: string
  nodeChanges: FigmaNodeChange[]
  blobs?: FigmaBlob[]
  pasteID?: number
  pasteFileKey?: string
}

export interface FigmaClipboardData {
  meta: FigMeta
  message: FigmaMessage
  nodes: ExternalNode[]
}

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/** Try both normal and HTML-escaped marker variants */
function extractBetween(
  html: string,
  start: string,
  end: string,
  escapedStart: string,
  escapedEnd: string,
): string | null {
  let si = html.indexOf(start)
  let ei = html.indexOf(end)
  if (si >= 0 && ei > si) return html.slice(si + start.length, ei)

  si = html.indexOf(escapedStart)
  ei = html.indexOf(escapedEnd)
  if (si >= 0 && ei > si) return html.slice(si + escapedStart.length, ei)

  return null
}

async function rawInflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()

  // TS thinks Uint8Array.buffer could be SharedArrayBuffer, but it never is here
  const writePromise = writer.write(data as unknown as BufferSource).then(() => writer.close())

  const chunks: Uint8Array[] = []
  let totalLength = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    totalLength += value.length
  }
  await writePromise

  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

/**
 * Parse the fig-kiwi binary container format:
 * header(8) | version(4) | schemaSize(4) | schema(...) | messageSize(4) | message(...)
 * Schema and message are raw-deflate compressed.
 */
async function parseFigKiwi(
  data: Uint8Array,
): Promise<{ schema: Uint8Array; message: Uint8Array }> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

  // Validate header
  const header = new TextDecoder().decode(data.subarray(0, HEADER_SIZE))
  if (header !== FIG_KIWI_HEADER) {
    throw new Error(`Invalid fig-kiwi header: ${header}`)
  }

  let offset = HEADER_SIZE

  // Skip file version (uint32 LE)
  offset += UINT32_SIZE

  // Read compressed schema
  const schemaSize = view.getUint32(offset, true)
  offset += UINT32_SIZE
  const compressedSchema = data.subarray(offset, offset + schemaSize)
  offset += schemaSize

  // Read compressed message
  const messageSize = view.getUint32(offset, true)
  offset += UINT32_SIZE
  const compressedMessage = data.subarray(offset, offset + messageSize)

  const [schema, message] = await Promise.all([
    rawInflate(compressedSchema),
    rawInflate(compressedMessage),
  ])

  return { schema, message }
}

/**
 * Dynamically compile a kiwi decoder from the binary schema embedded in
 * the paste payload, then use it to decode the message.
 */
function decodeKiwiMessage(
  schemaBytes: Uint8Array,
  messageBytes: Uint8Array,
): FigmaMessage {
  const textSchema = decodeBinarySchema(schemaBytes)
  const jsCode = compileSchemaJS(textSchema)

  // The generated code expects `exports` and `require("kiwi-schema")`
  // We provide ByteBuffer directly to avoid runtime require()
  const exports: Record<string, unknown> = { ByteBuffer }
  const fn = new Function('exports', 'require', jsCode)
  fn(exports, (mod: string) => {
    if (mod === 'kiwi-schema') return { ByteBuffer }
    throw new Error(`Unexpected require: ${mod}`)
  })

  // Generated functions use `this.ByteBuffer`, so call with exports as `this`
  const decodeMessage = exports['decodeMessage'] as (
    bb: ByteBuffer,
  ) => FigmaMessage
  return decodeMessage.call(exports, new ByteBuffer(messageBytes))
}

function mapNodeType(figmaType: string): string | null {
  switch (figmaType) {
    case 'FRAME':
    case 'COMPONENT':
    case 'COMPONENT_SET':
    case 'INSTANCE':
    case 'SYMBOL':
    case 'VARIANT':
      return 'FRAME'
    case 'SECTION':
    case 'SECTION_OVERLAY':
      return 'SECTION'
    case 'RECTANGLE':
    case 'ROUNDED_RECTANGLE':
      return 'RECTANGLE'
    case 'ELLIPSE':
      return 'ELLIPSE'
    case 'TEXT':
      return 'TEXT'
    case 'LINE':
      return 'LINE'
    case 'VECTOR':
      return 'VECTOR'
    case 'BOOLEAN_OPERATION':
      return 'FRAME'
    case 'REGULAR_POLYGON':
      return 'POLYGON'
    case 'STAR':
      return 'STAR'
    case 'GROUP':
      return 'GROUP'
    default:
      return null
  }
}

/** Figma uses 0-1 floats, we use 0-255 integers */
function mapColor(c: { r: number; g: number; b: number; a: number }) {
  return {
    r: Math.round(c.r * 255),
    g: Math.round(c.g * 255),
    b: Math.round(c.b * 255),
  }
}

function mapFills(paints?: FigmaPaint[]) {
  if (!paints) return []
  return paints
    .filter((p) => p.type === 'SOLID' && p.visible !== false && p.color)
    .map((p) => createPaint({
      type: 'SOLID' as const,
      color: mapColor(p.color!),
      opacity: p.opacity ?? 1,
      visible: true,
    }))
}

function mapStrokes(paints?: FigmaPaint[]) {
  if (!paints) return []
  return paints
    .filter((p) => p.type === 'SOLID' && p.visible !== false && p.color)
    .map((p) => createPaint({
      type: 'SOLID' as const,
      color: mapColor(p.color!),
      opacity: p.opacity ?? 1,
      visible: true,
    }))
}

function mapStrokeAlign(align?: string): StrokeAlign {
  return align === 'CENTER' ? 'CENTER' : align === 'OUTSIDE' ? 'OUTSIDE' : 'INSIDE'
}

function guidKey(guid: { sessionID: number; localID: number }) {
  return `${guid.sessionID}:${guid.localID}`
}

function extractVectorPaths(
  c: FigmaNodeChange,
  blobs?: FigmaBlob[],
): { d: string; fill?: string }[] {
  if (!c.vectorData || !blobs) return []

  const blobIndex = c.vectorData.vectorNetworkBlob
  const blob = blobs[blobIndex]
  if (!blob?.bytes) return []

  const nodeSize = c.size ?? { x: 100, y: 100 }
  const normalizedSize = c.vectorData.normalizedSize ?? nodeSize

  return vectorBlobToPaths(blob.bytes, normalizedSize, nodeSize).map((p) => ({
    d: p.d,
  }))
}

function convertToExternalNodes(message: FigmaMessage): ExternalNode[] {
  const changes = message.nodeChanges
  if (!changes) return []

  const SKIP_TYPES = new Set([
    'DOCUMENT', 'CANVAS', 'VARIABLE_SET', 'VARIABLE',
  ])

  // Find all canvas GUIDs, and identify the internal-only canvas which
  // holds backing component definitions — we skip its entire subtree.
  const canvasGuids = new Set<string>()
  const internalCanvasGuids = new Set<string>()
  for (const c of changes) {
    if (c.type !== 'CANVAS') continue
    const key = guidKey(c.guid)
    canvasGuids.add(key)
    if (c.name === 'Internal Only Canvas') internalCanvasGuids.add(key)
  }

  // Collect GUIDs of all nodes descended from the internal-only canvas.
  // Iterate until stable since clipboard order isn't guaranteed.
  const internalGuids = new Set<string>(internalCanvasGuids)
  let grew = true
  while (grew) {
    grew = false
    for (const c of changes) {
      const key = guidKey(c.guid)
      if (internalGuids.has(key)) continue
      const pg = c.parentIndex ? guidKey(c.parentIndex.guid) : null
      if (pg && internalGuids.has(pg)) {
        internalGuids.add(key)
        grew = true
      }
    }
  }

  // Inline backing component children into INSTANCE nodes.
  // Instances are references to SYMBOLs — clone the symbol's subtree
  // and reparent under the instance since we don't support components yet.
  const childrenByParent = new Map<string, FigmaNodeChange[]>()
  for (const c of changes) {
    const pg = c.parentIndex ? guidKey(c.parentIndex.guid) : null
    if (!pg) continue
    const list = childrenByParent.get(pg)
    if (list) list.push(c)
    else childrenByParent.set(pg, [c])
  }

  let nextInlinedId = 1
  const inlined: FigmaNodeChange[] = []
  for (const c of changes) {
    if (c.type !== 'INSTANCE' || !c.symbolData) continue
    const symbolKey = guidKey(c.symbolData.symbolID)

    // Collect all descendants of the symbol (BFS)
    const descendants: FigmaNodeChange[] = []
    const queue = [symbolKey]
    while (queue.length > 0) {
      const parentKey = queue.shift()!
      for (const child of childrenByParent.get(parentKey) ?? []) {
        descendants.push(child)
        queue.push(guidKey(child.guid))
      }
    }

    // Build a GUID remap: symbol → instance, each descendant → fresh GUID
    const guidRemap = new Map<string, { sessionID: number; localID: number }>()
    guidRemap.set(symbolKey, c.guid)
    for (const d of descendants) {
      guidRemap.set(guidKey(d.guid), { sessionID: 0, localID: nextInlinedId++ })
    }

    for (const d of descendants) {
      const pg = d.parentIndex ? guidKey(d.parentIndex.guid) : null
      inlined.push({
        ...d,
        guid: guidRemap.get(guidKey(d.guid))!,
        parentIndex: {
          guid: guidRemap.get(pg!)!,
          position: d.parentIndex?.position ?? '',
        },
      })
    }
  }

  const shapeChanges = [...changes, ...inlined].filter(
    (c) => !SKIP_TYPES.has(c.type) && !internalGuids.has(guidKey(c.guid)),
  )

  // Topological sort: parents must come before children.
  // Figma doesn't guarantee this order in the clipboard.
  const shapeGuidSet = new Set(shapeChanges.map((c) => guidKey(c.guid)))
  const sorted: FigmaNodeChange[] = []
  const visited = new Set<string>()
  const byGuid = new Map<string, FigmaNodeChange>()
  for (const c of shapeChanges) byGuid.set(guidKey(c.guid), c)

  function visit(c: FigmaNodeChange) {
    const key = guidKey(c.guid)
    if (visited.has(key)) return
    visited.add(key)
    // Visit parent first if it's a shape node
    const pg = c.parentIndex ? guidKey(c.parentIndex.guid) : null
    if (pg && shapeGuidSet.has(pg)) {
      const parent = byGuid.get(pg)
      if (parent) visit(parent)
    }
    sorted.push(c)
  }
  for (const c of shapeChanges) visit(c)

  // Assign temporary IDs and build nodes
  const guidToId = new Map<string, string>()
  let idCounter = 0
  for (const c of sorted) {
    guidToId.set(guidKey(c.guid), `figma-paste-${idCounter++}`)
  }

  // Boolean ops own all appearance — push their fills/strokes to children,
  // overwriting any child-level styles. The boolean op itself renders as a
  // transparent container since we don't do actual geometry merging.
  const booleanAppearance = new Map<string, {
    fills: ReturnType<typeof mapFills>
    strokes: ReturnType<typeof mapStrokes>
    strokeWeight: number
    strokeAlign: StrokeAlign
  }>()
  for (const c of sorted) {
    if (c.type === 'BOOLEAN_OPERATION') {
      booleanAppearance.set(guidKey(c.guid), {
        fills: mapFills(c.fillPaints),
        strokes: mapStrokes(c.strokePaints),
        strokeWeight: c.strokeWeight ?? 1,
        strokeAlign: mapStrokeAlign(c.strokeAlign),
      })
    }
  }

  const nodes: ExternalNode[] = []

  for (const c of sorted) {
    const nodeType = mapNodeType(c.type)
    if (!nodeType) continue

    const id = guidToId.get(guidKey(c.guid))!
    const parentGuid = c.parentIndex
      ? guidKey(c.parentIndex.guid)
      : null
    const parentId =
      parentGuid && !canvasGuids.has(parentGuid)
        ? (guidToId.get(parentGuid) ?? null)
        : null

    const base = {
      id,
      name: c.name ?? nodeType,
      type: nodeType,
      parentId,
      children: [] as string[],
      visible: c.visible ?? true,
      locked: false,
    }

    const geometry = {
      x: c.transform?.m02 ?? 0,
      y: c.transform?.m12 ?? 0,
      width: c.size?.x ?? 100,
      height: c.size?.y ?? 100,
      rotation: 0,
      opacity: c.opacity ?? 1,
    }

    const isBooleanOp = c.type === 'BOOLEAN_OPERATION'
    // Children of boolean ops inherit the parent's appearance (always overrides)
    const inheritedAppearance = parentGuid
      ? booleanAppearance.get(parentGuid)
      : undefined
    const appearance = {
      cornerRadius: c.cornerRadius ?? 0,
      fills: isBooleanOp ? [] : (inheritedAppearance?.fills ?? mapFills(c.fillPaints)),
      strokes: isBooleanOp ? [] : (inheritedAppearance?.strokes ?? mapStrokes(c.strokePaints)),
      strokeWeight: inheritedAppearance?.strokeWeight ?? c.strokeWeight ?? 1,
      strokeAlign: inheritedAppearance?.strokeAlign ?? mapStrokeAlign(c.strokeAlign),
      effects: [],
    }

    switch (nodeType) {
      case 'FRAME':
        nodes.push({
          ...base,
          type: 'FRAME',
          ...geometry,
          ...appearance,
          clipsContent: c.clipsContent ?? true,
          layoutMode:
            c.stackMode === 'HORIZONTAL'
              ? 'HORIZONTAL'
              : c.stackMode === 'VERTICAL'
                ? 'VERTICAL'
                : 'NONE',
          itemSpacing: c.itemSpacing ?? 0,
          paddingTop: c.paddingTop ?? 0,
          paddingRight: c.paddingRight ?? 0,
          paddingBottom: c.paddingBottom ?? 0,
          paddingLeft: c.paddingLeft ?? 0,
        })
        break
      case 'SECTION':
        nodes.push({ ...base, type: 'SECTION', ...geometry, ...appearance })
        break
      case 'RECTANGLE':
        nodes.push({ ...base, type: 'RECTANGLE', ...geometry, ...appearance })
        break
      case 'ELLIPSE':
        nodes.push({ ...base, type: 'ELLIPSE', ...geometry, ...appearance })
        break
      case 'TEXT': {
        const autoResize =
          (c.textAutoResize as 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'NONE') ??
          'WIDTH_AND_HEIGHT'
        const textGeometry = { ...geometry }
        // Figma reports size=0 for auto-sized dimensions; use a sensible fallback
        // so the ResizeObserver can measure and update correctly after render.
        if (autoResize === 'WIDTH_AND_HEIGHT' || autoResize === 'HEIGHT') {
          if (textGeometry.height === 0) {
            textGeometry.height = Math.ceil((c.fontSize ?? 14) * 1.5)
          }
        }
        if (autoResize === 'WIDTH_AND_HEIGHT') {
          if (textGeometry.width === 0) {
            textGeometry.width = 120
          }
        }

        // Characters live in textData.characters, not at the top level
        const characters = c.textData?.characters ?? c.characters ?? ''

        // lineHeight: RAW means multiplier (e.g. 1 = 1× fontSize),
        // PIXELS is absolute, PERCENT is relative to fontSize
        const fontSize = c.fontSize ?? 14
        let lineHeight: number
        if (c.lineHeight) {
          if (c.lineHeight.units === 'RAW') {
            lineHeight = Math.round(c.lineHeight.value * fontSize)
          } else if (c.lineHeight.units === 'PERCENT') {
            lineHeight = Math.round((c.lineHeight.value / 100) * fontSize)
          } else {
            lineHeight = c.lineHeight.value
          }
        } else {
          lineHeight = Math.round(fontSize * 1.2)
        }

        // letterSpacing: PERCENT is relative to fontSize, PIXELS is absolute
        let letterSpacing = 0
        if (c.letterSpacing) {
          if (c.letterSpacing.units === 'PERCENT') {
            letterSpacing = (c.letterSpacing.value / 100) * fontSize
          } else {
            letterSpacing = c.letterSpacing.value
          }
        }

        nodes.push({
          ...base,
          type: 'TEXT',
          ...textGeometry,
          ...appearance,
          characters,
          fontFamily: c.fontName?.family ?? 'Inter',
          fontSize,
          fontWeight: 400,
          lineHeight,
          letterSpacing,
          textAlignHorizontal:
            (c.textAlignHorizontal as 'LEFT' | 'CENTER' | 'RIGHT') ?? 'LEFT',
          textAlignVertical:
            (c.textAlignVertical as 'TOP' | 'CENTER' | 'BOTTOM') ?? 'TOP',
          textAutoResize: autoResize,
        })
        break
      }
      case 'LINE':
        nodes.push({
          ...base,
          type: 'LINE',
          ...geometry,
          strokes: mapStrokes(c.strokePaints),
          strokeWeight: c.strokeWeight ?? 1,
          strokeAlign: mapStrokeAlign(c.strokeAlign),
        })
        break
      case 'VECTOR': {
        const paths = extractVectorPaths(c, message.blobs)
        nodes.push({
          ...base,
          type: 'VECTOR',
          ...geometry,
          ...appearance,
          paths,
        })
        break
      }
      case 'POLYGON':
        nodes.push({
          ...base,
          type: 'POLYGON',
          ...geometry,
          ...appearance,
          sides: c.count ?? 3,
        })
        break
      case 'STAR':
        nodes.push({
          ...base,
          type: 'STAR',
          ...geometry,
          ...appearance,
          points: c.count ?? 5,
          innerRadius: c.starInnerScale ?? 0.382,
        })
        break
      case 'GROUP':
        nodes.push({ ...base, type: 'GROUP' })
        break
    }
  }

  // Wire up children arrays
  const nodeMap = new Map<string, ExternalNode>()
  for (const n of nodes) nodeMap.set(n.id, n)
  for (const n of nodes) {
    if (n.parentId) {
      const parent = nodeMap.get(n.parentId)
      if (parent) parent.children.push(n.id)
    }
  }

  return nodes
}

export function hasFigmaClipboardData(html: string): boolean {
  return html.includes(MAGIC_START) || html.includes(ESCAPED_MAGIC_START)
}

/**
 * Decode Figma clipboard data from text/html.
 * Returns parsed nodes ready to insert into our scene graph.
 */
export async function decodeFigmaClipboard(
  html: string,
): Promise<FigmaClipboardData | null> {
  // Extract figmeta
  const metaB64 = extractBetween(
    html,
    META_MAGIC_START,
    META_MAGIC_END,
    ESCAPED_META_MAGIC_START,
    ESCAPED_META_MAGIC_END,
  )
  if (!metaB64) return null

  const meta = JSON.parse(atob(metaB64)) as FigMeta

  // Extract figma payload
  const payloadB64 = extractBetween(
    html,
    MAGIC_START,
    MAGIC_END,
    ESCAPED_MAGIC_START,
    ESCAPED_MAGIC_END,
  )
  if (!payloadB64) return null

  const binary = b64ToBytes(payloadB64)

  // Parse fig-kiwi container
  const { schema, message } = await parseFigKiwi(binary)

  // Decode kiwi message
  const figmaMessage = decodeKiwiMessage(schema, message)

  // Convert to our scene nodes
  const nodes = convertToExternalNodes(figmaMessage)

  return { meta, message: figmaMessage, nodes }
}
