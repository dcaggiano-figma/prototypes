import clsx from 'clsx';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xlg';

interface AvatarProps {
  size?: AvatarSize;
  src?: string;
  alt?: string;
}

function Avatar({ size = 'md', src, alt = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={clsx(
          'rounded-full border border-border shrink-0 object-cover',
          size === 'sm' && 'w-16px h-16px',
          size === 'md' && 'w-24px h-24px',
          size === 'lg' && 'w-32px h-32px',
          size === 'xlg' && 'w-[48px] h-[48px]',
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full border border-border bg-bg-tertiary shrink-0',
        size === 'sm' && 'w-16px h-16px',
        size === 'md' && 'w-24px h-24px',
        size === 'lg' && 'w-32px h-32px',
        size === 'xlg' && 'w-[48px] h-[48px]',
      )}
      role="img"
      aria-label={alt}
    />
  );
}

export default Avatar;
