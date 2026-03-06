import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { Button, ButtonGroup, ButtonPrimitive, Collapse, IconButton, Input, InputPrimitive, Menu } from '@figma/fpl-components';
import { useMode } from '../ModeContext';
import {
  Icon16ChevronDown,
  Icon16Ellipse,
  Icon16Frame,
  Icon16Group,
  Icon16Hidden,
  Icon16Line,
  Icon16Polygon,
  Icon16Rectangle,
  Icon16Section,
  Icon16Star,
  Icon16Text,
  Icon16Visible,
  Icon24Plus,
  Icon24Template,
} from '@figma/fpl-icons';

import { useSceneGraph, useSelection } from '../../canvas';
import type { FrameNode, SlideNode } from '../../canvas/types';
import type { SceneNode, VectorNode } from '../../canvas';
import { useMinimizeUI } from '../MinimizeUIContext';
import { useViewMode } from '../ViewModeContext';
import { NavListThumbnail, ThumbnailPreview } from '@prototype/shared';
import { colorToCSS, getFirstVisibleFill } from '../../canvas/components/render-helpers';
import { ThumbnailRenderer } from '../../canvas/components/thumbnail-renderer';
import { createSlideAfterFocused } from '../../canvas/scene-graph/grid-manager';


export function FilePanel() {
  const mode = useMode();
  const { fileName, setFileName } = useMinimizeUI();
  const store = useSceneGraph();
  const { selectedIds, select } = useSelection();
  const { viewMode, focusedFrameId, setFocusedFrameId } = useViewMode();

  // File name inline editing
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const fileNameInputRef = useRef<HTMLInputElement>(null);

  // File color profile
  const [colorProfile, setColorProfile] = useState<'srgb' | 'p3'>('srgb');

  const fileMenu = Menu.useMenu();

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
          {isEditingFileName ? (
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
          ) : (
            <>
              <Menu.Root manager={fileMenu.manager}>
                <ButtonGroup aria-label="File actions">
                  <Button variant="ghost" onClick={startEditingFileName}>
                    <span className="text-bodyLg text-text truncate">{fileName}</span>
                  </Button>
                  <ButtonGroup.Trigger
                    aria-label="File options"
                    {...fileMenu.getTriggerProps()}
                  >
                    <Icon16ChevronDown />
                  </ButtonGroup.Trigger>
                </ButtonGroup>
                <Menu.Container>
                  <Menu.Group>
                    <Menu.Item onClick={() => console.log('version-history')}>
                      Show version history
                    </Menu.Item>
                    <Menu.SubMenu>
                      <Menu.SubTrigger>Library</Menu.SubTrigger>
                      <Menu.SubContainer>
                        <Menu.Group>
                          <Menu.Item onClick={() => console.log('publish-library')}>Publish library…</Menu.Item>
                          <Menu.Item onClick={() => console.log('connect-components')}>Connect components to code</Menu.Item>
                          <Menu.Item onClick={() => console.log('export-to-make')}>Export to Figma Make</Menu.Item>
                          <Menu.Item onClick={() => console.log('library-analytics')}>Library analytics</Menu.Item>
                        </Menu.Group>
                      </Menu.SubContainer>
                    </Menu.SubMenu>
                    <Menu.Item onClick={() => console.log('export')}>
                      Export…
                      <Menu.ItemTrail><Menu.Shortcut>⌥⌘E</Menu.Shortcut></Menu.ItemTrail>
                    </Menu.Item>
                  </Menu.Group>
                  <Menu.Group>
                    <Menu.SubMenu>
                      <Menu.SubTrigger>Add to sidebar</Menu.SubTrigger>
                      <Menu.SubContainer>
                        <Menu.Group>
                          <Menu.Item onClick={() => console.log('starred')}>Starred</Menu.Item>
                        </Menu.Group>
                      </Menu.SubContainer>
                    </Menu.SubMenu>
                    <Menu.Item onClick={() => console.log('pin-to-workspace')}>Pin to workspace</Menu.Item>
                  </Menu.Group>
                  <Menu.Group>
                    <Menu.Item onClick={() => console.log('create-branch')}>Create branch…</Menu.Item>
                  </Menu.Group>
                  <Menu.Group>
                    <Menu.SubMenu>
                      <Menu.SubTrigger>File color profile</Menu.SubTrigger>
                      <Menu.SubContainer>
                        <Menu.RadioGroup
                          title={<Menu.HiddenTitle>File color profile</Menu.HiddenTitle>}
                          value={colorProfile}
                          onChange={(value) => setColorProfile(value as 'srgb' | 'p3')}
                        >
                          <Menu.RadioGroupItem value="srgb">Assign to sRGB</Menu.RadioGroupItem>
                          <Menu.RadioGroupItem value="p3">Assign to Display P3</Menu.RadioGroupItem>
                        </Menu.RadioGroup>
                      </Menu.SubContainer>
                    </Menu.SubMenu>
                  </Menu.Group>
                  <Menu.Group>
                    <Menu.Item onClick={() => console.log('duplicate')}>Duplicate</Menu.Item>
                    <Menu.Item onClick={() => console.log('rename')}>Rename</Menu.Item>
                    <Menu.Item onClick={() => console.log('copy')}>Copy</Menu.Item>
                    <Menu.Item onClick={() => console.log('go-to-project')}>Go to project</Menu.Item>
                    <Menu.Item onClick={() => console.log('move-file')}>Move file…</Menu.Item>
                    <Menu.Item onClick={() => console.log('move-to-trash')}>Move to trash</Menu.Item>
                  </Menu.Group>
                  <Menu.Group>
                    <Menu.Item onClick={() => console.log('restore-thumbnail')}>Restore default thumbnail</Menu.Item>
                  </Menu.Group>
                </Menu.Container>
              </Menu.Root>
            </>
          )}
          <span className="px-2 text-bodyMd text-text-secondary truncate">Drafts</span>
          <div className="grid grid-cols-1 items-center px-2 pt-2"><ButtonGroup aria-label="File actions" variant="secondary"><Button variant="secondary" width='fill' iconPrefix={<Icon24Template />}>New asset</Button><IconButton aria-label="Add slide" variant="secondary" onClick={() => {
            const newId = createSlideAfterFocused(store, focusedFrameId);
            if (newId) setFocusedFrameId(newId);
          }}><Icon24Plus /></IconButton></ButtonGroup></div>
        </div>
      </div>

      <div className="border-t border-border" />

        {/* Sections derived from scene graph */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <SectionList
            store={store}
            selectedIds={selectedIds}
            onSelectFrame={(frameId) => {
              select(frameId);
              if (viewMode === 'asset') {
                setFocusedFrameId(frameId);
              }
            }}
            onSelectSection={(sectionId) => select(sectionId)}
          />
        </div>

        {/* Layers section — only shown in design mode */}
        {mode === 'design' && (
          <div className='border-t border-border flex-1 min-h-0 flex flex-col'>
            <Collapse.Root defaultOpen={true}>
              <Collapse.Header variant='leftPanel' size="lg">
                <Collapse.Label size="md">Layers</Collapse.Label>
              </Collapse.Header>
              <Collapse.Content>
                <LayersTree />
              </Collapse.Content>
            </Collapse.Root>
          </div>
        )}

    </>
  );
}

