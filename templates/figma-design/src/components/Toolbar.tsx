import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback, type ComponentType } from 'react';
import clsx from 'clsx';
import {
  Icon24MoveLarge,
  Icon24FrameLarge,
  Icon24RectangleLarge,
  Icon24PenLarge,
  Icon24TextLarge,
  Icon24CommentLarge,
  Icon24Design,
  Icon24Draw,
  Icon24Dev,
  Icon24Move,
  Icon24Hand,
  Icon24Scale,
  Icon24Frame,
  Icon24Section,
  Icon24Make,
  Icon24Slice,
  Icon24Rectangle,
  Icon24Line,
  Icon24Arrow,
  Icon24Ellipse,
  Icon24Polygon,
  Icon24Star,
  Icon24Image,
  Icon24Pen,
  Icon24Pencil,
  Icon24Comment,
  Icon24Annotate,
  Icon24Measure,
  Icon24HandLarge,
  Icon24ScaleLarge,
  Icon24SectionLarge,
  Icon24MakeLarge,
  Icon24SliceLarge,
  Icon24LineLarge,
  Icon24ArrowLarge,
  Icon24EllipseLarge,
  Icon24PolygonLarge,
  Icon24StarLarge,
  Icon24ImageLarge,
  Icon24PencilLarge,
  Icon24AnnotateLarge,
  Icon24MeasureLarge,
  Icon24EyedropperLarge,
  Icon24CodeToolLarge,
  Icon24CommentNewLarge,
  Icon24ConnectorElbowLarge,
} from '@figma/fpl-icons';
import { Toolbar as SharedToolbar, type SubTool } from '@prototype/shared';
import styles from './Toolbar.module.css';
import { ModeSwitcher } from './ModeSwitcher';
import { PenIllustration, BrushIllustration, PencilIllustration } from './ToolIllustrations';
import { QUICK_ACTIONS_TABS } from './quickActionsData';
import type { Mode } from './menuTypes';
import { MODE_TO_BRAND } from '../helpers/theme';
import { useActiveTool, type ToolType } from '../canvas';
import { useAction } from '../actions/provider';
import { DrawToolSecondaryToolbar } from './DrawToolSecondaryToolbar';

const { ToolButton, IllustrationToolButton, QuickActions } = SharedToolbar;

/** Map editor-shell toolbar tool IDs to figma-design ToolProvider types */
function mapToolId(id: string): ToolType {
  switch (id) {
    case 'move': return 'MOVE';
    case 'hand': return 'HAND';
    case 'frame': return 'FRAME';
    case 'rectangle': return 'RECTANGLE';
    case 'ellipse': return 'ELLIPSE';
    case 'text': return 'TEXT';
    case 'line': return 'LINE';
    case 'polygon': return 'POLYGON';
    case 'star': return 'STAR';
    case 'pen': return 'PEN';
    case 'pencil': return 'PENCIL';
    case 'draw-pen': return 'PEN';
    case 'draw-pencil': return 'PENCIL';
    case 'draw-brush': return 'PENCIL';
    case 'section': return 'SECTION';
    case 'comment': case 'comment-draw': case 'comment-dev': return 'COMMENT';
    default: return 'MOVE';
  }
}

// ---------------------------------------------------------------------------
// Tool config type
// ---------------------------------------------------------------------------

interface ToolConfig {
  Icon: ComponentType;
  label: string;
  id: string;
  subTools?: SubTool[];
}

// ---------------------------------------------------------------------------
// Mode-based toolbar configurations
// ---------------------------------------------------------------------------

// Draw-mode illustration tool definitions
const ILLUSTRATION_TOOLS = [
  { id: 'draw-pen', label: 'Pen', Illustration: PenIllustration },
  { id: 'draw-brush', label: 'Brush', Illustration: BrushIllustration },
  { id: 'draw-pencil', label: 'Pencil', Illustration: PencilIllustration },
] as const;

