import {
  useStandardBehaviorChain,
  type Behavior,
  type UseStandardBehaviorChainOptions,
} from '@prototype/shared/canvas'
import { applyGridDrop, findDropTarget, isManagedSlide, type DropTarget } from './scene-graph/grid'

export type UseBehaviorChainOptions = Omit<UseStandardBehaviorChainOptions<DropTarget>, 'grid'>

export function useBehaviorChain(options: UseBehaviorChainOptions): Behavior[] {
  return useStandardBehaviorChain({
    ...options,
    grid: {
      isManagedSlide,
      findDropTarget,
      applyGridDrop,
    },
  })
}
