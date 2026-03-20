import { useCallback } from 'react';
import { SelectionOverlay as SharedSelectionOverlay } from '@prototype/shared/canvas';
import { useViewMode } from '../../components/ViewModeContext';
import { ResizeHandles } from './resize-handles';

export function SelectionOverlay(_props?: { dragBox?: unknown }) {
  useViewMode();
  const shouldSkipNode = useCallback(
    (nodeType: string) => nodeType === 'SECTION' || nodeType === 'GRID_SECTION' || nodeType === 'SLIDE',
    [],
  );

  return (
    <SharedSelectionOverlay shouldSkipNode={shouldSkipNode}>
      <ResizeHandles />
    </SharedSelectionOverlay>
  );
}
