import { useCallback, useMemo, useState } from 'react';
import {
  ButtonPrimitive, Checkbox, FormattedInput, HiddenLabel, HiddenLegend, IconButton, Input, Label, ScrollContainer, SegmentedControl, Select, Tabs,
} from '@figma/fpl-components';
import { MenuV2, SplitInput } from '@figma/fpl-components/beta';
import {
  Icon16ChevronDown,
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
  Icon24TextAlignBottom,
  Icon24TextAlignCenter,
  Icon24TextAlignLeft,
  Icon24TextAlignMiddle,
  Icon24TextAlignRight,
  Icon24TextAlignTop,
  Icon24TextLetterSpacing,
  Icon24TextLineHeight,
  Icon24TextResizeFixed,
  Icon24TextResizeHeight,
  Icon24TextResizeWidth,
  Icon24Adjust,
  Icon24CountPolygon,
  Icon24CountStar,
  Icon24Hidden,
  Icon24Minus,
  Icon24Styles,
  Icon24StrokeWeight,
  Icon24Border,
  Icon24AspectRatio,
  Icon24Angle,
  Icon24LayoutDistributeHorizontalSpacing,
  Icon24LayoutDistributeVerticalSpacing,
  Icon24LayoutTidyUpGrid,
} from '@figma/fpl-icons';

import {
  alignChildren,
  alignNodes,
  createPaint,
  distributeNodes,
  isMixed,
  useCanvasId,
  usePageBackground,
  useSceneGraph,
  useSelection,
  useMixedChangeHandler,
  useSelectionProperty,
  useSelectionPropertySetter,
  useSelectionPaints,
  useViewportState,
} from '../../canvas';
import type {
  AlignDirection,
  AppearanceNode,
  Color,
  DistributeDirection,
  FrameNode,
  GeometryNode,
  NodeId,
  Paint,
  SceneNode,
  SelectionPaint,
  TextNode,
} from '../../canvas';
import { IconButtonGroup } from '../icon-button-group';
import { PropertySection, PropertyRow, PlaceholderSection } from '@prototype/shared';
import { NumericField, positiveFormatter, percentFormatter, type NumericFieldChangeOpts } from '../numeric-field';
import { ColorSwatch, HexInput, OpacityInput } from '../color-inputs';

const FONT_SIZE_PRESETS = ['10', '11', '12', '13', '14', '15', '16', '20', '24', '32', '36', '40', '48', '64', '96', '128'];

type DesignTab = 'design' | 'prototype';

