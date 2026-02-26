import { IconButton, ButtonPrimitive } from '@figma/fpl-components';
import { Icon24FigmaLarge, Icon24SidebarOpen } from '@figma/fpl-icons';
import { useMinimizeUI } from './MinimizeUIContext';

/**
 * Top-left floating header shown in minimized UI mode.
 * Contains a Figma icon, file name, and a button to exit minimized mode.
 */
export function FloatingFileHeader() {
  const { toggleMinimize, fileName } = useMinimizeUI();

  return (
    <div className="absolute top-12px left-12px z-nav pointer-events-auto">
      <div className="bg-bg-elevated rounded-lg shadow-300 flex items-center p-2">
        <IconButton size="lg" aria-label="Main menu">
          <Icon24FigmaLarge />
        </IconButton>

        <ButtonPrimitive aria-label="Show panels" onClick={toggleMinimize} className="px-8px py-4px gap-2 rounded-md text-bodyMd text-text hover:bg-bg-hover truncate max-w-[200px]">
          <span className="truncate px-1 text-bodyLg">{fileName}</span>
          <Icon24SidebarOpen />
        </ButtonPrimitive>

      </div>
    </div>
  );
}
