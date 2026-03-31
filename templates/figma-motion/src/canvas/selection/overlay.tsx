import { SelectionOverlay as SharedSelectionOverlay } from '@prototype/shared/canvas';
import { ResizeHandles } from './resize-handles';
import { MotionPath } from './motion-path';
import { TransformGizmo } from './transform-gizmo';
import { usePlaybackOptional } from '../../contexts/PlaybackContext';

export function SelectionOverlay() {
  const playback = usePlaybackOptional();
  const isPlaying = playback?.isPlaying ?? false;

  // Hide selection overlay during playback — CSS transforms handle
  // the visual position, so the scene-graph-based overlay would be stale.
  if (isPlaying) return null;

  return (
    <SharedSelectionOverlay>
      <MotionPath />
      <ResizeHandles />
      <TransformGizmo />
    </SharedSelectionOverlay>
  );
}
