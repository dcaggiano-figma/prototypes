import type { MouseEventHandler } from 'react';
import { ButtonPrimitive } from '@figma/fpl-components';

interface ResizeHandleProps {
  onMouseDown: MouseEventHandler<HTMLElement>;
}

export function ResizeHandle({ onMouseDown }: ResizeHandleProps) {
  return (
    <ButtonPrimitive
      aria-label="Resize panel"
      // eslint-disable-next-line @repo/no-arbitrary-value
      className="absolute top-0 bottom-0 -right-[2px] w-1 z-[10] cursor-col-resize group p-0 border-none"
      onMouseDown={onMouseDown}
    >
      {/* eslint-disable-next-line @repo/no-arbitrary-value */}
      <div className="absolute top-0 bottom-0 left-[1px] w-[2px] group-hover:bg-bg-brand group-active:bg-bg-brand transition-colors" />
    </ButtonPrimitive>
  );
}
