import { ButtonPrimitive, ButtonGroup, IconButton, Button } from '@figma/fpl-components';
import { Icon16ChevronDown, Icon24PlayLarge } from '@figma/fpl-icons';
import { useActiveTool, useSelection } from '../canvas';
import { DesignModeContent, CommentsPanelContent, PanelHeader } from './modes';
import type { Mode } from './menuTypes';
import { UserAvatar } from '@prototype/shared';

import { useViewport } from '../canvas';

interface MinimizedRightPanelProps {
  activeMode: Mode;
}

const MODE_CONTENT: Record<Mode, React.FC> = {
  buzz: DesignModeContent,
  design: DesignModeContent,
};

/**
 * Floating right panel in minimized UI mode.
 * - When nodes are selected: shows full properties panel
 * - When nothing selected: shows compact header strip
 */
export function MinimizedRightPanel({ activeMode }: MinimizedRightPanelProps) {
  const { selectedIds } = useSelection();
  const { activeTool } = useActiveTool();
  const hasSelection = selectedIds.size > 0;
  const isCommentMode = activeTool === 'COMMENT';

  if (hasSelection || isCommentMode) {
    return <FloatingFullPanel activeMode={activeMode} isCommentMode={isCommentMode} />;
  }

  return <FloatingCompactHeader />;
}

/** Full floating properties panel (selection active or comment mode) */
function FloatingFullPanel({ activeMode, isCommentMode }: { activeMode: Mode; isCommentMode: boolean }) {
  const ModeContent = MODE_CONTENT[activeMode];

  return (
    <div className="absolute top-12px right-12px bottom-12px w-[240px] z-nav pointer-events-auto">
      <div className="bg-bg-elevated rounded-lg shadow-300 flex flex-col h-full overflow-hidden">
        <PanelHeader />
        {isCommentMode ? <CommentsPanelContent /> : <ModeContent />}
      </div>
    </div>
  );
}

/** Compact floating header strip (no selection) */
function FloatingCompactHeader() {
  const { state: { scale } } = useViewport();

  return (
    <div className="absolute top-12px right-12px z-nav pointer-events-auto">
      <div className="bg-bg-elevated rounded-lg shadow-300 flex items-center gap-8px p-2 pl-2.5">
        <ButtonPrimitive aria-label="User menu" className="flex items-center rounded-full hover:bg-bg-hover active:bg-bg-pressed">
          <UserAvatar size="md" />
          <Icon16ChevronDown />
        </ButtonPrimitive>

        <ButtonPrimitive aria-label="Zoom level" className="flex items-center p-1 pl-2 rounded-md gap-4px text-bodyMd text-text hover:bg-bg-hover active:bg-bg-pressed">
            <span>{Math.round(scale * 100)}%</span>
            <Icon16ChevronDown />
          </ButtonPrimitive>

        <ButtonGroup aria-label="Prototyping">
          <IconButton size="lg" variant="ghost" aria-label="Present">
            <Icon24PlayLarge />
          </IconButton>
          <ButtonGroup.Trigger size="lg" aria-label="Present options" aria-expanded={false} />
        </ButtonGroup>

        <Button variant="primary" size="lg">
          Share
        </Button>
      </div>
    </div>
  );
}