export function DesignModeContent() {
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<DesignTab>(
    { design: true, prototype: true },
    { defaultActive: 'design' },
  );

  const { selectedIds } = useSelection();
  const { state: { scale } } = useViewportState();

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
            {selectedIds.size > 0 ? (
              <SelectionProperties selectedIds={selectedIds} />
            ) : (
              <NoSelectionState />
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

// ── No-selection state ────────────────────────────────────────────────

function NoSelectionState() {
  const sg = useSceneGraph();
  const canvasId = useCanvasId();
  const pageBg = usePageBackground(canvasId);

  const handleBgChange = (color: Color) => {
    sg.updateNode(canvasId, { backgroundColor: color });
  };

  return (
    <>
      <div className="border-b border-border pb-12px">
        <div className="flex items-center justify-between pl-3 pr-2 h-40px">
          <span className="text-text text-bodyMdStrong">Page</span>
        </div>
        <PropertyRow columns="1fr auto">
          <Input.Group columns="1fr 52px">
            <FormattedInput.Root>
              <ColorSwatch color={pageBg.color} onChange={handleBgChange} />
              <HexInput color={pageBg.color} onChange={handleBgChange} />
            </FormattedInput.Root>
            <OpacityInput
              value={pageBg.opacity}
              onChange={() => sg.updateNode(canvasId, { backgroundColor: pageBg.color })}
            />
          </Input.Group>
          <IconButton
            aria-label="Toggle visibility"
            onClick={() => sg.updateNode(canvasId, { backgroundVisible: !pageBg.visible })}
          >
            {pageBg.visible ? <Icon24Eye /> : <Icon24Hidden />}
          </IconButton>
        </PropertyRow>
      </div>
      <PlaceholderSection title="Styles" actions />
      <PlaceholderSection title="Export" actions />
    </>
  );
}

// ── Selection properties (unified for single + multi) ─────────────────

function SelectionProperties({ selectedIds }: { selectedIds: ReadonlySet<NodeId> }) {
  const sg = useSceneGraph();

  // Classify which node types are in the selection
  const { singleNode, allGeometry, allAppearance, allText, geoCount } = useMemo(() => {
    let geoN = 0;
    let appN = 0;
    let textN = 0;
    let single: SceneNode | null = null;

    for (const id of selectedIds) {
      const node = sg.getNode(id);
      if (!node) continue;
      if (selectedIds.size === 1) single = node;
      if (isGeometryNode(node)) geoN++;
      if (isAppearanceNode(node)) appN++;
      if (isTextNode(node)) textN++;
    }

    return {
      singleNode: single,
      allGeometry: geoN === selectedIds.size,
      allAppearance: appN === selectedIds.size,
      allText: textN === selectedIds.size,
      geoCount: geoN,
    };
  }, [selectedIds, sg]);

  return (
    <>
      <SelectionHeader singleNode={singleNode} count={selectedIds.size} />

      {/* Position — always shown when all are geometry */}
      {allGeometry && <PositionSection singleNode={singleNode} selectedIds={selectedIds} geoCount={geoCount} />}

      {/* Layout — text has its own layout section, otherwise show for geometry */}
      {allText && singleNode && <TextLayoutSection />}
      {!allText && allGeometry && <LayoutSection singleNode={singleNode as GeometryNode | null} />}

      {/* Typography — only for text nodes */}
      {allText && singleNode && <TypographySection />}

      {/* Appearance — shown when all are geometry */}
      {allGeometry && <AppearanceSection singleNode={singleNode as GeometryNode | null} allAppearance={allAppearance} />}

      {/* Fill/Stroke — shown when all support appearance */}
      {allAppearance && <FillSection />}
      {allAppearance && <StrokeSection />}

      <PlaceholderSection title="Effects" actions />
      <PlaceholderSection title="Export" actions />
    </>
  );
}

function SelectionHeader({ singleNode, count }: { singleNode: SceneNode | null; count: number }) {
  const label = singleNode ? nodeTypeLabel(singleNode) : `${count} layers`;

  return (
    <div className="flex items-center gap-2 pl-3 pr-2 h-panel-header box-content border-b border-border">
      <span className="text-text text-bodyLgStrong truncate flex-1 min-w-0">{label}</span>
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
    case 'SECTION': return 'Section';
    case 'TEXT': return 'Text';
    case 'LINE': return 'Line';
    case 'GROUP': return 'Group';
    case 'VECTOR': return 'Vector path';
    case 'POLYGON': return 'Polygon';
    case 'STAR': return 'Star';
    case 'STICKY_NOTE': return 'Sticky note';
    case 'CONNECTOR': return 'Connector';
    default: return node.type;
  }
}

// ── Position ────────────────────────────────────────────────────────

function PositionSection({ singleNode, selectedIds, geoCount }: { singleNode: SceneNode | null; selectedIds: ReadonlySet<NodeId>; geoCount: number }) {
  const sg = useSceneGraph();
  const [x, setX] = useSelectionProperty('x');
  const [y, setY] = useSelectionProperty('y');
  const [rotation, setRotation] = useSelectionProperty('rotation');
  const mixedX = useMixedChangeHandler('x');
  const mixedY = useMixedChangeHandler('y');
  const mixedRotation = useMixedChangeHandler('rotation');

  // Multi-select: align nodes relative to each other
  const isMulti = geoCount >= 2;

  // Single-selection: containers with 2+ children can align children
  const hasChildren = singleNode && 'children' in singleNode && Array.isArray(singleNode.children) && singleNode.children.length >= 2;

  const handleAlignChildren = useCallback(
    (direction: AlignDirection) => {
      if (!hasChildren || !singleNode) return;
      alignChildren(sg, singleNode.id, direction);
    },
    [sg, singleNode, hasChildren],
  );

  const handleAlignNodes = useCallback(
    (direction: AlignDirection) => { alignNodes(sg, selectedIds, direction) },
    [sg, selectedIds],
  );

  const handleDistribute = useCallback(
    (direction: DistributeDirection) => { distributeNodes(sg, selectedIds, direction) },
    [sg, selectedIds],
  );

  // Multi-select: always enabled. Single-select: only for containers with children.
  const alignDisabled = !isMulti && !hasChildren;
  const handleAlign = isMulti ? handleAlignNodes : handleAlignChildren;
  const canDistribute = geoCount >= 3;
  const tidyMenu = MenuV2.useMenu();
  // Call getTriggerProps() unconditionally — it contains useMergeRefs (a hook)
  // so calling it conditionally violates the Rules of Hooks.
  const tidyTriggerProps = tidyMenu.getTriggerProps();

  return (
    <PropertySection title="Position">
      <PropertyRow>
        <IconButtonGroup>
          <IconButtonGroup.Button aria-label="Align left" disabled={alignDisabled} onClick={() => handleAlign('left')}><Icon24LayoutAlignLeft /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align horizontal center" disabled={alignDisabled} onClick={() => handleAlign('center-h')}><Icon24LayoutAlignHorizontalCenter /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align right" disabled={alignDisabled} onClick={() => handleAlign('right')}><Icon24LayoutAlignRight /></IconButtonGroup.Button>
        </IconButtonGroup>
        <IconButtonGroup>
          <IconButtonGroup.Button aria-label="Align top" disabled={alignDisabled} onClick={() => handleAlign('top')}><Icon24LayoutAlignTop /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align vertical center" disabled={alignDisabled} onClick={() => handleAlign('center-v')}><Icon24LayoutAlignVerticalCenter /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align bottom" disabled={alignDisabled} onClick={() => handleAlign('bottom')}><Icon24LayoutAlignBottom /></IconButtonGroup.Button>
        </IconButtonGroup>
        {isMulti ? (
          <>
            <IconButton aria-label="Tidy up and distribute" {...tidyTriggerProps}>
              <Icon24LayoutTidyUpGrid />
            </IconButton>
            <MenuV2.Root manager={tidyMenu.manager}>
              <MenuV2.Item onClick={() => {}} lead={<Icon24LayoutTidyUpGrid />} trail="^⌥T">
                Tidy up
              </MenuV2.Item>
              <MenuV2.Item onClick={() => handleDistribute('vertical')} disabled={!canDistribute} lead={<Icon24LayoutDistributeVerticalSpacing />} trail="^⌥V">
                Distribute vertical spacing
              </MenuV2.Item>
              <MenuV2.Item onClick={() => handleDistribute('horizontal')} disabled={!canDistribute} lead={<Icon24LayoutDistributeHorizontalSpacing />} trail="^⌥H">
                Distribute horizontal spacing
              </MenuV2.Item>
            </MenuV2.Root>
          </>
        ) : (
          <div />
        )}
      </PropertyRow>
      <PropertyRow>
        <NumericField
          label="X"
          value={x ?? 0}
          onChange={setX}
          onMixedChange={mixedX}
        />
        <NumericField
          label="Y"
          value={y ?? 0}
          onChange={setY}
          onMixedChange={mixedY}
        />
        <div />
      </PropertyRow>
      <PropertyRow>
        <NumericField
          label="Rotation"
          value={rotation ?? 0}
          onChange={setRotation}
          onMixedChange={mixedRotation}
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

// ── Text layout ─────────────────────────────────────────────────────

function TextLayoutSection() {
  const setProperties = useSelectionPropertySetter();
  const [textAutoResize, setTextAutoResize] = useSelectionProperty('textAutoResize');
  const [width] = useSelectionProperty('width');
  const [height] = useSelectionProperty('height');

  const handleW = useCallback(
    (v: number, opts: NumericFieldChangeOpts) => {
      const updates: Record<string, unknown> = { width: v };
      if (textAutoResize === 'WIDTH_AND_HEIGHT') {
        updates.textAutoResize = 'HEIGHT';
      }
      setProperties(updates, opts);
    },
    [setProperties, textAutoResize],
  );

  const handleH = useCallback(
    (v: number, opts: NumericFieldChangeOpts) => {
      const updates: Record<string, unknown> = { height: v };
      if (textAutoResize !== 'NONE') {
        updates.textAutoResize = 'NONE';
      }
      setProperties(updates, opts);
    },
    [setProperties, textAutoResize],
  );

  const wDisabled = textAutoResize === 'WIDTH_AND_HEIGHT';
  const hDisabled = textAutoResize !== 'NONE';

  return (
    <PropertySection
      title="Layout"
      headerActions={
        <IconButton aria-label="Resize to fit"><Icon24ResizeToFit /></IconButton>
      }
    >
      <PropertyRow columns="1fr 24px">
        <SegmentedControl.Root
          value={!isMixed(textAutoResize) ? textAutoResize : undefined}
          onChange={(v) => setTextAutoResize(v as TextNode['textAutoResize'])}
          legend={<HiddenLegend>Resizing</HiddenLegend>}
        >
          <SegmentedControl.Option value="WIDTH_AND_HEIGHT" icon={<Icon24TextResizeWidth />} aria-label="Auto width" />
          <SegmentedControl.Option value="HEIGHT" icon={<Icon24TextResizeHeight />} aria-label="Auto height" />
          <SegmentedControl.Option value="NONE" icon={<Icon24TextResizeFixed />} aria-label="Fixed size" />
        </SegmentedControl.Root>
        <div />
      </PropertyRow>
      <PropertyRow columns="1fr 1fr 24px">
        <NumericField
          label="W"
          value={width ?? 0}
          onChange={handleW}
          formatter={positiveFormatter}
          disabled={wDisabled}
        />
        <NumericField
          label="H"
          value={height ?? 0}
          onChange={handleH}
          formatter={positiveFormatter}
          disabled={hDisabled}
        />
        <IconButton aria-label="Resize to fit">
          <Icon24AspectRatio />
        </IconButton>
      </PropertyRow>
    </PropertySection>
  );
}

// ── Typography ──────────────────────────────────────────────────────

function TypographySection() {
  const [fontFamily, setFontFamily] = useSelectionProperty('fontFamily');
  const [fontWeight, setFontWeight] = useSelectionProperty('fontWeight');
  const [fontSize, setFontSize] = useSelectionProperty('fontSize');
  const [lineHeight, setLineHeight] = useSelectionProperty('lineHeight');
  const [letterSpacing, setLetterSpacing] = useSelectionProperty('letterSpacing');
  const [textAlignHorizontal, setTextAlignHorizontal] = useSelectionProperty('textAlignHorizontal');
  const [textAlignVertical, setTextAlignVertical] = useSelectionProperty('textAlignVertical');

  return (
    <PropertySection title="Typography">
      {/* Font family + weight */}
      <PropertyRow columns="1fr 24px">
        <Select.Root value={!isMixed(fontFamily) ? (fontFamily ?? 'Inter') : undefined} onChange={(v) => v && setFontFamily(v)}>
          <Select.Trigger label={<HiddenLabel>Font family</HiddenLabel>} width="fill" />
          <Select.Container>
            <Select.Option value="Inter">Inter</Select.Option>
            <Select.Option value="Roboto">Roboto</Select.Option>
            <Select.Option value="Arial">Arial</Select.Option>
            <Select.Option value="Georgia">Georgia</Select.Option>
            <Select.Option value="monospace">Monospace</Select.Option>
          </Select.Container>
        </Select.Root>
        <div />
      </PropertyRow>

      {/* Font size + line height */}
      <PropertyRow columns="1fr 1fr 24px">
        <Select.Root value={!isMixed(fontWeight) ? String(fontWeight ?? 400) : undefined} onChange={(v) => v && setFontWeight(Number(v))}>
          <Select.Trigger label={<HiddenLabel>Font weight</HiddenLabel>} width="fill" />
          <Select.Container>
            <Select.Option value="300">Light</Select.Option>
            <Select.Option value="400">Regular</Select.Option>
            <Select.Option value="500">Medium</Select.Option>
            <Select.Option value="600">Semi Bold</Select.Option>
            <Select.Option value="700">Bold</Select.Option>
          </Select.Container>
        </Select.Root>
        <SplitInput
          aria-label="Font size"
          value={!isMixed(fontSize) ? String(fontSize ?? 16) : ''}
          onChange={(v) => {
            if (typeof v === 'string') setFontSize(Number(v));
          }}
        >
          <SplitInput.OptionGroup
            title={
              <SplitInput.MenuHiddenTitle>
                Font size presets
              </SplitInput.MenuHiddenTitle>
            }
          >
            {FONT_SIZE_PRESETS.map((size) => (
              <SplitInput.Option key={size} value={size}>
                {size}
              </SplitInput.Option>
            ))}
          </SplitInput.OptionGroup>
        </SplitInput>
        <div />
      </PropertyRow>

      {/* Letter spacing */}
      <PropertyRow>
        <NumericField
          label="Line height"
          value={lineHeight ?? 20}
          onChange={setLineHeight}
          formatter={positiveFormatter}
          icon={<Icon24TextLineHeight />}
        />
        <NumericField
          label="Letter spacing"
          value={letterSpacing ?? 0}
          onChange={setLetterSpacing}
          icon={<Icon24TextLetterSpacing />}
        />
        <div />
      </PropertyRow>

      {/* Horizontal alignment */}
      <PropertyRow columns="1fr 1fr 24px">
        <SegmentedControl.Root
          value={!isMixed(textAlignHorizontal) ? textAlignHorizontal : undefined}
          onChange={(v) => setTextAlignHorizontal(v as TextNode['textAlignHorizontal'])}
          legend={<HiddenLegend>Horizontal alignment</HiddenLegend>}
        >
          <SegmentedControl.Option value="LEFT" icon={<Icon24TextAlignLeft />} aria-label="Align left" />
          <SegmentedControl.Option value="CENTER" icon={<Icon24TextAlignCenter />} aria-label="Align center" />
          <SegmentedControl.Option value="RIGHT" icon={<Icon24TextAlignRight />} aria-label="Align right" />
        </SegmentedControl.Root>
        <SegmentedControl.Root
          value={!isMixed(textAlignVertical) ? textAlignVertical : undefined}
          onChange={(v) => setTextAlignVertical(v as TextNode['textAlignVertical'])}
          legend={<HiddenLegend>Vertical alignment</HiddenLegend>}
        >
          <SegmentedControl.Option value="TOP" icon={<Icon24TextAlignTop />} aria-label="Align top" />
          <SegmentedControl.Option value="CENTER" icon={<Icon24TextAlignMiddle />} aria-label="Align middle" />
          <SegmentedControl.Option value="BOTTOM" icon={<Icon24TextAlignBottom />} aria-label="Align bottom" />
        </SegmentedControl.Root>
        <IconButton aria-label="Type settings"><Icon24Adjust /></IconButton>
      </PropertyRow>

    </PropertySection>
  );
}

// ── Layout ──────────────────────────────────────────────────────────

function LayoutSection({ singleNode }: { singleNode: GeometryNode | null }) {
  const setProperties = useSelectionPropertySetter();
  const [width, setWidth] = useSelectionProperty('width');
  const [height, setHeight] = useSelectionProperty('height');
  const mixedW = useMixedChangeHandler('width');
  const mixedH = useMixedChangeHandler('height');
  const [constrained, setConstrained] = useState(false);
  const w = isMixed(width) ? 0 : width ?? 0;
  const h = isMixed(height) ? 0 : height ?? 0;
  const aspectRatio = h !== 0 ? w / h : 1;
  const isFrame = singleNode?.type === 'FRAME';

  const updateSize = useCallback(
    (field: string, value: number, opts: NumericFieldChangeOpts) => {
      if (constrained) {
        if (field === 'width') {
          setProperties({ width: value, height: value / aspectRatio }, opts);
        } else {
          setProperties({ height: value, width: value * aspectRatio }, opts);
        }
      } else {
        setProperties({ [field]: value }, opts);
      }
    },
    [setProperties, constrained, aspectRatio],
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
      {isFrame && singleNode && <FrameLayoutRows />}
      <PropertyRow columns="1fr 1fr 24px">
        <NumericField
          label="W"
          value={width ?? 0}
          onChange={constrained ? (v, opts) => updateSize('width', v, opts) : setWidth}
          formatter={positiveFormatter}
          onMixedChange={mixedW}
        />
        <NumericField
          label="H"
          value={height ?? 0}
          onChange={constrained ? (v, opts) => updateSize('height', v, opts) : setHeight}
          formatter={positiveFormatter}
          onMixedChange={mixedH}
        />
        <IconButton
          aria-label={constrained ? 'Unlock proportions' : 'Lock proportions'}
          onClick={() => setConstrained(!constrained)}
        >
          <Icon24AspectRatio />
        </IconButton>
      </PropertyRow>
      {isFrame && singleNode && <FrameSpacingRows />}
    </PropertySection>
  );
}

function FrameLayoutRows() {
  const [layoutMode, setLayoutMode] = useSelectionProperty('layoutMode');

  return (
    <PropertyRow columns="1fr 24px">
      <SegmentedControl.Root
        value={!isMixed(layoutMode) ? layoutMode : undefined}
        onChange={(v) => setLayoutMode(v as FrameNode['layoutMode'])}
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

function FrameSpacingRows() {
  const setProperties = useSelectionPropertySetter();
  const [paddingLeft] = useSelectionProperty('paddingLeft');
  const [paddingTop] = useSelectionProperty('paddingTop');
  const [clipsContent, setClipsContent] = useSelectionProperty('clipsContent');

  return (
    <>
      <PropertyRow>
        <NumericField
          label="Horizontal padding"
          value={paddingLeft ?? 0}
          onChange={(v, opts) => setProperties({ paddingLeft: v, paddingRight: v }, opts)}
          formatter={positiveFormatter}
          icon={<Icon24AlSpacingHorizontal />}
        />
        <NumericField
          label="Vertical padding"
          value={paddingTop ?? 0}
          onChange={(v, opts) => setProperties({ paddingTop: v, paddingBottom: v }, opts)}
          formatter={positiveFormatter}
          icon={<Icon24AlSpacingVertical />}
        />
        <div />
      </PropertyRow>
      <PropertyRow columns="auto 1fr 24px">
        <Checkbox
          checked={!isMixed(clipsContent) && (clipsContent ?? false)}
          mixed={isMixed(clipsContent)}
          onChange={(checked) => setClipsContent(checked)}
          label={<Label>Clip content</Label>}
          variant="muted"
        />
        <div />
        <div />
      </PropertyRow>
    </>
  );
}

// ── Appearance ──────────────────────────────────────────────────────

function AppearanceSection({ singleNode, allAppearance }: { singleNode: GeometryNode | null; allAppearance: boolean }) {
  const [opacity, setOpacity] = useSelectionProperty('opacity');
  const [cornerRadius, setCornerRadius] = useSelectionProperty('cornerRadius');
  const [sides, setSides] = useSelectionProperty('sides');
  const [points, setPoints] = useSelectionProperty('points');
  const [innerRadius, setInnerRadius] = useSelectionProperty('innerRadius');
  const mixedCornerRadius = useMixedChangeHandler('cornerRadius');

  // Opacity is stored as 0-1 but displayed as 0-100. Wrap the handler
  // to convert between display space and storage space.
  const mixedOpacityRaw = useMixedChangeHandler('opacity');
  const mixedOpacity = useCallback(
    (transform: (v: number) => number, commit: boolean) => {
      mixedOpacityRaw((stored) => transform(stored * 100) / 100, commit);
    },
    [mixedOpacityRaw],
  );

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
          value={isMixed(opacity) ? opacity : Math.round((opacity ?? 1) * 100)}
          onChange={(v, opts) => setOpacity(v / 100, opts)}
          formatter={percentFormatter}
          onMixedChange={mixedOpacity}
        />
        {allAppearance ? (
          <NumericField
            label="Corner radius"
            icon={<Icon24Corners />}
            value={cornerRadius ?? 0}
            onChange={setCornerRadius}
            formatter={positiveFormatter}
            onMixedChange={mixedCornerRadius}
          />
        ) : (
          <div />
        )}
        {singleNode && (singleNode.type === 'POLYGON' || singleNode.type === 'STAR') ? (
          <IconButton aria-label="Adjust"><Icon24Adjust /></IconButton>
        ) : (
          <IconButton aria-label="Individual corners"><Icon24Corners /></IconButton>
        )}
      </PropertyRow>
      {singleNode?.type === 'POLYGON' && (
        <PropertyRow>
          <NumericField
            label="Sides"
            icon={<Icon24CountPolygon />}
            value={sides ?? 3}
            onChange={(v, opts) => setSides(Math.max(3, Math.round(v)), opts)}
            formatter={positiveFormatter}
          />
          <div />
        </PropertyRow>
      )}
      {singleNode?.type === 'STAR' && (
        <PropertyRow>
          <NumericField
            label="Points"
            icon={<Icon24CountStar />}
            value={points ?? 5}
            onChange={(v, opts) => setPoints(Math.max(3, Math.round(v)), opts)}
            formatter={positiveFormatter}
          />
          <NumericField
            label="Inner radius"
            icon={<Icon24Angle />}
            value={Math.round((isMixed(innerRadius) ? 0.382 : (innerRadius ?? 0.382)) * 1000) / 10}
            onChange={(v, opts) => setInnerRadius(v / 100, opts)}
            formatter={percentFormatter}
          />
          <div />
        </PropertyRow>
      )}
    </PropertySection>
  );
}

// ── Fill ─────────────────────────────────────────────────────────────
// Uses the selection paints hook — works for single and multi-select.

function FillSection() {
  const { paints, updatePaint, addPaint, removePaint, toggleVisibility } = useSelectionPaints('fills');

  const handleAdd = useCallback(() => {
    const newFill: Paint = createPaint({ type: 'SOLID', color: { r: 196, g: 196, b: 196 }, opacity: 1, visible: true });
    addPaint(newFill);
  }, [addPaint]);

  if (paints.length === 0) return <PlaceholderSection title="Fill" actions onAdd={handleAdd} />;

  return (
    <PropertySection
      title="Fill"
      headerActions={(
        <>
          <IconButton aria-label="Fill settings"><Icon24Styles /></IconButton>
          <IconButton aria-label="Add fill" onClick={handleAdd}><Icon24Plus /></IconButton>
        </>
      )}
    >
      {[...paints].reverse().map((sp) => (
        <FillRow
          key={sp.paint.id}
          selectionPaint={sp}
          onUpdate={updatePaint}
          onRemove={removePaint}
          onToggleVisibility={toggleVisibility}
        />
      ))}
    </PropertySection>
  );
}

function FillRow({
  selectionPaint,
  onUpdate,
  onRemove,
  onToggleVisibility,
}: {
  selectionPaint: SelectionPaint
  onUpdate: (original: Paint, updated: Paint) => void
  onRemove: (original: Paint) => void
  onToggleVisibility: (original: Paint) => void
}) {
  const { paint } = selectionPaint;

  const handleColorChange = useCallback(
    (color: Color) => {
      onUpdate(paint, { ...paint, color });
    },
    [paint, onUpdate],
  );

  const handleOpacityChange = useCallback(
    (value: number) => {
      onUpdate(paint, { ...paint, opacity: value / 100 });
    },
    [paint, onUpdate],
  );

  return (
    <PropertyRow columns="1fr auto auto" style={{ opacity: paint.visible ? 1 : 0.4 }}>
      <Input.Group columns="1fr 52px">
        <FormattedInput.Root>
          <ColorSwatch color={paint.color} onChange={handleColorChange} />
          <HexInput color={paint.color} onChange={handleColorChange} />
        </FormattedInput.Root>
        <OpacityInput
          value={paint.opacity}
          onChange={handleOpacityChange}
        />
      </Input.Group>
      <IconButton aria-label="Toggle visibility" onClick={() => onToggleVisibility(paint)}>
        {paint.visible ? <Icon24Eye /> : <Icon24Hidden />}
      </IconButton>
      <IconButton aria-label="Remove fill" onClick={() => onRemove(paint)}>
        <Icon24Minus />
      </IconButton>
    </PropertyRow>
  );
}

// ── Stroke ───────────────────────────────────────────────────────────
// Uses selection paints hook + selection property hooks for weight/align.

function StrokeSection() {
  const { paints, updatePaint, addPaint, removePaint, toggleVisibility } = useSelectionPaints('strokes');
  const [strokeWeight, setStrokeWeight] = useSelectionProperty('strokeWeight');
  const [strokeAlign, setStrokeAlign] = useSelectionProperty('strokeAlign');
  const mixedStrokeWeight = useMixedChangeHandler('strokeWeight');

  const handleAdd = useCallback(() => {
    const newPaint: Paint = createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true });
    addPaint(newPaint);
  }, [addPaint]);

  if (paints.length === 0) {
    return (
      <PropertySection
        title="Stroke"
        headerActions={
          <IconButton aria-label="Add stroke" onClick={handleAdd}><Icon24Plus /></IconButton>
        }
      />
    );
  }

  return (
    <PropertySection
      title="Stroke"
      headerActions={(
        <>
          <IconButton aria-label="Stroke settings"><Icon24Styles /></IconButton>
          <IconButton aria-label="Add stroke" onClick={handleAdd}><Icon24Plus /></IconButton>
        </>
      )}
    >
      {[...paints].reverse().map((sp) => (
        <StrokeRow
          key={sp.paint.id}
          selectionPaint={sp}
          onUpdate={updatePaint}
          onRemove={removePaint}
          onToggleVisibility={toggleVisibility}
        />
      ))}
      <PropertyRow columns="1fr 1fr 24px 24px">
        <Select.Root value={strokeAlign ?? 'CENTER'} onChange={(v) => v && setStrokeAlign(v as GeometryNode['strokeAlign'])}>
          <Select.Trigger label={<HiddenLabel>Stroke position</HiddenLabel>} width="fill" />
          <Select.Container>
            <Select.Option value="INSIDE">Inside</Select.Option>
            <Select.Option value="CENTER">Center</Select.Option>
            <Select.Option value="OUTSIDE">Outside</Select.Option>
          </Select.Container>
        </Select.Root>
        <NumericField
          label="Wt"
          icon={<Icon24StrokeWeight />}
          value={strokeWeight ?? 1}
          onChange={setStrokeWeight}
          formatter={positiveFormatter}
          onMixedChange={mixedStrokeWeight}
        />
        <IconButton aria-label="Stroke settings">
          <Icon24Adjust />
        </IconButton>
        <IconButton aria-label="Stroke type">
          <Icon24Border />
        </IconButton>
      </PropertyRow>
    </PropertySection>
  );
}

function StrokeRow({
  selectionPaint,
  onUpdate,
  onRemove,
  onToggleVisibility,
}: {
  selectionPaint: SelectionPaint
  onUpdate: (original: Paint, updated: Paint) => void
  onRemove: (original: Paint) => void
  onToggleVisibility: (original: Paint) => void
}) {
  const { paint } = selectionPaint;

  const handleColorChange = useCallback(
    (color: Color) => {
      onUpdate(paint, { ...paint, color });
    },
    [paint, onUpdate],
  );

  const handleOpacityChange = useCallback(
    (value: number) => {
      onUpdate(paint, { ...paint, opacity: value / 100 });
    },
    [paint, onUpdate],
  );

  return (
    <PropertyRow columns="1fr 24px 24px" style={{ opacity: paint.visible ? 1 : 0.4 }}>
      <Input.Group columns="1fr 52px">
        <FormattedInput.Root>
          <ColorSwatch color={paint.color} onChange={handleColorChange} />
          <HexInput color={paint.color} onChange={handleColorChange} />
        </FormattedInput.Root>
        <OpacityInput
          value={paint.opacity}
          onChange={handleOpacityChange}
        />
      </Input.Group>
      <IconButton aria-label="Toggle visibility" onClick={() => onToggleVisibility(paint)}>
        {paint.visible ? <Icon24Eye /> : <Icon24Hidden />}
      </IconButton>
      <IconButton aria-label="Remove stroke" onClick={() => onRemove(paint)}>
        <Icon24Minus />
      </IconButton>
    </PropertyRow>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function isTextNode(node: SceneNode): node is TextNode {
  return node.type === 'TEXT';
}

function isGeometryNode(node: SceneNode): node is GeometryNode {
  return 'x' in node && 'y' in node && 'width' in node && 'height' in node;
}

function isAppearanceNode(node: SceneNode): node is AppearanceNode {
  return 'fills' in node && 'strokes' in node;
}
