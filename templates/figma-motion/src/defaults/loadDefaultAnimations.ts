import type { TimelineAnimation } from '../contexts/AnimationStoreContext';
import data from './default-animations.json';

export function loadDefaultAnimations(): TimelineAnimation[] {
  return data as TimelineAnimation[];
}
