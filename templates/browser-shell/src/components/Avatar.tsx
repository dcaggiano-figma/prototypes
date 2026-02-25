const SIZES = {
  sm: 16,
  md: 24,
  lg: 32,
  xlg: 48,
} as const;

type AvatarSize = keyof typeof SIZES;

interface AvatarProps {
  size?: AvatarSize;
  src?: string;
  alt?: string;
}

function Avatar({ size = 'md', src, alt = '' }: AvatarProps) {
  const px = SIZES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={px}
        height={px}
        className="rounded-full border border-border shrink-0 object-cover"
      />
    );
  }

  return (
    <div
      className="rounded-full border border-border bg-bg-tertiary shrink-0"
      role="img"
      aria-label={alt}
    />
  );
}

export default Avatar;
