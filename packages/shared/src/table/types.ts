import type {
  ColDef,
  GridOptions,
  GridReadyEvent,
  RowDragEvent,
  CellValueChangedEvent,
  SortChangedEvent,
  SelectionChangedEvent,
} from 'ag-grid-community';
import type { ReactNode } from 'react';

export type TableSize = 'medium' | 'large';
export type TableDensity = 'compact' | 'default' | 'comfortable';

export interface TableGridLines {
  horizontal?: boolean;
  vertical?: boolean;
}

export interface HeaderAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

export type ColumnMenuItemId =
  | 'sortAsc'
  | 'sortDesc'
  | 'moveLeft'
  | 'moveRight'
  | 'resizeToFit'
  | 'addColumnLeft'
  | 'addColumnRight'
  | 'deleteColumn'
  | string;

export interface ColumnMenuItem {
  id: ColumnMenuItemId;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface ColumnMenuGroup {
  items: ColumnMenuItem[];
}

export interface TableColumnDef<TData = unknown>
  extends Omit<ColDef<TData>, 'headerComponent' | 'headerComponentParams'> {
  headerActions?: HeaderAction[];
  /** Column menu items. Pass `true` for default menu, or an array of ColumnMenuGroup for custom menus. */
  columnMenu?: boolean | ColumnMenuGroup[];
}

export interface TableSection {
  field: string;
  label?: string;
  collapsed?: boolean;
}

/** Marker row inserted by the section data transformer. */
export interface SectionMarkerRow {
  __sectionMarker: true;
  __sectionField: string;
  __sectionLabel: string;
  __sectionCount: number;
  __sectionCollapsed: boolean;
}

export interface TableProps<TData = unknown> {
  columns: TableColumnDef<TData>[];
  data: TData[];
  getRowId?: (row: TData) => string;

  // Appearance
  size?: TableSize;
  density?: TableDensity;
  gridLines?: TableGridLines;
  className?: string;

  // Features (all default false)
  rowNumbers?: boolean;
  checkboxSelection?: boolean;
  selectionMode?: 'singleRow' | 'multiRow';
  sorting?: boolean;
  rowDrag?: boolean;
  cellEditing?: boolean;
  columnResizing?: boolean;
  /** Enable column menus with default actions. Individual columns can override via columnMenu on their column def. */
  columnMenu?: boolean;
  sectionField?: keyof TData & string;
  sections?: TableSection[];

  // Callbacks
  onRowDragEnd?: (event: RowDragEvent<TData>) => void;
  onCellValueChanged?: (event: CellValueChangedEvent<TData>) => void;
  onSortChanged?: (event: SortChangedEvent<TData>) => void;
  onSelectionChanged?: (event: SelectionChangedEvent<TData>) => void;
  onGridReady?: (event: GridReadyEvent<TData>) => void;
  /** Called when a column is added via the column menu. */
  onAddColumn?: (columnId: string, position: 'left' | 'right') => void;
  /** Called when a column is deleted via the column menu. */
  onDeleteColumn?: (columnId: string) => void;

  // Escape hatch
  gridOptions?: Partial<GridOptions<TData>>;
}
