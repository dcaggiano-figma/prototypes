import { useState } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive } from '@figma/fpl-components';
import { StickyIllustration } from './toolbar-illustrations';

interface StickyToolButtonProps {
  isActive: boolean;
  color: string;
  onSelect: () => void;
}

/**
 * Custom wider toolbar button for the sticky note tool.
 * On hover, only the top sticky note lifts — the bottom two stay in place.
 */
export function StickyToolButton({ isActive, color, onSelect }: StickyToolButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <ButtonPrimitive
      aria-label="Sticky note"
      aria-pressed={isActive}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        'group relative flex items-start justify-center rounded-t-md cursor-pointer overflow-visible w-[64px] shrink-0 h-6',
        isActive && 'bg-bg-secondary',
      )}
    >
      <div
        className={clsx(
          'transition-transform duration-md ease-out',
          // Only lift the whole illustration on active, not on hover
          // (hover lifts only the top sticky via the topLifted prop)
          isActive ? '-translate-y-1' : '',
        )}
      >
        <StickyIllustration
          color={color}
          className="w-[64px] h-[48px]"
          topLifted={isActive || isHovered}
        />
      </div>
    </ButtonPrimitive>
  );
}
