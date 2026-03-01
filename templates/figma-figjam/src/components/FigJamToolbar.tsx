import { type ComponentType, useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Button, ButtonPrimitive, IconButton } from '@figma/fpl-components';
import { Toolbar as SharedToolbar } from '@prototype/shared';
import { useAction } from '../actions/provider';
import {
  Icon16ChevronDown,
  Icon24MoveLarge,
  Icon24HandLarge,
  Icon24RectangleLarge,
  Icon24TextLarge,
  Icon24SectionLarge,
  Icon24TableLarge,
  Icon24StampLarge,
  Icon24CommentLarge,
  Icon24PlusLarge,
  Icon24EllipseLarge,
  Icon24PolygonLarge,
  Icon24PolygonDownwardLarge,
  Icon24DiamondLarge,
  Icon24ConnectorStraightLarge,
  Icon24ConnectorElbowLarge,
  Icon24ConnectorCurveLarge,
  Icon24FigjamLineLarge,
  Icon24ShapeCylinderLarge,
} from '@figma/fpl-icons';
import { useActiveTool, useSelection, useSceneGraph } from '../canvas';
import type { ToolType, Color, ConnectorLineShape } from '../canvas';
import { MarkerIllustration, HighlighterIllustration, TapeIllustration } from './toolbar-illustrations';
import { StickyToolButton } from './StickyToolButton';
import { ShapesToolButton } from './ShapesToolButton';
import type { ShapeType } from './ShapesToolButton';
import { MarkerSecondaryToolbar } from './MarkerSecondaryToolbar';
import { QUICK_ACTIONS_TABS } from './quickActionsData';

const { FlatToolButton, IllustrationToolButton, QuickActions } = SharedToolbar;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RaisedTool = 'marker' | 'sticky' | 'shapes';

interface ShapeOption {
  id: string;
  label: string;
  Icon: ComponentType;
  toolType?: ToolType;
}

// ---------------------------------------------------------------------------
// Shape & connector options for secondary toolbar
// ---------------------------------------------------------------------------

/** Map connector option IDs to ConnectorLineShape */
const CONNECTOR_SHAPE_MAP: Record<string, ConnectorLineShape> = {
  'connector-curve': 'CURVE',
  'connector-elbow': 'ELBOW',
  'connector-straight': 'STRAIGHT',
  'connector-line': 'LINE',
};

const ALL_SHAPE_OPTIONS: ShapeOption[] = [
  { id: 'connector-curve', label: 'Curve', Icon: Icon24ConnectorCurveLarge, toolType: 'CONNECTOR' },
  { id: 'connector-elbow', label: 'Elbow', Icon: Icon24ConnectorElbowLarge, toolType: 'CONNECTOR' },
  { id: 'connector-straight', label: 'Straight', Icon: Icon24ConnectorStraightLarge, toolType: 'CONNECTOR' },
  { id: 'connector-line', label: 'Line', Icon: Icon24FigjamLineLarge, toolType: 'CONNECTOR' },
  { id: 'shape-rect', label: 'Rectangle', Icon: Icon24RectangleLarge, toolType: 'RECTANGLE' },
  { id: 'shape-ellipse', label: 'Circle', Icon: Icon24EllipseLarge, toolType: 'ELLIPSE' },
  { id: 'shape-diamond', label: 'Diamond', Icon: Icon24DiamondLarge, toolType: 'POLYGON' },
  { id: 'shape-triangle', label: 'Triangle', Icon: Icon24PolygonLarge, toolType: 'POLYGON' },
  { id: 'shape-inv-triangle', label: 'Inv Triangle', Icon: Icon24PolygonDownwardLarge, toolType: 'POLYGON' },
  { id: 'shape-oval', label: 'Oval', Icon: Icon24EllipseLarge, toolType: 'ELLIPSE' },
  { id: 'shape-cylinder', label: 'Cylinder', Icon: Icon24ShapeCylinderLarge, toolType: 'POLYGON' },
];

// Map ShapesToolButton shape types to shape option IDs
const SHAPE_TYPE_MAP: Record<ShapeType, string> = {
  rectangle: 'shape-rect',
  circle: 'shape-ellipse',
  connector: 'connector-curve',
};

// ---------------------------------------------------------------------------
// Sticky note color options
// ---------------------------------------------------------------------------

