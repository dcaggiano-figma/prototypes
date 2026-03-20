import { SelectionOverlay as SharedSelectionOverlay } from '@prototype/shared/canvas';
import { ResizeHandles } from './resize-handles';

export function SelectionOverlay() {
  return (
    <SharedSelectionOverlay>
      <ResizeHandles />
    </SharedSelectionOverlay>
  );
}
