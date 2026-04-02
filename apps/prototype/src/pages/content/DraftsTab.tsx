import { useMemo, useState } from 'react';
import { IconButton, SearchInput } from '@figma/fpl-components';

import { Icon24ChevronRightLarge } from '@figma/fpl-icons';
import { Table, type TableColumnDef } from '@prototype/shared';

/* -------------------------------------------------------------------------- */
/*  Types & data                                                               */
/* -------------------------------------------------------------------------- */

interface DraftRow {
  id: string;
  name: string;
  filesLabel: string;
  removedLabel: string;
}

const DRAFT_ROWS: DraftRow[] = [
  { id: 'd1',  name: "Ryan McLaughlin (rmack@twigma.com)'s deleted drafts",       filesLabel: '2 files',  removedLabel: '1 day ago' },
  { id: 'd2',  name: "Sarah Johnson (sjohnson@twigma.com)'s deleted drafts",      filesLabel: '5 files',  removedLabel: '3 days ago' },
  { id: 'd3',  name: "Michael Chen (mchen@twigma.com)'s deleted drafts",          filesLabel: '1 file',   removedLabel: '1 week ago' },
  { id: 'd4',  name: "Jessica Park (jpark@twigma.com)'s deleted drafts",          filesLabel: '8 files',  removedLabel: '2 weeks ago' },
  { id: 'd5',  name: "David Kim (dkim@twigma.com)'s deleted drafts",              filesLabel: '3 files',  removedLabel: '1 day ago' },
  { id: 'd6',  name: "Amanda Torres (atorres@twigma.com)'s deleted drafts",       filesLabel: '12 files', removedLabel: '5 days ago' },
  { id: 'd7',  name: "James Wilson (jwilson@twigma.com)'s deleted drafts",        filesLabel: '2 files',  removedLabel: '2 days ago' },
  { id: 'd8',  name: "Emily Rodriguez (erodriguez@twigma.com)'s deleted drafts",  filesLabel: '4 files',  removedLabel: '1 week ago' },
  { id: 'd9',  name: "Chris Lee (clee@twigma.com)'s deleted drafts",              filesLabel: '7 files',  removedLabel: '3 days ago' },
  { id: 'd10', name: "Priya Patel (ppatel@twigma.com)'s deleted drafts",          filesLabel: '1 file',   removedLabel: '4 days ago' },
];

/* -------------------------------------------------------------------------- */
/*  Cell renderers & columns                                                   */
/* -------------------------------------------------------------------------- */

const DRAFT_COLUMNS: TableColumnDef<DraftRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 200,
    sortable: false,
    cellRenderer: ({ data }: { data?: DraftRow }) =>
      data ? (
        <div className="flex items-center gap-12px min-w-0 w-full">
          <div className="w-[80px] h-[48px] shrink-0 rounded bg-bg-hover" aria-hidden />
          <span className="truncate text-bodyMd text-text">{data.name}</span>
        </div>
      ) : null,
  },
  { field: 'filesLabel',   headerName: 'Files',   width: 200, minWidth: 120, sortable: false },
  { field: 'removedLabel', headerName: 'Removed', width: 200, minWidth: 120, sortable: false },
  {
    colId: '__chevron',
    headerName: '',
    width: 32, maxWidth: 32, minWidth: 32,
    sortable: false, resizable: false, suppressMovable: true, pinned: 'right',
    cellRenderer: ({ data }: { data?: DraftRow }) =>
      data ? (
        <IconButton variant="ghost" aria-label={`Open ${data.name}`}>
          <Icon24ChevronRightLarge />
        </IconButton>
      ) : null,
  },
];

/* -------------------------------------------------------------------------- */
/*  Tab component                                                              */
/* -------------------------------------------------------------------------- */

export function DraftsTab() {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DRAFT_ROWS;
    return DRAFT_ROWS.filter((r) => r.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="flex w-full flex-col h-full min-h-0">
      <div className="flex h-[48px] w-full items-center border-t border-border py-8px shrink-0">
        <div className="min-w-0 w-[260px] shrink-0 [&_input]:text-bodyMd">
          <SearchInput
            aria-label="Search unassigned drafts"
            placeholder="Search unassigned drafts"
            value={search}
            onChange={setSearch}
            size="md"
          />
        </div>
      </div>
      <div className="w-full overflow-x-hidden flex-1 min-h-0">
        <Table<DraftRow>
          columns={DRAFT_COLUMNS}
          data={rows}
          getRowId={(row) => row.id}
          checkboxSelection
          gridLines={{ horizontal: true }}
          gridOptions={{ rowHeight: 64, headerHeight: 48 }}
        />
      </div>
    </div>
  );
}
