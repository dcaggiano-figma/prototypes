import { useMemo, useState } from 'react';
import { IconButton, SearchInput, Tabs } from '@figma/fpl-components';
import { Icon24ChevronRightLarge, Icon24Filter } from '@figma/fpl-icons';
import { Table, type TableColumnDef } from '@prototype/shared';

/* -------------------------------------------------------------------------- */
/*  Types & data                                                               */
/* -------------------------------------------------------------------------- */

type ResourcesTab = 'libraries' | 'fonts' | 'plugins' | 'widgets';

const RESOURCES_TAB_MAP: Record<ResourcesTab, true> = {
  libraries: true,
  fonts: true,
  plugins: true,
  widgets: true,
};

interface LibraryRow {
  id: string;
  name: string;
  enabledFor: string;
  componentCount: number;
  styleCount: number;
}

const LIBRARY_ROWS: LibraryRow[] = Array.from({ length: 7 }, (_, i) => ({
  id: String(i + 1),
  name: 'Library',
  enabledFor: 'Twigma',
  componentCount: 12,
  styleCount: 53,
}));

interface FontRow {
  id: string;
  name: string;
  version: string;
  sample: string;
}

const FONT_ROWS: FontRow[] = Array.from({ length: 9 }, (_, i) => ({
  id: String(i + 1),
  name: 'Font name',
  version: '00.01.01',
  sample: 'Rag 123',
}));

interface ResourceItemRow {
  id: string;
  name: string;
  description: string;
  approvedDate: string;
  approvedFor: string;
}

const PLUGIN_ROWS: ResourceItemRow[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(i + 1),
  name: 'Plugin name',
  description: 'This plugin makes it easier to color things',
  approvedDate: '1 month ago',
  approvedFor: 'All Twigma',
}));

const WIDGET_ROWS: ResourceItemRow[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(i + 1),
  name: 'Widget name',
  description: 'This widget makes it easier to color things',
  approvedDate: '1 month ago',
  approvedFor: 'All Twigma',
}));

const RESOURCE_ITEM_TABS: Array<{
  key: Extract<ResourcesTab, 'plugins' | 'widgets'>;
  label: string;
  data: ResourceItemRow[];
}> = [
  { key: 'plugins', label: 'Approved plugins', data: PLUGIN_ROWS },
  { key: 'widgets', label: 'Approved widgets', data: WIDGET_ROWS },
];

/* -------------------------------------------------------------------------- */
/*  Shared header cell                                                         */
/* -------------------------------------------------------------------------- */

function ResourcesSecondaryHeader(props: { displayName: string }) {
  return (
    <div className="flex items-center h-full w-full min-w-0">
      <span className="text-bodyMd text-text-secondary truncate">{props.displayName}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Library cell renderers & columns                                           */
/* -------------------------------------------------------------------------- */

function LibraryNameCell({ data }: { data?: LibraryRow }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-12px min-w-0 py-8px w-full">
      <div
        className="shrink-0 w-[80px] h-[48px] rounded bg-bg-hover border border-border box-border"
        aria-hidden
      />
      <span className="text-bodyMd text-text truncate">{data.name}</span>
    </div>
  );
}

const LIBRARY_COLUMNS: TableColumnDef<LibraryRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    width: 360,
    minWidth: 280,
    flex: 1,
    cellRenderer: LibraryNameCell,
    comparator: (a, b) => String(a).localeCompare(String(b)),
  },
  {
    field: 'enabledFor',
    headerName: 'Enabled for',
    flex: 1,
    minWidth: 140,
    sortable: false,
    headerComponent: ResourcesSecondaryHeader,
    cellRenderer: ({ data }: { data?: LibraryRow }) =>
      data ? <span className="text-bodyMd text-text truncate">{data.enabledFor}</span> : null,
  },
  {
    field: 'componentCount',
    headerName: 'Components',
    flex: 1,
    minWidth: 140,
    sortable: false,
    headerComponent: ResourcesSecondaryHeader,
    cellRenderer: ({ data }: { data?: LibraryRow }) => {
      if (!data) return null;
      const n = data.componentCount;
      return (
        <span className="text-bodyMd text-text tabular-nums truncate">
          {n} {n === 1 ? 'component' : 'components'}
        </span>
      );
    },
  },
  {
    field: 'styleCount',
    headerName: 'Styles',
    flex: 1,
    minWidth: 120,
    sortable: false,
    headerComponent: ResourcesSecondaryHeader,
    cellRenderer: ({ data }: { data?: LibraryRow }) => {
      if (!data) return null;
      const n = data.styleCount;
      return (
        <span className="text-bodyMd text-text tabular-nums truncate">
          {n} {n === 1 ? 'style' : 'styles'}
        </span>
      );
    },
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
    cellRenderer: () => (
      <IconButton variant="ghost" aria-label="Open library">
        <Icon24ChevronRightLarge />
      </IconButton>
    ),
  },
];

