import { useMemo } from 'react';
import type { GridApi, Column } from 'ag-grid-community';
import { IconButton, Menu } from '@figma/fpl-components';
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
  const menu = Menu.useMenu();
  const colId = column.getColId();

  const menuContent = useMemo(() => {
    // Custom menu groups
    if (Array.isArray(columnMenu)) {
      return columnMenu.map((group, groupIndex) => (
        <Menu.Group key={groupIndex}>
          {group.items.map((item) => (
            <Menu.Item
              key={item.id}
              disabled={item.disabled}
              onClick={item.onClick}
            >
              {item.icon && <Menu.ItemLead>{item.icon}</Menu.ItemLead>}
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Group>
      ));
    }

    // Default menu
    const groups: React.ReactNode[] = [];

    // Group 1: Sort actions
    if (sorting) {
      groups.push(
        <Menu.Group key="sort">
          <Menu.Item
            onClick={() => {
              api.applyColumnState({
                state: [{ colId, sort: 'asc' }],
                defaultState: { sort: null },
              });
            }}
          >
            <Menu.ItemLead><Icon16ArrowUp /></Menu.ItemLead>
            Sort ascending
          </Menu.Item>
          <Menu.Item
            onClick={() => {
              api.applyColumnState({
                state: [{ colId, sort: 'desc' }],
                defaultState: { sort: null },
              });
            }}
          >
            <Menu.ItemLead><Icon16ArrowDown /></Menu.ItemLead>
            Sort descending
          </Menu.Item>
        </Menu.Group>,
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
        <Menu.Item
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
        </Menu.Item>,
      );
    }
    if (colIndex < userColumns.length - 1) {
      moveItems.push(
        <Menu.Item
          key="moveRight"
          onClick={() => {
            const displayIndex = allColumns.indexOf(column);
            const nextUserCol = userColumns[colIndex + 1];
            const nextDisplayIndex = allColumns.indexOf(nextUserCol);
            api.moveColumnByIndex(displayIndex, nextDisplayIndex);
          }}
        >
          Move right
        </Menu.Item>,
      );
    }

    const hasMove = moveItems.length > 0;
    const hasResize = columnResizing;

    if (hasMove || hasResize) {
      groups.push(
        <Menu.Group key="move-resize">
          {hasMove && (
            <Menu.SubMenu key="move">
              <Menu.SubTrigger>Move column</Menu.SubTrigger>
              <Menu.SubContainer>{moveItems}</Menu.SubContainer>
            </Menu.SubMenu>
          )}
          {hasResize && (
            <Menu.Item
              key="resizeToFit"
              onClick={() => {
                api.autoSizeColumns([colId]);
              }}
            >
              Resize to fit
            </Menu.Item>
          )}
        </Menu.Group>,
      );
    }

    // Group 3: Add/delete column actions
    const columnOps: React.ReactNode[] = [];
    if (onAddColumn) {
      columnOps.push(
        <Menu.Item
          key="addLeft"
          onClick={() => onAddColumn(colId, 'left')}
        >
          Add column left
        </Menu.Item>,
        <Menu.Item
          key="addRight"
          onClick={() => onAddColumn(colId, 'right')}
        >
          Add column right
        </Menu.Item>,
      );
    }
    if (onDeleteColumn) {
      columnOps.push(
        <Menu.Item
          key="delete"
          onClick={() => onDeleteColumn(colId)}
        >
          Delete column
        </Menu.Item>,
      );
    }
    if (columnOps.length > 0) {
      groups.push(<Menu.Group key="column-ops">{columnOps}</Menu.Group>);
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
      <Menu.Root manager={menu.manager}>
        <IconButton
          aria-label="Column menu"
          variant="ghost"
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...menu.getTriggerProps()}
        >
          <Icon16ChevronDown />
        </IconButton>
        <Menu.Container>{menuContent}</Menu.Container>
      </Menu.Root>
    </span>
  );
}
