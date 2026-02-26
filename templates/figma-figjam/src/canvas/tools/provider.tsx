import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

import type { Color } from '../types';

export type ToolType = 'MOVE' | 'FRAME' | 'SECTION' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'PEN' | 'HAND' | 'COMMENT' | 'LINE' | 'POLYGON' | 'STAR' | 'STICKY_NOTE'

export type MarkerSubType = 'marker' | 'highlighter' | 'tape';

export interface ToolAPI {
  /** Currently active tool */
  activeTool: ToolType
  /** Effective tool — returns 'HAND' when space bar is held, otherwise activeTool */
  effectiveTool: ToolType
  /** Whether space bar is currently held for temporary panning */
  isSpacePanning: boolean
  /** Set the active tool */
  setActiveTool(tool: ToolType): void
  /** Active sticky note color for creation */
  stickyColor: Color
  /** Set the active sticky note color */
  setStickyColor(color: Color): void
  /** Active marker/pen color (CSS string) */
  markerColor: string
  /** Set the active marker/pen color */
  setMarkerColor(color: string): void
  /** Active highlighter color (CSS string) */
  highlighterColor: string
  /** Set the active highlighter color */
  setHighlighterColor(color: string): void
  /** Active marker sub-type */
  markerSubType: MarkerSubType
  /** Set the active marker sub-type */
  setMarkerSubType(subType: MarkerSubType): void
  /** Active section fill color for creation */
  sectionFillColor: Color
  /** Set the active section fill color */
  setSectionFillColor(color: Color): void
}

const DEFAULT_STICKY_COLOR: Color = { r: 255, g: 226, b: 153 };
const DEFAULT_SECTION_COLOR: Color = { r: 255, g: 255, b: 255 };

const ToolContext = createContext<ToolAPI | null>(null);

/** Tags for elements where space bar should type instead of activating hand tool */
const TEXT_INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveToolState] = useState<ToolType>('MOVE');
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [stickyColor, setStickyColor] = useState<Color>(DEFAULT_STICKY_COLOR);
  const [markerColor, setMarkerColor] = useState('#1B1B1B');
  const [highlighterColor, setHighlighterColor] = useState('#FFF000');
  const [markerSubType, setMarkerSubType] = useState<MarkerSubType>('marker');
  const [sectionFillColor, setSectionFillColor] = useState<Color>(DEFAULT_SECTION_COLOR);

  const setActiveTool = useCallback((tool: ToolType) => {
    setActiveToolState(tool);
  }, []);

  // Space bar hold detection for temporary hand tool
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== ' ' || e.repeat) return;
      const tag = (e.target as HTMLElement).tagName;
      if (TEXT_INPUT_TAGS.has(tag) || (e.target as HTMLElement).isContentEditable) return;
      e.preventDefault();
      setIsSpacePanning(true);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key !== ' ') return;
      setIsSpacePanning(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const effectiveTool: ToolType = isSpacePanning ? 'HAND' : activeTool;

  const api = useMemo<ToolAPI>(
    () => ({
      activeTool, effectiveTool, isSpacePanning, setActiveTool,
      stickyColor, setStickyColor,
      markerColor, setMarkerColor,
      highlighterColor, setHighlighterColor,
      markerSubType, setMarkerSubType,
      sectionFillColor, setSectionFillColor,
    }),
    [activeTool, effectiveTool, isSpacePanning, setActiveTool, stickyColor, markerColor, highlighterColor, markerSubType, sectionFillColor],
  );

  return <ToolContext.Provider value={api}>{children}</ToolContext.Provider>;
}

export function useActiveTool(): ToolAPI {
  const ctx = useContext(ToolContext);
  if (!ctx) throw new Error('useActiveTool must be used within a ToolProvider');
  return ctx;
}
