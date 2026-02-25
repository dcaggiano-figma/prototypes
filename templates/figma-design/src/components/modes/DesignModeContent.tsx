import { useCallback, useMemo, useState } from 'react';
import {
  ButtonPrimitive, Checkbox, HiddenLabel, HiddenLegend, IconButton, Input, Label, ScrollContainer, SegmentedControl, Select, Tabs,
} from '@figma/fpl-components';
import {
  Icon16ChevronDown,
  Icon24Link,
  Icon16Remove,
  Icon16Settings,
  Icon16Visible,
  Icon24AlLayoutGridHorizontal,
  Icon24AlLayoutGridNone,
  Icon24AlLayoutGridVertical,
  Icon24AlSpacingHorizontal,
  Icon24AlSpacingVertical,
  Icon24AutolayoutAddVertical,
  Icon24Blendmode,
  Icon24Corners,
  Icon24SelectMatching,
  Icon24Eye,
  Icon24FlipHorizontal,
  Icon24FlipVertical,
  Icon24GridView,
  Icon24LayoutAlignBottom,
  Icon24LayoutAlignHorizontalCenter,
  Icon24LayoutAlignLeft,
  Icon24LayoutAlignRight,
  Icon24LayoutAlignTop,
  Icon24LayoutAlignVerticalCenter,
  Icon24More,
  Icon24Opacity,
  Icon24Plus,
  Icon24ResizeToFit,
  Icon24Rotate,
  Icon24Rotation,
  Icon24MultiEdit,
} from '@figma/fpl-icons';

import {
  useNode,
  usePageBackground,
  useSceneGraph,
  useSelection,
  useViewport,
} from '../../canvas';
import type {
  AppearanceNode,
  FrameNode,
  GeometryNode,
  SceneNode,
  Stroke,
} from '../../canvas';
import { IconButtonGroup } from '../icon-button-group';
import { PropertySection, PropertyRow, PlaceholderSection } from '../property-layout';
import { NumericField, positiveFormatter, percentFormatter } from '../numeric-field';
import { ColorSwatch, HexInput, OpacityInput, PercentSuffix, hexToRgb } from '../color-inputs';

type DesignTab = 'design' | 'prototype';

export function DesignModeContent() {
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<DesignTab>(
    { design: true, prototype: true },
    { defaultActive: 'design' },
  );

  const { selectedIds } = useSelection();
  const { state: { scale } } = useViewport();

  const singleId = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    return selectedIds.values().next().value as string;
  }, [selectedIds]);

  return (
    <>
      {/* Tab strip */}
      <div className="border-b border-border flex items-center pl-2 pr-1 pb-2">
        <Tabs.TabStrip manager={tabManager}>
          <Tabs.Tab {...tabPropsMap.design}>Design</Tabs.Tab>
          <Tabs.Tab {...tabPropsMap.prototype}>Prototype</Tabs.Tab>
        </Tabs.TabStrip>
        <div className="ml-auto pr-8px">
          <ButtonPrimitive aria-label="Zoom level" className="flex items-center p-1 pl-2 rounded-md gap-4px text-bodyMd text-text hover:bg-bg-hover active:bg-bg-pressed">
            <span>{Math.round(scale * 100)}%</span>
            <Icon16ChevronDown />
          </ButtonPrimitive>
        </div>
      </div>

      {/* Design tab panel */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <Tabs.TabPanel {...tabPanelPropsMap.design} height="fill">
          <ScrollContainer scroll="y" fill>
            {singleId ? (
              <NodePropertiesById nodeId={singleId} />
            ) : (
              <NoSelectionState multipleSelected={selectedIds.size > 1} />
            )}
          </ScrollContainer>
        </Tabs.TabPanel>

        {/* Prototype tab panel */}
        <Tabs.TabPanel {...tabPanelPropsMap.prototype} height="fill">
          <div className="flex flex-col flex-1 px-3 py-3 overflow-y-auto">
            <span className="text-bodyMd text-text-tertiary">
              Prototype interactions and flows
            </span>
          </div>
        </Tabs.TabPanel>
      </div>
    </>
  );
}

