import { useState, useRef, useEffect } from 'react';
import { Button, ButtonGroup, Collapse, IconButton, Input } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import { NavList, LayersPanel } from '@prototype/shared';
import type { LayersPanelHandle } from '@prototype/shared';

import {
  Icon16ChevronDown,
  Icon24CollapseLayers,
  Icon24Plus,
  Icon24SidebarOpen,
} from '@figma/fpl-icons';

import { useCanvasId } from '../../canvas';
import { useMinimizeUI } from '../MinimizeUIContext';

interface Page {
  name: string;
  status: 'none' | 'dev';
}

const PAGES: Page[] = [
  { name: 'Cover', status: 'none' },
  { name: 'Designs', status: 'none' },
  { name: 'Specs', status: 'dev' },
];


export function FilePanel() {
  const { toggleMinimize, fileName, setFileName } = useMinimizeUI();
  const canvasId = useCanvasId();
  const [selectedPage, setSelectedPage] = useState(PAGES[0].name);

  // File name inline editing
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const fileNameInputRef = useRef<HTMLInputElement>(null);

  // File color profile
  const [colorProfile, setColorProfile] = useState<'srgb' | 'p3'>('srgb');

  const layersPanelRef = useRef<LayersPanelHandle>(null);
  const [hasExpandedLayers, setHasExpandedLayers] = useState(true);
  const fileMenu = MenuV2.useMenu();

  useEffect(() => {
    if (isEditingFileName) {
      fileNameInputRef.current?.focus();
      fileNameInputRef.current?.select();
    }
  }, [isEditingFileName]);

  const startEditingFileName = () => {
    setEditingValue(fileName);
    setIsEditingFileName(true);
  };

  const commitFileName = () => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      setFileName(trimmed);
    }
    setIsEditingFileName(false);
  };

  return (
    <>
      {/* Header */}
      <div className="pr-2 pl-2 py-2 gap-2 flex items-start justify-between">
        <div className="flex flex-col py-1 min-w-0 flex-1">
          {isEditingFileName && (
            <Input
              className="text-bodyLg text-text"
              ref={fileNameInputRef}
              aria-label="File name"
              value={editingValue}
              onChange={setEditingValue}
              onBlur={commitFileName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitFileName();
                }
              }}
            />
          )}
          <div className={isEditingFileName ? 'hidden' : ''}>
              <ButtonGroup aria-label="File actions">
                <Button variant="ghost" onClick={startEditingFileName}>
                  <span className="text-bodyLg text-text truncate">{fileName}</span>
                </Button>
                <ButtonGroup.Trigger
                  {...fileMenu.getTriggerProps() as React.ComponentProps<typeof ButtonGroup.Trigger>}
                  aria-label="File options"
                >
                  <Icon16ChevronDown />
                </ButtonGroup.Trigger>
              </ButtonGroup>
          </div>
              <MenuV2.Root manager={fileMenu.manager}>
                <MenuV2.Group>
                  <MenuV2.Item onClick={() => console.log('version-history')}>
                    Show version history
                  </MenuV2.Item>
                  <MenuV2.SubMenu title="Library">
                    <MenuV2.Group>
                      <MenuV2.Item onClick={() => console.log('publish-library')}>Publish library…</MenuV2.Item>
                      <MenuV2.Item onClick={() => console.log('connect-components')}>Connect components to code</MenuV2.Item>
                      <MenuV2.Item onClick={() => console.log('export-to-make')}>Export to Figma Make</MenuV2.Item>
                      <MenuV2.Item onClick={() => console.log('library-analytics')}>Library analytics</MenuV2.Item>
                    </MenuV2.Group>
                  </MenuV2.SubMenu>
                  <MenuV2.Item onClick={() => console.log('export')} trail={<MenuV2.Shortcut>⌥⌘E</MenuV2.Shortcut>}>
                    Export…
                  </MenuV2.Item>
                </MenuV2.Group>
                <MenuV2.Group>
                  <MenuV2.SubMenu title="Add to sidebar">
                    <MenuV2.Group>
                      <MenuV2.Item onClick={() => console.log('starred')}>Starred</MenuV2.Item>
                    </MenuV2.Group>
                  </MenuV2.SubMenu>
                  <MenuV2.Item onClick={() => console.log('pin-to-workspace')}>Pin to workspace</MenuV2.Item>
                </MenuV2.Group>
                <MenuV2.Group>
                  <MenuV2.Item onClick={() => console.log('create-branch')}>Create branch…</MenuV2.Item>
                </MenuV2.Group>
                <MenuV2.Group>
                  <MenuV2.SubMenu title="File color profile">
                    <MenuV2.RadioGroup
                      title="File color profile"
                      value={colorProfile}
                      onChange={(value) => setColorProfile(value as 'srgb' | 'p3')}
                    >
                      <MenuV2.RadioGroupItem value="srgb">Assign to sRGB</MenuV2.RadioGroupItem>
                      <MenuV2.RadioGroupItem value="p3">Assign to Display P3</MenuV2.RadioGroupItem>
                    </MenuV2.RadioGroup>
                  </MenuV2.SubMenu>
                </MenuV2.Group>
                <MenuV2.Group>
                  <MenuV2.Item onClick={() => console.log('duplicate')}>Duplicate</MenuV2.Item>
                  <MenuV2.Item onClick={() => console.log('rename')}>Rename</MenuV2.Item>
                  <MenuV2.Item onClick={() => console.log('copy')}>Copy</MenuV2.Item>
                  <MenuV2.Item onClick={() => console.log('go-to-project')}>Go to project</MenuV2.Item>
                  <MenuV2.Item onClick={() => console.log('move-file')}>Move file…</MenuV2.Item>
                  <MenuV2.Item onClick={() => console.log('move-to-trash')}>Move to trash</MenuV2.Item>
                </MenuV2.Group>
                <MenuV2.Group>
                  <MenuV2.Item onClick={() => console.log('restore-thumbnail')}>Restore default thumbnail</MenuV2.Item>
                </MenuV2.Group>
              </MenuV2.Root>
          <span className="px-2 text-bodyMd text-text-secondary truncate">Drafts</span>
        </div>
        <div className="flex items-center">
          <IconButton size='lg' aria-label="Minimize UI" onClick={toggleMinimize}>
            <Icon24SidebarOpen />
          </IconButton>
        </div>
      </div>

      <div className="border-t border-border" />

        {/* Pages section */}
        <div>
          <Collapse.Root defaultOpen={true}>
            <Collapse.Header variant='leftPanel' size="lg">
              <Collapse.Label size="md">Pages</Collapse.Label>
              <Collapse.Trail>
                <IconButton aria-label="Search">
                  <Icon24Plus />
                </IconButton>
              </Collapse.Trail>
            </Collapse.Header>
            <Collapse.Content>
              <NavList
                value={selectedPage}
                onChange={setSelectedPage}
                size="md"
                selectedVariant="highlighted"
                aria-label="Pages"
                className="pb-2"
                items={PAGES.map((p) => ({ value: p.name, label: p.name }))}
              />
            </Collapse.Content>
          </Collapse.Root>

        </div>

        {/* Layers section */}
        <div className='border-t border-border flex-1 min-h-0 flex flex-col overflow-hidden'>
          <Collapse.Root defaultOpen={true}>
            <Collapse.Header variant='leftPanel' size="lg">
              <Collapse.Label size="md">Layers</Collapse.Label>
              {hasExpandedLayers && (
                <Collapse.Trail>
                  <IconButton
                    aria-label="Collapse layers"
                    onClick={() => layersPanelRef.current?.collapseAll()}
                  >
                    <Icon24CollapseLayers />
                  </IconButton>
                </Collapse.Trail>
              )}
            </Collapse.Header>
          </Collapse.Root>
          <LayersPanel
            ref={layersPanelRef}
            rootId={canvasId}
            onHasExpandedChange={setHasExpandedLayers}
          />
        </div>

    </>
  );
}
