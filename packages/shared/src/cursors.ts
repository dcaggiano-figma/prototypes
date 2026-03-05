import cursorBlack from '../assets/cursors/cursor-black-ui3.svg';
import cursorHandNew from '../assets/cursors/cursor-hand-new-ui3.svg';
import cursorHandPress from '../assets/cursors/cursor-hand-press-ui3.svg';
import cursorCrosshair from '../assets/cursors/cursor-crosshair-ui3.svg';
import cursorText from '../assets/cursors/cursor-text.svg';
import cursorFrame from '../assets/cursors/cursor-frame-ui3.svg';
import cursorPen from '../assets/cursors/cursor-pen-ui3.svg';
import cursorPencil from '../assets/cursors/cursor-pencil-ui3.svg';
import cursorMarker from '../assets/cursors/cursor-marker-ui3.svg';
import cursorHighlighter from '../assets/cursors/cursor-highlighter-ui3.svg';
import cursorCommentsPin from '../assets/cursors/cursor-comments-pin-ui3.svg';
import cursorCommentsNextPin from '../assets/cursors/cursor-comments-next-pin-ui3.svg';
import cursorRotateSW from '../assets/cursors/cursor-rotate-sw-ui3.svg';
import cursorRotate from '../assets/cursors/cursor-rotate-ui3.svg';
import cursorRotateNE from '../assets/cursors/cursor-rotate-ne-ui3.svg';
import cursorRotateSE from '../assets/cursors/cursor-rotate-se-ui3.svg';
import cursorResize from '../assets/cursors/cursor-resize-ui3.svg';
import cursorResizeV from '../assets/cursors/cursor-resize-v-ui3.svg';
import cursorResizeNWSE from '../assets/cursors/cursor-resize-nwse-ui3.svg';
import cursorResizeNESW from '../assets/cursors/cursor-resize-nesw-ui3.svg';

const cursor = (url: string, hx: number, hy: number, fallback: string) =>
  `url("${url}") ${hx} ${hy}, ${fallback}`;

export const CURSORS = {
  // Canvas tool cursors
  default: cursor(cursorBlack, 4, 2, 'default'),
  grab: cursor(cursorHandNew, 15, 15, 'grab'),
  grabbing: cursor(cursorHandPress, 15, 16, 'grabbing'),
  crosshair: cursor(cursorCrosshair, 15, 15, 'crosshair'),
  text: cursor(cursorText, 15, 16, 'text'),
  frame: cursor(cursorFrame, 4, 2, 'crosshair'),
  pen: cursor(cursorPen, 4, 2, 'crosshair'),
  pencil: cursor(cursorPencil, 4, 27, 'crosshair'),
  marker: cursor(cursorMarker, 4, 27, 'crosshair'),
  highlighter: cursor(cursorHighlighter, 1, 27, 'crosshair'),
  comment: cursor(cursorCommentsPin, 1, 28, 'crosshair'),
  commentNext: cursor(cursorCommentsNextPin, 1, 28, 'crosshair'),

  // Handle cursors
  rotateNW: cursor(cursorRotateSW, 16, 16, 'grab'),
  rotateNE: cursor(cursorRotate, 16, 16, 'grab'),
  rotateSE: cursor(cursorRotateNE, 16, 16, 'grab'),
  rotateSW: cursor(cursorRotateSE, 16, 16, 'grab'),
  resizeH: cursor(cursorResize, 16, 16, 'ew-resize'),
  resizeV: cursor(cursorResizeV, 16, 16, 'ns-resize'),
  resizeNWSE: cursor(cursorResizeNWSE, 16, 16, 'nwse-resize'),
  resizeNESW: cursor(cursorResizeNESW, 16, 16, 'nesw-resize'),
} as const;
