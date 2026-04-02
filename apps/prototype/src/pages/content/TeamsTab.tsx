import { useMemo, useState } from 'react';
import { ButtonPrimitive, IconButton, SearchInput } from '@figma/fpl-components';
import { Icon24ChevronRightLarge, Icon24Export, Icon24Insert } from '@figma/fpl-icons';
import { Avatar, Table, type TableColumnDef } from '@prototype/shared';


/* -------------------------------------------------------------------------- */
/*  Types & data                                                               */
/* -------------------------------------------------------------------------- */

type AdminCell =
  | { kind: 'photo'; name: string; src: string }
  | { kind: 'initial'; name: string; initial: string };

interface TeamRow {
  id: string;
  name: string;
  owner: AdminCell;
  ownerEmail: string;
  projectsLabel: string;
  membersLabel: string;
}

const AVATAR_JAKE      = 'https://i.pravatar.cc/150?img=12';
const AVATAR_KATHY     = 'https://i.pravatar.cc/150?img=9';
const AVATAR_LAURA     = 'https://i.pravatar.cc/150?img=32';
const AVATAR_LAUREN_MC = 'https://i.pravatar.cc/150?img=44';
const AVATAR_BRANDON   = 'https://i.pravatar.cc/150?img=65';
const AVATAR_ALEXIS    = 'https://i.pravatar.cc/150?img=20';

const TEAM_ROWS: TeamRow[] = [
  { id: 't1',  name: 'InnovationIcons',     owner: { kind: 'initial', name: 'Ashlyn Kim',        initial: 'A' }, ownerEmail: 'akim@twigma.com',         projectsLabel: '2 projects', membersLabel: '12 members' },
  { id: 't2',  name: 'UXUnicorns',          owner: { kind: 'photo',   name: 'Jake Murray',        src: AVATAR_JAKE      }, ownerEmail: 'jmurray@twigma.com',      projectsLabel: '2 projects', membersLabel: '12 members' },
  { id: 't3',  name: 'DesignDynamos',       owner: { kind: 'photo',   name: 'Kathy Bates',        src: AVATAR_KATHY     }, ownerEmail: 'kbates@twigma.com',       projectsLabel: '2 projects', membersLabel: '12 members' },
  { id: 't4',  name: 'CreativeCollective',  owner: { kind: 'photo',   name: 'Laura Brown',        src: AVATAR_LAURA     }, ownerEmail: 'lbrown@twigma.com',       projectsLabel: '2 projects', membersLabel: '12 members' },
  { id: 't5',  name: 'UserJourneyJedis',    owner: { kind: 'photo',   name: 'Alexis White',       src: AVATAR_ALEXIS    }, ownerEmail: 'awhite@twigma.com',       projectsLabel: '2 projects', membersLabel: '12 members' },
  { id: 't6',  name: 'DesignDazzlers',      owner: { kind: 'initial', name: 'Aaron Taylor',       initial: 'A' }, ownerEmail: 'ataylor@twigma.com',      projectsLabel: '2 projects', membersLabel: '12 members' },
  { id: 't7',  name: 'PrototypePioneers',   owner: { kind: 'photo',   name: 'Laura Brown',        src: AVATAR_LAURA     }, ownerEmail: 'lbrown@twigma.com',       projectsLabel: '2 projects', membersLabel: '12 members' },
  { id: 't8',  name: 'VisualVoyagers',      owner: { kind: 'photo',   name: 'Lauren McAllister',  src: AVATAR_LAUREN_MC }, ownerEmail: 'lmcallister@twigma.com',  projectsLabel: '2 projects', membersLabel: '12 members' },
  { id: 't9',  name: 'InterfaceInnovators', owner: { kind: 'photo',   name: 'Brandon Kent',       src: AVATAR_BRANDON   }, ownerEmail: 'bkent@huge.com',          projectsLabel: '2 projects', membersLabel: '12 members' },
  { id: 't10', name: 'ExperienceExperts',   owner: { kind: 'initial', name: 'Cameron Smith',      initial: 'C' }, ownerEmail: 'csmith@twigma.com',       projectsLabel: '2 projects', membersLabel: '12 members' },
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

const TEAM_COLUMNS: TableColumnDef<TeamRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 200,
    sortable: false,
    cellRenderer: ({ data }: { data?: TeamRow }) =>
      data ? (
        <div className="flex items-center gap-8px min-w-0 w-full">
          <span className="size-24px shrink-0 rounded bg-bg-hover" aria-hidden />
          <span className="truncate text-bodyMd font-bold text-text">{data.name}</span>
        </div>
      ) : null,
  },
  {
    field: 'owner',
    headerName: 'Owner',
    width: 240,
    minWidth: 180,
    sortable: false,
    cellRenderer: ({ data }: { data?: TeamRow }) =>
      data ? (
        <div className="flex items-center gap-8px min-w-0 w-full">
          <AdminAvatar admin={data.owner} />
          <div className="flex flex-col min-w-0">
            <span className="truncate text-bodyMd text-text">{data.owner.name}</span>
            <span className="truncate text-bodyMd text-text-secondary">{data.ownerEmail}</span>
          </div>
        </div>
      ) : null,
  },
  { field: 'projectsLabel', headerName: 'Projects', width: 160, minWidth: 120, sortable: false },
  { field: 'membersLabel',  headerName: 'Members',  width: 160, minWidth: 120, sortable: false },
  {
    colId: '__chevron',
    headerName: '',
    width: 32, maxWidth: 32, minWidth: 32,
    sortable: false, resizable: false, suppressMovable: true, pinned: 'right',
    cellRenderer: ({ data }: { data?: TeamRow }) =>
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

export function TeamsTab() {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TEAM_ROWS;
    return TEAM_ROWS.filter((r) => r.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="flex w-full flex-col h-full min-h-0">
      <div className="flex h-[48px] w-full items-center justify-between gap-16px border-t border-border py-8px shrink-0">
        <div className="min-w-0 w-[260px] shrink-0 [&_input]:text-bodyMd">
          <SearchInput
            aria-label="Search teams"
            placeholder="Search teams"
            value={search}
            onChange={setSearch}
            size="md"
          />
        </div>
        <div className="flex items-center gap-8px shrink-0">
          <ButtonPrimitive
            type="button"
            className="flex h-24px shrink-0 items-center rounded-md border border-dashed border-border pr-8px hover:bg-bg-transparent-hover"
          >
            <span className="flex size-24px items-center justify-center text-icon">
              <Icon24Insert />
            </span>
            <span className="text-bodyMd text-text-secondary whitespace-nowrap">
              Teams without owners
            </span>
          </ButtonPrimitive>
          <ButtonPrimitive
            type="button"
            className="flex h-24px shrink-0 items-center rounded-md border border-dashed border-border pr-8px hover:bg-bg-transparent-hover"
          >
            <span className="flex size-24px items-center justify-center text-icon">
              <Icon24Insert />
            </span>
            <span className="text-bodyMd text-text-secondary whitespace-nowrap">
              Teams you&apos;re a member of
            </span>
          </ButtonPrimitive>
          <IconButton variant="ghost" aria-label="Export">
            <Icon24Export />
          </IconButton>
        </div>
      </div>
      <div className="w-full overflow-x-hidden flex-1 min-h-0">
        <Table<TeamRow>
          columns={TEAM_COLUMNS}
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
