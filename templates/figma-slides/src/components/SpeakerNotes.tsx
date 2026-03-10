import { useCallback, useRef, useState } from 'react';
import { Button, TextareaPrimitive } from '@figma/fpl-components';
import { Icon24GeneratePresenterNotes } from '@figma/fpl-icons';
import { useSpeakerNotes } from './SpeakerNotesContext';
import { useViewMode } from './ViewModeContext';

const LINE_HEIGHT = 24;
const MIN_HEIGHT = LINE_HEIGHT; // 1 line
const MAX_AUTO_HEIGHT = LINE_HEIGHT * 6; // 6 lines auto-grow limit

export function SpeakerNotes() {
  const { viewMode, focusedFrameId } = useViewMode();
  const { getNotes, setNotes } = useSpeakerNotes();
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    const container = containerRef.current;
    if (container) {
      startHeight.current = container.offsetHeight;
    } else {
      startHeight.current = dragHeight ?? MIN_HEIGHT;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [dragHeight]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    // Dragging up = negative delta = increase height
    const delta = startY.current - e.clientY;
    const newHeight = Math.max(MIN_HEIGHT + 24, startHeight.current + delta); // 24 for padding
    setDragHeight(newHeight);
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Only show in slide (asset) view with a focused frame
  if (viewMode !== 'asset' || !focusedFrameId) return null;

  const notes = getNotes(focusedFrameId);

  // When drag height is set, the container uses that fixed height.
  // Otherwise, the textarea auto-grows up to 6 lines.
  const isManuallyResized = dragHeight !== null;

  return (
    <div className="w-full pointer-events-auto mb-3 flex flex-col items-center">
      {/* Drag handle */}
      <div
        className="flex items-center justify-center w-full cursor-ns-resize py-1"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="w-32px h-1 rounded-full bg-icon-tertiary" />
      </div>
      <div
        ref={containerRef}
        className="bg-bg-tertiary rounded-lg p-3 flex flex-col gap-2 w-full"
        style={isManuallyResized ? { height: dragHeight } : undefined}
      >
        <TextareaPrimitive.Root className="w-full flex gap-2 flex-1 min-h-0">
          <TextareaPrimitive
            aria-label="Speaker notes"
            className="w-full resize-none border-none outline-none text-bodyLg text-text bg-bg-tertiary placeholder:text-text-tertiary"
            placeholder="Add presenter notes..."
            value={notes}
            onChange={(value) => setNotes(focusedFrameId, value)}
            rows={1}
            expandable={!isManuallyResized}
            maxHeight={isManuallyResized ? undefined : MAX_AUTO_HEIGHT}
            style={isManuallyResized ? { height: '100%' } : undefined}
          />
          {!notes && (
            <div className="flex">
              <Button variant="ghost" size="md" iconPrefix={<Icon24GeneratePresenterNotes />}>
                Start with a draft
              </Button>
            </div>
          )}
        </TextareaPrimitive.Root>
      </div>
    </div>
  );
}
