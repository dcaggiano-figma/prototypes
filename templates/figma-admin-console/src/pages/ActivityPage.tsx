import { useState, useMemo } from 'react';
import { HiddenLabel, IconButton, SearchInput, Select } from '@figma/fpl-components';
import { Icon24Export } from '@figma/fpl-icons';
import { Avatar, Table, type TableColumnDef } from '@prototype/shared';

/* -------------------------------------------------------------------------- */
/*  Types & data                                                               */
/* -------------------------------------------------------------------------- */

interface ActivityRow {
  id: string;
  date: string;
  time: string;
  memberName: string;
  memberEmail: string;
  memberInitial: string;
  event: string;
  fileName: string;
  product: string;
  team: string;
  ipAddress: string;
}

const ACTIVITY_DATA: ActivityRow[] = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  date: 'Feb 3, 2024',
  time: '3:30pm',
  memberName: 'User name',
  memberEmail: 'uname@twigma.com',
  memberInitial: 'U',
  event: 'Viewed',
  fileName: 'File name',
  product: 'FigJam',
  team: 'Product design',
  ipAddress: '64.123.11.000',
}));

const DATE_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
];

const EVENT_OPTIONS = [
  { value: 'all', label: 'All events' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'edited', label: 'Edited' },
  { value: 'shared', label: 'Shared' },
  { value: 'exported', label: 'Exported' },
];

const TEAM_OPTIONS = [
  { value: 'all', label: 'All teams' },
  { value: 'product-design', label: 'Product design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
];

/* -------------------------------------------------------------------------- */
/*  Table cells                                                               */
/* -------------------------------------------------------------------------- */

function DateCell({ data }: { data?: ActivityRow }) {
  if (!data) return null;
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-bodyMd font-bold text-text whitespace-nowrap">{data.date}</span>
      <span className="text-bodyMd text-text-secondary whitespace-nowrap">{data.time}</span>
    </div>
  );
}

function MemberCell({ data }: { data?: ActivityRow }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-8px min-w-0 w-full">
      <Avatar size="md" initial={data.memberInitial} color="grey" alt={data.memberName} />
      <div className="flex min-w-0 flex-col">
        <span className="text-bodyMd font-bold text-text truncate">{data.memberName}</span>
        <span className="text-bodyMd text-text-secondary truncate">{data.memberEmail}</span>
      </div>
    </div>
  );
}

function EventCell({ data }: { data?: ActivityRow }) {
  if (!data) return null;
  return (
    <span className="text-bodyMd text-text truncate">
      {data.event}{' '}
      <strong className="font-bold">{data.fileName}</strong>
    </span>
  );
}

function TextCell({ value }: { value?: string }) {
  if (!value) return null;
  return <span className="text-bodyMd text-text truncate">{value}</span>;
}

const ACTIVITY_COLUMNS: TableColumnDef<ActivityRow>[] = [
  {
    field: 'date',
    headerName: 'Date',
    width: 120,
    minWidth: 100,
    sortable: true,
    cellRenderer: DateCell,
  },
  {
    field: 'memberName',
    headerName: 'Member',
    flex: 1,
    minWidth: 180,
    sortable: false,
    cellRenderer: MemberCell,
  },
  {
    field: 'event',
    headerName: 'Event',
    flex: 1,
    minWidth: 160,
    sortable: false,
    cellRenderer: EventCell,
  },
  {
    field: 'product',
    headerName: 'Product',
    width: 160,
    minWidth: 120,
    sortable: false,
    cellRenderer: ({ data }: { data?: ActivityRow }) => <TextCell value={data?.product} />,
  },
  {
    field: 'team',
    headerName: 'Team',
    width: 200,
    minWidth: 140,
    sortable: false,
    cellRenderer: ({ data }: { data?: ActivityRow }) => <TextCell value={data?.team} />,
  },
  {
    field: 'ipAddress',
    headerName: 'IP address',
    width: 160,
    minWidth: 120,
    sortable: false,
    cellRenderer: ({ data }: { data?: ActivityRow }) => <TextCell value={data?.ipAddress} />,
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

function ActivityPage() {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<string | undefined>('30d');
  const [eventFilter, setEventFilter] = useState<string | undefined>('all');
  const [teamFilter, setTeamFilter] = useState<string | undefined>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ACTIVITY_DATA;
    return ACTIVITY_DATA.filter(
      (r) =>
        r.memberName.toLowerCase().includes(q) ||
        r.memberEmail.toLowerCase().includes(q) ||
        r.team.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="flex w-full flex-col h-full">
      <div className="w-full px-32px pb-24px border-b border-border shrink-0">
        <h1 className="text-headingLg font-bold text-text m-0">Activity</h1>
      </div>

      <div className="px-32px flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="flex h-[48px] items-center justify-between gap-16px py-8px shrink-0">
          <div className="w-[260px] shrink-0 [&_input]:text-bodyMd">
            <SearchInput
              aria-label="Search people"
              placeholder="Search people"
              value={search}
              onChange={setSearch}
              size="md"
            />
          </div>
          <div className="flex items-center gap-8px shrink-0 [&_[data-fpl-component]]:text-bodyMd">
            <Select.Root value={dateRange} onChange={setDateRange}>
              <Select.Trigger width="hug" size="md" label={<HiddenLabel>Date range</HiddenLabel>} />
              <Select.Container>
                {DATE_RANGE_OPTIONS.map((o) => (
                  <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
                ))}
              </Select.Container>
            </Select.Root>
            <Select.Root value={eventFilter} onChange={setEventFilter}>
              <Select.Trigger width="hug" size="md" label={<HiddenLabel>Event type</HiddenLabel>} />
              <Select.Container>
                {EVENT_OPTIONS.map((o) => (
                  <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
                ))}
              </Select.Container>
            </Select.Root>
            <Select.Root value={teamFilter} onChange={setTeamFilter}>
              <Select.Trigger width="hug" size="md" label={<HiddenLabel>Team</HiddenLabel>} />
              <Select.Container>
                {TEAM_OPTIONS.map((o) => (
                  <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
                ))}
              </Select.Container>
            </Select.Root>
            <IconButton variant="ghost" aria-label="Export">
              <Icon24Export />
            </IconButton>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-hidden flex-1 min-h-0">
          <Table<ActivityRow>
            columns={ACTIVITY_COLUMNS}
            data={filtered}
            getRowId={(row) => row.id}
            sorting
            gridLines={{ horizontal: true }}
            gridOptions={{ rowHeight: 48, headerHeight: 48 }}
          />
        </div>
      </div>
    </div>
  );
}

export default ActivityPage;
