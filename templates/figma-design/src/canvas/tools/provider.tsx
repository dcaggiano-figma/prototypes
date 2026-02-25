import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

export type ToolType = 'MOVE' | 'FRAME' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'PEN' | 'HAND' | 'COMMENT'

export interface ToolAPI {
  /** Currently active tool */
  activeTool: ToolType
  /** Effective tool — returns 'HAND' when space bar is held, otherwise activeTool */
  effectiveTool: ToolType
  /** Whether space bar is currently held for temporary panning */
  isSpacePanning: boolean
  /** Set the active tool */
  setActiveTool(tool: ToolType): void
}

const ToolContext = createContext<ToolAPI | null>(null);

/** Tags for elements where space bar should type instead of activating hand tool */
const TEXT_INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveToolState] = useState<ToolType>('MOVE');
  const [isSpacePanning, setIsSpacePanning] = useState(false);

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
    () => ({ activeTool, effectiveTool, isSpacePanning, setActiveTool }),
    [activeTool, effectiveTool, isSpacePanning, setActiveTool],
  );

  return <ToolContext.Provider value={api}>{children}</ToolContext.Provider>;
}

export function useActiveTool(): ToolAPI {
  const ctx = useContext(ToolContext);
  if (!ctx) throw new Error('useActiveTool must be used within a ToolProvider');
  return ctx;
}
