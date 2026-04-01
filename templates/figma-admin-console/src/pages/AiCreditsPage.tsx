import { useMemo, useState } from 'react';
import {
  Button,
  ButtonPrimitive,
  HiddenLabel,
  IconButton,
  SearchInput,
  Select,
  Tabs,
} from '@figma/fpl-components';
import {
  Icon16ChevronLeft,
  Icon16ChevronRight,
  Icon24Insert,
  Icon24Export,
} from '@figma/fpl-icons';
import { Avatar, Table, type TableColumnDef, type MultiplayerColor } from '@prototype/shared';

/* -------------------------------------------------------------------------- */
/*  Avatar images (from Figma node 42:178464)                                  */
/* -------------------------------------------------------------------------- */

const AVATAR_KAREN = 'https://i.pravatar.cc/150?img=47';
const AVATAR_JESSICA = 'https://i.pravatar.cc/150?img=5';
const AVATAR_EMILY = 'https://i.pravatar.cc/150?img=9';
const AVATAR_MICHAEL = 'https://i.pravatar.cc/150?img=11';
const AVATAR_SOPHIA = 'https://i.pravatar.cc/150?img=20';

/* -------------------------------------------------------------------------- */
/*  Types & data                                                               */
/* -------------------------------------------------------------------------- */

type AiTab = 'users' | 'billingGroups';

const AI_TAB_MAP: Record<AiTab, true> = { users: true, billingGroups: true };

type SeatType = 'Full' | 'View' | 'Collab' | 'Dev';

type AvatarSpec =
  | { kind: 'photo'; src: string }
  | { kind: 'initial'; initial: string; color: MultiplayerColor };

interface AiUserRow {
  id: string;
  name: string;
  email: string;
  avatar: AvatarSpec;
  seatType: SeatType;
  seatCredits: number;
  seatCreditsUsed: number;
  paidCredits: number;
  lastActivity: string;
}

const MAX_PAID_CREDITS = 5050;

const AI_USER_ROWS: AiUserRow[] = [
  {
    id: 'u1',
    name: 'Karen Lee',
    email: 'klee@twigma.com',
    avatar: { kind: 'photo', src: AVATAR_KAREN },
    seatType: 'Full',
    seatCredits: 5050,
    seatCreditsUsed: 5050,
    paidCredits: 5050,
    lastActivity: '1 minute ago',
  },
  {
    id: 'u2',
    name: 'John Smith',
    email: 'john.smith@example.com',
    avatar: { kind: 'initial', initial: 'J', color: 'green' },
    seatType: 'View',
    seatCredits: 5050,
    seatCreditsUsed: 5050,
    paidCredits: 4750,
    lastActivity: '5 minutes ago',
  },
  {
    id: 'u3',
    name: 'Jessica Davis',
    email: 'jessica.d@website.com',
    avatar: { kind: 'photo', src: AVATAR_JESSICA },
    seatType: 'View',
    seatCredits: 5050,
    seatCreditsUsed: 5050,
    paidCredits: 4250,
    lastActivity: '20 minutes ago',
  },
  {
    id: 'u4',
    name: 'Emily Johnson',
    email: 'emily.j@example.com',
    avatar: { kind: 'photo', src: AVATAR_EMILY },
    seatType: 'Collab',
    seatCredits: 5050,
    seatCreditsUsed: 5050,
    paidCredits: 1700,
    lastActivity: '10 minutes ago',
  },
  {
    id: 'u5',
    name: 'Karen Lee',
    email: 'klee@twigma.com',
    avatar: { kind: 'photo', src: AVATAR_KAREN },
    seatType: 'Full',
    seatCredits: 5050,
    seatCreditsUsed: 5050,
    paidCredits: 450,
    lastActivity: '1 minute ago',
  },
  {
    id: 'u6',
    name: 'Oliver Thompson',
    email: 'michael.b@samplemail.com',
    avatar: { kind: 'initial', initial: 'O', color: 'purple' },
    seatType: 'Dev',
    seatCredits: 5050,
    seatCreditsUsed: 3500,
    paidCredits: 0,
    lastActivity: '15 minutes ago',
  },
  {
    id: 'u7',
    name: 'Michael Brown',
    email: 'michael.b@samplemail.com',
    avatar: { kind: 'photo', src: AVATAR_MICHAEL },
    seatType: 'View',
    seatCredits: 5050,
    seatCreditsUsed: 2000,
    paidCredits: 0,
    lastActivity: '15 minutes ago',
  },
  {
    id: 'u8',
    name: 'Sophia Martinez',
    email: 'smartinez@twigma.com',
    avatar: { kind: 'photo', src: AVATAR_SOPHIA },
    seatType: 'Full',
    seatCredits: 5050,
    seatCreditsUsed: 700,
    paidCredits: 0,
    lastActivity: '15 minutes ago',
  },
];

