import styles from './swatch.module.css';

export type SwatchType = 'color' | 'opacity' | 'image' | 'gradient' | 'circle';
export type SwatchSize = 'sm' | 'md' | 'lg';

export interface SwatchProps {
  /** Up to 3 CSS color values displayed as equal-width vertical stripes */
  colors?: string[];
  /** Swatch variant */
  type?: SwatchType;
  /** Size */
  size?: SwatchSize;
  /** Include padding around swatch */
  padding?: boolean;
  /** When provided, renders as button with focus ring */
  onClick?: () => void;
  /** CSS gradient string (type='gradient') */
  gradient?: string;
  /** Image URL (type='image') */
  imageSrc?: string;
  /** Opacity 0-1 for the alpha half (type='opacity') */
  opacity?: number;
  /** Show selected ring indicator */
  selected?: boolean;
  className?: string;
}

function buildBackground(props: SwatchProps): string {
  const { type = 'color', colors = [], gradient, imageSrc, opacity } = props;

  switch (type) {
    case 'gradient':
      return gradient ?? '';

    case 'image':
      return imageSrc ? `url(${imageSrc})` : '';

    case 'opacity': {
      const color = colors[0] ?? '#000000';
      const a = opacity ?? 0.5;
      return `linear-gradient(to right, ${color} 50%, color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent) 50%)`;
    }

    case 'circle':
    case 'color':
    default: {
      if (colors.length === 0) return '#cccccc';
      if (colors.length === 1) return colors[0];
      const stops = colors
        .map((c, i) => {
          const start = (i / colors.length) * 100;
          const end = ((i + 1) / colors.length) * 100;
          return `${c} ${start}% ${end}%`;
        })
        .join(', ');
      return `linear-gradient(to right, ${stops})`;
    }
  }
}

export function Swatch(props: SwatchProps) {
  const {
    type = 'color',
    size = 'sm',
    padding: padded = true,
    onClick,
    selected,
    className,
  } = props;

  const isCircular = type === 'circle';
  const background = buildBackground(props);
  const isImage = type === 'image';

  const rootClasses = [
    onClick ? styles.button : styles.root,
    styles[size],
    padded ? styles.padded : undefined,
    isCircular ? styles.circular : styles.rounded,
    selected ? styles.selected : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const fillStyle: React.CSSProperties = {
    background,
    ...(isImage && { backgroundSize: 'cover', backgroundPosition: 'center' }),
  };

  const inner = (
    <div className={styles.inner}>
      <div className={styles.fill} style={fillStyle} />
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className={rootClasses} onClick={onClick}>
        {inner}
      </button>
    );
  }

  return <div className={rootClasses}>{inner}</div>;
}
