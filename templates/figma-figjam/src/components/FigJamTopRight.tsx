import { useState } from 'react';
import { ButtonPrimitive, IconButton, Button } from '@figma/fpl-components';
import { Icon16ChevronDown, Icon24AiLarge, Icon24TimerLarge, Icon24TemplateLarge } from '@figma/fpl-icons';
import Avatar from './avatar';
import { ShareModal } from './ShareModal';
import { TimerPanel } from './TimerPanel';

export function FigJamTopRight() {
  const shareModal = ShareModal();
  const [timerOpen, setTimerOpen] = useState(false);

  return (
    <div className="absolute top-12px right-12px z-nav flex items-center gap-1 bg-bg-elevated rounded-lg shadow-300 p-2 pl-2.5 pointer-events-auto">
      {/* Avatar dropdown */}
      <ButtonPrimitive aria-label="User menu" className="flex items-center rounded-full hover:bg-bg-hover active:bg-bg-pressed">
        <Avatar initial="W" size="md" />
        <Icon16ChevronDown />
      </ButtonPrimitive>

      {/* Action icons */}
      <IconButton size="lg" aria-label="AI" variant="ghost">
        <Icon24AiLarge />
      </IconButton>
      <IconButton size="lg" aria-label="Table" variant="ghost">
        <Icon24TemplateLarge />
      </IconButton>

      {/* Timer widget */}
      <ButtonPrimitive
        className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-bg-hover active:bg-bg-pressed text-text text-bodyLg font-bold"
        onClick={() => setTimerOpen((prev) => !prev)}
      >
        <Icon24TimerLarge />
        <span>05:00</span>
      </ButtonPrimitive>

      {/* Share button */}
      <Button variant="primary" size="lg" onClick={shareModal.trigger}>Share</Button>
      {shareModal.modal}

      {/* Timer panel */}
      {timerOpen && <TimerPanel onClose={() => setTimerOpen(false)} />}
    </div>
  );
}