// ── Section list ────────────────────────────────────────────────────

interface SectionListProps {
  store: ReturnType<typeof useSceneGraph>
  selectedIds: Set<string>
  onSelectFrame: (frameId: string) => void
  onSelectSection: (sectionId: string) => void
}

function SectionList({ store, selectedIds, onSelectFrame, onSelectSection }: SectionListProps) {
  // Derive sections from scene graph
  const [sections, setSections] = useState<Array<{ id: string; name: string; children: SceneNode[] }>>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [storeVersion, setStoreVersion] = useState(0);

  const refreshSections = useCallback(() => {
    setStoreVersion((v) => v + 1);
    const roots = store.getRootNodes();
    const secs = roots
      .filter((n) => n.type === 'SECTION')
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
  }, [store]);

  useEffect(() => {
    refreshSections();
    return store.subscribe(refreshSections);
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
    <ThumbnailPreview width={frameNode.width} height={frameNode.height} backgroundColor={bgColor}>
      <ThumbnailRenderer frameNode={frameNode} store={store} storeVersion={storeVersion} />
    </ThumbnailPreview>
  );
}

// ── Layers tree ─────────────────────────────────────────────────────

function LayersTree() {
  const store = useSceneGraph();
  const { selectedIds, select, toggle } = useSelection();
  const { focusedFrameId } = useViewMode();
  const [layers, setLayers] = useState<Array<{ node: SceneNode; depth: number }>>(() => collectLayersReversed(store, focusedFrameId));

  // Re-walk when store or focused frame changes
  const refreshLayers = useCallback(() => {
    setLayers(collectLayersReversed(store, focusedFrameId));
  }, [store, focusedFrameId]);

  // Subscribe to store changes and refresh when focused frame changes
  useEffect(() => {
    refreshLayers();
    return store.subscribe(refreshLayers);
  }, [store, refreshLayers]);

  return (
    <div className="overflow-y-auto flex-1 min-h-0">
      <div className="px-1 pb-2">
        {layers.map(({ node, depth }) => (
          <LayerRow
            key={node.id}
            node={node}
            depth={depth}
            selected={selectedIds.has(node.id)}
            onSelect={select}
            onToggle={toggle}
            store={store}
          />
        ))}
      </div>
    </div>
  );
}

// ── Layer row ─────────────────────────────────────────────────────────

interface LayerRowProps {
  node: SceneNode
  depth: number
  selected: boolean
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  store: ReturnType<typeof useSceneGraph>
}

function LayerRow({
  node, depth, selected, onSelect, onToggle, store,
}: LayerRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) {
        onToggle(node.id);
      } else {
        onSelect(node.id);
      }
    },
    [node.id, onSelect, onToggle],
  );

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  }, []);

  const commitRename = useCallback(() => {
    const value = inputRef.current?.value.trim();
    if (value && value !== node.name) {
      store.updateNode(node.id, { name: value });
    }
    setIsEditing(false);
  }, [store, node.id, node.name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitRename();
      if (e.key === 'Escape') setIsEditing(false);
    },
    [commitRename],
  );

  const toggleVisibility = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      store.updateNode(node.id, { visible: !node.visible });
    },
    [store, node.id, node.visible],
  );

  return (
    <ButtonPrimitive
      className="relative flex items-center h-32px px-1 cursor-default select-none group w-full text-text"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={clsx(
          'absolute inset-x-1 top-1/2 -translate-y-1/2 h-24px rounded-md',
          selected ? 'bg-bg-selected' : 'group-hover:bg-bg-hover',
        )}
      />
      <div
        className={clsx(
          'relative flex items-center gap-2 flex-1 min-w-0 h-24px px-1',
          !node.visible && 'opacity-50',
        )}
        style={{ paddingLeft: 8 + depth * 24 }}
      >
        <span className="flex-shrink-0">
          <NodeTypeIcon node={node} />
        </span>
        {isEditing ? (
          <InputPrimitive
            ref={inputRef}
            className="flex-1 min-w-0 bg-bg text-text text-bodyMd px-1 py-0 rounded border border-border-brand outline-none"
            aria-label="Rename layer"
            value={node.name}
            onChange={() => {}}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className="flex-1 min-w-0 truncate text-bodyMd">{node.name}</span>
        )}
        {(isHovered || !node.visible) && (
          <ButtonPrimitive
            className="flex-shrink-0 p-1 rounded text-text-secondary hover:bg-bg-hover"
            onClick={toggleVisibility}
            aria-label={node.visible ? 'Hide' : 'Show'}
          >
            {node.visible ? <Icon16Visible /> : <Icon16Hidden />}
          </ButtonPrimitive>
        )}
      </div>
    </ButtonPrimitive>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Collect layers in reverse z-order: topmost node first, matching Figma convention.
 * When focusedFrameId is provided, only shows children of that frame.
 */
function collectLayersReversed(
  store: ReturnType<typeof useSceneGraph>,
  focusedFrameId: string | null,
): Array<{ node: SceneNode; depth: number }> {
  const result: Array<{ node: SceneNode; depth: number }> = [];

  function visitReversed(node: SceneNode, depth: number) {
    result.push({ node, depth });
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = store.getNode(node.children[i]);
      if (child) visitReversed(child, depth + 1);
    }
  }

  if (focusedFrameId) {
    const frame = store.getNode(focusedFrameId);
    if (frame) {
      for (let i = frame.children.length - 1; i >= 0; i--) {
        const child = store.getNode(frame.children[i]);
        if (child) visitReversed(child, 0);
      }
    }
  } else {
    const roots = store.getRootNodes();
    for (let i = roots.length - 1; i >= 0; i--) {
      visitReversed(roots[i], 0);
    }
  }

  return result;
}

