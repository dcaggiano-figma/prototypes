import { useCallback } from 'react';
import { SelectionOverlay as SharedSelectionOverlay } from '@prototype/shared/canvas';
import { ResizeHandles } from './resize-handles';

export function SelectionOverlay() {
  const shouldSkipNode = useCallback((nodeType: string) => nodeType === 'CONNECTOR', []);

  return (
    <SharedSelectionOverlay showDimensionLabel={false} selectionLineWidth={2} shouldSkipNode={shouldSkipNode}>
      <ResizeHandles />
    </SharedSelectionOverlay>
  );
}
