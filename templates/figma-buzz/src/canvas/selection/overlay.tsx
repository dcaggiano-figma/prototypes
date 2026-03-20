import { useCallback } from 'react';

import { SelectionOverlay as SharedSelectionOverlay } from '@prototype/shared/canvas';
import { useViewMode } from '../../components/ViewModeContext';
import { ResizeHandles } from './resize-handles';

export function SelectionOverlay() {
  const { viewMode } = useViewMode();
  const shouldSkipNode = useCallback(
    (nodeType: string) => nodeType === 'SECTION' || nodeType === 'GRID_SECTION' || (nodeType === 'SLIDE' && viewMode === 'grid'),
    [viewMode],
  );

  return (
    <SharedSelectionOverlay shouldSkipNode={shouldSkipNode}>
      <ResizeHandles />
    </SharedSelectionOverlay>
  );
}
