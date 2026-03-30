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
  createPaint,
  FONT_OPTIONS,
  getFontOptionWeights,
  isMixed,
  useAlignHandler,
  useCanvasId,
  useLocalFonts,
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
  AppearanceNode,
  Color,
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
import { useAnimationStore, type AnimationColor, type AnimationType, type EasingType, type TimelineAnimation } from '../../contexts/AnimationStoreContext';
import { useKeyframeStoreOptional, type KeyframeableProperty } from '../../contexts/KeyframeStoreContext';
import { usePlaybackOptional } from '../../contexts/PlaybackContext';
import { interpolateKeyframes } from '../../canvas/animation-utils';
import { Icon24ChevronLeftLarge } from '@figma/fpl-icons';

const FONT_SIZE_PRESETS = ['10', '11', '12', '13', '14', '15', '16', '20', '24', '32', '36', '40', '48', '64', '96', '128'];

// ── Keyframe helpers ────────────────────────────────────────────────

function KeyframeDiamondIcon({ active }: { active?: boolean }) {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M4.23218 0.646484C4.42743 0.451336 4.74397 0.451311 4.93921 0.646484L8.52515 4.23242C8.7203 4.42766 8.7203 4.74421 8.52515 4.93945L4.93921 8.52539C4.74397 8.72057 4.42743 8.72054 4.23218 8.52539L0.64624 4.93945C0.451075 4.74421 0.451075 4.42767 0.64624 4.23242L4.23218 0.646484Z"
        fill={active ? 'var(--color-icon-selected' : 'none'}
        stroke={active ? 'var(--color-icon-selected' : 'var(--fpl-icon-color, var(--color-icon))'}
      />
    </svg>
  );
}

/** Diamond button that toggles keyframing for a property on a node. */
function KeyframePropToggle({ nodeId, property, value }: { nodeId: string; property: KeyframeableProperty; value: number }) {
  const kfStore = useKeyframeStoreOptional();
  const playback = usePlaybackOptional();
  if (!kfStore) return null;

  const isEnabled = kfStore.autoKeyframeActive || kfStore.isPropertyEnabled(nodeId, property);
  const kfs = kfStore.getKeyframes(nodeId, property);
  const currentMs = playback?.currentMs ?? 0;
  const hasKeyframeHere = kfs.some((kf) => Math.abs(kf.timeMs - currentMs) < 5);

  return (
    <ButtonPrimitive
      aria-label={`Toggle keyframe for ${property}`}
      className="flex items-center justify-center size-24px shrink-0 p-0 cursor-pointer bg-bg outline-1 outline -outline-offset-1 outline-border rounded-md icon-secondary hover:icon focus-visible:outline focus-visible:outline-1 focus-visible:outline-border-selected"
      onClick={() => {
        if (!isEnabled) {
          kfStore.togglePropertyKeyframing(nodeId, property, value, currentMs);
        } else {
          kfStore.addKeyframe(nodeId, property, currentMs, value);
        }
      }}
    >
      <KeyframeDiamondIcon active={hasKeyframeHere} />
    </ButtonPrimitive>
  );
}

/** Returns the interpolated keyframe value if keyframes exist, otherwise the raw value. */
function useKeyframeValue(nodeId: string, property: KeyframeableProperty, rawValue: number): number {
  const kfStore = useKeyframeStoreOptional();
  const playback = usePlaybackOptional();
  if (!kfStore || !playback) return rawValue;
  const kfs = kfStore.getKeyframes(nodeId, property);
  if (kfs.length === 0) return rawValue;
  return interpolateKeyframes(kfs, playback.currentMs) ?? rawValue;
}

/** Returns a callback that stamps a keyframe when auto-keyframe is active or the property is enabled. */
function useKeyframeStamp(nodeId: string) {
  const kfStore = useKeyframeStoreOptional();
  const playback = usePlaybackOptional();
  const autoActive = kfStore?.autoKeyframeActive ?? false;

  return useCallback(
    (property: KeyframeableProperty, value: number, baseValue?: number) => {
      if (!kfStore || !playback) return;
      const shouldStamp = autoActive || kfStore.isPropertyEnabled(nodeId, property);
      if (shouldStamp) {
        kfStore.addKeyframe(nodeId, property, playback.currentMs, value, baseValue);
      }
    },
    [kfStore, playback, nodeId, autoActive],
  );
}

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

