import { useState } from 'react';
import { ButtonPrimitive, Button } from '@figma/fpl-components';
import { Icon16ChevronDown, Icon24TimerLarge } from '@figma/fpl-icons';
import { UserAvatar } from '@prototype/shared';
import { ShareModal } from './ShareModal';
import { TimerPanel } from './TimerPanel';

export function FigJamTopRight() {
  const shareModal = ShareModal();
  const [timerOpen, setTimerOpen] = useState(false);

  return (
    <div className="absolute top-12px right-12px z-nav flex items-center gap-1 bg-bg-elevated rounded-lg shadow-300 p-2 pl-2.5 pointer-events-auto">
      {/* Avatar dropdown */}
      <ButtonPrimitive aria-label="User menu" className="flex items-center rounded-full hover:bg-bg-hover active:bg-bg-pressed">
        <UserAvatar size="md" />
        <Icon16ChevronDown />
      </ButtonPrimitive>

      {/* Timer widget */}
      <ButtonPrimitive
        className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg font-bold"
        onClick={() => setTimerOpen((prev) => !prev)}
      >
        <Icon24TimerLarge />
        <span className="font-mono text-headingMd">05:00</span>
      </ButtonPrimitive>

      {/* Share button */}
      <Button variant="primary" size="lg" onClick={shareModal.trigger}>Share</Button>
      {shareModal.modal}

      {/* Timer panel */}
      {timerOpen && <TimerPanel onClose={() => setTimerOpen(false)} />}
    </div>
  );
}
