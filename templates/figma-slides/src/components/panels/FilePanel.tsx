import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, ButtonGroup, Collapse, IconButton, Input } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import { useMode } from '../ModeContext';
import {
  Icon16ChevronDown,
  Icon24CollapseLayers,
  Icon24Plus,
  Icon24SidebarOpen,
  Icon24Template,
} from '@figma/fpl-icons';

import { useCanvasId, useSceneGraph, useSelection } from '../../canvas';
import type { FrameNode, SlideNode, SceneNode, NodeId } from '../../canvas';
import type { LayersPanelHandle } from '@prototype/shared';
import { useMinimizeUI } from '../MinimizeUIContext';
import { useViewMode } from '../ViewModeContext';
import { NavListThumbnail, ThumbnailPreview, LayersPanel } from '@prototype/shared';
import { colorToCSS, getFirstVisibleFill } from '../../canvas/components/render-helpers';
import { ThumbnailRenderer } from '../../canvas/components/thumbnail-renderer';
import { createSlideAfterFocused } from '../../canvas/scene-graph/grid';


export function FilePanel() {
  const mode = useMode();
  const { toggleMinimize, fileName, setFileName } = useMinimizeUI();
  const store = useSceneGraph();
  const canvasId = useCanvasId();
  const { selectedIds, select } = useSelection();
  const { viewMode, focusedFrameId, setFocusedFrameId } = useViewMode();

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
      <div className="pr-2 pl-2 py-2 gap-2 flex flex-col">
        <div className="flex items-center justify-between py-1 min-w-0">
          <div className="flex-1 min-w-0">
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
          </div>
          <IconButton size="lg" aria-label="Minimize UI" onClick={toggleMinimize}>
            <Icon24SidebarOpen />
          </IconButton>
        </div>
        <span className="px-2 text-bodyMd text-text-secondary truncate">Drafts</span>
        <div className="grid grid-cols-1 items-center px-2 pt-2"><ButtonGroup aria-label="File actions" variant="secondary"><Button variant="secondary" width='fill' iconPrefix={<Icon24Template />}>New slide</Button><IconButton aria-label="Add slide" variant="secondary" onClick={() => {
            const newId = createSlideAfterFocused(store, canvasId, focusedFrameId);
            if (newId && viewMode === 'asset') setFocusedFrameId(newId);
          }}><Icon24Plus /></IconButton></ButtonGroup></div>
      </div>

      <div className="border-t border-border" />

        {/* Sections derived from scene graph */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <SectionList
            store={store}
            canvasId={canvasId}
            selectedIds={selectedIds}
            onSelectFrame={(frameId) => {
              select(frameId);
              if (viewMode === 'asset') {
                const node = store.getNode(frameId);
                if (node && node.type === 'SLIDE') {
                  setFocusedFrameId(frameId);
                }
              }
            }}
            onSelectSection={(sectionId) => select(sectionId)}
          />
        </div>

        {/* Layers section — only shown in design mode */}
        {mode === 'design' && (
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
              rootId={focusedFrameId ?? canvasId}
              onHasExpandedChange={setHasExpandedLayers}
            />
          </div>
        )}

    </>
  );
}

// ── Section list ────────────────────────────────────────────────────

interface SectionListProps {
  store: ReturnType<typeof useSceneGraph>
  canvasId: NodeId
  selectedIds: ReadonlySet<NodeId>
  onSelectFrame: (frameId: NodeId) => void
  onSelectSection: (sectionId: NodeId) => void
}

function SectionList({ store, canvasId, selectedIds, onSelectFrame, onSelectSection }: SectionListProps) {
  // Derive sections from scene graph
  const [sections, setSections] = useState<Array<{ id: NodeId; name: string; children: SceneNode[] }>>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [storeVersion, setStoreVersion] = useState(0);

  const refreshSections = useCallback(() => {
    setStoreVersion((v) => v + 1);
    const canvas = store.getNode(canvasId);
    const roots = canvas ? canvas.children.map((id) => store.getNode(id)).filter(Boolean) as SceneNode[] : [];
    const secs = roots
      .filter((n) => n.type === 'SECTION' || n.type === 'GRID_SECTION')
      .map((s) => ({
        id: s.id,
        name: s.name,
        children: s.children.map((cid) => store.getNode(cid)).filter(Boolean) as SceneNode[],
      }));
    setSections(secs);

    // Default all sections to open
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const sec of secs) {
        if (!(sec.id in next)) next[sec.id] = true;
      }
      return next;
    });
  }, [store, canvasId]);

  useEffect(() => {
    refreshSections();
    return store.addListener(refreshSections);
  }, [store, refreshSections]);

  // Compute a running offset so numbering is continuous across sections
  const sectionOffsets = sections.reduce<number[]>((acc, _section, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + sections[i - 1].children.length);
    return acc;
  }, []);

  return (
    <>
      {sections.map((section, sectionIdx) => {
        const isOpen = openSections[section.id] ?? true;
        const firstChild = section.children[0];
        const offset = sectionOffsets[sectionIdx];

        return (
          <Collapse.Root
            key={section.id}
            isOpen={isOpen}
            setOpen={(open) => setOpenSections((prev) => ({ ...prev, [section.id]: open }))}
          >
            <Collapse.Header
              variant="leftPanel"
              size="lg"
              onClick={() => onSelectSection(section.id)}
            >
              <Collapse.Label size="md">{section.name}</Collapse.Label>
            </Collapse.Header>

            {/* When collapsed, show stacked thumbnail of first child */}
            {!isOpen && firstChild && (
              <div className="flex flex-col gap-1 px-2 pb-2">
                <NavListThumbnail
                  leading={offset + 1}
                  variant="stacked"
                  selected={selectedIds.has(firstChild.id)}
                  label={firstChild.name}
                  onClick={() => onSelectFrame(firstChild.id)}
                >
                  {(firstChild.type === 'FRAME' || firstChild.type === 'SLIDE') && (
                    <FrameThumbnailPreview frameNode={firstChild as FrameNode | SlideNode} store={store} storeVersion={storeVersion} />
                  )}
                </NavListThumbnail>
              </div>
            )}

            <Collapse.Content>
              <div className="flex flex-col gap-1 px-2 pb-2">
                {section.children.map((child, i) => (
                  <NavListThumbnail
                    key={child.id}
                    leading={offset + i + 1}
                    variant="single"
                    selected={selectedIds.has(child.id)}
                    label={child.name}
                    onClick={() => onSelectFrame(child.id)}
                  >
                    {(child.type === 'FRAME' || child.type === 'SLIDE') && (
                      <FrameThumbnailPreview frameNode={child as FrameNode | SlideNode} store={store} storeVersion={storeVersion} />
                    )}
                  </NavListThumbnail>
                ))}
              </div>
            </Collapse.Content>
          </Collapse.Root>
        );
      })}
    </>
  );
}

/** Composes ThumbnailPreview + ThumbnailRenderer for a frame or slide node */
function FrameThumbnailPreview({ frameNode, store, storeVersion }: { frameNode: FrameNode | SlideNode; store: ReturnType<typeof useSceneGraph>; storeVersion: number }) {
  const fill = getFirstVisibleFill(frameNode.fills);
  const bgColor = fill ? colorToCSS(fill.color, fill.opacity) : undefined;

  return (
    <ThumbnailPreview width={frameNode.width} height={frameNode.height} backgroundColor={bgColor} bleed>
      <ThumbnailRenderer frameNode={frameNode} store={store} storeVersion={storeVersion} />
    </ThumbnailPreview>
  );
}

