import { IconButton } from '@figma/fpl-components';
import { Icon24MinusLarge, Icon24PlusLarge } from '@figma/fpl-icons';
import { useActionRegistry } from '../actions/provider';

export function FigJamZoomControls() {
  const registry = useActionRegistry();

  return (
    <div className="z-nav flex items-center bg-bg-elevated rounded-full shadow-300 pointer-events-auto overflow-hidden">
      <IconButton size="lg" aria-label="Zoom out" variant="ghost" onClick={() => registry.dispatch('zoom-out')}>
        <Icon24MinusLarge />
      </IconButton>
      <div className="w-px h-5 bg-border" />
      <IconButton size="lg" aria-label="Zoom in" variant="ghost" onClick={() => registry.dispatch('zoom-in')}>
        <Icon24PlusLarge />
      </IconButton>
    </div>
  );
}