export const STICKY_COLORS: { id: string; label: string; rgb: Color; css: string }[] = [
  { id: 'yellow', label: 'Yellow', rgb: { r: 255, g: 226, b: 153 }, css: 'rgb(255, 226, 153)' },
  { id: 'orange', label: 'Orange', rgb: { r: 255, g: 211, b: 168 }, css: 'rgb(255, 211, 168)' },
  { id: 'red', label: 'Red', rgb: { r: 255, g: 184, b: 168 }, css: 'rgb(255, 184, 168)' },
  { id: 'pink', label: 'Pink', rgb: { r: 255, g: 168, b: 219 }, css: 'rgb(255, 168, 219)' },
  { id: 'purple', label: 'Purple', rgb: { r: 211, g: 189, b: 255 }, css: 'rgb(211, 189, 255)' },
  { id: 'blue', label: 'Blue', rgb: { r: 168, g: 218, b: 255 }, css: 'rgb(168, 218, 255)' },
  { id: 'teal', label: 'Teal', rgb: { r: 179, g: 244, b: 239 }, css: 'rgb(179, 244, 239)' },
  { id: 'green', label: 'Green', rgb: { r: 179, g: 239, b: 189 }, css: 'rgb(179, 239, 189)' },
  { id: 'grey', label: 'Grey', rgb: { r: 179, g: 179, b: 179 }, css: 'rgb(179, 179, 179)' },
];

// ---------------------------------------------------------------------------
// Main toolbar
// ---------------------------------------------------------------------------