function SelectionProperties({ selectedIds, animateMode, animationSection }: { selectedIds: ReadonlySet<NodeId>; animateMode?: boolean; animationSection?: React.ReactNode }) {
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
      {animationSection}

      {/* Position — always shown when all are geometry */}
      {allGeometry && <PositionSection selectedIds={selectedIds} geoCount={geoCount} animateMode={animateMode} />}

      {/* Layout — text has its own layout section, otherwise show for geometry */}
      {allText && <TextLayoutSection />}
      {!allText && allGeometry && <LayoutSection singleNode={singleNode as GeometryNode | null} animateMode={animateMode} />}

      {/* Typography — only for text nodes */}
      {allText && <TypographySection />}

      {/* Appearance — shown when all are geometry */}
      {allGeometry && <AppearanceSection singleNode={singleNode as GeometryNode | null} allAppearance={allAppearance} animateMode={animateMode} />}

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

function PositionSection({ selectedIds, geoCount, animateMode }: { selectedIds: ReadonlySet<NodeId>; geoCount: number; animateMode?: boolean }) {
  const sg = useSceneGraph();
  const [x, setX] = useSelectionProperty('x');
  const [y, setY] = useSelectionProperty('y');
  const [rotation, setRotation] = useSelectionProperty('rotation');
  const mixedX = useMixedChangeHandler('x');
  const mixedY = useMixedChangeHandler('y');
  const mixedRotation = useMixedChangeHandler('rotation');

  const { handleAlign, handleDistribute, alignEnabled, distributeEnabled } = useAlignHandler(sg, selectedIds);

  // Keyframe support — only active in animate mode with a single selection
  const singleId = selectedIds.size === 1 ? String(selectedIds.values().next().value as NodeId) : '';
  const showKf = Boolean(animateMode && singleId);
  const stampKeyframe = useKeyframeStamp(singleId);
  const displayX = useKeyframeValue(singleId, 'x', typeof x === 'number' ? x : 0);
  const displayY = useKeyframeValue(singleId, 'y', typeof y === 'number' ? y : 0);
  const displayRotation = useKeyframeValue(singleId, 'rotation', typeof rotation === 'number' ? rotation : 0);

  const handleX = useCallback(
    (v: number, opts?: NumericFieldChangeOpts) => {
      if (showKf) {
        stampKeyframe('x', v, typeof x === 'number' ? x : 0);
      } else {
        setX(v, opts);
      }
    },
    [setX, showKf, stampKeyframe, x],
  );

  const handleY = useCallback(
    (v: number, opts?: NumericFieldChangeOpts) => {
      if (showKf) {
        stampKeyframe('y', v, typeof y === 'number' ? y : 0);
      } else {
        setY(v, opts);
      }
    },
    [setY, showKf, stampKeyframe, y],
  );

  const handleRotation = useCallback(
    (v: number, opts?: NumericFieldChangeOpts) => {
      if (showKf) {
        stampKeyframe('rotation', v, typeof rotation === 'number' ? rotation : 0);
      } else {
        setRotation(v, opts);
      }
    },
    [setRotation, showKf, stampKeyframe, rotation],
  );

  const isMulti = geoCount >= 2;
  const tidyMenu = MenuV2.useMenu();
  // Call getTriggerProps() unconditionally — it contains useMergeRefs (a hook)
  // so calling it conditionally violates the Rules of Hooks.
  const tidyTriggerProps = tidyMenu.getTriggerProps();

  return (
    <PropertySection title="Position">
      <PropertyRow>
        <IconButtonGroup>
          <IconButtonGroup.Button aria-label="Align left" disabled={!alignEnabled} onClick={() => handleAlign('left')}><Icon24LayoutAlignLeft /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align horizontal center" disabled={!alignEnabled} onClick={() => handleAlign('center-h')}><Icon24LayoutAlignHorizontalCenter /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align right" disabled={!alignEnabled} onClick={() => handleAlign('right')}><Icon24LayoutAlignRight /></IconButtonGroup.Button>
        </IconButtonGroup>
        <IconButtonGroup>
          <IconButtonGroup.Button aria-label="Align top" disabled={!alignEnabled} onClick={() => handleAlign('top')}><Icon24LayoutAlignTop /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align vertical center" disabled={!alignEnabled} onClick={() => handleAlign('center-v')}><Icon24LayoutAlignVerticalCenter /></IconButtonGroup.Button>
          <IconButtonGroup.Button aria-label="Align bottom" disabled={!alignEnabled} onClick={() => handleAlign('bottom')}><Icon24LayoutAlignBottom /></IconButtonGroup.Button>
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
              <MenuV2.Item onClick={() => handleDistribute('vertical')} disabled={!distributeEnabled} lead={<Icon24LayoutDistributeVerticalSpacing />} trail="^⌥V">
                Distribute vertical spacing
              </MenuV2.Item>
              <MenuV2.Item onClick={() => handleDistribute('horizontal')} disabled={!distributeEnabled} lead={<Icon24LayoutDistributeHorizontalSpacing />} trail="^⌥H">
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
          value={showKf ? displayX : (x ?? 0)}
          onChange={handleX}
          onMixedChange={mixedX}
          trailingAction={showKf ? <KeyframePropToggle nodeId={singleId} property="x" value={typeof x === 'number' ? x : 0} /> : undefined}
        />
        <NumericField
          label="Y"
          value={showKf ? displayY : (y ?? 0)}
          onChange={handleY}
          onMixedChange={mixedY}
          trailingAction={showKf ? <KeyframePropToggle nodeId={singleId} property="y" value={typeof y === 'number' ? y : 0} /> : undefined}
        />
        <div />
      </PropertyRow>
      <PropertyRow>
        <NumericField
          label="Rotation"
          value={showKf ? displayRotation : (rotation ?? 0)}
          onChange={handleRotation}
          onMixedChange={mixedRotation}
          icon={<Icon24Rotation />}
          trailingAction={showKf ? <KeyframePropToggle nodeId={singleId} property="rotation" value={typeof rotation === 'number' ? rotation : 0} /> : undefined}
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
  const mixedW = useMixedChangeHandler('width');
  const mixedH = useMixedChangeHandler('height');

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

  const wDisabled = !isMixed(textAutoResize) && textAutoResize === 'WIDTH_AND_HEIGHT';
  const hDisabled = !isMixed(textAutoResize) && textAutoResize !== 'NONE';

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
          onMixedChange={mixedW}
          formatter={positiveFormatter}
          disabled={wDisabled}
        />
        <NumericField
          label="H"
          value={height ?? 0}
          onChange={handleH}
          onMixedChange={mixedH}
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

const WEIGHT_LABELS: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
}

function TypographySection() {
  const [fontFamily, setFontFamily] = useSelectionProperty('fontFamily');
  const [fontWeight, setFontWeight] = useSelectionProperty('fontWeight');
  const [fontSize, setFontSize] = useSelectionProperty('fontSize');
  const [lineHeight, setLineHeight] = useSelectionProperty('lineHeight');
  const [letterSpacing, setLetterSpacing] = useSelectionProperty('letterSpacing');
  const mixedLineHeight = useMixedChangeHandler('lineHeight');
  const mixedLetterSpacing = useMixedChangeHandler('letterSpacing');
  const [textAlignHorizontal, setTextAlignHorizontal] = useSelectionProperty('textAlignHorizontal');
  const [textAlignVertical, setTextAlignVertical] = useSelectionProperty('textAlignVertical');
  const { supported: localFontsSupported, fonts: localFonts, getWeights, requestAccess } = useLocalFonts();
  const availableWeights = !isMixed(fontFamily) && fontFamily ? (getWeights(fontFamily) ?? getFontOptionWeights(fontFamily)) : null;

  return (
    <PropertySection title="Typography">
      {/* Font family + weight */}
      <PropertyRow columns="1fr 24px">
        <Select.Root
          value={!isMixed(fontFamily) ? (fontFamily ?? 'Inter') : undefined}
          onChange={(v) => {
            if (v === '__load_system_fonts__') {
              requestAccess()
              return
            }
            if (v) setFontFamily(v)
          }}
        >
          <Select.Trigger label={<HiddenLabel>Font family</HiddenLabel>} width="fill" />
          <Select.Container>
            {localFonts.length > 0
              ? localFonts.map((font) => (
                  <Select.Option key={font} value={font}>{font}</Select.Option>
                ))
              : FONT_OPTIONS.map((font) => (
                  <Select.Option key={font.value} value={font.value}>{font.label}</Select.Option>
                ))}
            {localFontsSupported && localFonts.length === 0 && (
              <Select.Option value="__load_system_fonts__">Load system fonts...</Select.Option>
            )}
          </Select.Container>
        </Select.Root>
        <div />
      </PropertyRow>

      {/* Font size + line height */}
      <PropertyRow columns="1fr 1fr 24px">
        <Select.Root value={!isMixed(fontWeight) ? String(fontWeight ?? 400) : undefined} onChange={(v) => v && setFontWeight(Number(v))}>
          <Select.Trigger label={<HiddenLabel>Font weight</HiddenLabel>} width="fill" />
          <Select.Container>
            {availableWeights
              ? availableWeights.map((w) => (
                  <Select.Option key={w} value={String(w)}>{WEIGHT_LABELS[w] ?? String(w)}</Select.Option>
                ))
              : <>
                  <Select.Option value="300">Light</Select.Option>
                  <Select.Option value="400">Regular</Select.Option>
                  <Select.Option value="500">Medium</Select.Option>
                  <Select.Option value="600">Semi Bold</Select.Option>
                  <Select.Option value="700">Bold</Select.Option>
                </>}
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
          onMixedChange={mixedLineHeight}
          formatter={positiveFormatter}
          icon={<Icon24TextLineHeight />}
        />
        <NumericField
          label="Letter spacing"
          value={letterSpacing ?? 0}
          onChange={setLetterSpacing}
          onMixedChange={mixedLetterSpacing}
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

function LayoutSection({ singleNode, animateMode }: { singleNode: GeometryNode | null; animateMode?: boolean }) {
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

  // Keyframe support
  const nodeId = singleNode ? String(singleNode.id) : '';
  const showKf = Boolean(animateMode && singleNode);
  const stampKeyframe = useKeyframeStamp(nodeId);
  const displayW = useKeyframeValue(nodeId, 'width', w);
  const displayH = useKeyframeValue(nodeId, 'height', h);

  const updateSize = useCallback(
    (field: string, value: number, opts: NumericFieldChangeOpts) => {
      const oldW = w;
      const oldH = h;
      if (constrained) {
        if (field === 'width') {
          setProperties({ width: value, height: value / aspectRatio }, opts);
          if (showKf) {
            stampKeyframe('width', value, oldW);
            stampKeyframe('height', value / aspectRatio, oldH);
          }
        } else {
          setProperties({ height: value, width: value * aspectRatio }, opts);
          if (showKf) {
            stampKeyframe('height', value, oldH);
            stampKeyframe('width', value * aspectRatio, oldW);
          }
        }
      } else {
        setProperties({ [field]: value }, opts);
        if (showKf && (field === 'width' || field === 'height')) {
          stampKeyframe(field as KeyframeableProperty, value, field === 'width' ? oldW : oldH);
        }
      }
    },
    [setProperties, constrained, aspectRatio, showKf, stampKeyframe, w, h],
  );

  const handleW = useCallback(
    (v: number, opts: NumericFieldChangeOpts) => {
      if (showKf) {
        // Only stamp keyframe — don't mutate scene graph; canvas reads from keyframes
        stampKeyframe('width', v, w);
        if (constrained) stampKeyframe('height', v / aspectRatio, h);
      } else if (constrained) {
        updateSize('width', v, opts);
      } else {
        setWidth(v, opts);
      }
    },
    [constrained, updateSize, setWidth, showKf, stampKeyframe, w, h, aspectRatio],
  );

  const handleH = useCallback(
    (v: number, opts: NumericFieldChangeOpts) => {
      if (showKf) {
        stampKeyframe('height', v, h);
        if (constrained) stampKeyframe('width', v * aspectRatio, w);
      } else if (constrained) {
        updateSize('height', v, opts);
      } else {
        setHeight(v, opts);
      }
    },
    [constrained, updateSize, setHeight, showKf, stampKeyframe, w, h, aspectRatio],
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
          value={showKf ? displayW : (width ?? 0)}
          onChange={showKf ? handleW : (constrained ? (v, opts) => updateSize('width', v, opts) : setWidth)}
          formatter={positiveFormatter}
          onMixedChange={mixedW}
          trailingAction={showKf ? <KeyframePropToggle nodeId={nodeId} property="width" value={w} /> : undefined}
        />
        <NumericField
          label="H"
          value={showKf ? displayH : (height ?? 0)}
          onChange={showKf ? handleH : (constrained ? (v, opts) => updateSize('height', v, opts) : setHeight)}
          formatter={positiveFormatter}
          onMixedChange={mixedH}
          trailingAction={showKf ? <KeyframePropToggle nodeId={nodeId} property="height" value={h} /> : undefined}
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

function AppearanceSection({ singleNode, allAppearance, animateMode }: { singleNode: GeometryNode | null; allAppearance: boolean; animateMode?: boolean }) {
  const [opacity, setOpacity] = useSelectionProperty('opacity');
  const [cornerRadius, setCornerRadius] = useSelectionProperty('cornerRadius');
  const [sides, setSides] = useSelectionProperty('sides');
  const [points, setPoints] = useSelectionProperty('points');
  const [innerRadius, setInnerRadius] = useSelectionProperty('innerRadius');
  const mixedCornerRadius = useMixedChangeHandler('cornerRadius');

  // Keyframe support
  const nodeId = singleNode ? String(singleNode.id) : '';
  const showKf = Boolean(animateMode && singleNode);
  const stampKeyframe = useKeyframeStamp(nodeId);
  const rawOpacity = typeof opacity === 'number' ? opacity : 1;
  const displayOpacity = useKeyframeValue(nodeId, 'opacity', rawOpacity);

  const handleOpacityChange = useCallback(
    (v: number, opts?: NumericFieldChangeOpts) => {
      const val = v / 100;
      if (showKf) {
        stampKeyframe('opacity', val, rawOpacity);
      } else {
        setOpacity(val, opts);
      }
    },
    [setOpacity, showKf, stampKeyframe, rawOpacity],
  );

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
          value={showKf ? Math.round(displayOpacity * 100) : (isMixed(opacity) ? opacity : Math.round((opacity ?? 1) * 100))}
          onChange={handleOpacityChange}
          formatter={percentFormatter}
          onMixedChange={mixedOpacity}
          trailingAction={showKf ? <KeyframePropToggle nodeId={nodeId} property="opacity" value={rawOpacity} /> : undefined}
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
      onUpdate(paint, { ...paint, opacity: value });
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
      onUpdate(paint, { ...paint, opacity: value });
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

// ── Animate Mode ──────────────────────────────────────────────────────

/** True if the node has a FRAME among its ancestors (i.e. is inside a frame). */
function isNodeInsideFrame(store: ReturnType<typeof useSceneGraph>, nodeId: number): boolean {
  const ancestors = store.getAncestors(nodeId);
  return ancestors.some((a: SceneNode) => a.type === 'FRAME');
}

export function AnimateModeContent() {
  const store = useSceneGraph();
  const { selectedIds } = useSelection();
  const { animations, selectedClipIds, setSelectedClipIds } = useAnimationStore();

  const singleId = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    return selectedIds.values().next().value as number;
  }, [selectedIds]);

  // String version of singleId for animation store (which uses string nodeIds)
  const singleIdStr = singleId != null ? String(singleId) : null;

  const [presetsForNodeId, setPresetsForNodeId] = useState<string | null>(null);
  const showAnimationSection = Boolean(
    singleId != null && isNodeInsideFrame(store, singleId),
  );

  const selectedClip = useMemo(() => {
    if (selectedClipIds.size !== 1) return null;
    const id = selectedClipIds.values().next().value as string;
    return animations.find((a) => a.id === id) ?? null;
  }, [animations, selectedClipIds]);

  return (
    <>
      {/* Header with zoom */}
      <div className="border-b border-border flex items-center justify-between pl-3 pr-2 pb-2 pt-1">
        <span className="text-bodyMdStrong text-text">Animate</span>
        <ButtonPrimitive aria-label="Zoom level" className="flex items-center p-1 pl-2 rounded-md gap-4px text-bodyMd text-text hover:bg-bg-hover active:bg-bg-pressed">
          <span>50%</span>
          <Icon16ChevronDown />
        </ButtonPrimitive>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
        <ScrollContainer scroll="y" fill>
          {selectedClip ? (
            <SelectedClipDetailView
              clip={selectedClip}
              onBack={() => setSelectedClipIds(new Set())}
            />
          ) : presetsForNodeId ? (
            <AnimationPresetsView
              nodeId={presetsForNodeId}
              onBack={() => setPresetsForNodeId(null)}
            />
          ) : selectedIds.size > 0 ? (
            <SelectionProperties
              selectedIds={selectedIds}
              animateMode
              animationSection={showAnimationSection && singleIdStr ? (
                <AnimationSection nodeId={singleIdStr} onOpenPresets={() => setPresetsForNodeId(singleIdStr)} />
              ) : undefined}
            />
          ) : (
            <NoSelectionState />
          )}
        </ScrollContainer>
      </div>
    </>
  );
}

function AnimationSection({ onOpenPresets }: { nodeId: string; onOpenPresets: () => void }) {
  return (
    <div className="border-b border-border py-12px px-3 w-full">
      <ButtonPrimitive
        type="button"
        onClick={onOpenPresets}
        className="w-full flex justify-center items-center gap-1 px-3 rounded-md text-bodyMd bg-bg border border-border text-text hover:bg-bg-hover active:bg-bg-pressed h-24px"
      >
        <Icon24Plus />
        <span>Add animation</span>
      </ButtonPrimitive>
    </div>
  );
}

const ANIMATION_PRESETS: { type: AnimationType; label: string }[] = [
  { type: 'fade-in', label: 'Fade in' },
  { type: 'fade-out', label: 'Fade out' },
  { type: 'slide-in', label: 'Slide in' },
  { type: 'slide-out', label: 'Slide out' },
  { type: 'spin', label: 'Spin' },
  { type: 'translate-x', label: 'Translate X' },
  { type: 'color', label: 'Color' },
];

const PRESET_BY_TYPE = Object.fromEntries(ANIMATION_PRESETS.map((p) => [p.type, p.label]));

const SUGGESTED_ANIMATION_TYPES: AnimationType[] = ['fade-in', 'fade-out', 'slide-in', 'slide-out', 'spin', 'translate-x', 'color'];

const ANIMATION_CATEGORIES: { title: string; types: AnimationType[] }[] = [
  { title: 'Appear', types: ['fade-in', 'slide-in', 'spin', 'translate-x'] },
  { title: 'Disappear', types: ['fade-out', 'slide-out'] },
  { title: 'Style', types: ['color'] },
];

function PresetCardPreview() {
  return (
    <div className="w-full aspect-square rounded-lg bg-bg-secondary flex items-center justify-center group-hover:bg-bg-hover group-active:bg-bg-pressed">
      <span className="text-bodyLgStrong text-text-secondary">Text</span>
    </div>
  );
}

function PresetListPreview() {
  return (
    <div className="w-32px h-32px shrink-0 rounded-md bg-bg border border-border flex items-center justify-center">
      <div className="w-5 h-5 rounded-sm bg-text-tertiary" aria-hidden />
    </div>
  );
}

function AnimationPresetsView({ nodeId, onBack }: { nodeId: string; onBack: () => void }) {
  const { addAnimation } = useAnimationStore();
  const store = useSceneGraph();
  const handleSelect = useCallback(
    (type: AnimationType) => {
      if (type === 'color') {
        const node = store.getNode(Number(nodeId));
        let fillColor: AnimationColor | undefined;
        if (node && 'fills' in node) {
          const fills = (node as AppearanceNode).fills;
          const visible = fills.find((f: Paint) => f.visible);
          if (visible) {
            fillColor = { r: visible.color.r, g: visible.color.g, b: visible.color.b };
          }
        }
        const from = fillColor ?? { r: 200, g: 200, b: 200 };
        addAnimation(nodeId, type, undefined, undefined, from, from);
      } else {
        addAnimation(nodeId, type);
      }
      onBack();
    },
    [nodeId, addAnimation, onBack, store],
  );
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 flex items-center gap-1 shrink-0 border-b border-border py-8px px-3 h-[48px] bg-bg z-10">
        <IconButton aria-label="Back" size="md" onClick={onBack}>
          <Icon24ChevronLeftLarge />
        </IconButton>
        <span className="text-bodyLgStrong text-text truncate">Add animation</span>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto py-2 px-3 gap-4">
        <section className="flex flex-col gap-2">
          <h2 className="text-bodyMdStrong text-text mt-2 mb-2">Suggested animations</h2>
          <div className="grid grid-cols-2 gap-2">
            {SUGGESTED_ANIMATION_TYPES.map((type) => (
              <ButtonPrimitive
                key={type}
                type="button"
                onClick={() => handleSelect(type)}
                className="group flex flex-col rounded-lg overflow-hidden bg-bg text-left p-0"
              >
                <PresetCardPreview />
                <span className="text-bodyMd text-text text-left py-1 px-1 truncate">
                  {PRESET_BY_TYPE[type]}
                </span>
              </ButtonPrimitive>
            ))}
          </div>
        </section>

        {ANIMATION_CATEGORIES.map(({ title, types }) => (
          <section key={title} className="flex flex-col gap-1 border-t border-border pt-2">
            <h2 className="text-bodyMdStrong text-text mt-1 mb-1">{title}</h2>
            <div className="flex flex-col gap-0">
              {types.map((type) => (
                <ButtonPrimitive
                  key={type}
                  type="button"
                  onClick={() => handleSelect(type)}
                  className="w-full flex items-center gap-2 px-0 py-2 rounded-md text-bodyMd text-text hover:bg-bg-hover active:bg-bg-pressed text-left min-h-6"
                >
                  <PresetListPreview />
                  <span className="truncate">{PRESET_BY_TYPE[type]}</span>
                </ButtonPrimitive>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const TIMING_GROUPS: Record<string, { value: AnimationType; label: string }[]> = {
  fade: [
    { value: 'fade-in', label: 'Fade In' },
    { value: 'fade-out', label: 'Fade Out' },
  ],
  slide: [
    { value: 'slide-in', label: 'Slide In' },
    { value: 'slide-out', label: 'Slide Out' },
  ],
  spin: [{ value: 'spin', label: 'Spin' }],
  'translate-x': [{ value: 'translate-x', label: 'Translate X' }],
  color: [{ value: 'color', label: 'Color' }],
};

function getTimingGroupKey(type: AnimationType): string {
  if (type === 'fade-in' || type === 'fade-out') return 'fade';
  if (type === 'slide-in' || type === 'slide-out') return 'slide';
  if (type === 'spin') return 'spin';
  if (type === 'color') return 'color';
  return 'translate-x';
}

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease in' },
  { value: 'ease-out', label: 'Ease out' },
  { value: 'ease-in-out', label: 'Ease in and out' },
  { value: 'ease-in-back', label: 'Ease in back' },
  { value: 'ease-out-back', label: 'Ease out back' },
  { value: 'ease-in-out-back', label: 'Ease in and out back' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'quick', label: 'Quick' },
  { value: 'bouncy', label: 'Bouncy' },
  { value: 'slow', label: 'Slow' },
];

function SelectedClipDetailView({ clip, onBack }: { clip: TimelineAnimation; onBack: () => void }) {
  const { updateAnimation } = useAnimationStore();

  const handleDurationChange = useCallback((v: string) => {
    const val = parseFloat(v);
    if (!isNaN(val) && val > 0) {
      updateAnimation(clip.id, { durationMs: Math.round(val * 1000) });
    }
  }, [clip.id, updateAnimation]);

  const handleTimingChange = useCallback((v: AnimationType | undefined) => {
    if (v) updateAnimation(clip.id, { type: v });
  }, [clip.id, updateAnimation]);

  const handleEasingChange = useCallback((v: EasingType | undefined) => {
    if (v) updateAnimation(clip.id, { easing: v });
  }, [clip.id, updateAnimation]);

  const handleColorFromChange = useCallback((color: Color) => {
    updateAnimation(clip.id, { colorFrom: color });
  }, [clip.id, updateAnimation]);

  const handleColorToChange = useCallback((color: Color) => {
    updateAnimation(clip.id, { colorTo: color });
  }, [clip.id, updateAnimation]);

  const durationStr = String(Math.round(clip.durationMs) / 1000);
  const timingOptions = TIMING_GROUPS[getTimingGroupKey(clip.type)];
  const isColor = clip.type === 'color';

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 flex items-center gap-1 shrink-0 border-b border-border py-8px px-3 h-[48px] bg-bg z-10">
        <IconButton aria-label="Back" size="md" onClick={onBack}>
          <Icon24ChevronLeftLarge />
        </IconButton>
        <span className="text-bodyLgStrong text-text truncate">Animation preset</span>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto">
        <PropertySection title="Timing">
          <PropertyRow columns="1fr 24px">
            <Select.Root value={clip.type} onChange={handleTimingChange}>
              <Select.Trigger label={<HiddenLabel>Timing</HiddenLabel>} width="fill" />
              <Select.Container>
                {timingOptions?.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select.Container>
            </Select.Root>
            <div />
          </PropertyRow>
        </PropertySection>

        <PropertySection title="Duration">
          <PropertyRow columns="1fr 24px">
            <NumericField
              label="s"
              value={parseFloat(durationStr)}
              onChange={(v) => handleDurationChange(String(v))}
              formatter={positiveFormatter}
            />
            <div />
          </PropertyRow>
        </PropertySection>

        <PropertySection title="Easing">
          <PropertyRow columns="1fr 24px">
            <Select.Root value={clip.easing} onChange={handleEasingChange}>
              <Select.Trigger label={<HiddenLabel>Easing</HiddenLabel>} width="fill" />
              <Select.Container>
                {EASING_OPTIONS.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select.Container>
            </Select.Root>
            <div />
          </PropertyRow>
        </PropertySection>

        {isColor && clip.colorFrom && (
          <PropertySection title="From color">
            <PropertyRow columns="1fr 24px">
              <Input.Group columns="1fr 52px">
                <Input.Root>
                  <ColorSwatch color={clip.colorFrom} onChange={handleColorFromChange} />
                  <HexInput color={clip.colorFrom} onChange={handleColorFromChange} />
                </Input.Root>
              </Input.Group>
              <div />
            </PropertyRow>
          </PropertySection>
        )}

        {isColor && clip.colorTo && (
          <PropertySection title="To color">
            <PropertyRow columns="1fr 24px">
              <Input.Group columns="1fr 52px">
                <Input.Root>
                  <ColorSwatch color={clip.colorTo} onChange={handleColorToChange} />
                  <HexInput color={clip.colorTo} onChange={handleColorToChange} />
                </Input.Root>
              </Input.Group>
              <div />
            </PropertyRow>
          </PropertySection>
        )}
      </div>
    </div>
  );
}
