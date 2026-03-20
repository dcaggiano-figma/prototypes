import { SceneGraph, createPaint } from '@prototype/shared/canvas';

/** Figma logo frame size (covers the full 5-piece logo). */
const LOGO_SIZE = 64;

/** Piece size — each logo part is 20×20 in the 64×64 frame. */
const PIECE = 20;

/**
 * Logo parts with tight bounding boxes. Each path is translated to a local
 * 20×20 coordinate space so the layer bounds match the visible shape,
 * making individual pieces easy to select on the canvas.
 */
const LOGO_PARTS = [
  {
    name: 'Green',
    x: 12, y: 42,
    d: 'M0 10C0 4.4771 4.4771 0 10 0H20V10C20 15.5228 15.5228 20 10 20C4.4771 20 0 15.5228 0 10Z',
    fill: '#24CB71',
  },
  {
    name: 'Orange',
    x: 32, y: 2,
    d: 'M0 0V20H10C15.5228 20 20 15.5228 20 10C20 4.4771 15.5228 0 10 0L0 0Z',
    fill: '#FF7237',
  },
  {
    name: 'Blue',
    x: 32, y: 22,
    d: 'M10 0C15.5228 0 20 4.4772 20 10C20 15.5229 15.5228 20 10 20C4.4772 20 0 15.5229 0 10C0 4.4772 4.4772 0 10 0Z',
    fill: '#00B6FF',
  },
  {
    name: 'Red',
    x: 12, y: 2,
    d: 'M0 10C0 15.5229 4.4771 20 10 20L20 20L20 0L10 0C4.4771 0 0 4.4771 0 10Z',
    fill: '#FF3737',
  },
  {
    name: 'Purple',
    x: 12, y: 22,
    d: 'M0 10C0 15.5228 4.4771 20 10 20H20L20 0L10 0C4.4771 0 0 4.4771 0 10Z',
    fill: '#874FFF',
  },
];

export function createInitialSceneGraph(): SceneGraph {
  const sg = new SceneGraph();
  const canvas = sg.createCanvas('Page 1');

  // Create frame for the Figma logo
  const frame = sg.createNode('FRAME', canvas.id, {
    name: 'Figma Logo',
    x: -LOGO_SIZE / 2,
    y: -LOGO_SIZE / 2,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [],
    strokes: [],
    effects: [],
    clipsContent: false,
    layoutMode: 'NONE',
    itemSpacing: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  });

  // Create the 5 vector children with tight bounding boxes
  for (const part of LOGO_PARTS) {
    sg.createNode('VECTOR', frame.id, {
      name: part.name,
      x: part.x,
      y: part.y,
      width: PIECE,
      height: PIECE,
      pathWidth: PIECE,
      pathHeight: PIECE,
      rotation: 0,
      opacity: 1,
      cornerRadius: 0,
      fills: [createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true })],
      strokes: [],
      strokeWeight: 0,
      strokeAlign: 'CENTER',
      effects: [],
      paths: [{ d: part.d, fill: part.fill }],
    });
  }

  return sg;
}
