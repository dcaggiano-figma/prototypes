import clsx from 'clsx';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xlg';

interface AvatarProps {
  size?: AvatarSize;
  src?: string;
  alt?: string;
  initial?: string;
}

export function Avatar({ size = 'md', src, alt = '', initial }: AvatarProps) {
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
    return (
      <div
        className={clsx(
          'rounded-full shrink-0 flex items-center justify-center bg-bg-warning text-icon-onwarning font-bold select-none',
          sizeClasses,
        )}
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
