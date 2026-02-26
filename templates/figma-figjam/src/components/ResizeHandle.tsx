import type { MouseEventHandler } from 'react';
import { ButtonPrimitive } from '@figma/fpl-components';
import clsx from 'clsx';

interface ResizeHandleProps {
  onMouseDown: MouseEventHandler<HTMLElement>;
  /** Which side of the panel the handle sits on */
  side?: 'left' | 'right';
}

export function ResizeHandle({ onMouseDown, side = 'right' }: ResizeHandleProps) {
  return (
    <ButtonPrimitive
      aria-label="Resize panel"
      className={clsx(
        'absolute top-0 bottom-0 w-2 z-sidebar cursor-col-resize group p-0 border-none',
        side === 'right' ? '-right-1' : '-left-1'
      )}
      onMouseDown={onMouseDown}
    >
      <div className={clsx(
        'absolute top-0 bottom-0 w-1 group-hover:bg-border group-active:bg-bg-tertiary transition-colors',
        side === 'right' ? 'left-1' : 'right-1'
      )} />
    </ButtonPrimitive>
  );
}
