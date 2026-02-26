import { useState } from 'react';
import { ButtonPrimitive, IconButton } from '@figma/fpl-components';
import { Icon24FigjamPagesLarge } from '@figma/fpl-icons';

export function FigJamFileHeader() {
  const [fileName] = useState('Untitled');

  return (
    <div className="absolute top-12px left-12px z-nav flex items-center gap-1 bg-bg-elevated rounded-lg shadow-300 pointer-events-auto">
      <div className="flex items-center p-2">
        <ButtonPrimitive className="text-text px-2 h-32px rounded-md text-sm font-normal select-none hover:bg-bg-hover active:bg-bg-pressed truncate max-w-[200px]">{fileName}</ButtonPrimitive>
      </div>
      <div className="flex items-center gap-1 border-l border-border p-2">
        <IconButton size="lg" aria-label="Pages" variant="ghost">
          <Icon24FigjamPagesLarge />
        </IconButton>
      </div>
    </div>
  );
}
