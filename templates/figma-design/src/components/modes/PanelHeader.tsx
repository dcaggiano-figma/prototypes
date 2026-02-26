import { ButtonPrimitive, ButtonGroup, IconButton, Button } from '@figma/fpl-components';
import { Icon16ChevronDown, Icon24PlayLarge } from '@figma/fpl-icons';
import { Avatar } from '@prototype/shared';
import { ShareModal } from '../ShareModal';

export function PanelHeader() {
  const { trigger, modal } = ShareModal();

  return (
    <div className="flex items-center justify-between pr-2 pl-12px py-8px">
      <ButtonPrimitive aria-label="User menu" className="flex items-center rounded-full hover:bg-bg-hover active:bg-bg-pressed">
        <Avatar initial="W" size="md" />
        <Icon16ChevronDown />
      </ButtonPrimitive>

      <div className="flex items-center gap-8px">
        <ButtonGroup aria-label="Prototyping">
          <IconButton size="lg" variant="ghost" aria-label="Present">
            <Icon24PlayLarge />
          </IconButton>
          <ButtonGroup.Trigger size="lg" aria-label="Present options" aria-expanded={false} />
        </ButtonGroup>

        <Button variant="primary" size="lg" onClick={trigger}>
          Share
        </Button>
      </div>

      {modal}
    </div>
  );
}
