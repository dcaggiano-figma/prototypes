import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, ButtonPrimitive, InputPrimitive, Menu } from '@figma/fpl-components';
import { Icon16ChevronDown, Icon24Plus } from '@figma/fpl-icons';
import { useMinimizeUI } from './MinimizeUIContext';

/**
 * Top-left floating header with a FigJam-style file title button.
 * Clicking the title enters inline rename mode; the chevron opens a dropdown menu.
 */
export function FloatingFileHeader() {
  const { fileName, setFileName } = useMinimizeUI();
  const fileMenu = Menu.useMenu();
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(fileName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus & select all when entering rename mode
  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const commitRename = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed) {
      setFileName(trimmed);
    } else {
      setDraft(fileName);
    }
    setIsRenaming(false);
  }, [draft, fileName, setFileName]);

  const startRename = useCallback(() => {
    setDraft(fileName);
    setIsRenaming(true);
  }, [fileName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commitRename();
      } else if (e.key === 'Escape') {
        setDraft(fileName);
        setIsRenaming(false);
      }
    },
    [commitRename, fileName],
  );

  return (
    <div className="absolute top-12px left-60px z-nav pointer-events-auto">
      <div className="bg-bg-elevated rounded-lg shadow-300 flex items-center gap-1 p-2">
        {/* File title — click to rename */}
        {isRenaming ? (
          <InputPrimitive
            id="file-rename"
            ref={inputRef}
            value={draft}
            onChange={setDraft}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            className="px-8px py-4px text-bodyLg text-text border border-border-brand rounded-sm outline-none max-w-[200px]"
          />
        ) : (
          <div className="flex items-center">
            <ButtonPrimitive
              aria-label="Rename file"
              onClick={startRename}
              className="px-8px py-4px rounded-md text-bodyLg text-text hover:bg-bg-hover truncate max-w-[200px]"
            >
              {fileName}
            </ButtonPrimitive>

            {/* Dropdown chevron */}
            <Menu.Root manager={fileMenu.manager}>
              <ButtonPrimitive
                aria-label="File options"
                className="p-2px rounded-sm text-icon-tertiary hover:bg-bg-hover hover:text-icon"
                {...fileMenu.getTriggerProps()}
              >
                <Icon16ChevronDown />
              </ButtonPrimitive>
              <Menu.Container>
                <Menu.Group>
                  <Menu.Item onClick={startRename}>Rename</Menu.Item>
                  <Menu.Item onClick={() => {}}>Duplicate</Menu.Item>
                  <Menu.Item onClick={() => {}}>Move to project…</Menu.Item>
                </Menu.Group>
                <Menu.Group>
                  <Menu.Item onClick={() => {}}>Delete</Menu.Item>
                </Menu.Group>
              </Menu.Container>
            </Menu.Root>
          </div>
        )}

        <Button variant="secondary" iconPrefix={<Icon24Plus />}>New asset</Button>
      </div>
    </div>
  );
}
