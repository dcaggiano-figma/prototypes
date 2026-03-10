import { ButtonPrimitive, Button } from '@figma/fpl-components';
import { Icon24SidebarOpen, Icon24Plus } from '@figma/fpl-icons';
import clsx from 'clsx';
import { useMinimizeUI } from './MinimizeUIContext';
import { useSceneGraph, useSelection } from '../canvas';
import { useViewMode } from './ViewModeContext';
import { createSlideAfterFocused } from '../canvas/scene-graph/grid-manager';

/**
 * Top-left floating header shown in minimized UI mode or grid view.
 * Contains a Figma icon, file name, sidebar toggle, and a "New slide" button.
 */
export function FloatingFileHeader() {
  const { isMinimized, toggleMinimize, fileName } = useMinimizeUI();
  const store = useSceneGraph();
  const { selectedIds, select } = useSelection();
  const { viewMode, setFocusedFrameId } = useViewMode();

  // Find the first selected slide/frame ID to insert after
  const selectedSlideId = selectedIds.size > 0 ? [...selectedIds][0] : null;

  const handleNewSlide = () => {
    const newId = createSlideAfterFocused(store, selectedSlideId);
    if (newId) {
      select(newId);
      if (viewMode === 'asset') setFocusedFrameId(newId);
    }
  };

  return (
    <div className={clsx('absolute top-12px z-nav pointer-events-auto', isMinimized ? 'left-12px' : 'left-60px')}>
      <div className="bg-bg-elevated rounded-lg shadow-300 flex items-center p-2 gap-2">

        <ButtonPrimitive aria-label="Show panels" onClick={toggleMinimize} className="px-8px py-4px gap-2 rounded-md text-bodyMd text-text hover:bg-bg-hover truncate max-w-[200px]">
          <span className="truncate text-bodyLg">{fileName}</span>
          <Icon24SidebarOpen />
        </ButtonPrimitive>

        <Button variant="secondary" size="lg" iconPrefix={<Icon24Plus />} onClick={handleNewSlide}>New slide</Button>
      </div>
    </div>
  );
}