const ILLUSTRATION_IDS: string[] = ILLUSTRATION_TOOLS.map((t) => t.id);

interface ToolbarConfigs {
  move: Record<Mode, ToolConfig>;
  main: Record<Mode, ToolConfig[]>;
}

function getToolbarConfigs(): ToolbarConfigs {
  const moveTool: ToolConfig = {
    Icon: Icon24MoveLarge,
    label: 'Move',
    id: 'move',
    subTools: [
      { id: 'move', label: 'Move', Icon: Icon24Move, LargeIcon: Icon24MoveLarge, shortcut: 'V' },
      { id: 'hand', label: 'Hand tool', Icon: Icon24Hand, LargeIcon: Icon24HandLarge, shortcut: 'H' },
      { id: 'scale', label: 'Scale', Icon: Icon24Scale, LargeIcon: Icon24ScaleLarge, shortcut: 'K' },
    ],
  };

  const frameTool: ToolConfig = {
    Icon: Icon24FrameLarge,
    label: 'Frame',
    id: 'frame',
    subTools: [
      { id: 'frame', label: 'Frame', Icon: Icon24Frame, LargeIcon: Icon24FrameLarge, shortcut: 'F' },
      { id: 'section', label: 'Section', Icon: Icon24Section, LargeIcon: Icon24SectionLarge, shortcut: '⇧S' },
      { id: 'make', label: 'Make', Icon: Icon24Make, LargeIcon: Icon24MakeLarge, shortcut: 'E' },
      { id: 'slice', label: 'Slice', Icon: Icon24Slice, LargeIcon: Icon24SliceLarge, shortcut: 'S' },
    ],
  };

  const shapeTool: ToolConfig = {
    Icon: Icon24RectangleLarge,
    label: 'Shape',
    id: 'shape',
    subTools: [
      { id: 'rectangle', label: 'Rectangle', Icon: Icon24Rectangle, LargeIcon: Icon24RectangleLarge, shortcut: 'R' },
      { id: 'line', label: 'Line', Icon: Icon24Line, LargeIcon: Icon24LineLarge, shortcut: 'L' },
      { id: 'arrow', label: 'Arrow', Icon: Icon24Arrow, LargeIcon: Icon24ArrowLarge, shortcut: '⇧L' },
      { id: 'ellipse', label: 'Ellipse', Icon: Icon24Ellipse, LargeIcon: Icon24EllipseLarge, shortcut: 'O' },
      { id: 'polygon', label: 'Polygon', Icon: Icon24Polygon, LargeIcon: Icon24PolygonLarge },
      { id: 'star', label: 'Star', Icon: Icon24Star, LargeIcon: Icon24StarLarge },
      { id: 'image', label: 'Image/video...', Icon: Icon24Image, LargeIcon: Icon24ImageLarge, shortcut: '⌥⌘K' },
    ],
  };

  const penTool: ToolConfig = {
    Icon: Icon24PenLarge,
    label: 'Pen',
    id: 'pen',
    subTools: [
      { id: 'pen', label: 'Pen', Icon: Icon24Pen, LargeIcon: Icon24PenLarge, shortcut: 'P' },
      { id: 'pencil', label: 'Pencil', Icon: Icon24Pencil, LargeIcon: Icon24PencilLarge, shortcut: '⇧P' },
    ],
  };

  const textTool: ToolConfig = {
    Icon: Icon24TextLarge,
    label: 'Text',
    id: 'text',
  };

  const commentTool: ToolConfig = {
    Icon: Icon24CommentLarge,
    label: 'Comment',
    id: 'comment',
    subTools: [
      { id: 'comment', label: 'Comment', Icon: Icon24Comment, LargeIcon: Icon24CommentLarge, shortcut: 'C' },
      { id: 'annotate', label: 'Annotation', Icon: Icon24Annotate, LargeIcon: Icon24AnnotateLarge, shortcut: 'Y' },
      { id: 'measure', label: 'Measurement', Icon: Icon24Measure, LargeIcon: Icon24MeasureLarge, shortcut: '⇧M' },
    ],
  };

  // Draw-mode comment tool (no subtools)
  const commentDrawTool: ToolConfig = {
    Icon: Icon24CommentLarge,
    label: 'Comment',
    id: 'comment-draw',
  };

  // Dev-mode-only tools (no dropdowns)
  const moveDevTool: ToolConfig = {
    Icon: Icon24MoveLarge,
    label: 'Move',
    id: 'move',
  };

  const inspectTool: ToolConfig = {
    Icon: Icon24EyedropperLarge,
    label: 'Inspect',
    id: 'inspect',
  };

  const measureDevTool: ToolConfig = {
    Icon: Icon24MeasureLarge,
    label: 'Measure',
    id: 'measure-dev',
  };

  const codeToolDev: ToolConfig = {
    Icon: Icon24CodeToolLarge,
    label: 'Code',
    id: 'code',
  };

  const commentDevTool: ToolConfig = {
    Icon: Icon24CommentNewLarge,
    label: 'Comment',
    id: 'comment-dev',
  };

  const connectorTool: ToolConfig = {
    Icon: Icon24ConnectorElbowLarge,
    label: 'Connector',
    id: 'connector',
  };

  return {
    move: {
      design: moveTool,
      draw: moveTool,
      dev: moveDevTool,
    },
    main: {
      design: [frameTool, shapeTool, penTool, textTool, commentTool],
      draw: [frameTool, shapeTool, textTool, commentDrawTool],
      dev: [inspectTool, measureDevTool, codeToolDev, commentDevTool, connectorTool],
    },
  };
}

