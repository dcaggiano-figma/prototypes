import { ButtonPrimitive, Button } from '@figma/fpl-components';
import { Icon16ChevronDown} from '@figma/fpl-icons';
import { UserAvatar } from '@prototype/shared';
import { ShareModal } from '../ShareModal';

export function PanelHeader() {
  const { trigger, modal } = ShareModal();

  return (
    <div className="flex items-center justify-between pr-2 pl-12px py-8px">
      <ButtonPrimitive aria-label="User menu" className="flex items-center rounded-full hover:bg-bg-hover active:bg-bg-pressed">
        <UserAvatar size="md" />
        <Icon16ChevronDown />
      </ButtonPrimitive>

      <div className="flex items-center gap-2">
      <Button variant="secondary" size="lg">Export</Button>
        <Button variant="primary" size="lg" onClick={trigger}>
          Share
        </Button>
      </div>

      {modal}
    </div>
  );
}
