import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { Button, ButtonGroup, ButtonPrimitive, Collapse, IconButton, Input, InputPrimitive } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import { NavList } from '@prototype/shared';

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
  Icon24SidebarOpen,
} from '@figma/fpl-icons';

import { useCanvasId, useSceneGraph, useSelection } from '../../canvas';
import type { NodeId, SceneNode, VectorNode } from '../../canvas';
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
  const [selectedPage, setSelectedPage] = useState(PAGES[0].name);

  // File name inline editing
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const fileNameInputRef = useRef<HTMLInputElement>(null);

  // File color profile
  const [colorProfile, setColorProfile] = useState<'srgb' | 'p3'>('srgb');

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
            </>
          )}
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
  const sg = useSceneGraph();
  const canvasId = useCanvasId();
  const { selectedIds, select, toggle } = useSelection();
  const [layers, setLayers] = useState<Array<{ node: SceneNode; depth: number }>>(() => collectLayersReversed(sg, canvasId));

  // Re-walk when scene graph changes
  const refreshLayers = useCallback(() => {
    setLayers(collectLayersReversed(sg, canvasId));
  }, [sg, canvasId]);

  // Subscribe to scene graph changes
  useEffect(() => sg.addListener(refreshLayers), [sg, refreshLayers]);

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
            sg={sg}
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
  onSelect: (id: NodeId) => void
  onToggle: (id: NodeId) => void
  sg: ReturnType<typeof useSceneGraph>
}

function LayerRow({
  node, depth, selected, onSelect, onToggle, sg,
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
      sg.updateNode(node.id, { name: value });
    }
    setIsEditing(false);
  }, [sg, node.id, node.name]);

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
      sg.updateNode(node.id, { visible: !node.visible });
    },
    [sg, node.id, node.visible],
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
  sg: ReturnType<typeof useSceneGraph>,
  canvasId: NodeId,
): Array<{ node: SceneNode; depth: number }> {
  const result: Array<{ node: SceneNode; depth: number }> = [];

  function visitReversed(node: SceneNode, depth: number) {
    result.push({ node, depth });
    // Visit children in reverse order so highest z-index appears first
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = sg.getNode(node.children[i]);
      if (child) visitReversed(child, depth + 1);
    }
  }

  // Root nodes in reverse order
  const canvas = sg.getNode(canvasId);
  if (!canvas) return result;
  for (let i = canvas.children.length - 1; i >= 0; i--) {
    const root = sg.getNode(canvas.children[i]);
    if (root) visitReversed(root, 0);
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
