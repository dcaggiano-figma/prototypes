import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { Button, ButtonGroup, ButtonPrimitive, Collapse, IconButton, Input, InputPrimitive, Menu } from '@figma/fpl-components';

import {
  Icon16ChevronDown,
  Icon16Ellipse,
  Icon16Frame,
  Icon16Group,
  Icon16Hidden,
  Icon16Line,
  Icon16Rectangle,
  Icon16Text,
  Icon16Visible,
  Icon24Plus,
  Icon24SidebarOpen,
} from '@figma/fpl-icons';

import { useSceneGraph, useSelection } from '../../canvas';
import type { SceneNode, VectorNode } from '../../canvas';

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
  const [selectedPage, setSelectedPage] = useState(0);

  // File name inline editing
  const [fileName, setFileName] = useState('Untitled');
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
        </div>
        <div className="flex items-center">
          <IconButton size='lg' aria-label="Desktop view">
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
              <ul className="flex flex-col pb-2">
              {PAGES.map((page, i) => (
                <li className='flex flex-col px-2 py-1' key={page.name}>
                  <ButtonPrimitive
                    aria-label={page.name}
                    className={clsx(
                      'flex items-center gap-2 px-2 py-1 rounded-md text-bodyMd cursor-pointer',
                      selectedPage === i
                        ? 'bg-bg-secondary text-text text-bodyMdStrong'
                        : 'text-text hover:bg-bg-hover',
                    )}
                    onClick={() => setSelectedPage(i)}
                  >
                  {page.name}
                </ButtonPrimitive>
                </li>
              ))}
              </ul>
            </Collapse.Content>
          </Collapse.Root>

        </div>

        {/* Layers section */}
        <div className='border-t border-border flex-1 min-h-0 flex flex-col'>
          <Collapse.Root defaultOpen={true}>
            <Collapse.Header variant='leftPanel' size="lg">
              <Collapse.Label size="md">Layers</Collapse.Label>
              <Collapse.Trail>
                <IconButton aria-label="Add layer">
                  <Icon24Plus />
                </IconButton>
              </Collapse.Trail>
            </Collapse.Header>
            <Collapse.Content>
              <LayersTree />
            </Collapse.Content>
          </Collapse.Root>
        </div>

    </>
  );
}

// ── Layers tree ─────────────────────────────────────────────────────

function LayersTree() {
  const store = useSceneGraph();
  const { selectedIds, select, toggle } = useSelection();
  const [layers, setLayers] = useState<Array<{ node: SceneNode; depth: number }>>(() => collectLayersReversed(store));

  // Re-walk when store changes
  const refreshLayers = useCallback(() => {
    setLayers(collectLayersReversed(store));
  }, [store]);

  // Subscribe to store changes
  useEffect(() => store.subscribe(refreshLayers), [store, refreshLayers]);

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
 */
function collectLayersReversed(
  store: ReturnType<typeof useSceneGraph>,
): Array<{ node: SceneNode; depth: number }> {
  const result: Array<{ node: SceneNode; depth: number }> = [];

  function visitReversed(node: SceneNode, depth: number) {
    result.push({ node, depth });
    // Visit children in reverse order so highest z-index appears first
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = store.getNode(node.children[i]);
      if (child) visitReversed(child, depth + 1);
    }
  }

  // Root nodes in reverse order
  const roots = store.getRootNodes();
  for (let i = roots.length - 1; i >= 0; i--) {
    visitReversed(roots[i], 0);
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
    case 'TEXT':
      return <Icon16Text />;
    case 'LINE':
      return <Icon16Line />;
    case 'GROUP':
      return <Icon16Group />;
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