/* -------------------------------------------------------------------------- */
/*  Font cell renderers & columns                                              */
/* -------------------------------------------------------------------------- */

const FONT_COLUMNS: TableColumnDef<FontRow>[] = [
  {
    field: 'name',
    headerName: 'Name ↓',
    flex: 1,
    minWidth: 200,
    sortable: false,
    cellRenderer: ({ data }: { data?: FontRow }) =>
      data ? <span className="text-bodyMd text-text truncate">{data.name}</span> : null,
  },
  {
    field: 'version',
    headerName: 'Version',
    width: 200,
    minWidth: 120,
    sortable: false,
    headerComponent: ResourcesSecondaryHeader,
    cellRenderer: ({ data }: { data?: FontRow }) =>
      data ? (
        <span className="text-bodyMd text-text tabular-nums truncate">{data.version}</span>
      ) : null,
  },
  {
    field: 'sample',
    headerName: 'Sample',
    width: 200,
    minWidth: 120,
    sortable: false,
    headerComponent: ResourcesSecondaryHeader,
    cellRenderer: ({ data }: { data?: FontRow }) =>
      data ? (
        <span className="text-bodyLg font-bold italic text-text truncate">{data.sample}</span>
      ) : null,
  },
];

/* -------------------------------------------------------------------------- */
/*  Resource item (plugins + widgets) cell renderers & columns                */
/* -------------------------------------------------------------------------- */