/** Wrapper that subscribes to a single node via useNode */
function NodePropertiesById({ nodeId }: { nodeId: string }) {
  const node = useNode(nodeId);
  if (!node) return null;
  return <NodeProperties node={node} />;
}

// ── No-selection state ────────────────────────────────────────────────

function NoSelectionState({ multipleSelected }: { multipleSelected: boolean }) {
  const store = useSceneGraph();
  const pageBg = usePageBackground();

  if (multipleSelected) {
    return (
      <div className="pl-3 pr-2 py-32px text-center text-text-tertiary text-bodyMd">
        Multiple selection
      </div>
    );
  }

  const handleBgChange = (hex: string) => {
    const color = hexToRgb(hex);
    if (!color) return;
    store.setPageBackground({ ...pageBg, color });
  };

  return (
    <>
      <div className="border-b border-border pb-12px">
        <div className="flex items-center justify-between pl-3 pr-2 h-40px">
          <span className="text-text text-bodyMdStrong">Page</span>
        </div>
        <PropertyRow columns="1fr auto">
          <Input.Group columns="1fr 52px">
            <Input.Root>
              <ColorSwatch color={pageBg.color} onChange={handleBgChange} />
              <HexInput color={pageBg.color} onChange={handleBgChange} />
            </Input.Root>
            <Input.Root>
              <OpacityInput
                value={pageBg.opacity}
                onChange={(v) => store.setPageBackground({ ...pageBg, opacity: v / 100 })}
              />
              <PercentSuffix />
            </Input.Root>
          </Input.Group>
          <IconButton aria-label="Toggle visibility">
            <Icon24Eye />
          </IconButton>
        </PropertyRow>
      </div>
      <PlaceholderSection title="Styles" actions />
      <PlaceholderSection title="Export" actions />
    </>
  );
}

// ── Node properties ──────────────────────────────────────────────────

function NodeProperties({ node }: { node: SceneNode }) {
  return (
    <>
      <NodeHeader node={node} />
      {isGeometryNode(node) && <PositionSection node={node} />}
      {isGeometryNode(node) && <LayoutSection node={node} />}
      {isGeometryNode(node) && <AppearanceSection node={node} />}
      {isAppearanceNode(node) && <FillSection node={node} />}
      {isAppearanceNode(node) && <StrokeSection node={node} />}
      <PlaceholderSection title="Effects" actions />
      <PlaceholderSection title="Export" actions />
    </>
  );
}

function NodeHeader({ node }: { node: SceneNode }) {
  return (
    <div className="flex items-center gap-2 pl-3 pr-2 h-panel-header box-content border-b border-border">
      <span className="text-text text-bodyLgStrong truncate flex-1 min-w-0">{nodeTypeLabel(node)}</span>
      <div className="flex items-center gap-4px flex-shrink-0">
        <IconButton aria-label="Settings"><Icon24MultiEdit /></IconButton>
        <IconButton aria-label="Select matching layers"><Icon24SelectMatching /></IconButton>
        <IconButton aria-label="More"><Icon24More /></IconButton>
      </div>
    </div>
  );
}

function nodeTypeLabel(node: SceneNode): string {
  switch (node.type) {
    case 'RECTANGLE': return 'Rectangle';
    case 'ELLIPSE': return 'Ellipse';
    case 'FRAME': return 'Frame';
    case 'TEXT': return 'Text';
    case 'LINE': return 'Line';
    case 'GROUP': return 'Group';
    case 'VECTOR': return 'Vector path';
  }
}