export function FigJamToolbar() {
  const {
    activeTool, setActiveTool,
    stickyColor, setStickyColor,
    markerColor, setMarkerColor,
    highlighterColor, setHighlighterColor,
    markerSubType, setMarkerSubType,
    setConnectorLineShape,
  } = useActiveTool();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Register quick-actions action so it can be triggered from the main menu
  useAction('quick-actions', useCallback(() => setIsActionsOpen(true), []));

  /** The active pen color based on the current sub-type */
  const activePenColor = markerSubType === 'highlighter' ? highlighterColor : markerColor;
  const setActivePenColor = markerSubType === 'highlighter' ? setHighlighterColor : setMarkerColor;
  const selection = useSelection();
  const store = useSceneGraph();
  const [activeRaised, setActiveRaised] = useState<RaisedTool | null>(null);
  const [activeShapeOption, setActiveShapeOption] = useState('shape-rect');

  // Derive active sticky color CSS from the shared tool provider state
  const activeStickyColor = STICKY_COLORS.find(
    (c) => c.rgb.r === stickyColor.r && c.rgb.g === stickyColor.g && c.rgb.b === stickyColor.b,
  )?.id ?? 'yellow';
  const activeStickyColorCss = STICKY_COLORS.find(
    (c) => c.rgb.r === stickyColor.r && c.rgb.g === stickyColor.g && c.rgb.b === stickyColor.b,
  )?.css ?? 'rgb(255, 226, 153)';

  // Reset activeRaised when the tool changes externally (e.g. after sticky placement)
  useEffect(() => {
    if (activeRaised === 'sticky' && activeTool !== 'STICKY_NOTE') {
      setActiveRaised(null);
    }
    if (activeRaised === 'marker' && activeTool !== 'PEN') {
      setActiveRaised(null);
    }
    if (activeRaised === 'shapes' && !['RECTANGLE', 'ELLIPSE', 'POLYGON', 'LINE', 'CONNECTOR'].includes(activeTool)) {
      setActiveRaised(null);
    }
  }, [activeTool, activeRaised]);

  // Toggle raised tool — clicking the same one again deselects it
  const handleRaisedClick = (tool: RaisedTool) => {
    if (activeRaised === tool) {
      setActiveRaised(null);
      setActiveTool('MOVE');
    } else {
      setActiveRaised(tool);
      // Activate the corresponding canvas tool
      if (tool === 'marker') setActiveTool('PEN');
      if (tool === 'sticky') setActiveTool('STICKY_NOTE');
      if (tool === 'shapes') {
        const opt = ALL_SHAPE_OPTIONS.find((s) => s.id === activeShapeOption);
        if (opt?.toolType) setActiveTool(opt.toolType);
      }
    }
  };

  const handleToolClick = (tool: ToolType) => {
    setActiveRaised(null);
    setActiveTool(tool);
  };

  const handleShapeOptionSelect = (optionId: string) => {
    setActiveShapeOption(optionId);
    const opt = ALL_SHAPE_OPTIONS.find((s) => s.id === optionId);
    if (opt?.toolType) setActiveTool(opt.toolType);
    // Set connector line shape when a connector option is selected
    const connectorShape = CONNECTOR_SHAPE_MAP[optionId];
    if (connectorShape) setConnectorLineShape(connectorShape);
  };

  // Handle direct shape clicks from the ShapesToolButton
  const handleShapeTypeSelect = (shapeType: ShapeType) => {
    const optionId = SHAPE_TYPE_MAP[shapeType];
    setActiveShapeOption(optionId);
    const opt = ALL_SHAPE_OPTIONS.find((s) => s.id === optionId);
    if (opt?.toolType) setActiveTool(opt.toolType);
    setActiveRaised('shapes');
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Secondary toolbar */}
      {activeRaised === 'shapes' && (
        <ShapesSecondaryToolbar
          activeOption={activeShapeOption}
          onOptionSelect={handleShapeOptionSelect}
        />
      )}
      {activeRaised === 'sticky' && (
        <StickySecondaryToolbar
          activeColor={activeStickyColor}
          onColorSelect={(id) => {
            const stickyColorEntry = STICKY_COLORS.find((c) => c.id === id);
            if (!stickyColorEntry) return;
            // Update the tool's sticky color for new creations
            setStickyColor(stickyColorEntry.rgb);
            // Update any selected STICKY_NOTE nodes
            for (const nodeId of selection.selectedIds) {
              const node = store.getNode(nodeId);
              if (node?.type === 'STICKY_NOTE') {
                store.updateNode(nodeId, {
                  fills: [{ type: 'SOLID', color: stickyColorEntry.rgb, opacity: 1, visible: true }],
                });
              }
            }
          }}
        />
      )}
      {activeRaised === 'marker' && (
        <MarkerSecondaryToolbar
          activeSubType={markerSubType}
          activeColor={activePenColor}
          onSubTypeSelect={setMarkerSubType}
          onColorSelect={setActivePenColor}
        />
      )}

      {/* Main toolbar */}
      <div ref={toolbarRef} className="flex items-end bg-bg rounded-lg shadow-300">
        {/* Section 1: Move + Hand */}
        <div className="flex items-center p-2 gap-2">
          <FlatToolButton
            icon={Icon24MoveLarge}
            label="Move"
            isActive={activeTool === 'MOVE' && activeRaised === null}
            onClick={() => handleToolClick('MOVE')}
          />
          <FlatToolButton
            icon={Icon24HandLarge}
            label="Hand"
            isActive={activeTool === 'HAND'}
            onClick={() => handleToolClick('HAND')}
          />
        </div>


        {/* Section 2: Raised buttons — Marker, Sticky, Shapes+Connectors */}
        <div className="flex items-end pt-2 px-2 gap-1 border-x border-border overflow-hidden">
          {/* Marker — inline SVG with dynamic color */}
          <IllustrationToolButton
            id="marker"
            label="Marker"
            isActive={activeRaised === 'marker'}
            onSelect={() => handleRaisedClick('marker')}
            widthClass="w-auto min-w-40px"
            restTranslate="-translate-y-0"
            hoverTranslate="group-hover:-translate-y-1"
            activeTranslate="-translate-y-1 group-hover:-translate-y-1"
          >
            {markerSubType === 'highlighter' ? (
              <HighlighterIllustration color={activePenColor} className="w-5 h-[52px]" />
            ) : markerSubType === 'tape' ? (
              <TapeIllustration className="w-5 h-[52px]" />
            ) : (
              <MarkerIllustration color={activePenColor} className="w-5 h-[52px]" />
            )}
          </IllustrationToolButton>

          {/* Sticky — custom button with top-note-only hover lift */}
          <StickyToolButton
            isActive={activeRaised === 'sticky'}
            color={activeStickyColorCss}
            onSelect={() => handleRaisedClick('sticky')}
          />

          {/* Shapes — custom button with per-shape click targets */}
          <ShapesToolButton
            isActive={activeRaised === 'shapes'}
            onSelect={() => handleRaisedClick('shapes')}
            onSelectShape={handleShapeTypeSelect}
          />
        </div>

        {/* Section 3: Flat tools — Text, Frame, Table, Stamp, Comment, Widget, + */}
        <div className="flex items-center p-2 gap-2">
          <FlatToolButton
            icon={Icon24TextLarge}
            label="Text"
            isActive={activeTool === 'TEXT' && activeRaised === null}
            onClick={() => handleToolClick('TEXT')}
          />
          <FlatToolButton
            icon={Icon24SectionLarge}
            label="Section"
            isActive={activeTool === 'SECTION' && activeRaised === null}
            onClick={() => handleToolClick('SECTION')}
          />
          <FlatToolButton
            icon={Icon24TableLarge}
            label="Table"
            isActive={false}
            onClick={() => {}}
          />
          <FlatToolButton
            icon={Icon24StampLarge}
            label="Stamp"
            isActive={false}
            onClick={() => {}}
          />
          <FlatToolButton
            icon={Icon24CommentLarge}
            label="Comment"
            isActive={activeTool === 'COMMENT' && activeRaised === null}
            onClick={() => handleToolClick('COMMENT')}
          />
          <QuickActions
            tabs={QUICK_ACTIONS_TABS}
            isOpen={isActionsOpen}
            onOpenChange={setIsActionsOpen}
            toolbarRef={toolbarRef}
          />
          <FlatToolButton
            icon={Icon24PlusLarge}
            label="More"
            isActive={false}
            secondary
            onClick={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shapes & Connectors secondary toolbar
// ---------------------------------------------------------------------------

function ShapesSecondaryToolbar({
  activeOption,
  onOptionSelect,
}: {
  activeOption: string;
  onOptionSelect: (id: string) => void;
}) {
  const { shapeColor, setShapeColor } = useActiveTool();
  const selection = useSelection();
  const store = useSceneGraph();
  const [showColors, setShowColors] = useState(false);
  const colorPopoverRef = useRef<HTMLDivElement>(null);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);

  // Close color popover on click outside
  useEffect(() => {
    if (!showColors) return undefined;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        colorPopoverRef.current?.contains(target) ||
        colorTriggerRef.current?.contains(target)
      ) return;
      setShowColors(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [showColors]);

  const swatchBg = `rgb(${shapeColor.r}, ${shapeColor.g}, ${shapeColor.b})`;
  const activeColorId = STICKY_COLORS.find(
    (c) => c.rgb.r === shapeColor.r && c.rgb.g === shapeColor.g && c.rgb.b === shapeColor.b,
  )?.id;

  const handleColorChange = (colorId: string) => {
    const entry = STICKY_COLORS.find((c) => c.id === colorId);
    if (!entry) return;
    setShapeColor(entry.rgb);
    // Also update any selected shape nodes
    for (const nodeId of selection.selectedIds) {
      const node = store.getNode(nodeId);
      if (node && 'fills' in node) {
        store.updateNode(nodeId, {
          fills: [{ type: 'SOLID', color: entry.rgb, opacity: 1, visible: true }],
        });
      }
    }
  };

  return (
    <div className="flex items-center bg-bg rounded-lg shadow-300 px-1 gap-1">
      {/* Color picker button — same pattern as floating object toolbar */}
      <div className="relative">
        <ButtonPrimitive
          ref={colorTriggerRef}
          className={clsx(
            'flex items-center gap-1 rounded-[8px] px-2 py-2 hover:bg-bg-hover active:bg-bg-pressed',
            showColors && 'bg-bg-secondary',
          )}
          onClick={() => setShowColors((v) => !v)}
        >
          <div
            className="w-16px h-16px rounded-full border border-solid border-border"
            style={{ backgroundColor: swatchBg }}
          />
          <Icon16ChevronDown />
        </ButtonPrimitive>

        {/* Color popover — positioned above, centered on trigger */}
        {showColors && (
          <div
            ref={colorPopoverRef}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center bg-bg rounded-lg shadow-300 p-2 gap-2"
          >
            {STICKY_COLORS.map((c) => (
              <ButtonPrimitive
                key={c.id}
                aria-label={c.label}
                aria-pressed={activeColorId === c.id}
                onClick={() => handleColorChange(c.id)}
                className={clsx(
                  'rounded-full w-4 h-4 shrink-0',
                  activeColorId === c.id
                    ? 'ring-2 ring-border-selected ring-offset-2 ring-offset-bg'
                    : '',
                )} style={{ backgroundColor: c.css }}
              >
                <span className="sr-only">{c.label}</span>
              </ButtonPrimitive>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 py-1 px-2 border-x border-border">
      {ALL_SHAPE_OPTIONS.map((opt) => (
        <IconButton
          key={opt.id}
          aria-label={opt.label}
          aria-pressed={activeOption === opt.id}
          onClick={() => onOptionSelect(opt.id)}
          variant={activeOption === opt.id ? 'highlighted' : 'ghost'}
          size="lg"
        >
          <opt.Icon />
        </IconButton>
      ))}
      </div>

      {/* More shapes button */}
      <div className="p-1">
        <Button
          variant="secondary"
          aria-label="More shapes"
        >
          More shapes
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sticky Note secondary toolbar
// ---------------------------------------------------------------------------

function StickySecondaryToolbar({
  activeColor,
  onColorSelect,
}: {
  activeColor: string;
  onColorSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-center bg-bg rounded-lg shadow-300 px-2 py-2 gap-2">
      {STICKY_COLORS.map((c) => (
        <ButtonPrimitive
          key={c.id}
          aria-label={c.label}
          aria-pressed={activeColor === c.id}
          onClick={() => onColorSelect(c.id)}
          className={clsx(
            'rounded-full w-4 h-4 shrink-0',
            activeColor === c.id
              ? 'ring-2 ring-border-selected ring-offset-2 ring-offset-bg'
              : '',
          )} style={{ backgroundColor: c.css }}
        >
          <span className="sr-only">{c.label}</span>
        </ButtonPrimitive>
      ))}
    </div>
  );
}
