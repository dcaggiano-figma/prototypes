import clsx from 'clsx';
import { ButtonPrimitive } from '@figma/fpl-components';
import { MarkerIllustration } from './toolbar-illustrations/MarkerIllustration';
import { HighlighterIllustration } from './toolbar-illustrations/HighlighterIllustration';
import { TapeIllustration } from './toolbar-illustrations/TapeIllustration';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MarkerSubType = 'marker' | 'highlighter' | 'tape';

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

export const MARKER_COLORS: { id: string; label: string; css: string }[] = [
  { id: 'black', label: 'Black', css: '#1B1B1B' },
  { id: 'grey', label: 'Grey', css: '#A5A5A5' },
  { id: 'red', label: 'Red', css: '#F24822' },
  { id: 'orange', label: 'Orange', css: '#FFA629' },
  { id: 'yellow', label: 'Yellow', css: '#FFCD29' },
  { id: 'green', label: 'Green', css: '#14AE5C' },
  { id: 'blue', label: 'Blue', css: '#0D99FF' },
  { id: 'purple', label: 'Purple', css: '#9747FF' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MarkerSecondaryToolbarProps {
  activeSubType: MarkerSubType;
  activeColor: string;
  onSubTypeSelect: (subType: MarkerSubType) => void;
  onColorSelect: (color: string) => void;
}

export function MarkerSecondaryToolbar({
  activeSubType,
  activeColor,
  onSubTypeSelect,
  onColorSelect,
}: MarkerSecondaryToolbarProps) {
  return (
    <div className="flex items-center bg-bg rounded-lg shadow-300">
      <div className="flex items-center gap-2 p-2">
      {/* Sub-type selectors */}
      <SubTypeButton
        label="Highlighter"
        isActive={activeSubType === 'highlighter'}
        onClick={() => onSubTypeSelect('highlighter')}
      >
        <HighlighterIllustration color={activeColor} className="w-4 h-[36px]" />
      </SubTypeButton>

      <SubTypeButton
        label="Marker"
        isActive={activeSubType === 'marker'}
        onClick={() => onSubTypeSelect('marker')}
      >
        <MarkerIllustration color={activeColor} className="w-4 h-[36px]" />
      </SubTypeButton>

      <SubTypeButton
        label="Tape"
        isActive={activeSubType === 'tape'}
        onClick={() => onSubTypeSelect('tape')}
      >
        <TapeIllustration className="w-4 h-[36px]" />
      </SubTypeButton>
      </div>

      <div className="flex items-center p-2 gap-2 border-l border-border">

      {/* Color dots */}
      {MARKER_COLORS.map((c) => (
        <ButtonPrimitive
          key={c.id}
          aria-label={c.label}
          aria-pressed={activeColor === c.css}
          onClick={() => onColorSelect(c.css)}
          className={clsx(
            'rounded-full w-4 h-4 shrink-0',
            activeColor === c.css
              ? 'ring-2 ring-border-selected ring-offset-2 ring-offset-bg'
              : '',
          )}
          style={{ backgroundColor: c.css }}
        >
          <span className="sr-only">{c.label}</span>
        </ButtonPrimitive>
      ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-type button
// ---------------------------------------------------------------------------

function SubTypeButton({
  label,
  isActive,
  onClick,
  children,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <ButtonPrimitive
      aria-label={label}
      aria-pressed={isActive}
      onClick={onClick}
      className={clsx(
        'flex items-center justify-center rounded-md pt-3 cursor-pointer overflow-hidden h-4 w-4',
        'hover:bg-bg-hover active:bg-bg-pressed',
        isActive && 'bg-bg-selected ring-1 ring-border-brand',
      )}
    >
      {children}
    </ButtonPrimitive>
  );
}