function PositionSection({ node }: { node: GeometryNode }) {
  const store = useSceneGraph();

  const updateField = useCallback(
    (field: string, value: number) => {
      store.updateNode(node.id, { [field]: value });
    },
    [store, node.id],
  );

  return (
    <PropertySection title="Position">
      <PropertyRow>
        <IconButtonGroup>
          <IconButtonGroup.Button aria-label="Align left"><Icon24LayoutAlignLeft /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align horizontal center"><Icon24LayoutAlignHorizontalCenter /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align right"><Icon24LayoutAlignRight /></IconButtonGroup.Button>
        </IconButtonGroup>
        <IconButtonGroup>
          <IconButtonGroup.Button aria-label="Align top"><Icon24LayoutAlignTop /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align vertical center"><Icon24LayoutAlignVerticalCenter /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align bottom"><Icon24LayoutAlignBottom /></IconButtonGroup.Button>
        </IconButtonGroup>
        <div />
      </PropertyRow>
      <PropertyRow>
        <NumericField label="X" value={node.x} onChange={(v) => updateField('x', v)} />
        <NumericField label="Y" value={node.y} onChange={(v) => updateField('y', v)} />
        <div />
      </PropertyRow>
      <PropertyRow>
        <NumericField
          label="Rotation"
          value={node.rotation}
          onChange={(v) => updateField('rotation', v)}
          icon={<Icon24Rotation />}
        />
        <IconButtonGroup>
          <IconButtonGroup.Button aria-label="Rotate"><Icon24Rotate /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Flip horizontal"><Icon24FlipHorizontal /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Flip vertical"><Icon24FlipVertical /></IconButtonGroup.Button>
        </IconButtonGroup>
        <div />
      </PropertyRow>
    </PropertySection>
  );
}

function LayoutSection({ node }: { node: GeometryNode }) {
  const store = useSceneGraph();
  const [constrained, setConstrained] = useState(false);
  const aspectRatio = node.width / node.height;
  const isFrame = node.type === 'FRAME';

  const updateField = useCallback(
    (field: string, value: number) => {
      if (constrained) {
        if (field === 'width') {
          store.updateNode(node.id, { width: value, height: value / aspectRatio });
        } else {
          store.updateNode(node.id, { height: value, width: value * aspectRatio });
        }
      } else {
        store.updateNode(node.id, { [field]: value });
      }
    },
    [store, node.id, constrained, aspectRatio],
  );

  return (
    <PropertySection
      title="Layout"
      headerActions={isFrame ? (
        <>
          <IconButton aria-label="Resize to fit"><Icon24ResizeToFit /></IconButton>
          <IconButton aria-label="Add auto layout"><Icon24AutolayoutAddVertical /></IconButton>
        </>
      ) : undefined}
    >
      {isFrame && <FrameLayoutRows node={node as FrameNode} />}
      <PropertyRow columns="1fr 1fr 24px">
        <NumericField
          label="W"
          value={node.width}
          onChange={(v) => updateField('width', v)}
          formatter={positiveFormatter}
        />
        <NumericField
          label="H"
          value={node.height}
          onChange={(v) => updateField('height', v)}
          formatter={positiveFormatter}
        />
        <IconButton
          aria-label={constrained ? 'Unlock proportions' : 'Lock proportions'}
          onClick={() => setConstrained(!constrained)}
        >
          <Icon24Link />
        </IconButton>
      </PropertyRow>
      {isFrame && <FrameSpacingRows node={node as FrameNode} />}
    </PropertySection>
  );
}

function FrameLayoutRows({ node }: { node: FrameNode }) {
  const store = useSceneGraph();

  return (
    <PropertyRow columns="1fr 24px">
      <SegmentedControl.Root
        value={node.layoutMode}
        onChange={(v) => store.updateNode(node.id, { layoutMode: v as FrameNode['layoutMode'] })}
        legend={<HiddenLegend>Layout direction</HiddenLegend>}
      >
        <SegmentedControl.Option value="NONE" icon={<Icon24AlLayoutGridNone />} aria-label="No auto layout" />
        <SegmentedControl.Option value="VERTICAL" icon={<Icon24AlLayoutGridVertical />} aria-label="Vertical" />
        <SegmentedControl.Option value="HORIZONTAL" icon={<Icon24AlLayoutGridHorizontal />} aria-label="Horizontal" />
        <SegmentedControl.Option value="GRID" icon={<Icon24GridView />} aria-label="Grid" />
      </SegmentedControl.Root>
      <div />
    </PropertyRow>
  );
}

