import { useState } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive, Collapse, IconButton } from '@figma/fpl-components';
import { Icon24Plus } from '@figma/fpl-icons';

const COLLECTIONS = [
  { name: 'Collection', count: 0 },
];

const GROUPS = [
  { name: 'Groups', count: 0 },
];

export function VariablesSidebarContent() {
  const [selectedCollection, setSelectedCollection] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState(0);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      {/* Collections section */}
      <Collapse.Root defaultOpen={true}>
        <Collapse.Header variant="leftPanel" size="lg">
          <Collapse.Label size="md">Collections</Collapse.Label>
          <Collapse.Trail>
            <IconButton aria-label="Add collection">
              <Icon24Plus />
            </IconButton>
          </Collapse.Trail>
        </Collapse.Header>
        <Collapse.Content>
          <ul className="flex flex-col pb-2">
            {COLLECTIONS.map((collection, i) => (
              <li className="flex flex-col px-2 py-1" key={collection.name}>
                <ButtonPrimitive
                  aria-label={collection.name}
                  className={clsx(
                    'flex items-center gap-2 px-2 py-1 rounded-md text-bodyMd cursor-pointer',
                    selectedCollection === i
                      ? 'bg-bg-secondary text-text text-bodyMdStrong'
                      : 'text-text hover:bg-bg-hover',
                  )}
                  onClick={() => setSelectedCollection(i)}
                >
                  {collection.name}
                </ButtonPrimitive>
              </li>
            ))}
          </ul>
        </Collapse.Content>
      </Collapse.Root>

      {/* Groups section */}
      <div className="border-t border-border">
        <Collapse.Root defaultOpen={true}>
          <Collapse.Header variant="leftPanel" size="lg">
            <Collapse.Label size="md">Groups</Collapse.Label>
            <Collapse.Trail>
              <IconButton aria-label="Add group">
                <Icon24Plus />
              </IconButton>
            </Collapse.Trail>
          </Collapse.Header>
          <Collapse.Content>
            <ul className="flex flex-col pb-2">
              {GROUPS.map((group, i) => (
                <li className="flex flex-col px-2 py-1" key={group.name}>
                  <ButtonPrimitive
                    aria-label={group.name}
                    className={clsx(
                      'flex items-center gap-2 px-2 py-1 rounded-md text-bodyMd cursor-pointer',
                      selectedGroup === i
                        ? 'bg-bg-selected text-text text-bodyMdStrong'
                        : 'text-text hover:bg-bg-hover',
                    )}
                    onClick={() => setSelectedGroup(i)}
                  >
                    {group.name}
                  </ButtonPrimitive>
                </li>
              ))}
            </ul>
          </Collapse.Content>
        </Collapse.Root>
      </div>
    </div>
  );
}
