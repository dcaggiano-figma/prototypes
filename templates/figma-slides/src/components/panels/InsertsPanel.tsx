import { useState } from 'react';
import { IconButton, SearchInput, ButtonPrimitive } from '@figma/fpl-components';
import {
  Icon24Adjust,
  Icon24Table,
  Icon24CodeBlock,
  Icon24Number,
} from '@figma/fpl-icons';
import clsx from 'clsx';
import { NavList } from '@prototype/shared';

const TOP_ITEMS = [
  { value: 'table', label: 'Table', icon: Icon24Table },
  { value: 'code-block', label: 'Code block', icon: Icon24CodeBlock },
  { value: 'slide-number', label: 'Slide number', icon: Icon24Number },
];

const THUMBNAIL_ITEMS = [
  { value: 'prototypes', label: 'Prototypes', color: 'bg-[#C4D4FF]' },
  { value: 'interactive', label: 'Interactive', color: 'bg-[#FFD9A3]' },
  { value: 'templates', label: 'Templates', color: 'bg-[#FFBFB3]' },
  { value: 'libraries', label: 'Libraries', color: 'bg-[#B3E6C4]' },
];

export function InsertsPanel() {
  const [selected, setSelected] = useState('');

  return (
    <>
      <div className="px-3 py-12px border-b border-border">
        <span className="text-bodyLgStrong text-text">Inserts</span>
      </div>
      <div className="pl-3 pr-12px py-12px flex items-center gap-2">
        <SearchInput aria-label="Inserts search" placeholder="Search inserts" />
        <IconButton aria-label="Filter">
          <Icon24Adjust />
        </IconButton>
      </div>
      <div className="flex flex-col border-t border-border overflow-auto">
        <div className="px-2 pt-2">
        <NavList
          value={selected}
          onChange={setSelected}
          aria-label="Insert items"
          items={TOP_ITEMS}
          size="lg"
        />
        </div>

        <div className="flex flex-col px-2 py-2">
          {THUMBNAIL_ITEMS.map((item) => (
            <ButtonPrimitive
              key={item.value}
              className={clsx(
                'flex items-center gap-3 rounded-lg p-2 w-full cursor-pointer',
                selected === item.value
                  ? 'bg-bg-selected text-text'
                  : 'text-text hover:bg-bg-hover',
              )}
              onClick={() => setSelected(item.value)}
            >
              <div className={clsx('w-56px h-56px rounded-md flex-shrink-0', item.color)} />
              <span className="text-bodyMd">{item.label}</span>
            </ButtonPrimitive>
          ))}
        </div>
      </div>
    </>
  );
}
