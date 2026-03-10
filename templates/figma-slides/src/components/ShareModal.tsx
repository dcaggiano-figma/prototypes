import { useState } from 'react';
import { Button, ButtonPrimitive, Chip, HiddenLabel, Input, Modal, Select } from '@figma/fpl-components';
import { Icon24ChevronRight, Icon24CodeBlock, Icon24Link, Icon24Play, Icon24Plus, Icon24Settings } from '@figma/fpl-icons';
import { Avatar } from '@prototype/shared';

const MOCK_USERS = [
  { name: 'Wren Yeung', email: 'wren@figma.com', initial: 'W', permission: 'Owner' },
  { name: 'Alex Chen', email: 'alex@figma.com', initial: 'A', permission: 'can edit' },
  { name: 'Jordan Lee', email: 'jordan@figma.com', initial: 'J', permission: 'can view' },
];

export function ShareModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState('can edit');

  const manager = Modal.useModal({
    open: isOpen,
    onClose: () => setIsOpen(false),
  });

  return {
    trigger: () => setIsOpen(true),
    modal: (
      <Modal.Root manager={manager} width="lg">
        <Modal.Contents>
          <Modal.Header>
            <Modal.Title>Share</Modal.Title>
            <Modal.ActionStrip>
              <div className="flex items-center mr-2">
                <Button variant="link" iconPrefix={<Icon24Link />}>
                  Copy link
                </Button>
              </div>
            </Modal.ActionStrip>
          </Modal.Header>

          <Modal.Body>
            {/* Invite section */}
            <div className="flex items-end gap-2 py-2">
              <div className="flex-1">
                <Input.Root size='lg'>
                  <Input
                    aria-label="Invite people"
                    placeholder="Invite by email or name"
                    value={inviteEmail}
                    onChange={setInviteEmail}
                  />
                  <div className="flex px-1">
                    <Select.Root value={invitePermission} onChange={(value) => { if (value !== undefined) setInvitePermission(value); }}>
                      <Select.ManuallyLabeledTrigger id="share-permission" aria-label="Permission" />
                      <Select.Container>
                        <Select.Option value="can edit">can edit</Select.Option>
                        <Select.Option value="can view">can view</Select.Option>
                      </Select.Container>
                    </Select.Root>
                  </div>
                </Input.Root>
              </div>
              <Button variant="primary" size='lg'>Invite</Button>
            </div>

            <div className="flex gap-1 pb-3 flex-wrap">
              <Chip onClose={()=>{}} leading={<Icon24Plus />}>Kyle Rosenberg</Chip>
              <Chip onClose={()=>{}} leading={<Icon24Plus />}>Aosheng Ran</Chip>
              <Chip onClose={()=>{}} leading={<Icon24Plus />}>Bobby Bucatini</Chip>
            </div>

            {/* People with access */}
            <div className="flex flex-col gap-1">
              <span className="text-bodyMdStrong text-text-secondary pb-1">
                Who has access
              </span>
              {MOCK_USERS.map((user) => (
                <div
                  key={user.email}
                  className="flex items-center gap-2 py-4px"
                >
                  <Avatar initial={user.initial} size="md" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-bodyMd text-text truncate">
                      {user.name}
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    {user.permission !== 'Owner' ? (
                      <Select.Root value={user.permission} onChange={() => {}}>
                        <Select.Trigger label={<HiddenLabel>Permission</HiddenLabel>} />
                        <Select.Container>
                          <Select.Option value="can edit">Can edit</Select.Option>
                          <Select.Option value="can view">Can view</Select.Option>
                        </Select.Container>
                      </Select.Root>
                    ) : (
                      <span className="flex items-center px-2 text-bodyMd text-text">{user.permission}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Modal.Body>
        </Modal.Contents>
        <Modal.Contents className="mt-3">
          <Modal.Body className="flex flex-col gap-1 p-2">
            <ButtonPrimitive className="flex items-center gap-2 p-1 rounded-md hover:bg-bg-hover active:bg-bg-pressed w-full flex-1">
              <Icon24Play />
              <span className="flex-1 text-bodyMd text-text">Copy Prototype link</span>
              <Icon24Settings />
            </ButtonPrimitive>
            <ButtonPrimitive className="flex items-center gap-2 p-1 rounded-md hover:bg-bg-hover active:bg-bg-pressed w-full flex-1">
              <Icon24CodeBlock />
              <span className="flex-1 text-bodyMd text-text">Get embed code</span>
              <Icon24ChevronRight />
            </ButtonPrimitive>
          </Modal.Body>
        </Modal.Contents>
      </Modal.Root>
    ),
  };
}
