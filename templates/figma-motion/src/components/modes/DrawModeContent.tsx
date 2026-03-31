import { useState } from 'react';
import { ButtonPrimitive, HiddenLabel, IconButton, Select } from '@figma/fpl-components';
import { Icon16ChevronDown, Icon16Visible, Icon24Plus, Icon24Swatch, Icon24Minus } from '@figma/fpl-icons';

export function DrawModeContent() {
  const [collection, setCollection] = useState<string | undefined>('dev-mode');
  const [mode, setMode] = useState<string | undefined>('light');

  return (
    <>
      {/* Draw header with zoom */}
      <div className="border-b border-border flex items-center justify-between pl-3 pr-2 pb-2 pt-1">
        <span className="text-bodyMdStrong text-text">Draw</span>
        <ButtonPrimitive aria-label="Zoom level" className="flex items-center p-1 pl-2 rounded-md gap-4px text-bodyMd text-text hover:bg-bg-hover active:bg-bg-pressed">
          <span>50%</span>
          <Icon16ChevronDown />
        </ButtonPrimitive>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Page section */}
        <div className="pl-3 pr-2 py-2">
          <div className="flex items-center justify-between">
            <span className="text-bodyMdStrong text-text">Page</span>
            <IconButton aria-label="View code">
              <Icon24Swatch />
            </IconButton>
          </div>

          {/* Color swatch */}
          <div className="flex items-center gap-2 mt-2">
            <div className="w-32px h-32px rounded-md border border-border bg-bg" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-bodyMd text-text">FFFFFF</span>
              <span className="text-bodySm text-text-secondary">100% · Solid</span>
            </div>
            <IconButton aria-label="Toggle visibility">
              <Icon16Visible />
            </IconButton>
          </div>

          {/* Collection / Mode row */}
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-3">
            <div className="flex flex-col gap-1">
              <span className="text-bodySm text-text-secondary">Collection</span>
              <Select.Root value={collection} onChange={(v) => setCollection(v)}>
                <Select.Trigger width="fill" label={<HiddenLabel>Collection</HiddenLabel>} />
                <Select.Container>
                  <Select.Option value="dev-mode">Dev Mode</Select.Option>
                  <Select.Option value="colors">Colors</Select.Option>
                </Select.Container>
              </Select.Root>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-bodySm text-text-secondary">Mode</span>
              <Select.Root value={mode} onChange={(v) => setMode(v)}>
                <Select.Trigger width="fill" label={<HiddenLabel>Mode</HiddenLabel>} />
                <Select.Container>
                  <Select.Option value="light">Light</Select.Option>
                  <Select.Option value="dark">Dark</Select.Option>
                </Select.Container>
              </Select.Root>
            </div>
            <div className="flex items-end pt-1">
              <IconButton aria-label="Remove">
                <Icon24Minus />
              </IconButton>
            </div>
          </div>
        </div>
        <div className="border-t border-border" />

        {/* Styles section */}
        <div className="pl-3 pr-2 py-2">
          <div className="flex items-center justify-between">
            <span className="text-bodyMdStrong text-text">Styles</span>
            <IconButton aria-label="Add style">
              <Icon24Plus />
            </IconButton>
          </div>
        </div>
        <div className="border-t border-border" />

        {/* Export section */}
        <div className="pl-3 pr-2 py-2">
          <div className="flex items-center justify-between">
            <span className="text-bodyMdStrong text-text">Export</span>
            <div className="flex items-center gap-1">
              <IconButton aria-label="Add export">
                <Icon24Plus />
              </IconButton>
              <IconButton aria-label="Export options">
                <Icon16ChevronDown />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
