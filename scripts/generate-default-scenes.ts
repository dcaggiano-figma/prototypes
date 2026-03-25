/**
 * Generate default-scene.json files for templates that build their scenes programmatically.
 *
 * Run with: pnpm tsx scripts/generate-default-scenes.ts
 *
 * This script imports directly from shared package source files to avoid
 * path alias resolution issues.
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Direct imports from shared source (no path aliases)
import { SceneGraph } from '../packages/shared/src/scene-graph/scene-graph.ts'
import { createPaint } from '../packages/shared/src/scene-graph/types.ts'
import { getTypeDefaults } from '../packages/shared/src/canvas/scene-graph/node-defaults.ts'
import { serializeSceneGraph } from '../packages/shared/src/scene-graph/storage.ts'
import { DEFAULT_PAGE_BG } from '../packages/shared/src/canvas/scene-graph/provider.tsx'
import { createGridHelpers } from '../packages/shared/src/canvas/scene-graph/grid-helpers.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function writeScene(templateName: string, sg: SceneGraph) {
  const data = serializeSceneGraph(sg)
  const outPath = join(ROOT, 'templates', templateName, 'src', 'defaults', 'default-scene.json')
  writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n')
  console.log(`Wrote ${outPath}`)
}

// ── FigJam ─────────────────────────────────────────────────────────────

function generateFigJam(): SceneGraph {
  const sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1', DEFAULT_PAGE_BG.color)

  const DEMO_SCENE = [
    {
      type: 'STICKY_NOTE' as const,
      props: {
        name: 'Sticky Note 1',
        x: -280, y: -120, width: 240, height: 240,
        rotation: 0, opacity: 1, cornerRadius: 0,
        fills: [createPaint({ type: 'SOLID', color: { r: 255, g: 226, b: 153 }, opacity: 1, visible: true })],
        strokes: [], strokeWeight: 0, strokeAlign: 'CENTER' as const,
        effects: [{ type: 'DROP_SHADOW' as const, visible: true }],
        characters: 'Welcome to FigJam!',
        fontFamily: 'Inter', fontSize: 24, fontWeight: 400,
        authorName: 'You', showAuthor: true,
      },
    },
    {
      type: 'STICKY_NOTE' as const,
      props: {
        name: 'Sticky Note 2',
        x: 0, y: -140, width: 240, height: 240,
        rotation: 0, opacity: 1, cornerRadius: 0,
        fills: [createPaint({ type: 'SOLID', color: { r: 255, g: 184, b: 168 }, opacity: 1, visible: true })],
        strokes: [], strokeWeight: 0, strokeAlign: 'CENTER' as const,
        effects: [{ type: 'DROP_SHADOW' as const, visible: true }],
        characters: 'Add your ideas here',
        fontFamily: 'Inter', fontSize: 24, fontWeight: 400,
        authorName: 'You', showAuthor: true,
      },
    },
    {
      type: 'STICKY_NOTE' as const,
      props: {
        name: 'Sticky Note 3',
        x: -140, y: 160, width: 240, height: 240,
        rotation: 0, opacity: 1, cornerRadius: 0,
        fills: [createPaint({ type: 'SOLID', color: { r: 179, g: 239, b: 189 }, opacity: 1, visible: true })],
        strokes: [], strokeWeight: 0, strokeAlign: 'CENTER' as const,
        effects: [{ type: 'DROP_SHADOW' as const, visible: true }],
        characters: 'Click to edit',
        fontFamily: 'Inter', fontSize: 24, fontWeight: 400,
        authorName: 'You', showAuthor: true,
      },
    },
    {
      type: 'ELLIPSE' as const,
      props: {
        name: 'Circle 1',
        x: 200, y: -60, width: 100, height: 100,
        rotation: 0, opacity: 1, cornerRadius: 0,
        fills: [createPaint({ type: 'SOLID', color: { r: 196, g: 167, b: 255 }, opacity: 1, visible: true })],
        strokes: [], strokeWeight: 0, strokeAlign: 'CENTER' as const,
        effects: [],
      },
    },
    {
      type: 'RECTANGLE' as const,
      props: {
        name: 'Diamond 1',
        x: 220, y: 80, width: 80, height: 80,
        rotation: 45, opacity: 1, cornerRadius: 0,
        fills: [createPaint({ type: 'SOLID', color: { r: 147, g: 197, b: 253 }, opacity: 1, visible: true })],
        strokes: [], strokeWeight: 0, strokeAlign: 'CENTER' as const,
        effects: [],
      },
    },
    {
      type: 'LINE' as const,
      props: {
        name: 'Connector',
        x: 75, y: 55, width: 125, height: 0,
        rotation: -25, opacity: 1,
        strokes: [createPaint({ type: 'SOLID', color: { r: 100, g: 100, b: 100 }, opacity: 1, visible: true })],
        strokeWeight: 2, strokeAlign: 'CENTER' as const,
        strokeDashPattern: [],
        startCap: 'NONE', endCap: 'NONE',
      },
    },
  ]

  for (const node of DEMO_SCENE) {
    sg.createNode(node.type, canvas.id, node.props)
  }

  return sg
}

// ── Slides ─────────────────────────────────────────────────────────────

const slidesGrid = createGridHelpers({
  defaultSlideWidth: 1920,
  defaultSlideHeight: 1080,
  slideGap: 300,
  rowGap: 500,
  contentTop: 400,
})

function generateSlides(): SceneGraph {
  const sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1')

  const WHITE_FILL = createPaint({ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true })
  const SECTION_STROKE = createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true })
  const SECTION_FILL = createPaint({ type: 'SOLID', color: { r: 245, g: 245, b: 245 }, opacity: 1, visible: true })

  const rows = [
    { name: 'Row 1', slideNames: ['Slide 1', 'Slide 2', 'Slide 3'] },
    { name: 'Row 2', slideNames: ['Slide 4', 'Slide 5', 'Slide 6'] },
  ]

  for (let row = 0; row < rows.length; row++) {
    const { name, slideNames } = rows[row]
    const bounds = slidesGrid.getSectionBounds(row, slideNames.length)
    const y = slidesGrid.getSectionRowY(row)

    const section = sg.createNode('GRID_SECTION', canvas.id, {
      ...getTypeDefaults('GRID_SECTION'),
      name,
      x: bounds.x,
      y,
      width: bounds.width,
      height: bounds.height,
      cornerRadius: 8,
      fills: [SECTION_FILL],
      strokes: [SECTION_STROKE],
      strokeWeight: 2,
      strokeAlign: 'INSIDE' as const,
    })

    for (let col = 0; col < slideNames.length; col++) {
      const pos = slidesGrid.getSlidePosition(row, col)
      sg.createNode('SLIDE', section.id, {
        ...getTypeDefaults('SLIDE'),
        name: slideNames[col],
        x: pos.x,
        y: pos.y,
        width: 1920,
        height: 1080,
        fills: [WHITE_FILL],
        strokes: [],
        strokeWeight: 0,
        strokeAlign: 'CENTER' as const,
        clipsContent: true,
      })
    }
  }

  return sg
}

// ── Buzz ───────────────────────────────────────────────────────────────

function generateBuzz(): SceneGraph {
  const sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1')

  const WHITE_FILL = createPaint({ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true })
  const SECTION_STROKE = createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true })
  const SECTION_FILL = createPaint({ type: 'SOLID', color: { r: 245, g: 245, b: 245 }, opacity: 1, visible: true })

  const rows = [
    { name: 'Row 1', slideNames: ['Untitled 1', 'Untitled 2', 'Untitled 3'] },
    { name: 'Row 2', slideNames: ['Untitled 4', 'Untitled 5', 'Untitled 6'] },
  ]

  for (let row = 0; row < rows.length; row++) {
    const { name, slideNames } = rows[row]
    const bounds = slidesGrid.getSectionBounds(row, slideNames.length)
    const y = slidesGrid.getSectionRowY(row)

    const section = sg.createNode('GRID_SECTION', canvas.id, {
      ...getTypeDefaults('GRID_SECTION'),
      name,
      x: bounds.x,
      y,
      width: bounds.width,
      height: bounds.height,
      cornerRadius: 8,
      fills: [SECTION_FILL],
      strokes: [SECTION_STROKE],
      strokeWeight: 1,
      strokeAlign: 'INSIDE' as const,
    })

    for (let col = 0; col < slideNames.length; col++) {
      const pos = slidesGrid.getSlidePosition(row, col)
      sg.createNode('SLIDE', section.id, {
        ...getTypeDefaults('SLIDE'),
        name: slideNames[col],
        x: pos.x,
        y: pos.y,
        width: 1920,
        height: 1080,
        fills: [WHITE_FILL],
        strokes: [SECTION_STROKE],
        strokeWeight: 1,
        strokeAlign: 'INSIDE' as const,
        clipsContent: true,
      })
    }
  }

  return sg
}

// ── Main ───────────────────────────────────────────────────────────────

writeScene('figma-figjam', generateFigJam())
writeScene('figma-slides', generateSlides())
writeScene('figma-buzz', generateBuzz())

console.log('Done!')
