import { useRef, type ChangeEvent } from 'react';
import { IconButton, Menu } from '@figma/fpl-components';
import {
  Icon24Plus,
  Icon24Paperclip,
  Icon24Component,
  Icon24McpConnector,
} from '@figma/fpl-icons';

export interface AttachMenuProps {
  onFileSelect: (files: File[]) => void;
  onAttachDesign?: () => void;
  onConnectors?: () => void;
  /** Button variant - defaults to 'ghost' */
  variant?: 'ghost' | 'secondary';
}

export function AttachMenu({
  onFileSelect,
  onAttachDesign,
  onConnectors,
  variant = 'ghost',
}: AttachMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenu = Menu.useMenu();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onFileSelect(files);
    }
    e.target.value = '';
  };

  return (
    <>
      <Menu.Root manager={attachMenu.manager}>
        <IconButton
          aria-label="Attach"
          variant={variant}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...attachMenu.getTriggerProps()}
        >
          <Icon24Plus />
        </IconButton>
        <Menu.Container>
          <Menu.Group>
            <Menu.Item onClick={() => fileInputRef.current?.click()}>
              <Menu.ItemLead><Icon24Paperclip /></Menu.ItemLead>
              Add images & files
            </Menu.Item>
            <Menu.Item onClick={() => onAttachDesign?.()}>
              <Menu.ItemLead><Icon24Component /></Menu.ItemLead>
              Attach a design
            </Menu.Item>
          </Menu.Group>
          <Menu.Group>
            <Menu.Item onClick={() => onConnectors?.()}>
              <Menu.ItemLead><Icon24McpConnector /></Menu.ItemLead>
              Connectors
            </Menu.Item>
          </Menu.Group>
        </Menu.Container>
      </Menu.Root>
      {/* eslint-disable-next-line react/forbid-elements -- no FPL file input equivalent */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
