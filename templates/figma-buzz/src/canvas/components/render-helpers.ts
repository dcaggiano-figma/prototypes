import type { Color, Paint, StrokeAlign } from '@prototype/shared/canvas';

/** Build a GPU-composited transform for node positioning (avoids layout thrash) */
export function nodeTransform(x: number, y: number, rotation: number): string {
  if (rotation) return `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
  return `translate(${x}px, ${y}px)`;
}

export { nodePosition } from '@prototype/shared/canvas';

export function colorToCSS(color: Color, opacity: number): string {
  if (opacity >= 1) return `rgb(${color.r}, ${color.g}, ${color.b})`;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

export function getFirstVisibleFill(fills: Paint[]): Paint | undefined {
  // Fills render bottom to top, but for a single fill we just take the last visible one
  for (let i = fills.length - 1; i >= 0; i--) {
    if (fills[i].visible) return fills[i];
  }
  return undefined;
}

export function getFirstVisibleStroke(strokes: Paint[]): Paint | undefined {
  for (const s of strokes) {
    if (s.visible) return s;
  }
  return undefined;
}

/** SVG stroke width adjusted for alignment (OUTSIDE/INSIDE double to compensate for clipping) */
export function svgStrokeWidth(weight: number, align: StrokeAlign): number {
  return align === 'CENTER' ? weight : weight * 2;
}

export function strokeStyles(
  stroke: Paint | undefined,
  weight: number,
  align: StrokeAlign,
): React.CSSProperties {
  if (!stroke) return {};

  const color = colorToCSS(stroke.color, stroke.opacity);

  if (align === 'INSIDE') {
    return {
      boxShadow: `inset 0 0 0 ${weight}px ${color}`,
    };
  }

  if (align === 'OUTSIDE') {
    return {
      boxShadow: `0 0 0 ${weight}px ${color}`,
    };
  }

  // CENTER — half inside, half outside (matches Figma behavior)
  const half = weight / 2;
  return {
    boxShadow: `inset 0 0 0 ${half}px ${color}, 0 0 0 ${half}px ${color}`,
  };
}