function NodeTypeIcon({ node }: { node: SceneNode }) {
  switch (node.type) {
    case 'RECTANGLE':
      return <Icon16Rectangle />;
    case 'ELLIPSE':
      return <Icon16Ellipse />;
    case 'FRAME':
      return <Icon16Frame />;
    case 'SLIDE':
      return <Icon16Frame />;
    case 'SECTION':
      return <Icon16Section />;
    case 'TEXT':
      return <Icon16Text />;
    case 'LINE':
      return <Icon16Line />;
    case 'GROUP':
      return <Icon16Group />;
    case 'STAR':
      return <Icon16Star />;
    case 'POLYGON':
      return <Icon16Polygon />;
    case 'VECTOR':
      return <VectorPreviewIcon node={node} />;
  }
}

function VectorPreviewIcon({ node }: { node: VectorNode }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState(`0 0 ${node.width} ${node.height}`);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const bbox = svg.getBBox();
    if (bbox.width === 0 || bbox.height === 0) return;
    const pad = 0.5;
    setViewBox(`${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
  }, [node.paths]);

  return (
    <svg
      ref={svgRef}
      width="10"
      height="10"
      viewBox={viewBox}
      fill="none"
      stroke="var(--color-icon-tertiary)"
      strokeWidth={1}
    >
      {node.paths.map((p, i) => (
        <path key={i} d={p.d} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
