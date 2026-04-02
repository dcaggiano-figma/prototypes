import { useMemo, useState } from 'react';
import { ButtonPrimitive, IconButton, SearchInput } from '@figma/fpl-components';
import { Icon24ChevronRightLarge, Icon24Insert } from '@figma/fpl-icons';
import { Avatar, Table, type TableColumnDef } from '@prototype/shared';

/* -------------------------------------------------------------------------- */
/*  Types & data                                                               */
/* -------------------------------------------------------------------------- */

type AdminCell =
  | { kind: 'photo'; name: string; src: string }
  | { kind: 'initial'; name: string; initial: string };

interface WorkspaceRow {
  id: string;
  name: string;
  admin: AdminCell;
  teamsLabel: string;
  membersLabel: string;
}

const AVATAR_LEONNE = 'https://i.pravatar.cc/150?img=47';
const AVATAR_ADRIAN = 'https://i.pravatar.cc/150?img=11';
const AVATAR_KIMBERLY = 'https://i.pravatar.cc/150?img=5';
const AVATAR_HARVEY = 'https://i.pravatar.cc/150?img=53';
const AVATAR_ALEXIS = 'https://i.pravatar.cc/150?img=20';
const AVATAR_ADAM = 'https://i.pravatar.cc/150?img=60';

const WORKSPACE_ROWS: WorkspaceRow[] = [
  { id: '1',  name: 'Customer Support',       admin: { kind: 'photo',   name: 'Leonne Martin',   src: AVATAR_LEONNE   }, teamsLabel: '11 teams', membersLabel: '43 members' },
  { id: '2',  name: 'Design',                 admin: { kind: 'photo',   name: 'Leonne Martin',   src: AVATAR_LEONNE   }, teamsLabel: '13 teams', membersLabel: '12 members' },
  { id: '3',  name: 'Finance',                admin: { kind: 'photo',   name: 'Adrian Torres',   src: AVATAR_ADRIAN   }, teamsLabel: '4 teams',  membersLabel: '100 members' },
  { id: '4',  name: 'Human Resources',        admin: { kind: 'photo',   name: 'Kimberly Perez',  src: AVATAR_KIMBERLY }, teamsLabel: '1 team',   membersLabel: '17 members' },
  { id: '5',  name: 'IT',                     admin: { kind: 'photo',   name: 'Harvey King',     src: AVATAR_HARVEY   }, teamsLabel: '6 teams',  membersLabel: '19 members' },
  { id: '6',  name: 'Legal',                  admin: { kind: 'photo',   name: 'Harvey King',     src: AVATAR_HARVEY   }, teamsLabel: '15 teams', membersLabel: '32 members' },
  { id: '7',  name: 'Marketing',              admin: { kind: 'initial', name: 'Cameron Smith',   initial: 'C'         }, teamsLabel: '16 teams', membersLabel: '42 members' },
  { id: '8',  name: 'Operations',             admin: { kind: 'photo',   name: 'Harvey King',     src: AVATAR_HARVEY   }, teamsLabel: '2 teams',  membersLabel: '11 members' },
  { id: '9',  name: 'Product Development',    admin: { kind: 'photo',   name: 'Alexis White',    src: AVATAR_ALEXIS   }, teamsLabel: '5 teams',  membersLabel: '1 member' },
  { id: '10', name: 'Research and Development', admin: { kind: 'photo', name: 'Kimberly Perez',  src: AVATAR_KIMBERLY }, teamsLabel: '23 teams', membersLabel: '5 members' },
  { id: '11', name: 'Sales',                  admin: { kind: 'photo',   name: 'Adam Yang',       src: AVATAR_ADAM     }, teamsLabel: '1 team',   membersLabel: '12 members' },
];

/* -------------------------------------------------------------------------- */
/*  Cell renderers & columns                                                   */
/* -------------------------------------------------------------------------- */

function AdminAvatar({ admin }: { admin: AdminCell }) {
  if (admin.kind === 'initial') {
    return <Avatar size="md" initial={admin.initial} color="blue" alt={admin.name} />;
  }
  return <Avatar size="md" src={admin.src} alt={admin.name} />;
}

const WORKSPACE_COLUMNS: TableColumnDef<WorkspaceRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 200,
    sortable: false,
    cellRenderer: ({ data }: { data?: WorkspaceRow }) =>
      data ? (
        <div className="flex items-center gap-8px min-w-0 w-full">
          <span className="size-24px shrink-0 rounded bg-bg-hover" aria-hidden />
          <span className="truncate text-bodyMd font-bold text-text">{data.name}</span>
        </div>
      ) : null,
  },
  {
    field: 'admin',
    headerName: 'Admins',
    flex: 1,
    minWidth: 160,
    sortable: false,
    cellRenderer: ({ data }: { data?: WorkspaceRow }) =>
      data ? (
        <div className="flex items-center gap-8px min-w-0 w-full">
          <AdminAvatar admin={data.admin} />
          <span className="truncate text-bodyMd text-text">{data.admin.name}</span>
        </div>
      ) : null,
  },
  { field: 'teamsLabel',   headerName: 'Teams',   width: 200, minWidth: 120, sortable: false },
  { field: 'membersLabel', headerName: 'Members', width: 200, minWidth: 120, sortable: false },
  {
    colId: '__chevron',
    headerName: '',
    width: 32, maxWidth: 32, minWidth: 32,
    sortable: false, resizable: false, suppressMovable: true, pinned: 'right',
    cellRenderer: ({ data }: { data?: WorkspaceRow }) =>
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

export function WorkspacesTab() {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return WORKSPACE_ROWS;
    return WORKSPACE_ROWS.filter((r) => r.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="flex w-full flex-col h-full min-h-0">
      <div className="flex h-[48px] w-full items-center justify-between gap-16px border-t border-border py-8px shrink-0">
        <div className="min-w-0 w-[260px] shrink-0 [&_input]:text-bodyMd">
          <SearchInput
            aria-label="Search workspaces"
            placeholder="Search workspaces"
            value={search}
            onChange={setSearch}
            size="md"
          />
        </div>
        <ButtonPrimitive
          type="button"
          className="flex h-24px shrink-0 items-center rounded-md border border-dashed border-border pr-8px hover:bg-bg-transparent-hover"
        >
          <span className="flex size-24px items-center justify-center text-icon">
            <Icon24Insert />
          </span>
          <span className="text-bodyMd text-text-secondary whitespace-nowrap">
            Workspaces you manage
          </span>
        </ButtonPrimitive>
      </div>
      <div className="w-full overflow-x-hidden flex-1 min-h-0">
        <Table<WorkspaceRow>
          columns={WORKSPACE_COLUMNS}
          data={rows}
          getRowId={(row) => row.id}
          checkboxSelection
          gridLines={{ horizontal: true }}
          gridOptions={{ rowHeight: 48, headerHeight: 48 }}
        />
      </div>
    </div>
  );
}
