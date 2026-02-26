import { IconButton } from '@figma/fpl-components';
import { Icon24MinusLarge, Icon24PlusLarge } from '@figma/fpl-icons';
import { useViewport } from '../canvas';

export function FigJamZoomControls() {
  const viewport = useViewport();

  const zoomIn = () => {
    viewport.setState((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.25, 64),
    }));
  };

  const zoomOut = () => {
    viewport.setState((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / 1.25, 0.02),
    }));
  };

  return (
    <div className="z-nav flex items-center bg-bg-elevated rounded-full shadow-300 pointer-events-auto overflow-hidden">
      <IconButton size="lg" aria-label="Zoom out" variant="ghost" onClick={zoomOut}>
        <Icon24MinusLarge />
      </IconButton>
      <div className="w-px h-5 bg-border" />
      <IconButton size="lg" aria-label="Zoom in" variant="ghost" onClick={zoomIn}>
        <Icon24PlusLarge />
      </IconButton>
    </div>
  );
}
