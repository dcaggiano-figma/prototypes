# Figma clipboard paste

Paste Figma nodes into the prototype editor via the native clipboard. Copies
from Figma arrive as `text/html` with embedded binary data.

## How it works

1. **Extract** — Pull base64 payloads from `<!--(figmeta)-->` and `<!--(figma)-->` markers in the HTML
2. **Decode fig-kiwi** — Parse the binary container: `header | version | compressed_schema | compressed_message` (raw deflate)
3. **Compile kiwi decoder** — The schema is embedded in every paste; we dynamically compile a JS decoder via `kiwi-schema`
4. **Convert nodes** — Map Figma node types to our scene graph types, extract fills/strokes/geometry, decode vector network blobs to SVG paths
5. **Insert** — Offset nodes to the viewport center and add to the store

## Key files

- `src/canvas/clipboard/figma-clipboard.ts` — Decoder pipeline (extract, decompress, decode, convert)
- `src/canvas/clipboard/vector-network.ts` — Binary vector network blob decoder, converts to SVG path `d` strings
- `src/canvas/clipboard/clipboard.ts` — Internal copy/paste + `pasteExternalNodes()` for Figma data
- `src/canvas/components/Canvas.tsx` — Native `paste` event listener that handles both Figma and internal clipboard
- `scripts/decode-figma-clipboard.ts` — CLI debug tool: `pnpm decode-clipboard <file>`

## What works

- Basic shapes: frames, rectangles, ellipses, text, lines, polygons, stars
- Vector paths via vector network blob decoding
- Nested hierarchies with proper parent-child relationships
- Fills and strokes (solid colors)
- Node visibility and opacity
- Auto-layout properties (stack mode, spacing, padding)
- Corner radius
- Groups and sections
- Internal Only Canvas is filtered out
- Instance nodes get their backing component's children inlined
- Boolean operations render as transparent frames with appearance pushed to children

## Next steps

- **Gradients and images** — Only solid fills are supported; gradient stops and image fills are dropped
- **Boolean operation geometry** — Currently approximated as overlapping children. Real CSG would produce correct merged paths. Group opacity (`opacity` on the wrapper) would fix transparency compositing for overlapping children.
- **Instance overrides** — We inline the base component but ignore `symbolOverrides` (size, text, fill overrides on specific children)
- **Text styles** — Mixed text styles within a single text node (multiple font weights, sizes, colors) aren't handled
- **Effects** — Drop shadows, blurs, and other effects are not yet mapped
- **Stroke details** — Dashes, caps, joins, individual stroke sides
- **Rotation** — Transform matrix rotation component is ignored (only translation is extracted)
- **Constraints and responsive layout** — Not mapped
- **Export back to Figma** — Encode our scene graph into the same fig-kiwi format for copy-to-Figma
