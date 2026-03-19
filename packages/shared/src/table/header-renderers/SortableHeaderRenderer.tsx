import { useState, useEffect, useCallback, useRef } from 'react';
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
  onRenameColumn?: (columnId: string, newName: string) => void;
}

export function SortableHeaderRenderer(props: SortableHeaderParams) {
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    props.column.getSort() ?? null,
  );
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(props.displayName);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const updateSort = useCallback(() => {
    setSortDirection(props.column.getSort() ?? null);
  }, [props.column]);

  useEffect(() => {
    props.api.addEventListener('sortChanged', updateSort);
    return () => {
      props.api.removeEventListener('sortChanged', updateSort);
    };
  }, [props.api, updateSort]);

  // Toggle data-editing on the .ag-header-cell so global CSS can
  // set overflow:visible on it and its inner wrapper.
  useEffect(() => {
    const headerCell = wrapperRef.current?.closest('.ag-header-cell') as HTMLElement | null;
    if (!headerCell) return;
    if (editing) {
      headerCell.setAttribute('data-editing', '');
    } else {
      headerCell.removeAttribute('data-editing');
    }
  }, [editing]);

  const handleClick = () => {
    if (editing) return;
    const nextSort: SortDirection =
      sortDirection === null ? 'asc' : sortDirection === 'asc' ? 'desc' : null;
    props.setSort(nextSort);
  };

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== props.displayName) {
      props.onRenameColumn?.(props.column.getColId(), trimmed);
    }
    setEditing(false);
  }, [editValue, props]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!props.onRenameColumn) return;
    e.stopPropagation();
    setEditValue(props.displayName);
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const headerActions = props.headerActions;
  const columnMenuConfig = props.columnMenu;

  if (editing) {
    return (
      <div ref={wrapperRef} className={styles.headerEditing}>
        <input
          ref={inputRef}
          className={styles.headerEditingInput}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={styles.sortableHeader} onClick={handleClick} onDoubleClick={handleDoubleClick}>
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
