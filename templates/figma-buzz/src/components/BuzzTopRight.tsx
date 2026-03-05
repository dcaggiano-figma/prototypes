import { ButtonPrimitive, Button } from '@figma/fpl-components';
import { Icon16ChevronDown } from '@figma/fpl-icons';
import { UserAvatar } from '@prototype/shared';
import { ShareModal } from './ShareModal';

export function BuzzTopRight() {
  const shareModal = ShareModal();

  return (
    <div className="absolute top-12px right-12px z-nav flex items-center gap-2 bg-bg-elevated rounded-lg shadow-300 p-2 pl-2.5 pointer-events-auto">
      {/* Avatar dropdown */}
      <ButtonPrimitive aria-label="User menu" className="flex items-center rounded-full hover:bg-bg-hover active:bg-bg-pressed">
        <UserAvatar size="md" />
        <Icon16ChevronDown />
      </ButtonPrimitive>

      {/* Export button */}
      <Button variant="secondary" size="lg">Export</Button>

      {/* Share button */}
      <Button variant="primary" size="lg" onClick={shareModal.trigger}>Share</Button>
      {shareModal.modal}
    </div>
  );
}
