import { useState } from 'react';
import { Button, Checkbox, HiddenLabel } from '@figma/fpl-components';
import {
  Icon24Size,
  Icon24Table,
  Icon24Upload,
} from '@figma/fpl-icons';

const SIZE_PRESETS = [
  { id: 'ig-square', label: 'Instagram post (square)', size: '1080 \u00d7 1080' },
  {
    id: 'ig-portrait',
    label: 'Instagram post (portrait)',
    size: '1080 \u00d7 1350',
  },
  { id: 'ig-story', label: 'Instagram story', size: '1080 \u00d7 1920' },
  { id: 'fb-post', label: 'Facebook post', size: '1200 \u00d7 630' },
  {
    id: 'print-letter',
    label: 'Print (US letter)',
    size: '2550 \u00d7 3300',
  },
];

export function BulkCreatePanel() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const togglePreset = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const selectAll = () => {
    const allSelected: Record<string, boolean> = {};
    for (const preset of SIZE_PRESETS) {
      allSelected[preset.id] = true;
    }
    setSelected(allSelected);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-12px border-b border-border flex items-center gap-2">
        <span className="text-bodyLgStrong text-text">Bulk create</span>
      </div>

      {/* Size presets */}
      <div className="flex flex-col py-1">
        <div className="flex items-center gap-1 text-bodyMdStrong text-text px-2.5 py-2"><Icon24Size /><span>Create new sizes</span></div>
        {SIZE_PRESETS.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center justify-between px-3 py-1"
          >
            <div className="flex flex-col">
              <span className="text-bodyMd text-text">{preset.label}</span>
              <span className="text-bodyMd text-text-tertiary">
                {preset.size}
              </span>
            </div>
            <Checkbox
              label={<HiddenLabel>{preset.label}</HiddenLabel>}
              checked={selected[preset.id] ?? false}
              onChange={(checked) => togglePreset(preset.id, checked)}
            />
          </div>
        ))}
      </div>

      {/* More link */}
      <div className="px-3 pb-3">
        <Button variant="link">
          More
        </Button>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Use a spreadsheet */}
      <div className="px-2.5 py-2 flex items-center gap-1">
        <Icon24Table className="text-text-secondary" />
        <span className="text-bodyMd text-text">Use a spreadsheet</span>
      </div>

      {/* Upload button */}
      <div className="px-3 pb-2">
        <Button variant="secondary" width='fill' iconPrefix={<Icon24Upload />}>
          Upload
        </Button>
      </div>

      {/* Helper text */}
      <div className="px-3 pb-3">
        <p className="text-bodySm text-text-secondary">
          You can upload XLSX or CSV files. To bulk create with images, use XLSX
          files.
        </p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-bodyMd text-text-secondary">
            Select an asset
          </span>
          <Button
            variant="link"
            onClick={selectAll}
          >
            Select all
          </Button>
        </div>
        <Button variant="primary" width='fill' disabled={selectedCount === 0}>
          Bulk create
        </Button>
      </div>
    </div>
  );
}
