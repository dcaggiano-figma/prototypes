const cursor = (file: string, hx: number, hy: number, fallback: string) =>
  `url("/assets/cursors/${file}") ${hx} ${hy}, ${fallback}`;

export const CURSORS = {
  // Canvas tool cursors
  default: cursor('cursor-black-ui3.svg', 4, 2, 'default'),
  grab: cursor('cursor-hand-new-ui3.svg', 15, 15, 'grab'),
  grabbing: cursor('cursor-hand-press-ui3.svg', 15, 16, 'grabbing'),
  crosshair: cursor('cursor-crosshair-ui3.svg', 15, 15, 'crosshair'),
  text: cursor('cursor-text.svg', 15, 16, 'text'),
  frame: cursor('cursor-frame-ui3.svg', 4, 2, 'crosshair'),
  pen: cursor('cursor-pen-ui3.svg', 4, 2, 'crosshair'),
  pencil: cursor('cursor-pencil-ui3.svg', 4, 27, 'crosshair'),

  // Handle cursors
  rotateNW: cursor('cursor-rotate-sw-ui3.svg', 16, 16, 'grab'),
  rotateNE: cursor('cursor-rotate-ui3.svg', 16, 16, 'grab'),
  rotateSE: cursor('cursor-rotate-ne-ui3.svg', 16, 16, 'grab'),
  rotateSW: cursor('cursor-rotate-se-ui3.svg', 16, 16, 'grab'),
  resizeH: cursor('cursor-resize-ui3.svg', 16, 16, 'ew-resize'),
  resizeV: cursor('cursor-resize-v-ui3.svg', 16, 16, 'ns-resize'),
  resizeNWSE: cursor('cursor-resize-nwse-ui3.svg', 16, 16, 'nwse-resize'),
  resizeNESW: cursor('cursor-resize-nesw-ui3.svg', 16, 16, 'nesw-resize'),
} as const;
