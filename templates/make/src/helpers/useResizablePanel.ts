import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useRef,
  useEffect,
} from 'react';

interface UseResizablePanelOptions {
  /** The minimum (and default) width in pixels */
  minWidth: number;
  /** Optional maximum width in pixels */
  maxWidth?: number;
}

export function useResizablePanel({ minWidth, maxWidth }: UseResizablePanelOptions) {
  const panelRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      e.preventDefault();
      const panel = panelRef.current;
      if (!panel) return;
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = panel.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const panel = panelRef.current;
      if (!panel) return;
      const delta = e.clientX - startX.current;
      let newWidth = startWidth.current + delta;
      if (newWidth < minWidth) newWidth = minWidth;
      if (maxWidth && newWidth > maxWidth) newWidth = maxWidth;
      panel.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [minWidth, maxWidth]);

  return { panelRef, onMouseDown };
}
