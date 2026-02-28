import clsx from 'clsx';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xlg';

export type MultiplayerColor =
  | 'blue'
  | 'green'
  | 'grey'
  | 'pink'
  | 'purple'
  | 'red'
  | 'yellow';

const MULTIPLAYER_COLORS: MultiplayerColor[] = [
  'blue',
  'green',
  'grey',
  'pink',
  'purple',
  'red',
  'yellow',
];

const COLOR_STYLES: Record<MultiplayerColor, { bg: string; text: string }> = {
  blue: {
    bg: 'var(--color-multiplayerblue)',
    text: 'var(--color-textonmultiplayerblue)',
  },
  green: {
    bg: 'var(--color-multiplayergreen)',
    text: 'var(--color-textonmultiplayergreen)',
  },
  grey: {
    bg: 'var(--color-multiplayergrey)',
    text: 'var(--color-textonmultiplayergrey)',
  },
  pink: {
    bg: 'var(--color-multiplayerpink)',
    text: 'var(--color-textonmultiplayerpink)',
  },
  purple: {
    bg: 'var(--color-multiplayerpurple)',
    text: 'var(--color-textonmultiplayerpurple)',
  },
  red: {
    bg: 'var(--color-multiplayerred)',
    text: 'var(--color-textonmultiplayerred)',
  },
  yellow: {
    bg: 'var(--color-multiplayeryellow)',
    text: 'var(--color-textonmultiplayeryellow)',
  },
};

function getStableColor(seed: string): MultiplayerColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return MULTIPLAYER_COLORS[Math.abs(hash) % MULTIPLAYER_COLORS.length];
}

interface AvatarProps {
  size?: AvatarSize;
  src?: string;
  alt?: string;
  initial?: string;
  color?: MultiplayerColor;
}

export function Avatar({
  size = 'md',
  src,
  alt = '',
  initial,
  color,
}: AvatarProps) {
  const sizeClasses = clsx(
    size === 'sm' && 'w-16px h-16px text-bodySm',
    size === 'md' && 'w-24px h-24px text-bodyMd',
    size === 'lg' && 'w-32px h-32px text-bodyMd',
    size === 'xlg' && 'w-48px h-48px text-bodyLg',
  );

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={clsx(
          'rounded-full border border-border shrink-0 object-cover',
          sizeClasses,
        )}
      />
    );
  }

  if (initial) {
    const resolvedColor = color ?? getStableColor(alt || initial);
    const styles = COLOR_STYLES[resolvedColor];
    return (
      <div
        className={clsx(
          'rounded-full shrink-0 flex items-center justify-center font-bold select-none',
          sizeClasses,
        )}
        style={{ backgroundColor: styles.bg, color: styles.text }}
        role="img"
        aria-label={alt || initial}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full border border-border bg-bg-tertiary shrink-0',
        sizeClasses,
      )}
      role="img"
      aria-label={alt}
    />
  );
}
