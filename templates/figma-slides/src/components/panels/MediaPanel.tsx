import clsx from 'clsx';
import { ButtonPrimitive } from '@figma/fpl-components';
import { SearchStylePanel } from './SearchStylePanel';

/** Seeded aspect ratios for visual variety in the masonry grid */
const ITEMS = [
  { h: 'h-[120px]' },
  { h: 'h-[80px]' },
  { h: 'h-[100px]' },
  { h: 'h-[140px]' },
  { h: 'h-[90px]' },
  { h: 'h-[110px]' },
  { h: 'h-[70px]' },
  { h: 'h-[130px]' },
  { h: 'h-[100px]' },
  { h: 'h-[85px]' },
  { h: 'h-[120px]' },
  { h: 'h-[95px]' },
];

export function MediaPanel() {
  const col1 = ITEMS.filter((_, i) => i % 2 === 0);
  const col2 = ITEMS.filter((_, i) => i % 2 === 1);

  return (
    <SearchStylePanel
      title="Media"
      searchPlaceholder="Search media..."
    >
      <div className="px-3 py-3 flex flex-col gap-2 border-t border-border">
        <span className="text-bodyMdStrong text-text-secondary py-1">Stock photos</span>
        <div className="grid grid-cols-2 gap-8px">
          <div className="flex flex-col gap-8px">
            {col1.map((item, i) => (
              <ButtonPrimitive
                key={i}
                aria-label={`Stock photo ${i * 2 + 1}`}
                className={clsx(item.h, 'w-full rounded-md bg-bg-secondary hover:border-border border border-bg-secondary active:bg-bg-pressed')}
              ><span /></ButtonPrimitive>
            ))}
          </div>
          <div className="flex flex-col gap-8px">
            {col2.map((item, i) => (
              <ButtonPrimitive
                key={i}
                aria-label={`Stock photo ${i * 2 + 2}`}
                className={clsx(item.h, 'w-full rounded-md bg-bg-secondary hover:border-border border border-bg-secondary active:bg-bg-pressed')}
              ><span /></ButtonPrimitive>
            ))}
          </div>
        </div>
      </div>
    </SearchStylePanel>
  );
}
