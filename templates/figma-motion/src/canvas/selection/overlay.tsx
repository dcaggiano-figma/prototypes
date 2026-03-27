import { useEffect, useRef } from 'react';
import { SelectionOverlay as SharedSelectionOverlay, useSceneGraph, useSelection, isGeometryNode } from '@prototype/shared/canvas';
import { ResizeHandles } from './resize-handles';
import { MotionPath } from './motion-path';
import { TransformGizmo } from './transform-gizmo';
import { usePlaybackOptional } from '../../contexts/PlaybackContext';
import { useKeyframeStoreOptional } from '../../contexts/KeyframeStoreContext';
import { interpolateKeyframes } from '../animation-utils';

/**
 * When playback stops, write the final animated values (from keyframes)
 * back into the scene graph so that the selection overlay and property
 * panel reflect the node's resting state at the current playhead time.
 */
function useCommitKeyframesOnStop() {
  const playback = usePlaybackOptional();
  const kfStore = useKeyframeStoreOptional();
  const sg = useSceneGraph();
  const { selectedIds } = useSelection();
  const wasPlayingRef = useRef(false);

  const commitKeyframes = () => {
    if (!kfStore || !playback) return;
    const currentMs = playback.currentMs;

    for (const nodeId of selectedIds) {
      const node = sg.getNode(nodeId);
      if (!node || !isGeometryNode(node)) continue;

      const nodeKfs = kfStore.getNodeKeyframes(String(nodeId));
      if (nodeKfs.size === 0) continue;

      const updates: Record<string, number> = {};
      for (const [prop, kfs] of nodeKfs) {
        if (kfs.length < 2) continue;
        const val = interpolateKeyframes(kfs, currentMs);
        if (val !== undefined) {
          updates[prop] = val;
        }
      }

      if (Object.keys(updates).length > 0) {
        sg.updateNode(nodeId, updates);
      }
    }
  };

  // Commit when playback stops
  useEffect(() => {
    const isPlaying = playback?.isPlaying ?? false;
    if (wasPlayingRef.current && !isPlaying) {
      commitKeyframes();
    }
    wasPlayingRef.current = isPlaying;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback?.isPlaying]);

  // Commit when scrubbing the playhead while stopped
  useEffect(() => {
    if (playback?.isPlaying) return;
    commitKeyframes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback?.currentMs]);
}

export function SelectionOverlay() {
  const playback = usePlaybackOptional();
  const isPlaying = playback?.isPlaying ?? false;

  useCommitKeyframesOnStop();

  if (isPlaying) return null;

  return (
    <SharedSelectionOverlay>
      <MotionPath />
      <ResizeHandles />
      <TransformGizmo />
    </SharedSelectionOverlay>
  );
}
