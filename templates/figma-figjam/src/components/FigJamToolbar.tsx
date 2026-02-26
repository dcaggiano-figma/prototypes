import { type ComponentType, useEffect, useState } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive, IconButton } from '@figma/fpl-components';
import {
  Icon24MoveLarge,
  Icon24HandLarge,
  Icon24RectangleLarge,
  Icon24TextLarge,
  Icon24SectionLarge,
  Icon24TableLarge,
  Icon24StampLarge,
  Icon24CommentLarge,
  Icon24WidgetLarge,
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
import type { ToolType, Color } from '../canvas';
import { IllustrationToolButton } from './IllustrationToolButton';
import { MarkerIllustration, HighlighterIllustration, TapeIllustration } from './toolbar-illustrations';
import { StickyToolButton } from './StickyToolButton';
import { ShapesToolButton } from './ShapesToolButton';
import type { ShapeType } from './ShapesToolButton';
import { MarkerSecondaryToolbar } from './MarkerSecondaryToolbar';

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

const CONNECTOR_OPTIONS: ShapeOption[] = [
  { id: 'connector-curve', label: 'Curve', Icon: Icon24ConnectorCurveLarge, toolType: 'LINE' },
  { id: 'connector-elbow', label: 'Elbow', Icon: Icon24ConnectorElbowLarge, toolType: 'LINE' },
  { id: 'connector-straight', label: 'Straight', Icon: Icon24ConnectorStraightLarge, toolType: 'LINE' },
  { id: 'connector-line', label: 'Line', Icon: Icon24FigjamLineLarge, toolType: 'LINE' },
];

const SHAPE_OPTIONS: ShapeOption[] = [
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
  } = useActiveTool();

  /** The active pen color based on the current sub-type */
  const activePenColor = markerSubType === 'highlighter' ? highlighterColor : markerColor;
  const setActivePenColor = markerSubType === 'highlighter' ? setHighlighterColor : setMarkerColor;
  const selection = useSelection();
  const store = useSceneGraph();
  const [activeRaised, setActiveRaised] = useState<RaisedTool | null>(null);
  const [activeShape, setActiveShape] = useState('shape-rect');
  const [activeConnector, setActiveConnector] = useState('connector-curve');

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
    if (activeRaised === 'shapes' && !['RECTANGLE', 'ELLIPSE', 'POLYGON', 'LINE'].includes(activeTool)) {
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
        const shape = SHAPE_OPTIONS.find((s) => s.id === activeShape);
        if (shape?.toolType) setActiveTool(shape.toolType);
      }
    }
  };

  const handleToolClick = (tool: ToolType) => {
    setActiveRaised(null);
    setActiveTool(tool);
  };

  const handleShapeSelect = (shapeId: string) => {
    setActiveShape(shapeId);
    const shape = SHAPE_OPTIONS.find((s) => s.id === shapeId);
    if (shape?.toolType) setActiveTool(shape.toolType);
  };

  const handleConnectorSelect = (connectorId: string) => {
    setActiveConnector(connectorId);
    setActiveTool('LINE');
  };

  // Handle direct shape clicks from the ShapesToolButton
  const handleShapeTypeSelect = (shapeType: ShapeType) => {
    const shapeId = SHAPE_TYPE_MAP[shapeType];
    if (shapeType === 'connector') {
      setActiveConnector(shapeId);
      setActiveTool('LINE');
    } else {
      setActiveShape(shapeId);
      const shape = SHAPE_OPTIONS.find((s) => s.id === shapeId);
      if (shape?.toolType) setActiveTool(shape.toolType);
    }
    setActiveRaised('shapes');
  };

  const hasSelection = selection.selectedIds.size > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Secondary toolbar — hidden when floating toolbar is visible (nodes selected) */}
      {!hasSelection && activeRaised === 'shapes' && (
        <ShapesSecondaryToolbar
          activeShape={activeShape}
          activeConnector={activeConnector}
          onShapeSelect={handleShapeSelect}
          onConnectorSelect={handleConnectorSelect}
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
      <div className="flex items-end bg-bg rounded-lg shadow-300">
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
          <FlatToolButton
            icon={Icon24WidgetLarge}
            label="Widget"
            isActive={false}
            onClick={() => {}}
          />
          <FlatToolButton
            icon={Icon24PlusLarge}
            label="More"
            isActive={false}
            onClick={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flat tool button (icon-only, no sub-menu)
// ---------------------------------------------------------------------------

function FlatToolButton({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: ComponentType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      size="lg"
      aria-label={label}
      variant={isActive ? 'primary' : 'ghost'}
      onClick={onClick}
    >
      <Icon />
    </IconButton>
  );
}

// ---------------------------------------------------------------------------
// Shapes & Connectors secondary toolbar
// ---------------------------------------------------------------------------

function ShapesSecondaryToolbar({
  activeShape,
  activeConnector,
  onShapeSelect,
  onConnectorSelect,
}: {
  activeShape: string;
  activeConnector: string;
  onShapeSelect: (id: string) => void;
  onConnectorSelect: (id: string) => void;
}) {
  // Find the active shape's icon to show as the indicator
  const ActiveShapeIcon =
    SHAPE_OPTIONS.find((s) => s.id === activeShape)?.Icon ??
    CONNECTOR_OPTIONS.find((c) => c.id === activeConnector)?.Icon ??
    Icon24EllipseLarge;

  return (
    <div className="flex items-center bg-bg rounded-lg shadow-300 px-1 py-1 gap-1">
      {/* Active shape indicator with dropdown chevron */}
      <div className="flex items-center rounded-md p-1 bg-bg-selected ring-1 ring-border-brand">
        <ActiveShapeIcon />
        <svg width="8" height="8" viewBox="0 0 8 8" className="ml-px opacity-60">
          <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.25" fill="none" />
        </svg>
      </div>

      {/* Connector options */}
      {CONNECTOR_OPTIONS.map((opt) => (
        <ButtonPrimitive
          key={opt.id}
          aria-label={opt.label}
          aria-pressed={activeConnector === opt.id}
          onClick={() => onConnectorSelect(opt.id)}
          className={clsx(
            'rounded-md p-1 hover:bg-bg-hover active:bg-bg-pressed',
            activeConnector === opt.id && 'bg-bg-selected ring-1 ring-border-brand',
          )}
        >
          <opt.Icon />
        </ButtonPrimitive>
      ))}

      <div className="w-px h-6 bg-border" />

      {/* Shape options */}
      {SHAPE_OPTIONS.map((opt) => (
        <ButtonPrimitive
          key={opt.id}
          aria-label={opt.label}
          aria-pressed={activeShape === opt.id}
          onClick={() => onShapeSelect(opt.id)}
          className={clsx(
            'rounded-md p-1 hover:bg-bg-hover active:bg-bg-pressed',
            activeShape === opt.id && 'bg-bg-selected ring-1 ring-border-brand',
          )}
        >
          <opt.Icon />
        </ButtonPrimitive>
      ))}

      {/* More shapes button */}
      <ButtonPrimitive
        aria-label="More shapes"
        className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-bg-hover active:bg-bg-pressed whitespace-nowrap text-text-secondary text-bodySmStrong"
      >
        More shapes
      </ButtonPrimitive>
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