const RESOURCE_ITEM_COLUMNS: TableColumnDef<ResourceItemRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    width: 200,
    minWidth: 160,
    sortable: false,
    cellRenderer: ({ data }: { data?: ResourceItemRow }) =>
      data ? (
        <div className="flex items-center gap-8px min-w-0 py-8px w-full">
          <div
            className="shrink-0 w-4 h-4 rounded bg-bg-hover border border-border box-border"
            aria-hidden
          />
          <span className="text-bodyMd text-text truncate">{data.name}</span>
        </div>
      ) : null,
  },
  {
    field: 'description',
    headerName: 'Description',
    flex: 1,
    minWidth: 200,
    sortable: false,
    headerComponent: ResourcesSecondaryHeader,
    cellRenderer: ({ data }: { data?: ResourceItemRow }) =>
      data ? (
        <span className="text-bodyMd text-text truncate">{data.description}</span>
      ) : null,
  },
  {
    field: 'approvedDate',
    headerName: 'Requested ↑',
    width: 140,
    minWidth: 120,
    sortable: false,
    cellRenderer: ({ data }: { data?: ResourceItemRow }) =>
      data ? (
        <span className="text-bodyMd text-text truncate">{data.approvedDate}</span>
      ) : null,
  },
  {
    field: 'approvedFor',
    headerName: 'Requested by',
    width: 240,
    minWidth: 160,
    sortable: false,
    headerComponent: ResourcesSecondaryHeader,
    cellRenderer: ({ data }: { data?: ResourceItemRow }) =>
      data ? (
        <span className="text-bodyMd text-text-secondary truncate">{data.approvedFor}</span>
      ) : null,
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
    cellRenderer: ({ data }: { data?: ResourceItemRow }) =>
      data ? (
        <IconButton variant="ghost" aria-label={`Open ${data.name}`}>
          <Icon24ChevronRightLarge />
        </IconButton>
      ) : null,
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

function ResourcesPage() {
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<ResourcesTab>(RESOURCES_TAB_MAP, {
    defaultActive: 'libraries',
  });
  const [search, setSearch] = useState('');
  const [fontSearch, setFontSearch] = useState('');

  const filteredLibraries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LIBRARY_ROWS;
    return LIBRARY_ROWS.filter(
      (row) => row.name.toLowerCase().includes(q) || row.enabledFor.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    if (!q) return FONT_ROWS;
    return FONT_ROWS.filter((row) => row.name.toLowerCase().includes(q));
  }, [fontSearch]);

  return (
    <div className="flex w-full flex-col h-full">
      <div className="w-full px-32px pb-24px border-b border-border shrink-0">
        <h1 className="text-headingLg font-bold text-text m-0">Resources</h1>
      </div>

      <div className="flex min-w-0 w-full flex-col gap-16px px-32px pt-16px flex-1 min-h-0">
        <div className="shrink-0">
        <Tabs.TabStrip manager={tabManager}>
          <Tabs.Tab {...tabPropsMap.libraries}>Libraries</Tabs.Tab>
          <Tabs.Tab {...tabPropsMap.fonts}>Fonts</Tabs.Tab>
          <Tabs.Tab {...tabPropsMap.plugins}>Approved plugins</Tabs.Tab>
          <Tabs.Tab {...tabPropsMap.widgets}>Approved widgets</Tabs.Tab>
        </Tabs.TabStrip>
        </div>

        {/* Libraries */}
        <Tabs.TabPanel {...tabPanelPropsMap.libraries} height="fill" width="fill">
          <div className="flex min-w-0 w-full flex-col h-full min-h-0">
            <div className="flex h-[48px] w-full items-center justify-between gap-16px border-t border-border py-8px shrink-0">
              <div className="w-[260px] shrink-0 [&_input]:text-bodyMd">
                <SearchInput
                  aria-label="Search libraries"
                  placeholder="Search libraries"
                  value={search}
                  onChange={setSearch}
                  size="md"
                />
              </div>
              <IconButton variant="ghost" aria-label="Filter">
                <Icon24Filter />
              </IconButton>
            </div>
            <div className="w-full overflow-x-hidden flex-1 min-h-0">
              <Table<LibraryRow>
                columns={LIBRARY_COLUMNS}
                data={filteredLibraries}
                getRowId={(row) => row.id}
                sorting
                size="medium"
                density="comfortable"
                gridLines={{ horizontal: true, vertical: false }}
                onGridReady={(params) => params.api.sizeColumnsToFit()}
                gridOptions={{
                  headerHeight: 48,
                  rowHeight: 64,
                  onFirstDataRendered: (params) => params.api.sizeColumnsToFit(),
                  initialState: {
                    sort: { sortModel: [{ colId: 'name', sort: 'desc' }] },
                  },
                }}
              />
            </div>
          </div>
        </Tabs.TabPanel>

        {/* Fonts */}
        <Tabs.TabPanel {...tabPanelPropsMap.fonts} height="fill" width="fill">
          <div className="flex min-w-0 w-full flex-col h-full min-h-0">
            <div className="flex h-[48px] w-full items-center border-t border-border py-8px shrink-0">
              <div className="w-[260px] shrink-0 [&_input]:text-bodyMd">
                <SearchInput
                  aria-label="Search fonts"
                  placeholder="Search fonts"
                  value={fontSearch}
                  onChange={setFontSearch}
                  size="md"
                />
              </div>
            </div>
            <div className="w-full overflow-x-hidden flex-1 min-h-0">
              <Table<FontRow>
                columns={FONT_COLUMNS}
                data={filteredFonts}
                getRowId={(row) => row.id}
                checkboxSelection
                gridLines={{ horizontal: true }}
                gridOptions={{ rowHeight: 48, headerHeight: 48 }}
              />
            </div>
          </div>
        </Tabs.TabPanel>

        {/* Plugins + Widgets (shared structure) */}
        {RESOURCE_ITEM_TABS.map(({ key, data }) => (
          <Tabs.TabPanel key={key} {...tabPanelPropsMap[key]} height="fill" width="fill">
            <div className="flex min-w-0 w-full flex-col h-full min-h-0">
              <div className="w-full overflow-x-hidden flex-1 min-h-0">
                <Table<ResourceItemRow>
                  columns={RESOURCE_ITEM_COLUMNS}
                  data={data}
                  getRowId={(row) => row.id}
                  gridLines={{ horizontal: true, vertical: false }}
                  gridOptions={{ rowHeight: 48, headerHeight: 48 }}
                  onGridReady={(params) => params.api.sizeColumnsToFit()}
                />
              </div>
            </div>
          </Tabs.TabPanel>
        ))}
      </div>
    </div>
  );
}

export default ResourcesPage;