// Collect all valid tool IDs for a given mode
function getAllToolIds(moveTool: ToolConfig, mainTools: ToolConfig[], mode: Mode): string[] {
  const moveIds = moveTool.subTools ? moveTool.subTools.map((st) => st.id) : [moveTool.id];
  const mainIds = mainTools.flatMap((t) => (t.subTools ? t.subTools.map((st) => st.id) : [t.id]));
  const illustrationIds = mode === 'draw' ? ILLUSTRATION_IDS : [];
  return [...moveIds, ...illustrationIds, ...mainIds];
}

// ---------------------------------------------------------------------------
// Animation constants
// ---------------------------------------------------------------------------

const MODE_ORDER: Mode[] = ['draw', 'design', 'dev'];

// ---------------------------------------------------------------------------
// Toolbar component
// ---------------------------------------------------------------------------

interface ToolbarProps {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
  isActionsOpen: boolean;
  onActionsOpenChange: (open: boolean) => void;
}

export function Toolbar({ activeMode, onModeChange, isActionsOpen, onActionsOpenChange }: ToolbarProps) {
  const [activeTool, setActiveTool] = useState('move');
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string>>({});
  const {
    activeTool: providerTool, setActiveTool: setProviderTool,
    drawColor, setDrawColor, drawStrokeWeight, setDrawStrokeWeight,
  } = useActiveTool();

  // Sync local toolbar state when provider tool changes externally (e.g. after shape creation)
  const prevProviderToolRef = useRef(providerTool);
  useEffect(() => {
    if (prevProviderToolRef.current !== providerTool) {
      prevProviderToolRef.current = providerTool;
      const mapped = providerTool.toLowerCase();
      if (mapToolId(activeTool) !== providerTool) {
        setActiveTool(mapped);
      }
    }
  }, [providerTool, activeTool]);

  // Register tool keyboard shortcuts via the action system (V, F, R, O, T, P, H, C)
  useAction('tool.move', useCallback(() => { setActiveTool('move'); setProviderTool('MOVE'); }, [setProviderTool]));
  useAction('tool.frame', useCallback(() => { setActiveTool('frame'); setProviderTool('FRAME'); }, [setProviderTool]));
  useAction('tool.rectangle', useCallback(() => { setActiveTool('rectangle'); setProviderTool('RECTANGLE'); }, [setProviderTool]));
  useAction('tool.ellipse', useCallback(() => { setActiveTool('ellipse'); setProviderTool('ELLIPSE'); }, [setProviderTool]));
  useAction('tool.text', useCallback(() => { setActiveTool('text'); setProviderTool('TEXT'); }, [setProviderTool]));
  useAction('tool.pen', useCallback(() => { setActiveTool('pen'); setProviderTool('PEN'); }, [setProviderTool]));
  useAction('tool.pencil', useCallback(() => { setActiveTool('pencil'); setProviderTool('PENCIL'); }, [setProviderTool]));
  useAction('tool.hand', useCallback(() => { setActiveTool('hand'); setProviderTool('HAND'); }, [setProviderTool]));
  useAction('tool.comment', useCallback(() => { setActiveTool('comment'); setProviderTool('COMMENT'); }, [setProviderTool]));
  useAction('tool.line', useCallback(() => { setActiveTool('line'); setProviderTool('LINE'); }, [setProviderTool]));
  useAction('tool.polygon', useCallback(() => { setActiveTool('polygon'); setProviderTool('POLYGON'); }, [setProviderTool]));
  useAction('tool.star', useCallback(() => { setActiveTool('star'); setProviderTool('STAR'); }, [setProviderTool]));
  useAction('tool.section', useCallback(() => { setActiveTool('section'); setProviderTool('SECTION'); }, [setProviderTool]));

  const [phase, setPhase] = useState<'idle' | 'sliding' | 'resizing'>('idle');
  const [measured, setMeasured] = useState(false);
  const [rowHeight, setRowHeight] = useState(0);
  const [displayWidth, setDisplayWidth] = useState(0);
  // Visual slide position — decoupled from activeMode so we can enable the
  // CSS transition before moving, giving the browser two distinct frames.
  const [visualIndex, setVisualIndex] = useState(() => MODE_ORDER.indexOf(activeMode));

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState(0);

  const rowRefs = useRef<Record<Mode, HTMLDivElement | null>>({ draw: null, design: null, dev: null });
  const widthsRef = useRef<Record<Mode, number>>({ draw: 0, design: 0, dev: 0 });
  const prevModeRef = useRef(activeMode);
  const initialModeRef = useRef(activeMode);
  const slideRafRef = useRef(0);

  const toolbarConfigs = useMemo(() => getToolbarConfigs(), []);
  const moveTool = toolbarConfigs.move[activeMode];
  const mainTools = toolbarConfigs.main[activeMode];

  // Measure all rows on mount (runs before first paint)
  useLayoutEffect(() => {
    let h = 0;
    for (const mode of MODE_ORDER) {
      const el = rowRefs.current[mode];
      if (el) {
        widthsRef.current[mode] = el.offsetWidth;
        if (!h) h = el.offsetHeight;
      }
    }
    setRowHeight(h);
    setDisplayWidth(widthsRef.current[initialModeRef.current]);
    setMeasured(true);
  }, []);

  // Re-measure row widths when activeMode changes, since QuickActions
  // is conditionally rendered only in the active row
  useLayoutEffect(() => {
    for (const mode of MODE_ORDER) {
      const el = rowRefs.current[mode];
      if (el) {
        widthsRef.current[mode] = el.offsetWidth;
      }
    }
  }, [activeMode]);

  // Track toolbar outer width for QuickActions popover sizing
  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    setToolbarWidth(el.offsetWidth);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setToolbarWidth(entry.contentBoxSize[0].inlineSize);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Detect mode changes: enable the transition immediately (before paint),
  // then move the slide position on the next frame so the browser sees the
  // property change while the transition is active.
  useLayoutEffect(() => {
    if (prevModeRef.current !== activeMode) {
      prevModeRef.current = activeMode;
      setPhase('sliding');
      cancelAnimationFrame(slideRafRef.current);
      slideRafRef.current = requestAnimationFrame(() => {
        setVisualIndex(MODE_ORDER.indexOf(activeMode));
      });
    }
  }, [activeMode]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(slideRafRef.current);
  }, []);

  // After phase becomes 'resizing', schedule width change on next frame
  // so the browser paints the transition property before the value changes
  useEffect(() => {
    if (phase === 'resizing') {
      const id = requestAnimationFrame(() => {
        setDisplayWidth(widthsRef.current[activeMode]);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [phase, activeMode]);

  // Reset active tool when switching to a mode that doesn't include it
  useEffect(() => {
    const allIds = getAllToolIds(moveTool, mainTools, activeMode);
    if (!allIds.includes(activeTool)) {
      setActiveTool(allIds[0]);
    }
  }, [activeMode, moveTool, mainTools, activeTool]);

  // Global ESC handler: close Actions popover and reset to Move tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onActionsOpenChange(false);
        setActiveTool('move');
        setProviderTool('MOVE');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onActionsOpenChange, setProviderTool]);

  const handleModeChange = (value: string) => {
    if (value === 'draw' || value === 'design' || value === 'dev') {
      onModeChange(value);
    }
  };

  const handleSelectTool = (toolId: string) => {
    setActiveTool(toolId);
    setProviderTool(mapToolId(toolId));
    onActionsOpenChange(false);
    const allGroupTools = [moveTool, ...mainTools];
    for (const tool of allGroupTools) {
      if (tool.subTools?.some((st) => st.id === toolId)) {
        setSelectedByGroup((prev) => ({ ...prev, [tool.id]: toolId }));
        break;
      }
    }
  };

  // When the vertical slide finishes, start the width animation (or skip if same width)
  const handleSlideEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform' || e.target !== e.currentTarget) return;
    if (phase !== 'sliding') return;

    const newWidth = widthsRef.current[activeMode];
    if (Math.abs(newWidth - displayWidth) < 1) {
      setPhase('idle');
    } else {
      setPhase('resizing');
    }
  };

  // When the width animation finishes, return to idle
  const handleWidthEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'width' || e.target !== e.currentTarget) return;
    if (phase === 'resizing') {
      setPhase('idle');
    }
  };

  const slideOffset = -visualIndex * rowHeight;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Secondary toolbar — only in draw mode when a draw tool is active */}
      {activeMode === 'draw' && ILLUSTRATION_IDS.includes(activeTool) && (
        <DrawToolSecondaryToolbar
          color={drawColor}
          onColorChange={setDrawColor}
          strokeWeight={drawStrokeWeight}
          onStrokeWeightChange={setDrawStrokeWeight}
        />
      )}
    <div ref={toolbarRef} className="bg-bg flex items-end rounded-lg shadow-300">
        {/* Tools viewport — clips via clip-path, animates width */}
        <div
          className={clsx(
            measured && 'h-[var(--viewport-h)] w-[var(--viewport-w)]',
            measured && (activeMode === 'draw' && phase === 'idle'
              ? styles.clipInsetOverflow
              : styles.clipInset),
            phase === 'resizing' && styles.transitionWidth,
          )}
          style={measured ? {
            '--viewport-h': `${String(rowHeight)}px`,
            '--viewport-w': `${String(displayWidth)}px`,
          } as React.CSSProperties : undefined}
          onTransitionEnd={handleWidthEnd}
        >
          {/* Sliding column — translateY moves between mode rows */}
          <div
            className={clsx(
              measured && styles.slideOffset,
              phase === 'sliding' && styles.transitionSlide,
            )}
            style={{ '--slide-offset': `${String(slideOffset)}px` } as React.CSSProperties}
            onTransitionEnd={handleSlideEnd}
          >
            {MODE_ORDER.map((mode) => {
              const modeMove = toolbarConfigs.move[mode];
              const modeMain = toolbarConfigs.main[mode];

              return (
                <div
                  key={mode}
                  ref={(el) => {
                    rowRefs.current[mode] = el;
                  }}
                  className="flex w-fit"
                  data-editor-theme={MODE_TO_BRAND[mode]}
                >
                  {mode === 'draw' ? (
                    <>
                      {/* Move tool section */}
                      <div className="flex items-center gap-2 p-8px border-r border-solid border-border">
                        <ToolButton
                          key={`${mode}-${modeMove.id}`}
                          id={modeMove.id}
                          Icon={modeMove.Icon}
                          label={modeMove.label}
                          activeTool={activeTool}
                          selectedSubToolId={selectedByGroup[modeMove.id]}
                          subTools={modeMove.subTools}
                          onSelectTool={handleSelectTool}
                        />
                      </div>
                      {/* Illustration tools — overflow visible for raised state */}
                      <div className={clsx(
                        "flex items-end px-2 pt-2 border-r border-solid border-border",
                        activeMode === 'draw' && phase === 'idle' ? 'overflow-visible' : 'overflow-hidden'
                      )}>
                        {ILLUSTRATION_TOOLS.map((tool) => (
                          <IllustrationToolButton
                            key={tool.id}
                            id={tool.id}
                            label={tool.label}
                            isActive={activeTool === tool.id}
                            onSelect={handleSelectTool}
                          >
                            <tool.Illustration />
                          </IllustrationToolButton>
                        ))}
                      </div>
                      {/* Remaining tools */}
                      <div className="flex items-center gap-2 p-8px">
                        {modeMain.map((tool) => (
                          <ToolButton
                            key={`${mode}-${tool.id}`}
                            id={tool.id}
                            Icon={tool.Icon}
                            label={tool.label}
                            activeTool={activeTool}
                            selectedSubToolId={selectedByGroup[tool.id]}
                            subTools={tool.subTools}
                            onSelectTool={handleSelectTool}
                          />
                        ))}
                        {mode === activeMode && (
                          <QuickActions
                            tabs={QUICK_ACTIONS_TABS}
                            isOpen={isActionsOpen}
                            onOpenChange={onActionsOpenChange}
                            isActive={isActionsOpen}
                            width={toolbarWidth}
                            toolbarRef={toolbarRef}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-8px">
                      <ToolButton
                        key={`${mode}-${modeMove.id}`}
                        id={modeMove.id}
                        Icon={modeMove.Icon}
                        label={modeMove.label}
                        activeTool={activeTool}
                        selectedSubToolId={selectedByGroup[modeMove.id]}
                        subTools={modeMove.subTools}
                        onSelectTool={handleSelectTool}
                      />
                      {modeMain.map((tool) => (
                        <ToolButton
                          key={`${mode}-${tool.id}`}
                          id={tool.id}
                          Icon={tool.Icon}
                          label={tool.label}
                          activeTool={activeTool}
                          selectedSubToolId={selectedByGroup[tool.id]}
                          subTools={tool.subTools}
                          onSelectTool={handleSelectTool}
                        />
                      ))}
                      {mode === activeMode && mode !== 'dev' && (
                        <QuickActions
                          tabs={QUICK_ACTIONS_TABS}
                          isOpen={isActionsOpen}
                          onOpenChange={onActionsOpenChange}
                          isActive={isActionsOpen}
                          width={toolbarWidth}
                          toolbarRef={toolbarRef}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mode switcher — always visible */}
        <div className="flex items-center p-8px border-l border-solid border-border">
          <ModeSwitcher value={activeMode} onChange={handleModeChange} legend="Editor mode">
            <ModeSwitcher.Option value="draw" aria-label="Draw view">
              <Icon24Draw />
            </ModeSwitcher.Option>
            <ModeSwitcher.Option value="design" aria-label="Design view">
              <Icon24Design />
            </ModeSwitcher.Option>
            <ModeSwitcher.Option value="dev" aria-label="Dev view">
              <Icon24Dev />
            </ModeSwitcher.Option>
          </ModeSwitcher>
        </div>
    </div>
    </div>
  );
}
