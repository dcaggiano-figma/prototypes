import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useResearch } from '../research/researchCopy';
import {
  Button,
  ButtonPrimitive,
  IconButton,
  SearchInput,
  Tabs,
} from '@figma/fpl-components';
import {
  Icon16ChevronDown,
  Icon24Billing,
  Icon24CalendarYear,
  Icon24ChevronRightLarge,
  Icon24Plus,
} from '@figma/fpl-icons';
import { Table, type TableColumnDef } from '@prototype/shared';

type BillingTab = 'overview' | 'billingGroups' | 'invoices';

const BILLING_TAB_MAP: Record<BillingTab, true> = {
  overview: true,
  billingGroups: true,
  invoices: true,
};

function CounterBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center h-16px min-h-16px px-4px rounded-md bg-bg-secondary text-bodyMd text-text tabular-nums">
      {children}
    </span>
  );
}

function BillingOverview() {
  const { variant, copy } = useResearch();
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-24px items-start w-full">
      <section className="min-w-0 xl:col-span-2 border border-border rounded-lg bg-bg overflow-hidden">
        <div className="p-16px border-b border-border">
          <h2 className="text-bodyLg font-bold text-text m-0">{copy.billingPlanTitle}</h2>
          <p className="text-bodyLg text-text-secondary m-0 mt-0">
            <span>{copy.billingPlanDescriptor}</span>
            <span className="text-text-tertiary"> · </span>
            <span>Renews {copy.planRenewalDate}</span>
            <span className="text-text-tertiary"> · </span>
            <ButtonPrimitive
              type="button"
              className="text-bodyLg text-text-brand hover:underline p-0 border-0 bg-transparent cursor-pointer align-baseline"
            >
              Learn more
            </ButtonPrimitive>
          </p>
        </div>

        <div className="px-16px py-8px flex flex-col">
          <div className="flex items-center justify-between gap-16px py-16px border-b border-bg-hover">
            <div className="flex gap-8px min-w-0 items-start">
              <span className="text-icon shrink-0 inline-flex size-24px items-center justify-center" aria-hidden>
                <Icon24ChevronRightLarge />
              </span>
              <div className="flex flex-col gap-0 min-w-0">
                <div className="flex flex-wrap items-center gap-8px">
                  <span className="text-bodyLg font-bold text-text">Paid seats</span>
                  <CounterBadge>44</CounterBadge>
                </div>
                <span className="text-bodyLg text-text-secondary">6 available</span>
              </div>
            </div>
            <div className="shrink-0">
              <Button variant="secondary" size="md">
                Manage
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-16px py-16px">
            <div className="flex gap-8px min-w-0 items-start">
              <span className="text-icon shrink-0 inline-flex size-24px items-center justify-center" aria-hidden>
                <Icon24ChevronRightLarge />
              </span>
              <div className="flex flex-col gap-0 min-w-0">
                <div className="flex flex-wrap items-center gap-8px">
                  <span className="text-bodyLg font-bold text-text">AI credits</span>
                  <CounterBadge>Included</CounterBadge>
                </div>
                <span className="text-bodyLg text-text-secondary">20% of your team is using AI credits</span>
              </div>
            </div>
            <div className="shrink-0">
              <Button
                variant="secondary"
                size="md"
                onClick={() => void navigate({ to: '/ai-credits', search: { variant } })}
              >
                View usage
              </Button>
            </div>
          </div>
        </div>
      </section>

      <aside className="min-w-0 xl:col-span-1 border border-border rounded-lg bg-bg overflow-hidden flex flex-col">
        <div className="p-16px border-b border-border">
          <p className="text-bodyLg font-bold text-text m-0 tabular-nums">$400.68</p>
          <p className="text-bodyLg text-text-secondary m-0 mt-0">due July 30</p>
        </div>
        <div className="px-8px py-0 border-b border-border flex flex-col gap-16px">
          <div className="px-8px py-16px flex flex-col gap-16px">
            <div className="flex items-end justify-between gap-12px text-bodyLg text-text-secondary">
              <span>Seat changes</span>
              <span className="tabular-nums shrink-0">$400.68</span>
            </div>
            <Button variant="secondary" size="md" width="fill">
              Preview invoice
            </Button>
          </div>
        </div>
        <div className="px-8px py-0">
          <div className="px-8px py-16px">
            <ButtonPrimitive
              type="button"
              className="flex items-center gap-4px text-bodyMd text-text-secondary hover:text-text p-0 border-0 bg-transparent cursor-pointer"
            >
              <span>How am I billed?</span>
              <Icon16ChevronDown className="shrink-0" aria-hidden />
            </ButtonPrimitive>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Billing Groups                                                             */
/* -------------------------------------------------------------------------- */

interface BillingGroupRow {
  id: string;
  name: string;
  isDefault?: boolean;
  members: number;
  fullSeats: number;
  devSeats: number;
  collabSeats: number;
  assignedAiCredits: number | null;
}

const BILLING_GROUPS_DATA: BillingGroupRow[] = [
  { id: 'unassigned', name: 'Unassigned', isDefault: true, members: 12, fullSeats: 4, devSeats: 5, collabSeats: 4, assignedAiCredits: null },
  { id: 'accounting', name: 'Accounting', members: 100, fullSeats: 25, devSeats: 5, collabSeats: 10, assignedAiCredits: null },
  { id: 'design', name: 'Design', members: 100, fullSeats: 4, devSeats: 5, collabSeats: 4, assignedAiCredits: null },
  { id: 'marketing', name: 'Marketing', members: 100, fullSeats: 4, devSeats: 5, collabSeats: 4, assignedAiCredits: null },
  { id: 'research', name: 'Research', members: 100, fullSeats: 4, devSeats: 5, collabSeats: 4, assignedAiCredits: null },
  { id: 'xyz', name: 'XYZ', members: 100, fullSeats: 4, devSeats: 5, collabSeats: 4, assignedAiCredits: null },
];

function BillingGroupNameCell({ data }: { data?: BillingGroupRow }) {
  if (!data) return null;
  return (
    <span className="text-bodyMd text-text truncate">
      {data.name}
      {data.isDefault && (
        <span className="text-text-tertiary"> (default)</span>
      )}
    </span>
  );
}

function BillingGroupMembersCell({ data }: { data?: BillingGroupRow }) {
  if (!data) return null;
  return <span className="text-bodyMd text-text">{data.members} members</span>;
}

function BillingGroupSeatsCell({ value }: { value?: number }) {
  if (value == null) return null;
  return <span className="text-bodyMd text-text">{value} seats</span>;
}

function BillingGroupAiCreditsCell({ data }: { data?: BillingGroupRow }) {
  if (!data) return null;
  if (data.assignedAiCredits == null) {
    return <span className="text-bodyMd text-text-tertiary">–</span>;
  }
  return <span className="text-bodyMd text-text">{data.assignedAiCredits}</span>;
}

function BillingGroupChevronCell({ data }: { data?: BillingGroupRow }) {
  if (!data) return null;
  if (data.isDefault) return null;
  return (
    <IconButton variant="ghost" size="lg" aria-label={`Open ${data.name}`}>
      <Icon24ChevronRightLarge />
    </IconButton>
  );
}

const BILLING_GROUPS_COLUMNS: TableColumnDef<BillingGroupRow>[] = [
  {
    field: 'name',
    headerName: 'Name ↓',
    flex: 1,
    minWidth: 150,
    sortable: false,
    cellRenderer: BillingGroupNameCell,
  },
  {
    field: 'members',
    headerName: 'Members',
    width: 140,
    minWidth: 100,
    sortable: false,
    cellRenderer: BillingGroupMembersCell,
  },
  {
    field: 'fullSeats',
    headerName: 'Full seats',
    width: 120,
    minWidth: 90,
    sortable: false,
    cellRenderer: BillingGroupSeatsCell,
  },
  {
    field: 'devSeats',
    headerName: 'Dev seats',
    width: 120,
    minWidth: 90,
    sortable: false,
    cellRenderer: BillingGroupSeatsCell,
  },
  {
    field: 'collabSeats',
    headerName: 'Collab seats',
    width: 130,
    minWidth: 90,
    sortable: false,
    cellRenderer: BillingGroupSeatsCell,
  },
  {
    field: 'assignedAiCredits',
    headerName: 'Assigned AI credits',
    width: 170,
    minWidth: 130,
    sortable: false,
    cellRenderer: BillingGroupAiCreditsCell,
  },
  {
    colId: '__chevron',
    headerName: '',
    width: 32,
    maxWidth: 32,
    minWidth: 32,
    sortable: false,
    resizable: false,
    suppressMovable: true,
    pinned: 'right',
    cellRenderer: BillingGroupChevronCell,
  },
];

function BillingGroups() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BILLING_GROUPS_DATA;
    return BILLING_GROUPS_DATA.filter((r) =>
      r.name.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="flex w-full flex-col h-full min-h-0">
      <div className="flex h-[48px] items-center justify-between border-t border-border py-8px shrink-0">
        <div className="w-[260px] shrink-0 [&_input]:text-bodyMd">
          <SearchInput
            aria-label="Search billing groups"
            placeholder="Search billing groups"
            value={search}
            onChange={setSearch}
            size="md"
          />
        </div>
      </div>
      <div className="w-full overflow-x-hidden flex-1 min-h-0">
        <Table<BillingGroupRow>
          columns={BILLING_GROUPS_COLUMNS}
          data={filtered}
          getRowId={(row) => row.id}
          checkboxSelection
          gridLines={{ horizontal: true }}
          gridOptions={{ rowHeight: 48, headerHeight: 48 }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Invoices                                                                   */
/* -------------------------------------------------------------------------- */

type InvoiceStatus = 'paid' | 'overdue';
type InvoiceType = 'quarterly' | 'subscription';

interface InvoiceRow {
  id: string;
  dueDate: string;
  type: InvoiceType;
  description: string;
  status: InvoiceStatus;
  seats: string;
  total: string;
}

const INVOICE_ROWS: InvoiceRow[] = [
  { id: 'i1', dueDate: 'October 10, 2024', type: 'quarterly', description: 'Quarterly invoice', status: 'overdue', seats: '+3', total: '$600' },
  { id: 'i2', dueDate: 'July 10, 2024', type: 'subscription', description: 'Plan subscription', status: 'paid', seats: '112', total: '$67,000' },
  { id: 'i3', dueDate: 'July 10, 2024', type: 'quarterly', description: 'Quarterly invoice', status: 'paid', seats: '+1', total: '$60' },
  { id: 'i4', dueDate: 'April 7, 2024', type: 'quarterly', description: 'Quarterly invoice', status: 'paid', seats: '+8', total: '$750' },
  { id: 'i5', dueDate: 'January 7, 2024', type: 'quarterly', description: 'Quarterly invoice', status: 'paid', seats: '–', total: '$0' },
  { id: 'i6', dueDate: 'October 10, 2023', type: 'quarterly', description: 'Quarterly invoice', status: 'paid', seats: '+2', total: '$120' },
  { id: 'i7', dueDate: 'July 10, 2023', type: 'subscription', description: 'Plan subscription', status: 'paid', seats: '95', total: '$45,000' },
];

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === 'overdue') {
    return (
      <span className="inline-flex items-center h-16px px-4px rounded border border-border-warning text-bodyMd text-text-warning whitespace-nowrap">
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center h-16px px-4px rounded border border-border-success text-bodyMd text-text-success whitespace-nowrap">
      Paid
    </span>
  );
}

function InvoiceDateCell({ data }: { data?: InvoiceRow }) {
  if (!data) return null;
  return <span className="text-bodyMd text-text">{data.dueDate}</span>;
}

function InvoiceDescriptionCell({ data }: { data?: InvoiceRow }) {
  if (!data) return null;
  const Icon = data.type === 'subscription' ? Icon24CalendarYear : Icon24Billing;
  return (
    <div className="flex items-center gap-8px min-w-0 w-full">
      <span className="text-icon shrink-0 inline-flex size-24px items-center justify-center" aria-hidden>
        <Icon />
      </span>
      <span className="truncate text-bodyMd text-text">{data.description}</span>
    </div>
  );
}

function InvoiceStatusCell({ data }: { data?: InvoiceRow }) {
  if (!data) return null;
  return <InvoiceStatusBadge status={data.status} />;
}

function InvoiceSeatsCell({ data }: { data?: InvoiceRow }) {
  if (!data) return null;
  return <span className="text-bodyMd text-text">{data.seats}</span>;
}

function InvoiceTotalCell({ data }: { data?: InvoiceRow }) {
  if (!data) return null;
  return <span className="text-bodyMd text-text">{data.total}</span>;
}

function InvoiceChevronCell({ data }: { data?: InvoiceRow }) {
  if (!data) return null;
  return (
    <IconButton variant="ghost" size="lg" aria-label={`Open invoice for ${data.dueDate}`}>
      <Icon24ChevronRightLarge />
    </IconButton>
  );
}

const INVOICE_COLUMNS: TableColumnDef<InvoiceRow>[] = [
  {
    field: 'dueDate',
    headerName: 'Due Date ↑',
    width: 180,
    minWidth: 140,
    sortable: false,
    cellRenderer: InvoiceDateCell,
  },
  {
    field: 'description',
    headerName: 'Description',
    flex: 1,
    minWidth: 180,
    sortable: false,
    cellRenderer: InvoiceDescriptionCell,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    minWidth: 90,
    sortable: false,
    cellRenderer: InvoiceStatusCell,
  },
  {
    field: 'seats',
    headerName: 'Seats',
    width: 100,
    minWidth: 80,
    sortable: false,
    cellRenderer: InvoiceSeatsCell,
  },
  {
    field: 'total',
    headerName: 'Invoice total',
    width: 150,
    minWidth: 110,
    sortable: false,
    cellRenderer: InvoiceTotalCell,
  },
  {
    colId: '__chevron',
    headerName: '',
    width: 32,
    maxWidth: 32,
    minWidth: 32,
    sortable: false,
    resizable: false,
    suppressMovable: true,
    pinned: 'right',
    cellRenderer: InvoiceChevronCell,
  },
];

function Invoices() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return INVOICE_ROWS;
    return INVOICE_ROWS.filter((r) => r.dueDate.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="flex w-full flex-col h-full min-h-0">
      <div className="flex h-[48px] items-center justify-between border-t border-border py-8px shrink-0">
        <div className="w-[260px] shrink-0 [&_input]:text-bodyMd">
          <SearchInput
            aria-label="Search dates"
            placeholder="Search dates"
            value={search}
            onChange={setSearch}
            size="md"
          />
        </div>
        <ButtonPrimitive
          type="button"
          className="flex h-24px shrink-0 items-center gap-4px rounded border border-border px-8px hover:bg-bg-hover"
        >
          <span className="text-bodyMd text-text whitespace-nowrap">Date</span>
          <Icon16ChevronDown className="shrink-0 text-icon" aria-hidden />
        </ButtonPrimitive>
      </div>
      <div className="w-full overflow-x-hidden flex-1 min-h-0">
        <Table<InvoiceRow>
          columns={INVOICE_COLUMNS}
          data={filtered}
          getRowId={(row) => row.id}
          gridLines={{ horizontal: true }}
          gridOptions={{ rowHeight: 48, headerHeight: 48 }}
        />
      </div>
    </div>
  );
}

function BillingPage() {
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<BillingTab>(BILLING_TAB_MAP, {
    defaultActive: 'overview',
  });

  return (
    <div className="flex w-full flex-col h-full">
      <div className="w-full px-32px pb-24px border-b border-border shrink-0">
        <h1 className="text-headingLg font-bold text-text m-0">
          Billing
        </h1>
      </div>

      <div className="px-32px pt-16px flex flex-col gap-16px flex-1 min-h-0">
        <div className="flex items-center justify-between gap-16px shrink-0">
          <Tabs.TabStrip manager={tabManager}>
            <Tabs.Tab {...tabPropsMap.overview}>Overview</Tabs.Tab>
            <Tabs.Tab {...tabPropsMap.billingGroups}>Billing Groups</Tabs.Tab>
            <Tabs.Tab {...tabPropsMap.invoices}>Invoices</Tabs.Tab>
          </Tabs.TabStrip>
          {tabManager.activeTab === 'billingGroups' && (
            <Button variant="primary" iconPrefix={<Icon24Plus />}>
              Create billing group
            </Button>
          )}
        </div>

        <Tabs.TabPanel {...tabPanelPropsMap.overview} height="fill" width="fill">
          <div className="h-full overflow-y-auto">
            <BillingOverview />
          </div>
        </Tabs.TabPanel>
        <Tabs.TabPanel {...tabPanelPropsMap.billingGroups} height="fill" width="fill">
          <BillingGroups />
        </Tabs.TabPanel>
        <Tabs.TabPanel {...tabPanelPropsMap.invoices} height="fill" width="fill">
          <Invoices />
        </Tabs.TabPanel>
      </div>
    </div>
  );
}

export default BillingPage;