function FrameSpacingRows({ node }: { node: FrameNode }) {
  const store = useSceneGraph();

  return (
    <>
      <PropertyRow>
        <NumericField
          label="Horizontal padding"
          value={node.paddingLeft}
          onChange={(v) => store.updateNode(node.id, { paddingLeft: v, paddingRight: v })}
          formatter={positiveFormatter}
          icon={<Icon24AlSpacingHorizontal />}
        />
        <NumericField
          label="Vertical padding"
          value={node.paddingTop}
          onChange={(v) => store.updateNode(node.id, { paddingTop: v, paddingBottom: v })}
          formatter={positiveFormatter}
          icon={<Icon24AlSpacingVertical />}
        />
        <div />
      </PropertyRow>
      <PropertyRow columns="auto 1fr 24px">
        <Checkbox
          checked={node.clipsContent}
          onChange={(checked) => store.updateNode(node.id, { clipsContent: checked })}
          label={<Label>Clip content</Label>}
          variant="muted"
        />
        <div />
        <div />
      </PropertyRow>
    </>
  );
}

function AppearanceSection({ node }: { node: GeometryNode }) {
  const store = useSceneGraph();

  return (
    <PropertySection
      title="Appearance"
      headerActions={(
        <>
          <IconButton aria-label="Toggle visibility"><Icon24Eye /></IconButton>
          <IconButton aria-label="Blend mode"><Icon24Blendmode /></IconButton>
        </>
      )}
    >
      <PropertyRow>
        <NumericField
          label="Opacity"
          icon={<Icon24Opacity />}
          value={Math.round(node.opacity * 100)}
          onChange={(v) => store.updateNode(node.id, { opacity: v / 100 })}
          formatter={percentFormatter}
        />
        {isAppearanceNode(node) ? (
          <NumericField
            label="Corner radius"
            icon={<Icon24Corners />}
            value={node.cornerRadius}
            onChange={(v) => store.updateNode(node.id, { cornerRadius: v })}
            formatter={positiveFormatter}
          />
        ) : (
          <div />
        )}
        <div />
      </PropertyRow>
    </PropertySection>
  );
}

function FillSection({ node }: { node: AppearanceNode }) {
  const store = useSceneGraph();
  const fill = node.fills[0];

  const handleColorChange = useCallback(
    (hex: string) => {
      const color = hexToRgb(hex);
      if (!color) return;
      const newFills = [...node.fills];
      newFills[0] = { ...newFills[0], color };
      store.updateNode(node.id, { fills: newFills });
    },
    [store, node.id, node.fills],
  );

  const handleOpacityChange = useCallback(
    (value: number) => {
      const newFills = [...node.fills];
      newFills[0] = { ...newFills[0], opacity: value / 100 };
      store.updateNode(node.id, { fills: newFills });
    },
    [store, node.id, node.fills],
  );

  if (!fill) return <PlaceholderSection title="Fill" actions />;

  return (
    <PropertySection
      title="Fill"
      headerActions={(
        <>
          <IconButton aria-label="Fill settings"><Icon16Settings /></IconButton>
          <IconButton aria-label="Add fill"><Icon24Plus /></IconButton>
        </>
      )}
    >
      <PropertyRow columns="1fr auto auto">
        <Input.Group columns="1fr 52px">
          <Input.Root>
            <ColorSwatch color={fill.color} onChange={handleColorChange} />
            <HexInput color={fill.color} onChange={handleColorChange} />
          </Input.Root>
          <Input.Root>
            <OpacityInput
              value={fill.opacity}
              onChange={handleOpacityChange}
            />
            <PercentSuffix />
          </Input.Root>
        </Input.Group>
        <IconButton aria-label="Toggle visibility">
          <Icon16Visible />
        </IconButton>
        <IconButton aria-label="Remove fill">
          <Icon16Remove />
        </IconButton>
      </PropertyRow>
    </PropertySection>
  );
}