const BILLING_GROUP_OPTIONS = [
  { value: 'all', label: 'Billing group: All' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
];

/* -------------------------------------------------------------------------- */
/*  Billing groups tab data                                                     */
/* -------------------------------------------------------------------------- */

interface BillingGroupRow {
  id: string;
  name: string;
  isDefault?: boolean;
  activeUsers: number;
  paidCredits: number;
  assignedCredits: number | null;
}

const MAX_BG_PAID = 12000;

const BILLING_GROUP_ROWS: BillingGroupRow[] = [
  { id: 'bg1', name: 'Chicago',          activeUsers: 12, paidCredits: 12000, assignedCredits: null },
  { id: 'bg2', name: 'Los Angeles',      activeUsers: 2,  paidCredits: 8000,  assignedCredits: null },
  { id: 'bg3', name: 'Houston',          activeUsers: 23, paidCredits: 5000,  assignedCredits: null },
  { id: 'bg4', name: 'Phoenix',          activeUsers: 22, paidCredits: 0,     assignedCredits: null },
  { id: 'bg5', name: 'Unassigned users', isDefault: true, activeUsers: 8, paidCredits: 0, assignedCredits: null },
  { id: 'bg6', name: 'Philadelphia',     activeUsers: 4,  paidCredits: 0,     assignedCredits: null },
];

const SEAT_TYPE_OPTIONS = [
  { value: 'all', label: 'Seat type: All' },
  { value: 'full', label: 'Full' },
  { value: 'view', label: 'View' },
  { value: 'collab', label: 'Collab' },
  { value: 'dev', label: 'Dev' },
];

/* -------------------------------------------------------------------------- */
/*  Stat cards                                                                  */
/* -------------------------------------------------------------------------- */

const PAID_USED = 25000;
const PAID_TOTAL = 100000;
const PAID_PCT = (PAID_USED / PAID_TOTAL) * 100;

function StatCards() {
  return (
    <div className="flex gap-16px w-full">
      {/* Monthly paid credits */}
      <div className="flex flex-col gap-8px flex-1 border border-border rounded-lg p-16px min-w-0">
        <span className="text-bodyLg text-text">Monthly paid credits</span>
        <div className="flex flex-col gap-16px">
          <p className="text-headingLg font-bold text-text m-0">
            <span>25K </span>
            <span className="text-text-tertiary font-bold">/ 100K</span>
          </p>
          <div className="h-[6px] w-full rounded-full bg-bg-hover overflow-hidden">
            <div
              className="h-full rounded-l-full bg-bg-brand-tertiary-pressed"
              style={{ width: `${String(PAID_PCT)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active users */}
      <div className="flex flex-col gap-8px flex-1 border border-border rounded-lg p-16px min-w-0">
        <span className="text-bodyLg text-text">Active users</span>
        <p className="text-headingLg font-bold text-text m-0">8</p>
        <span className="text-bodyMd text-text-secondary">5 using paid credits</span>
      </div>

      {/* Days until credits reset */}
      <div className="flex flex-col gap-8px flex-1 border border-border rounded-lg p-16px min-w-0">
        <span className="text-bodyLg text-text">Days until credits reset</span>
        <p className="text-headingLg font-bold text-text m-0">30</p>
        <span className="text-bodyMd text-text-secondary">
          Reset:{' '}
          <span className="underline decoration-dotted">August 5</span>
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Billing groups stat cards                                                   */
/* -------------------------------------------------------------------------- */

function BillingGroupStatCards() {
  return (
    <div className="flex gap-16px w-full">
      <div className="flex flex-col gap-8px flex-1 border border-border rounded-lg p-16px min-w-0">
        <span className="text-bodyLg text-text">Assigned credit usage</span>
        <p className="text-headingLg font-bold text-text m-0">0</p>
        <span className="text-bodyMd text-text-secondary">No credits assigned to billing groups</span>
      </div>
      <div className="flex flex-col gap-8px flex-1 border border-border rounded-lg p-16px min-w-0">
        <span className="text-bodyLg text-text">Unassigned credit usage</span>
        <p className="text-headingLg font-bold text-text m-0">
          <span>25K </span>
          <span className="text-text-tertiary font-bold">/ 100K</span>
        </p>
        <span className="text-bodyMd text-text-secondary">Can be used by all of (Plan)</span>
      </div>
      <div className="flex flex-col gap-8px flex-1 border border-border rounded-lg p-16px min-w-0">
        <span className="text-bodyLg text-text">Days until credits reset</span>
        <p className="text-headingLg font-bold text-text m-0">30</p>
        <span className="text-bodyMd text-text-secondary">
          Reset: <span className="underline decoration-dotted">August 5</span>
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Billing groups table cells                                                  */
/* -------------------------------------------------------------------------- */

function BgNameCell({ data }: { data?: BillingGroupRow }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-4px min-w-0">
      <span className="text-bodyMd text-text truncate">{data.name}</span>
      {data.isDefault && (
        <span className="text-bodyMd text-text-secondary shrink-0">(default)</span>
      )}
    </div>
  );
}

function BgActiveUsersCell({ data }: { data?: BillingGroupRow }) {
  if (!data) return null;
  return <span className="text-bodyMd text-text tabular-nums">{data.activeUsers}</span>;
}

function BgPaidCreditsCell({ data }: { data?: BillingGroupRow }) {
  if (!data) return null;
  const pct = MAX_BG_PAID > 0 ? (data.paidCredits / MAX_BG_PAID) * 100 : 0;
  return (
    <div className="flex items-center gap-8px w-full overflow-hidden">
      {data.paidCredits === 0 ? (
        <div className="w-8px h-8px shrink-0 rounded-full bg-bg-tertiary" />
      ) : (
        <div
          className="h-[6px] rounded-full bg-bg-brand-tertiary-pressed shrink-0"
          style={{ width: `${String(Math.min(pct, 100) * 0.7)}%` }}
        />
      )}
      <span className="text-bodyMd text-text tabular-nums shrink-0 whitespace-nowrap">
        {data.paidCredits > 0 ? data.paidCredits.toLocaleString() : '0'}
      </span>
    </div>
  );
}

function BgAssignedCreditsCell({ data }: { data?: BillingGroupRow }) {
  if (!data) return null;
  return (
    <span className="text-bodyMd text-text-secondary">
      {data.assignedCredits !== null ? data.assignedCredits.toLocaleString() : '–'}
    </span>
  );
}

const BILLING_GROUP_COLUMNS: TableColumnDef<BillingGroupRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 160,
    sortable: false,
    cellRenderer: BgNameCell,
  },
  {
    field: 'activeUsers',
    headerName: 'Active users',
    width: 140,
    sortable: false,
    cellRenderer: BgActiveUsersCell,
  },
  {
    field: 'paidCredits',
    headerName: 'Paid credits ↓',
    flex: 1,
    minWidth: 200,
    sortable: false,
    cellRenderer: BgPaidCreditsCell,
    cellStyle: { paddingLeft: 8 },
    headerStyle: { paddingLeft: 8 },
  },
  {
    field: 'assignedCredits',
    headerName: 'Assigned credits',
    width: 160,
    sortable: false,
    cellRenderer: BgAssignedCreditsCell,
  },
];

/* -------------------------------------------------------------------------- */
/*  Table cells                                                                 */
/* -------------------------------------------------------------------------- */

function AiUserNameCell({ data }: { data?: AiUserRow }) {
  if (!data) return null;
  const avatar =
    data.avatar.kind === 'photo' ? (
      <Avatar size="md" src={data.avatar.src} alt={data.name} />
    ) : (
      <Avatar size="md" initial={data.avatar.initial} color={data.avatar.color} alt={data.name} />
    );
  return (
    <div className="flex items-center gap-8px min-w-0 w-full">
      {avatar}
      <div className="flex flex-col min-w-0">
        <span className="text-bodyMd font-bold text-text truncate">{data.name}</span>
        <span className="text-bodyMd text-text-secondary truncate">{data.email}</span>
      </div>
    </div>
  );
}

function AiSeatTypeCell({ data }: { data?: AiUserRow }) {
  if (!data) return null;
  return <span className="text-bodyMd text-text">{data.seatType}</span>;
}

function AiSeatCreditsCell({ data }: { data?: AiUserRow }) {
  if (!data) return null;
  const pct = data.seatCredits > 0 ? (data.seatCreditsUsed / data.seatCredits) * 100 : 0;
  return (
    <div className="w-full h-[6px] rounded-full bg-bg-hover overflow-hidden">
      <div
        className="h-full rounded-full bg-gauge-secondary"
        style={{ width: `${String(Math.min(pct, 100))}%` }}
      />
    </div>
  );
}

function AiPaidCreditsCell({ data }: { data?: AiUserRow }) {
  if (!data) return null;
  const pct = MAX_PAID_CREDITS > 0 ? (data.paidCredits / MAX_PAID_CREDITS) * 100 : 0;
  const clampedPct = Math.min(pct, 100);
  return (
    <div className="flex items-center gap-8px w-full overflow-hidden">
      {data.paidCredits === 0 ? (
        <div className="w-8px h-8px shrink-0 rounded-full bg-bg-tertiary" />
      ) : (
        <div
          className="h-[6px] rounded-full bg-bg-brand-tertiary-pressed shrink-0"
          style={{ width: `${String(clampedPct * 0.7)}%` }}
        />
      )}
      <span className="text-bodyMd text-text tabular-nums shrink-0 whitespace-nowrap">
        {data.paidCredits > 0 ? data.paidCredits.toLocaleString() : '0'}
      </span>
    </div>
  );
}

function AiLastActivityCell({ data }: { data?: AiUserRow }) {
  if (!data) return null;
  return <span className="text-bodyMd text-text-secondary truncate">{data.lastActivity}</span>;
}

const AI_USER_COLUMNS: TableColumnDef<AiUserRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 200,
    sortable: false,
    cellRenderer: AiUserNameCell,
  },
  {
    field: 'seatType',
    headerName: 'Seat type',
    width: 120,
    minWidth: 100,
    sortable: false,
    cellRenderer: AiSeatTypeCell,
  },
  {
    field: 'seatCredits',
    headerName: 'Seat credits',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    sortable: false,
    cellRenderer: AiSeatCreditsCell,
    cellStyle: { paddingLeft: 0, paddingRight: 0 },
    headerStyle: { paddingLeft: 0, paddingRight: 0 },
  },
  {
    field: 'paidCredits',
    headerName: 'Paid credits ↓',
    flex: 1,
    minWidth: 180,
    sortable: false,
    cellRenderer: AiPaidCreditsCell,
    cellStyle: { paddingLeft: 8 },
    headerStyle: { paddingLeft: 8 },
  },
  {
    field: 'lastActivity',
    headerName: 'Last activity',
    flex: 1,
    minWidth: 120,
    sortable: false,
    cellRenderer: AiLastActivityCell,
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                        */
/* -------------------------------------------------------------------------- */

function AiCreditsPage() {
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<AiTab>(AI_TAB_MAP, {
    defaultActive: 'users',
  });
  const [search, setSearch] = useState('');
  const [bgSearch, setBgSearch] = useState('');
  const [billingGroup, setBillingGroup] = useState<string | undefined>('all');
  const [seatType, setSeatType] = useState<string | undefined>('all');

  const filteredBillingGroups = useMemo(() => {
    const q = bgSearch.trim().toLowerCase();
    if (!q) return BILLING_GROUP_ROWS;
    return BILLING_GROUP_ROWS.filter((r) => r.name.toLowerCase().includes(q));
  }, [bgSearch]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const seatFilter = seatType === 'all' || !seatType ? null : seatType;
    return AI_USER_ROWS.filter((r) => {
      const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      const matchesSeat = !seatFilter || r.seatType.toLowerCase() === seatFilter;
      return matchesSearch && matchesSeat;
    });
  }, [search, seatType]);

  return (
    <div className="flex w-full min-w-0 max-w-none flex-col h-full">
      {/* Page header */}
      <div className="w-full px-32px pb-24px border-b border-border flex items-center justify-between gap-16px shrink-0">
        <h1 className="text-headingLg font-bold text-text m-0">AI credits</h1>
        <div className="flex items-center gap-8px shrink-0">
          <Button variant="secondary" size="md">
            Manage AI credits
          </Button>
          <IconButton variant="ghost" aria-label="Export">
            <Icon24Export />
          </IconButton>
        </div>
      </div>

      <div className="mx-32px flex w-[calc(100%-64px)] flex-col pt-16px gap-16px flex-1 min-h-0">
        {/* Tab strip row with date (+ billing group filter on Users tab) */}
        <div className="flex items-center justify-between gap-16px shrink-0">
          <Tabs.TabStrip manager={tabManager}>
            <Tabs.Tab {...tabPropsMap.users}>Users</Tabs.Tab>
            <Tabs.Tab {...tabPropsMap.billingGroups}>Billing groups</Tabs.Tab>
          </Tabs.TabStrip>
          <div className="flex items-center gap-8px shrink-0 [&_[data-fpl-component]]:text-bodyMd">
            {tabManager.activeTab === 'users' && (
              <Select.Root value={billingGroup} onChange={setBillingGroup}>
                <Select.Trigger width="hug" size="md" label={<HiddenLabel>Billing group filter</HiddenLabel>} />
                <Select.Container>
                  {BILLING_GROUP_OPTIONS.map((o) => (
                    <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
                  ))}
                </Select.Container>
              </Select.Root>
            )}
            <div className="flex items-center gap-0 border border-border rounded-md overflow-hidden">
              <IconButton variant="ghost" size="md" aria-label="Previous period">
                <Icon16ChevronLeft />
              </IconButton>
              <span className="text-bodyMd text-text px-4px whitespace-nowrap">July 5–August 5</span>
              <IconButton variant="ghost" size="md" aria-label="Next period">
                <Icon16ChevronRight />
              </IconButton>
            </div>
          </div>
        </div>

        {/* Users tab */}
        <Tabs.TabPanel {...tabPanelPropsMap.users} height="fill" width="fill">
          <div className="flex w-full flex-col gap-0 h-full min-h-0">
            {/* Stat cards */}
            <StatCards />

            {/* Search + seat type filter */}
            <div className="flex items-center justify-between gap-16px h-[56px] shrink-0">
              <div className="min-w-0 w-[260px] shrink-0 [&_input]:text-bodyMd">
                <SearchInput
                  aria-label="Search people"
                  placeholder="Search people"
                  value={search}
                  onChange={setSearch}
                  size="md"
                />
              </div>
              <div className="shrink-0 [&_[data-fpl-component]]:text-bodyMd">
                <Select.Root value={seatType} onChange={setSeatType}>
                  <Select.Trigger width="hug" size="md" label={<HiddenLabel>Filter by seat type</HiddenLabel>} />
                  <Select.Container>
                    {SEAT_TYPE_OPTIONS.map((o) => (
                      <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
                    ))}
                  </Select.Container>
                </Select.Root>
              </div>
            </div>

            {/* User table */}
            <div className="w-full overflow-x-hidden flex-1 min-h-0">
              <Table<AiUserRow>
                columns={AI_USER_COLUMNS}
                data={filteredUsers}
                getRowId={(row) => row.id}
gridLines={{ horizontal: true }}
                gridOptions={{ rowHeight: 48, headerHeight: 48 }}
              />
            </div>
          </div>
        </Tabs.TabPanel>

        <Tabs.TabPanel {...tabPanelPropsMap.billingGroups} height="fill" width="fill">
          <div className="flex w-full flex-col gap-0 h-full min-h-0">
            <BillingGroupStatCards />

            {/* Search + limit indicator */}
            <div className="flex items-center justify-between gap-16px h-[56px] shrink-0">
              <div className="min-w-0 w-[260px] shrink-0 [&_input]:text-bodyMd">
                <SearchInput
                  aria-label="Search billing groups"
                  placeholder="Search billing groups"
                  value={bgSearch}
                  onChange={setBgSearch}
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
                  Billing groups at limit
                </span>
                <span className="text-bodyMd text-text-secondary whitespace-nowrap ml-4px">0</span>
              </ButtonPrimitive>
            </div>

            {/* Billing groups table */}
            <div className="w-full overflow-x-hidden flex-1 min-h-0">
              <Table<BillingGroupRow>
                columns={BILLING_GROUP_COLUMNS}
                data={filteredBillingGroups}
                getRowId={(row) => row.id}
                gridLines={{ horizontal: true }}
                gridOptions={{ rowHeight: 48, headerHeight: 48 }}
              />
            </div>
          </div>
        </Tabs.TabPanel>
      </div>
    </div>
  );
}

export default AiCreditsPage;
