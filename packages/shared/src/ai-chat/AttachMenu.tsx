import { useRef, type ChangeEvent } from 'react';
import { IconButton } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
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
  const attachMenu = MenuV2.useMenu();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onFileSelect(files);
    }
    e.target.value = '';
  };

  return (
    <>
      <IconButton
        aria-label="Attach"
        variant={variant}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...attachMenu.getTriggerProps()}
      >
        <Icon24Plus />
      </IconButton>
      <MenuV2.Root manager={attachMenu.manager}>
        <MenuV2.Group>
          <MenuV2.Item lead={<Icon24Paperclip />} onClick={() => fileInputRef.current?.click()}>
            Add images & files
          </MenuV2.Item>
          <MenuV2.Item lead={<Icon24Component />} onClick={() => onAttachDesign?.()}>
            Attach a design
          </MenuV2.Item>
        </MenuV2.Group>
        <MenuV2.Group>
          <MenuV2.Item lead={<Icon24McpConnector />} onClick={() => onConnectors?.()}>
            Connectors
          </MenuV2.Item>
        </MenuV2.Group>
      </MenuV2.Root>
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
