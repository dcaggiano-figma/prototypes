import { useState } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive } from '@figma/fpl-components';
import { ShapesIllustration } from './toolbar-illustrations';
import type { HoveredShape } from './toolbar-illustrations';

export type ShapeType = 'rectangle' | 'circle' | 'connector';

interface ShapesToolButtonProps {
  isActive: boolean;
  onSelect: () => void;
  onSelectShape: (type: ShapeType) => void;
}

/**
 * Custom wider toolbar button for shapes & connectors.
 * The whole illustration lifts on hover. Each shape sub-region has an invisible
 * clickable overlay so users can click rectangle, circle, or connector directly.
 * Individual shapes scale 25% when their region is hovered.
 */
export function ShapesToolButton({ isActive, onSelect, onSelectShape }: ShapesToolButtonProps) {
  const [hoveredShape, setHoveredShape] = useState<HoveredShape>(null);

  return (
    <div
      role="group"
      aria-label="Shapes and connectors"
      className={clsx(
        'group relative flex items-start justify-center rounded-t-md overflow-visible w-[64px] shrink-0 h-6',
        isActive && 'bg-bg-secondary',
      )}
    >
      {/* Background button for the whole region (activates shapes mode) */}
      <ButtonPrimitive
        aria-label="Shapes and connectors"
        aria-pressed={isActive}
        onClick={onSelect}
        className="absolute inset-0 rounded-t-md cursor-pointer"
      >
        <span className="sr-only">Shapes and connectors</span>
      </ButtonPrimitive>

      {/* SVG illustration with hover lift */}
      <div
        className={clsx(
          'transition-transform duration-md ease-out group-hover:-translate-y-1 pointer-events-none',
          isActive ? '-translate-y-1' : '',
        )}
      >
        <ShapesIllustration className="w-[64px] h-[54px]" hoveredShape={hoveredShape} />
      </div>

      {/* Invisible sub-button overlays positioned over each shape */}
      {/* Rectangle: left region (roughly x:0-26, y:8-31 in the 64x54 viewBox) */}
      <ButtonPrimitive
        aria-label="Rectangle"
        onClick={(e) => {
          e.stopPropagation();
          onSelectShape('rectangle');
        }}
        onMouseEnter={() => setHoveredShape('rectangle')}
        onMouseLeave={() => setHoveredShape(null)}
        className="absolute left-0 top-0 w-[26px] h-full cursor-pointer opacity-0"
      >
        <span className="sr-only">Rectangle</span>
      </ButtonPrimitive>

      {/* Connector: top-right region */}
      <ButtonPrimitive
        aria-label="Connector"
        onClick={(e) => {
          e.stopPropagation();
          onSelectShape('connector');
        }}
        onMouseEnter={() => setHoveredShape('connector')}
        onMouseLeave={() => setHoveredShape(null)}
        className="absolute right-0 top-0 w-[28px] h-4 cursor-pointer opacity-0"
      >
        <span className="sr-only">Connector</span>
      </ButtonPrimitive>

      {/* Circle: bottom-right region */}
      <ButtonPrimitive
        aria-label="Circle"
        onClick={(e) => {
          e.stopPropagation();
          onSelectShape('circle');
        }}
        onMouseEnter={() => setHoveredShape('circle')}
        onMouseLeave={() => setHoveredShape(null)}
        className="absolute right-0 bottom-0 w-[28px] h-4 cursor-pointer opacity-0"
      >
        <span className="sr-only">Circle</span>
      </ButtonPrimitive>
    </div>
  );
}
