import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { AgGridReactProps } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GetRowIdParams,
  type IsFullWidthRowParams,
  type RowDragEvent,
} from 'ag-grid-community';
import clsx from 'clsx';
import type { TableProps, SectionMarkerRow } from './types';
import { fplTableTheme } from './table-theme';
import { injectSectionRows, isSectionMarker } from './utils';
import { CheckboxCellRenderer } from './cell-renderers/CheckboxCellRenderer';
import { RowNumberCellRenderer } from './cell-renderers/RowNumberCellRenderer';
import { DefaultCellRenderer } from './cell-renderers/DefaultCellRenderer';
import { DragHandleCellRenderer } from './cell-renderers/DragHandleCellRenderer';
import { CheckboxHeaderRenderer } from './header-renderers/CheckboxHeaderRenderer';
import { SortableHeaderRenderer } from './header-renderers/SortableHeaderRenderer';
import { SectionRowRenderer } from './SectionRowRenderer';
import styles from './table.module.css';

// Register all community modules once
ModuleRegistry.registerModules([AllCommunityModule]);

const SIZE_CLASSES = {
  medium: styles.sizeMedium,
  large: styles.sizeLarge,
} as const;

const DENSITY_CLASSES = {
  compact: styles.densityCompact,
  default: styles.densityDefault,
  comfortable: styles.densityComfortable,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- AG Grid uses `any` internally for mixed row data
type AnyRowData = any;

export function Table<TData = unknown>({
  columns,
  data,
  getRowId,
  size = 'medium',
  density = 'default',
  gridLines,
  className,
  rowNumbers = false,
  checkboxSelection = false,
  selectionMode = 'multiRow',
  sorting = false,
  rowDrag = false,
  cellEditing = false,
  columnResizing = false,
  columnMenu = false,
  sectionField,
  sections,
  onRowDragEnd,
  onCellValueChanged,
  onSortChanged,
  onSelectionChanged,
  onGridReady,
  onAddColumn,
  onDeleteColumn,
  gridOptions,
}: TableProps<TData>) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => {
      const initial = new Set<string>();
      if (sections) {
        for (const s of sections) {
          if (s.collapsed) initial.add(s.field);
        }
      }
      return initial;
    },
  );

  const toggleSection = useCallback((sectionKey: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  }, []);

  // Default column definition — wraps cell content in a clipping div
  const defaultColDef = useMemo<ColDef>(
    () => ({
      cellRenderer: DefaultCellRenderer,
    }),
    [],
  );

  // Build row data — inject section markers if needed
  const rowData = useMemo((): AnyRowData[] => {
    if (sectionField) {
      return injectSectionRows(data, sectionField, sections, collapsedSections);
    }
    return data;
  }, [data, sectionField, sections, collapsedSections]);

  // Build column defs
  const columnDefs = useMemo(() => {
    const cols: ColDef[] = [];

    // Drag handle column
    if (rowDrag) {
      cols.push({
        colId: '__drag',
        headerName: '',
        width: 24,
        maxWidth: 24,
        minWidth: 24,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        suppressNavigable: true,
        cellRenderer: DragHandleCellRenderer,
        rowDrag: true,
        pinned: 'left',
      });
    }

    // Checkbox column
    if (checkboxSelection) {
      cols.push({
        colId: '__checkbox',
        headerName: '',
        width: 48,
        maxWidth: 48,
        minWidth: 48,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        cellRenderer: CheckboxCellRenderer,
        headerComponent: CheckboxHeaderRenderer,
        pinned: 'left',
      });
    }

    // Row number column
    if (rowNumbers) {
      cols.push({
        colId: '__rowNumber',
        headerName: '#',
        width: 48,
        maxWidth: 48,
        minWidth: 48,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        cellRenderer: RowNumberCellRenderer,
        pinned: 'left',
      });
    }

    // User-defined columns
    for (const col of columns) {
      const { headerActions, columnMenu: colColumnMenu, ...colDef } = col;
      const processedCol: ColDef = {
        ...colDef,
        sortable: col.sortable ?? sorting,
        resizable: col.resizable ?? columnResizing,
        editable: col.editable ?? cellEditing,
      };

      // Resolve column menu: per-column overrides table-level
      const resolvedColumnMenu = colColumnMenu ?? columnMenu;

      if (sorting || (headerActions && headerActions.length > 0) || resolvedColumnMenu) {
        processedCol.headerComponent = SortableHeaderRenderer;
        processedCol.headerComponentParams = {
          headerActions,
          columnMenu: resolvedColumnMenu,
          sorting,
          columnResizing,
          onAddColumn,
          onDeleteColumn,
        };
      }

      cols.push(processedCol);
    }

    return cols;
  }, [
    columns,
    rowDrag,
    checkboxSelection,
    rowNumbers,
    sorting,
    columnResizing,
    cellEditing,
    columnMenu,
    onAddColumn,
    onDeleteColumn,
  ]);

  // Row ID getter
  const getRowIdFn = useMemo(() => {
    if (sectionField) {
      return (params: GetRowIdParams) => {
        const row = params.data;
        if (isSectionMarker(row)) {
          return `__section_${row.__sectionField}`;
        }
        return getRowId ? getRowId(row as TData) : params.data.__autoId ?? String(Math.random());
      };
    }
    if (getRowId) {
      return (params: GetRowIdParams) =>
        getRowId(params.data as TData);
    }
    return undefined;
  }, [getRowId, sectionField]);

  // Full-width row detection for section markers
  const isFullWidthRow = useMemo(() => {
    if (!sectionField) return undefined;
    return (params: IsFullWidthRowParams) => isSectionMarker(params.rowNode.data);
  }, [sectionField]);

  // Theme with grid line overrides
  const theme = useMemo(() => {
    return fplTableTheme.withParams({
      rowBorder: gridLines?.horizontal !== false,
      columnBorder: gridLines?.vertical ?? false,
    });
  }, [gridLines]);

  const handleRowDragEnd = useCallback(
    (event: RowDragEvent) => {
      onRowDragEnd?.(event as RowDragEvent<TData>);
    },
    [onRowDragEnd],
  );

  // Stop pointer events on headers and drag handles from propagating to parent drag handlers (e.g. Window.ResizableRoot)
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ag-header') || target.closest('.ag-row-drag') || target.closest('[class*="dragHandle"]')) {
        e.stopPropagation();
      }
    };
    el.addEventListener('pointerdown', handler);
    return () => el.removeEventListener('pointerdown', handler);
  }, []);

  const wrapperClass = clsx(
    styles.wrapper,
    SIZE_CLASSES[size],
    DENSITY_CLASSES[density],
    gridLines?.vertical && styles.verticalGridLines,
    className,
  );

  const gridProps: AgGridReactProps = {
    theme,
    rowData,
    columnDefs,
    defaultColDef,
    getRowId: getRowIdFn,
    rowSelection: checkboxSelection
      ? { mode: selectionMode, checkboxes: false, headerCheckbox: false }
      : undefined,
    rowDragManaged: rowDrag,
    isFullWidthRow,
    fullWidthCellRenderer: sectionField
      ? (params: { data: SectionMarkerRow }) => (
          <SectionRowRenderer data={params.data} onToggle={toggleSection} />
        )
      : undefined,
    getRowHeight: sectionField
      ? (params) => (isSectionMarker(params.data) ? 56 : undefined)
      : undefined,
    animateRows: false,
    domLayout: 'autoHeight',
    suppressRowClickSelection: true,
    onRowDragEnd: handleRowDragEnd,
    onCellValueChanged: onCellValueChanged,
    onSortChanged: onSortChanged,
    onSelectionChanged: onSelectionChanged,
    onGridReady: onGridReady,
    ...gridOptions,
  };

  return (
    <div ref={wrapperRef} className={wrapperClass}>
      <AgGridReact {...gridProps} />
    </div>
  );
}
