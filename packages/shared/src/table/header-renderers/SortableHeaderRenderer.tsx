import { useState, useEffect, useCallback } from 'react';
import type { IHeaderParams, SortDirection } from 'ag-grid-community';
import { IconButton } from '@figma/fpl-components';
import { Icon16ArrowUp, Icon16ArrowDown } from '@figma/fpl-icons';
import clsx from 'clsx';
import type { HeaderAction, ColumnMenuGroup } from '../types';
import { ColumnHeaderMenu } from './ColumnHeaderMenu';
import styles from '../table.module.css';

interface SortableHeaderParams extends IHeaderParams {
  headerActions?: HeaderAction[];
  columnMenu?: boolean | ColumnMenuGroup[];
  sorting?: boolean;
  columnResizing?: boolean;
  onAddColumn?: (columnId: string, position: 'left' | 'right') => void;
  onDeleteColumn?: (columnId: string) => void;
}

export function SortableHeaderRenderer(props: SortableHeaderParams) {
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    props.column.getSort() ?? null,
  );

  const updateSort = useCallback(() => {
    setSortDirection(props.column.getSort() ?? null);
  }, [props.column]);

  useEffect(() => {
    props.api.addEventListener('sortChanged', updateSort);
    return () => {
      props.api.removeEventListener('sortChanged', updateSort);
    };
  }, [props.api, updateSort]);

  const handleClick = () => {
    const nextSort: SortDirection =
      sortDirection === null ? 'asc' : sortDirection === 'asc' ? 'desc' : null;
    props.setSort(nextSort);
  };

  const headerActions = props.headerActions;
  const columnMenuConfig = props.columnMenu;

  return (
    <div className={styles.sortableHeader} onClick={handleClick}>
      <span className={styles.sortableHeaderLeading}>
        <span className={clsx(styles.sortableHeaderLabel, sortDirection && styles.sortableHeaderLabelActive)}>
          {props.displayName}
        </span>
        {sortDirection && (
          <span
            className={clsx(styles.sortIcon, sortDirection && styles.sortIconActive)}
          >
            {sortDirection === 'asc' ? <Icon16ArrowUp /> : <Icon16ArrowDown />}
          </span>
        )}
      </span>
      {(headerActions?.length || columnMenuConfig) && (
        <span
          className={styles.sortableHeaderTrailing}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {headerActions && headerActions.length > 0 && (
            <span className={styles.sortableHeaderActions}>
              {headerActions.map((action, i) => (
                <IconButton
                  key={i}
                  onClick={action.onClick}
                  aria-label={action.label}
                  variant="ghost"
                >
                  {action.icon}
                </IconButton>
              ))}
            </span>
          )}
          {columnMenuConfig && (
            <ColumnHeaderMenu
              api={props.api}
              column={props.column}
              columnMenu={columnMenuConfig}
              sorting={props.sorting}
              columnResizing={props.columnResizing}
              onAddColumn={props.onAddColumn}
              onDeleteColumn={props.onDeleteColumn}
            />
          )}
        </span>
      )}
    </div>
  );
}
