import { useState } from 'react';
import { ButtonPrimitive, IconButton, Input, Popover, PopoverPrimitive } from '@figma/fpl-components';
import { Icon24FigjamPagesLarge, Icon24Plus, Icon16More } from '@figma/fpl-icons';
import clsx from 'clsx';

interface Page {
  id: string;
  name: string;
}

const DEFAULT_PAGES: Page[] = [
  { id: 'page_1', name: 'Page 1' },
];

export function FigJamFileHeader() {
  const [fileName, setFileName] = useState('Untitled');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fileName);
  const [pages, setPages] = useState<Page[]>(DEFAULT_PAGES);
  const [currentPageId, setCurrentPageId] = useState('page_1');
  const [pagesOpen, setPagesOpen] = useState(false);

  const currentPage = pages.find((p) => p.id === currentPageId);
  const hasMultiplePages = pages.length > 1;

  function startEditing() {
    setEditValue(fileName);
    setIsEditing(true);
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed) {
      setFileName(trimmed);
    }
    setIsEditing(false);
  }

  function addPage() {
    const newId = `page_${Date.now()}`;
    const newPage: Page = { id: newId, name: `Page ${pages.length + 1}` };
    setPages((prev) => [...prev, newPage]);
    setCurrentPageId(newId);
  }

  function selectPage(id: string) {
    setCurrentPageId(id);
    setPagesOpen(false);
  }

  const { getTriggerProps, getContainerProps, context } = PopoverPrimitive.usePopover({
    isOpen: pagesOpen,
    onOpenChange: setPagesOpen,
    type: 'dialog',
    softDismiss: true,
    placement: 'bottom-start',
    offset: 16,
  });

  return (
    <div className="absolute top-12px left-12px z-nav flex items-center gap-1 bg-bg-elevated rounded-lg shadow-300 pointer-events-auto">
      <div className="flex items-center p-2">
        {isEditing ? (
          <div className="w-[180px]">
            <Input
              aria-label="File name"
              size="lg"
              value={editValue}
              onChange={setEditValue}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitEdit();
                }
              }}
              onBlur={commitEdit}
            />
          </div>
        ) : (
          <ButtonPrimitive
            className="text-text px-2 h-32px rounded-md text-sm font-normal select-none hover:bg-bg-hover active:bg-bg-pressed truncate max-w-[200px]"
            onDoubleClick={startEditing}
          >
            {fileName}
          </ButtonPrimitive>
        )}
      </div>
      <div className="flex items-center gap-1 border-l border-border p-2">
        {hasMultiplePages ? (
          <ButtonPrimitive
            {...getTriggerProps()}
            className="flex items-center gap-1 pl-2 pr-3 h-32px rounded-md text-bodyLg select-none text-text hover:bg-bg-hover active:bg-bg-pressed aria-expanded:bg-bg-secondary"
          >
            <Icon24FigjamPagesLarge />
            <span className="truncate max-w-[140px]">{currentPage?.name}</span>
          </ButtonPrimitive>
        ) : (
          <IconButton {...getTriggerProps()} size="lg" aria-label="Pages" variant="ghost">
            <Icon24FigjamPagesLarge />
          </IconButton>
        )}

        <PopoverPrimitive.Container {...getContainerProps()} style={{ ...getContainerProps().style, opacity: context.isPositioned ? 1 : 0 }}>
          <Popover.CustomContents>
            <div className="w-[220px] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pl-3 pr-2 pt-2 pb-2">
                <span className="text-bodyMdStrong text-text">Pages</span>
                <IconButton aria-label="Add page" variant="ghost" onClick={addPage}>
                  <Icon24Plus />
                </IconButton>
              </div>

              {/* Page list */}
              <ul className="flex flex-col pb-2">
                {pages.map((page) => {
                  const isSelected = page.id === currentPageId;
                  return (
                    <li className="flex flex-col px-2 py-1" key={page.id}>
                      <ButtonPrimitive
                        aria-label={page.name}
                        className={clsx(`flex items-center justify-between gap-2 pl-2 pr-1 h-4 rounded-md text-bodyMd cursor-pointer group`,
                          isSelected
                            ? 'bg-bg-brand-tertiary text-text text-bodyMdStrong'
                            : 'text-text hover:bg-bg-hover'
                        )}
                        onClick={() => selectPage(page.id)}
                      >
                        <span className="truncate">{page.name}</span>
                        <IconButton aria-label='More' variant='ghost'><Icon16More /></IconButton>
                      </ButtonPrimitive>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Popover.CustomContents>
        </PopoverPrimitive.Container>
      </div>
    </div>
  );
}
