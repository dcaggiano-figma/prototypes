#!/usr/bin/env npx tsx
/**
 * Decode Figma clipboard data from an HTML file.
 *
 * Usage:
 *   pnpm decode-clipboard <file>
 *   cat /tmp/html | pnpm decode-clipboard
 *
 * Outputs the decoded figmeta JSON, the raw kiwi Message, and the
 * converted SceneNode[] so we can inspect what comes through.
 */

import { readFileSync } from 'node:fs'
import { inflateRaw } from 'node:zlib'
import { promisify } from 'node:util'
import {
  ByteBuffer,
  compileSchemaJS,
  decodeBinarySchema,
} from 'kiwi-schema'

const inflateRawAsync = promisify(inflateRaw)

const MAGIC_START = '<!--(figma)'
const MAGIC_END = '(/figma)-->'
const ESCAPED_MAGIC_START = '&lt;!--(figma)'
const ESCAPED_MAGIC_END = '(/figma)--&gt;'

const META_MAGIC_START = '<!--(figmeta)'
const META_MAGIC_END = '(/figmeta)-->'
const ESCAPED_META_MAGIC_START = '&lt;!--(figmeta)'
const ESCAPED_META_MAGIC_END = '(/figmeta)--&gt;'

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

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, 'base64'))
}

async function rawInflate(data: Uint8Array): Promise<Uint8Array> {
  const result = await inflateRawAsync(data)
  return new Uint8Array(result)
}

async function parseFigKiwi(
  data: Uint8Array,
): Promise<{ version: number; schema: Uint8Array; message: Uint8Array }> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

  const header = new TextDecoder().decode(data.subarray(0, 8))
  if (header !== 'fig-kiwi') {
    throw new Error(`Invalid fig-kiwi header: ${header}`)
  }

  let offset = 8
  const version = view.getUint32(offset, true)
  offset += 4

  const schemaSize = view.getUint32(offset, true)
  offset += 4
  const compressedSchema = data.subarray(offset, offset + schemaSize)
  offset += schemaSize

  const messageSize = view.getUint32(offset, true)
  offset += 4
  const compressedMessage = data.subarray(offset, offset + messageSize)

  const [schema, message] = await Promise.all([
    rawInflate(compressedSchema),
    rawInflate(compressedMessage),
  ])

  return { version, schema, message }
}

function decodeKiwiMessage(
  schemaBytes: Uint8Array,
  messageBytes: Uint8Array,
): unknown {
  const textSchema = decodeBinarySchema(schemaBytes)
  const jsCode = compileSchemaJS(textSchema)

  const exports: Record<string, unknown> = { ByteBuffer }
  const fn = new Function('exports', 'require', jsCode)
  fn(exports, (mod: string) => {
    if (mod === 'kiwi-schema') return { ByteBuffer }
    throw new Error(`Unexpected require: ${mod}`)
  })

  const decodeMessage = exports['decodeMessage'] as (
    bb: ByteBuffer,
  ) => unknown
  return decodeMessage.call(exports, new ByteBuffer(messageBytes))
}

function replacer(_key: string, value: unknown) {
  if (value instanceof Uint8Array) return `<Uint8Array:${value.length}>`
  return value
}

async function main() {
  const file = process.argv[2]
  const html = file
    ? readFileSync(file, 'utf-8')
    : readFileSync(0, 'utf-8')

  // Decode figmeta
  const metaB64 = extractBetween(
    html,
    META_MAGIC_START,
    META_MAGIC_END,
    ESCAPED_META_MAGIC_START,
    ESCAPED_META_MAGIC_END,
  )
  if (metaB64) {
    const meta = JSON.parse(Buffer.from(metaB64, 'base64').toString('utf-8'))
    console.log('=== figmeta ===')
    console.log(JSON.stringify(meta, null, 2))
    console.log()
  }

  // Decode figma payload
  const payloadB64 = extractBetween(
    html,
    MAGIC_START,
    MAGIC_END,
    ESCAPED_MAGIC_START,
    ESCAPED_MAGIC_END,
  )
  if (!payloadB64) {
    console.error('No figma payload found in HTML')
    process.exit(1)
  }

  const binary = b64ToBytes(payloadB64)
  const { version, schema, message } = await parseFigKiwi(binary)

  console.log(`=== fig-kiwi container ===`)
  console.log(`Version: ${version}`)
  console.log(`Schema: ${schema.length} bytes`)
  console.log(`Message: ${message.length} bytes`)
  console.log()

  const decoded = decodeKiwiMessage(schema, message) as {
    nodeChanges?: Array<Record<string, unknown>>
    blobs?: Array<{ bytes: Uint8Array }>
  }
  console.log('=== decoded message ===')
  console.log(JSON.stringify(decoded, replacer, 2))

  // Decode vector network blobs if present
  if (decoded.blobs && decoded.nodeChanges) {
    const { decodeVectorNetwork, convertNetworkToPaths } = await import(
      '@prototype/shared/canvas'
    )
    console.log('\n=== vector paths ===')
    for (const nc of decoded.nodeChanges) {
      const vd = nc.vectorData as
        | { vectorNetworkBlob: number; normalizedSize: { x: number; y: number } }
        | undefined
      if (!vd) continue

      const blob = decoded.blobs[vd.vectorNetworkBlob]
      if (!blob?.bytes) continue

      const network = decodeVectorNetwork(blob.bytes)
      const paths = convertNetworkToPaths(network)
      console.log(`\n  ${nc.name} (blob ${vd.vectorNetworkBlob}, normalized ${vd.normalizedSize.x}x${vd.normalizedSize.y}):`)
      console.log(`    vertices: ${network.vertices.length}, segments: ${network.segments.length}, regions: ${network.regions.length}`)
      for (const p of paths) {
        console.log(`    [${p.windingRule}] ${p.d}`)
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
