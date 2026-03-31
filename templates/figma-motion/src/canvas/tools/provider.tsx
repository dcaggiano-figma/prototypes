import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import type { Color, ConnectorLineShape } from '@prototype/shared/canvas';

export type ToolType = 'MOVE' | 'FRAME' | 'SECTION' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'PEN' | 'PENCIL' | 'HAND' | 'COMMENT' | 'LINE' | 'POLYGON' | 'STAR' | 'STICKY_NOTE' | 'CONNECTOR'

export interface ToolAPI {
  /** Currently active tool */
  activeTool: ToolType
  /** Effective tool — returns 'HAND' when space bar is held, otherwise activeTool */
  effectiveTool: ToolType
  /** Whether space bar is currently held for temporary panning */
  isSpacePanning: boolean
  /** Set the active tool */
  setActiveTool(tool: ToolType): void
  /** Draw tool state — color (CSS hex) */
  drawColor: string
  setDrawColor(color: string): void
  /** Draw tool state — stroke weight in px */
  drawStrokeWeight: number
  setDrawStrokeWeight(weight: number): void
  /** Draw tool state — opacity 0–100 */
  drawOpacity: number
  setDrawOpacity(opacity: number): void
  /** Active sticky note color for creation */
  stickyColor: Color
  setStickyColor(color: Color): void
  /** Active shape fill color for creation */
  shapeColor: Color
  setShapeColor(color: Color): void
  /** Active connector line shape for creation */
  connectorLineShape: ConnectorLineShape
  setConnectorLineShape(shape: ConnectorLineShape): void
}

const ToolContext = createContext<ToolAPI | null>(null);

/** Tags for elements where space bar should type instead of activating hand tool */
const TEXT_INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveToolState] = useState<ToolType>('MOVE');
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawStrokeWeight, setDrawStrokeWeight] = useState(2);
  const [drawOpacity, setDrawOpacity] = useState(100);
  const [stickyColor, setStickyColor] = useState<Color>({ r: 255, g: 226, b: 153 });
  const [shapeColor, setShapeColor] = useState<Color>({ r: 217, g: 217, b: 217 });
  const [connectorLineShape, setConnectorLineShape] = useState<ConnectorLineShape>('CURVE');

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
      drawColor, setDrawColor,
      drawStrokeWeight, setDrawStrokeWeight,
      drawOpacity, setDrawOpacity,
      stickyColor, setStickyColor,
      shapeColor, setShapeColor,
      connectorLineShape, setConnectorLineShape,
    }),
    [activeTool, effectiveTool, isSpacePanning, setActiveTool, drawColor, drawStrokeWeight, drawOpacity, stickyColor, shapeColor, connectorLineShape],
  );

  return <ToolContext.Provider value={api}>{children}</ToolContext.Provider>;
}

export function useActiveTool(): ToolAPI {
  const ctx = useContext(ToolContext);
  if (!ctx) throw new Error('useActiveTool must be used within a ToolProvider');
  return ctx;
}
