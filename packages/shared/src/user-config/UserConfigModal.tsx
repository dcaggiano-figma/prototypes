import { useState } from 'react';
import { Button, Input, Label, Modal } from '@figma/fpl-components';
import { Avatar, MULTIPLAYER_COLORS, type MultiplayerColor } from '../avatar/Avatar';
import { useUserConfig } from './provider';

interface UserConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export function UserConfigModal({ open, onClose }: UserConfigModalProps) {
  const { config, updateConfig } = useUserConfig();

  const [name, setName] = useState(config.name);
  const [color, setColor] = useState<MultiplayerColor | undefined>(config.color);
  const [avatarUrl, setAvatarUrl] = useState(config.avatarUrl ?? '');

  const manager = Modal.useModal({
    open,
    onClose,
  });

  const handleSave = () => {
    updateConfig({
      name: name.trim() || config.name,
      color,
      avatarUrl: avatarUrl.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal.Root manager={manager} width="sm">
      <Modal.Contents>
        <Modal.Header>
          <Modal.Title>User config</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Display name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Avatar color</Label>
            <div className="flex gap-2 flex-wrap">
              {MULTIPLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="rounded-full p-0.5 cursor-pointer"
                  style={{
                    outline: c === color ? '2px solid var(--color-border-selected)' : '2px solid transparent',
                    outlineOffset: '1px',
                  }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                >
                  <Avatar
                    size="md"
                    initial={name.charAt(0).toUpperCase() || '?'}
                    color={c}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="avatar-url">Avatar image URL</Label>
            <Input
              id="avatar-url"
              type="url"
              value={avatarUrl}
              onChange={setAvatarUrl}
              placeholder="https://example.com/photo.jpg"
            />
            {avatarUrl.trim() && (
              <div className="mt-1">
                <Avatar size="lg" src={avatarUrl.trim()} alt={name} />
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Modal.ActionStrip>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save</Button>
          </Modal.ActionStrip>
        </Modal.Footer>
      </Modal.Contents>
    </Modal.Root>
  );
}