function StrokeSection({ node }: { node: AppearanceNode }) {
  const store = useSceneGraph();
  const stroke = node.strokes[0];

  const handleColorChange = useCallback(
    (hex: string) => {
      const color = hexToRgb(hex);
      if (!color) return;
      const newStrokes = [...node.strokes];
      newStrokes[0] = {
        ...newStrokes[0],
        paint: { ...newStrokes[0].paint, color },
      };
      store.updateNode(node.id, { strokes: newStrokes });
    },
    [store, node.id, node.strokes],
  );

  const handleWeightChange = useCallback(
    (value: number) => {
      const newStrokes = [...node.strokes];
      newStrokes[0] = { ...newStrokes[0], weight: value };
      store.updateNode(node.id, { strokes: newStrokes });
    },
    [store, node.id, node.strokes],
  );

  const handlePositionChange = useCallback(
    (value: string) => {
      const pos = value as Stroke['position'];
      const newStrokes = [...node.strokes];
      newStrokes[0] = { ...newStrokes[0], position: pos };
      store.updateNode(node.id, { strokes: newStrokes });
    },
    [store, node.id, node.strokes],
  );

  if (!stroke) return <PlaceholderSection title="Stroke" actions />;

  return (
    <PropertySection
      title="Stroke"
      headerActions={(
        <>
          <IconButton aria-label="Stroke settings"><Icon16Settings /></IconButton>
          <IconButton aria-label="Add stroke"><Icon24Plus /></IconButton>
        </>
      )}
    >
      <PropertyRow columns="1fr auto auto">
        <Input.Group columns="1fr 52px">
          <Input.Root>
            <ColorSwatch color={stroke.paint.color} onChange={handleColorChange} />
            <HexInput color={stroke.paint.color} onChange={handleColorChange} />
          </Input.Root>
          <Input.Root>
            <OpacityInput
              value={stroke.paint.opacity}
              onChange={(v) => {
                const newStrokes = [...node.strokes];
                newStrokes[0] = {
                  ...newStrokes[0],
                  paint: { ...newStrokes[0].paint, opacity: v / 100 },
                };
                store.updateNode(node.id, { strokes: newStrokes });
              }}
            />
            <PercentSuffix />
          </Input.Root>
        </Input.Group>
        <IconButton aria-label="Toggle visibility">
          <Icon16Visible />
        </IconButton>
        <IconButton aria-label="Remove stroke">
          <Icon16Remove />
        </IconButton>
      </PropertyRow>
      <PropertyRow>
        <Select.Root value={stroke.position} onChange={(v) => v && handlePositionChange(v)}>
          <Select.Trigger label={<HiddenLabel>Stroke position</HiddenLabel>} width="fill" />
          <Select.Container>
            <Select.Option value="INSIDE">Inside</Select.Option>
            <Select.Option value="CENTER">Center</Select.Option>
            <Select.Option value="OUTSIDE">Outside</Select.Option>
          </Select.Container>
        </Select.Root>
        <NumericField
          label="Wt"
          value={stroke.weight}
          onChange={handleWeightChange}
          formatter={positiveFormatter}
        />
        <div />
      </PropertyRow>
    </PropertySection>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function isGeometryNode(node: SceneNode): node is GeometryNode {
  return 'x' in node && 'y' in node && 'width' in node && 'height' in node;
}

function isAppearanceNode(node: SceneNode): node is AppearanceNode {
  return 'fills' in node && 'strokes' in node;
}
