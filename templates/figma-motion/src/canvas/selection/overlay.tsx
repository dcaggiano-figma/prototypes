import { SelectionOverlay as SharedSelectionOverlay } from '@prototype/shared/canvas';
import { ResizeHandles } from './resize-handles';
import { MotionPath } from './motion-path';
import { TransformGizmo } from './transform-gizmo';

export function SelectionOverlay() {
  return (
    <SharedSelectionOverlay>
      <MotionPath />
      <ResizeHandles />
      <TransformGizmo />
    </SharedSelectionOverlay>
  );
}
