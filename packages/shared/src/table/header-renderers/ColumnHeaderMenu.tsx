import { useMemo } from 'react';
import type { GridApi, Column } from 'ag-grid-community';
import { IconButton } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import { Icon16ChevronDown, Icon16ArrowUp, Icon16ArrowDown } from '@figma/fpl-icons';
import type { ColumnMenuGroup } from '../types';
import styles from '../table.module.css';

interface ColumnHeaderMenuProps {
  api: GridApi;
  column: Column;
  columnMenu: boolean | ColumnMenuGroup[];
  sorting?: boolean;
  columnResizing?: boolean;
  onAddColumn?: (columnId: string, position: 'left' | 'right') => void;
  onDeleteColumn?: (columnId: string) => void;
}

export function ColumnHeaderMenu({
  api,
  column,
  columnMenu,
  sorting,
  columnResizing,
  onAddColumn,
  onDeleteColumn,
}: ColumnHeaderMenuProps) {
  const menu = MenuV2.useMenu();
  const colId = column.getColId();

  const menuContent = useMemo(() => {
    // Custom menu groups
    if (Array.isArray(columnMenu)) {
      return columnMenu.map((group, groupIndex) => (
        <MenuV2.Group key={groupIndex}>
          {group.items.map((item) => (
            <MenuV2.Item
              key={item.id}
              disabled={item.disabled}
              onClick={item.onClick}
              lead={item.icon}
            >
              {item.label}
            </MenuV2.Item>
          ))}
        </MenuV2.Group>
      ));
    }

    // Default menu
    const groups: React.ReactNode[] = [];

    // Group 1: Sort actions
    if (sorting) {
      groups.push(
        <MenuV2.Group key="sort">
          <MenuV2.Item
            lead={<Icon16ArrowUp />}
            onClick={() => {
              api.applyColumnState({
                state: [{ colId, sort: 'asc' }],
                defaultState: { sort: null },
              });
            }}
          >
            Sort ascending
          </MenuV2.Item>
          <MenuV2.Item
            lead={<Icon16ArrowDown />}
            onClick={() => {
              api.applyColumnState({
                state: [{ colId, sort: 'desc' }],
                defaultState: { sort: null },
              });
            }}
          >
            Sort descending
          </MenuV2.Item>
        </MenuV2.Group>,
      );
    }

    // Group 2: Move & resize actions
    const moveItems: React.ReactNode[] = [];
    const allColumns = api.getAllDisplayedColumns();
    // Find index among user columns only (skip internal columns like __drag, __checkbox, __rowNumber)
    const userColumns = allColumns.filter(
      (c) => !c.getColId().startsWith('__'),
    );
    const colIndex = userColumns.findIndex((c) => c.getColId() === colId);

    if (colIndex > 0) {
      moveItems.push(
        <MenuV2.Item
          key="moveLeft"
          onClick={() => {
            const displayIndex = allColumns.indexOf(column);
            // Find the previous user column's display index
            const prevUserCol = userColumns[colIndex - 1];
            const prevDisplayIndex = allColumns.indexOf(prevUserCol);
            api.moveColumnByIndex(displayIndex, prevDisplayIndex);
          }}
        >
          Move left
        </MenuV2.Item>,
      );
    }
    if (colIndex < userColumns.length - 1) {
      moveItems.push(
        <MenuV2.Item
          key="moveRight"
          onClick={() => {
            const displayIndex = allColumns.indexOf(column);
            const nextUserCol = userColumns[colIndex + 1];
            const nextDisplayIndex = allColumns.indexOf(nextUserCol);
            api.moveColumnByIndex(displayIndex, nextDisplayIndex);
          }}
        >
          Move right
        </MenuV2.Item>,
      );
    }

    const hasMove = moveItems.length > 0;
    const hasResize = columnResizing;

    if (hasMove || hasResize) {
      groups.push(
        <MenuV2.Group key="move-resize">
          {hasMove && (
            <MenuV2.SubMenu key="move" title="Move column">
              {moveItems}
            </MenuV2.SubMenu>
          )}
          {hasResize && (
            <MenuV2.Item
              key="resizeToFit"
              onClick={() => {
                api.autoSizeColumns([colId]);
              }}
            >
              Resize to fit
            </MenuV2.Item>
          )}
        </MenuV2.Group>,
      );
    }

    // Group 3: Add/delete column actions
    const columnOps: React.ReactNode[] = [];
    if (onAddColumn) {
      columnOps.push(
        <MenuV2.Item
          key="addLeft"
          onClick={() => onAddColumn(colId, 'left')}
        >
          Add column left
        </MenuV2.Item>,
        <MenuV2.Item
          key="addRight"
          onClick={() => onAddColumn(colId, 'right')}
        >
          Add column right
        </MenuV2.Item>,
      );
    }
    if (onDeleteColumn) {
      columnOps.push(
        <MenuV2.Item
          key="delete"
          onClick={() => onDeleteColumn(colId)}
        >
          Delete column
        </MenuV2.Item>,
      );
    }
    if (columnOps.length > 0) {
      groups.push(<MenuV2.Group key="column-ops">{columnOps}</MenuV2.Group>);
    }

    return groups;
  }, [
    columnMenu,
    sorting,
    columnResizing,
    api,
    column,
    colId,
    onAddColumn,
    onDeleteColumn,
  ]);

  return (
    <span className={styles.columnMenuTrigger}>
      <IconButton
        aria-label="Column menu"
        variant="ghost"
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...menu.getTriggerProps()}
      >
        <Icon16ChevronDown />
      </IconButton>
      <MenuV2.Root manager={menu.manager}>
        {menuContent}
      </MenuV2.Root>
    </span>
  );
}
