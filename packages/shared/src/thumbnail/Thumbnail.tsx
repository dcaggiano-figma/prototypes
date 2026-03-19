import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive } from '@figma/fpl-components';

interface ThumbnailProps {
  /** Leading element shown to the left of the card (number, icon, etc.) */
  leading?: ReactNode
  /** Visual variant: single card or stacked to indicate collapsed group */
  variant: 'single' | 'stacked'
  selected: boolean
  label: string
  onClick: () => void
  /** Content rendered inside the card (e.g. ThumbnailPreview) */
  children?: ReactNode
}

export function NavListThumbnail({ leading, variant, selected, label, onClick, children }: ThumbnailProps) {
  return (
    <ButtonPrimitive
      className={clsx(
        'text-bodyLg flex flex-col gap-1 w-full text-left rounded-lg overflow-hidden',
        selected ? 'bg-bg-selected text-text' : 'text-text-secondary bg-bg hover:bg-bg-hover', variant === 'stacked' && 'pb-3',
      )}
      onClick={onClick}
      aria-label={label}
    >
      <div className="flex items-start gap-1 w-full p-2 pl-1">
        {leading != null && (
          <div className="flex-shrink-0 w-4 text-center">
            {leading}
          </div>
        )}
        <div className="relative flex-1">
          {/* Stacked layers behind the card */}
          {variant === 'stacked' && (
            <>
              <div
                className={clsx(
                  'absolute inset-x-3 top-1 bottom-0 rounded-md border translate-y-3',
                  selected ? 'border-border-brand bg-bg-selected-tertiary' : 'border-border bg-bg-secondary',
                )}
              />
              <div
                className={clsx(
                  'absolute inset-x-2 top-px bottom-0 rounded-md border translate-y-2 z-[1]',
                  selected ? 'border-border-brand bg-bg-selected-tertiary' : 'border-border bg-bg-secondary',
                )}
              />
            </>
          )}
          {/* Main card */}
          <div
            className={clsx(
              'relative z-[2] flex aspect-[16/9] border w-full rounded-md overflow-hidden',
              selected ? 'border-border-brand' : 'border-border',
            )}
          >
            {children ?? (
              <div className={clsx(
                'flex justify-center items-center w-full h-full p-2',
                selected ? 'bg-bg-selected-tertiary' : 'bg-bg-secondary',
              )}>
                <div className="bg-bg aspect-[3/4] h-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </ButtonPrimitive>
  );
}

interface ThumbnailPreviewProps {
  /** Width of the content to scale */
  width: number
  /** Height of the content to scale */
  height: number
  /** Background color of the scaled content area */
  backgroundColor?: string
  /** When true, remove padding so content fills the entire card */
  bleed?: boolean
  /** Content to render inside the scaled container */
  children: ReactNode
}

/** CSS-scaled preview container with ResizeObserver-based scaling */
export const ThumbnailPreview = memo(function ThumbnailPreview({
  width,
  height,
  backgroundColor = 'rgb(255,255,255)',
  bleed = false,
  children,
}: ThumbnailPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: cw, height: ch } = entry.contentRect;
      if (cw === 0 || ch === 0) return;
      setScale(Math.min(cw / width, ch / height));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        'w-full h-full contain-strict pointer-events-none overflow-hidden relative',
        bleed ? '' : 'p-2 bg-bg-secondary',
      )}
    >
      {scale > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width,
            height,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
            backgroundColor,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
});
