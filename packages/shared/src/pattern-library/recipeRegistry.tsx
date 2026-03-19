import { useState, useCallback } from 'react';
import {
  Badge,
  Banner,
  Button,
  ButtonPrimitive,
  Checkbox,
  Chip,
  HiddenLabel,
  HiddenLegend,
  IconButton,
  Input,
  Label,
  Link,
  LoadingSpinner,
  Modal,
  NumberFormatter,
  RadioInput,
  ScrubbableInput,
  SearchInput,
  SegmentedControl,
  Select,
  Switch,
  Tabs,
  Textarea,
  Toast,
  Window,
} from '@figma/fpl-components';
import {
  Icon24AspectRatio,
  Icon24Eye,
  Icon24Hidden,
  Icon24LayoutAlignBottom,
  Icon24LayoutAlignHorizontalCenter,
  Icon24LayoutAlignLeft,
  Icon24LayoutAlignRight,
  Icon24LayoutAlignTop,
  Icon24LayoutAlignVerticalCenter,
  Icon24Minus,
  Icon24AlLayoutGridHorizontal,
  Icon24AlLayoutGridNone,
  Icon24AlLayoutGridVertical,
  Icon24GridView,
  Icon24Styles,
  Icon24TextAlignBottom,
  Icon24TextAlignCenter,
  Icon24TextAlignLeft,
  Icon24TextAlignMiddle,
  Icon24TextAlignRight,
  Icon24TextAlignTop,
  Icon24TextLetterSpacing,
  Icon24TextLineHeight,
  Icon24Collapse,
  Icon24Component,
  Icon24Import,
  Icon24Instance,
  Icon24Link,
  Icon24More,
  Icon24PlayLarge,
  Icon24Text,
  Icon24Plus,
  Icon24Adjust,
  Icon24Detach,
  Icon24MoveLarge,
  Icon24Rectangle,
  Icon24RectangleLarge,
  Icon24Line,
  Icon24LineLarge,
  Icon24Arrow,
  Icon24ArrowLarge,
  Icon24Ellipse,
  Icon24EllipseLarge,
  Icon24PenLarge,
  Icon24HandLarge,
  Icon24TextLarge,
  Icon24ExpandLayers,
  Icon24Settings,
  Icon24Page,
  Icon24Add,
  Icon24Search,
  Icon24Variable,
  Icon24ListView,
  Icon24Bold,
  Icon24StrikeThrough,
  Icon24Duplicate,
  Icon24Lock,
  Icon24Warning,
  Icon24Key,
} from '@figma/fpl-icons';
import { Form, TextInput, useForm } from '@figma/fpl-components/form';
import { z } from 'zod';
import type { Recipe } from './types';
import { PropertySection, PropertyRow, PlaceholderSection } from '../layout/PropertyLayout';
import { Avatar } from '../avatar/Avatar';
import { Card } from '../card/Card';
import { Text } from '../typography/Text';
import { Heading } from '../typography/Heading';
import { Code } from '../typography/Code';
import { Pre } from '../typography/Pre';
import { UnorderedList, ListItem } from '../typography/List';
import { NavList } from '../navigation/NavList';
import { LeftSidebar } from '../left-sidebar';
import { Toolbar } from '../toolbar';
import type { SubTool } from '../toolbar';
import { Table } from '../table';
import type { TableColumnDef } from '../table';
import { Skeleton } from '../progress/Skeleton';
import { Swatch } from '../swatch/Swatch';
import { useContextMenu, ContextMenuRenderer } from '../context-menu';
import type { MenuItemDef } from '../context-menu';
import {
  StreamingContent,
  PromptPanel,
  FileCard,
  ChatMessage,
  CollapsibleSection,
  ProgressIndicator,
  SystemMessage,
  TodoList,
  VersionCard,
  AttachmentThumbnail,
} from '../ai-chat';
import type { Task } from '../ai-chat';

// ---------------------------------------------------------------------------
// ExampleContainer — visual wrapper for recipe demos only.
// This is NOT part of the component library. Do not copy into prototypes.
// ---------------------------------------------------------------------------

function ExampleContainer({
  children,
  width,
  padding = false,
  fullWidth = false,
  bare = false,
  className,
}: {
  children: React.ReactNode;
  width?: number;
  padding?: boolean;
  fullWidth?: boolean;
  bare?: boolean;
  className?: string;
}) {
  if (fullWidth) {
    return <div className={`w-full${className ? ` ${className}` : ''}`}>{children}</div>;
  }
  return (
    <div
      className={`${bare ? '' : 'border border-border rounded-lg overflow-hidden bg-bg'}${padding ? ' p-4' : ''}${className ? ` ${className}` : ''}`}
      style={width ? { width } : undefined}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers — small stateful wrappers for live demos
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

function ModalFormDemo() {
  const [isOpen, setIsOpen] = useState(false);

  const { manager: formManager } = useForm({
    schema: profileSchema,
    defaultValues: { name: '', email: '' },
  });

  const modalManager = Modal.useModal({
    open: isOpen,
    onClose: () => setIsOpen(false),
  });

  const handleSubmit = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open modal</Button>
      <Modal.Root manager={modalManager} width="sm">
        <Modal.Contents>
          <Modal.Header>
            <Modal.Title>Edit profile</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form manager={formManager} onSubmit={handleSubmit}>
              <Form.Row name="name" label={<Form.Label>Name</Form.Label>}>
                <TextInput type="text" placeholder="Jane Doe" autoComplete="name" />
              </Form.Row>
              <Form.Row name="email" label={<Form.Label>Email</Form.Label>}>
                <TextInput type="email" placeholder="jane@example.com" autoComplete="email" />
              </Form.Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Modal.ActionStrip>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmit}>Save</Button>
            </Modal.ActionStrip>
          </Modal.Footer>
        </Modal.Contents>
      </Modal.Root>
    </>
  );
}

const accountSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

function InformationFormDemo() {
  const { manager: formManager } = useForm({
    schema: accountSchema,
    size: 'lg',
    defaultValues: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@figma.com',
      username: 'janedoe',
    },
  });

  const [bio, setBio] = useState('Design systems engineer at Figma. Passionate about building tools that make designers and developers more productive.');
  const [role, setRole] = useState('editor');
  const [visibility, setVisibility] = useState('team');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSubmit = () => {
    // submitted
  };

  return (
    <ExampleContainer width={360} padding>
      <Form manager={formManager} onSubmit={handleSubmit}>
        <Form.Row name="firstName" label={<Form.Label>First name</Form.Label>}>
          <TextInput type="text" placeholder="Jane" autoComplete="given-name" />
        </Form.Row>
        <Form.Row name="lastName" label={<Form.Label>Last name</Form.Label>}>
          <TextInput type="text" placeholder="Doe" autoComplete="family-name" />
        </Form.Row>
        <Form.Row name="email" label={<Form.Label>Email</Form.Label>}>
          <TextInput type="email" placeholder="jane@example.com" autoComplete="email" />
        </Form.Row>
        <Form.Row name="username" label={<Form.Label>Username</Form.Label>}>
          <TextInput type="text" placeholder="janedoe" autoComplete="username" />
        </Form.Row>
        <Form.Row name="bio" label={<Form.Label>Bio</Form.Label>}>
          <Textarea id="bio" size="lg" value={bio} onChange={setBio} placeholder="Tell us about yourself" rows={3} />
        </Form.Row>
        <Form.Row name="role" label={<Form.Label>Role</Form.Label>}>
          <Select.Root value={role} onChange={(value) => { if (value) setRole(value); }}>
            <Select.Trigger label={<HiddenLabel>Role</HiddenLabel>} width="fill" size="lg" />
            <Select.Container>
              <Select.Option value="viewer">Viewer</Select.Option>
              <Select.Option value="editor">Editor</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
            </Select.Container>
          </Select.Root>
        </Form.Row>
        <Form.Row name="visibility" label={<Form.Label>Profile visibility</Form.Label>}>
          <RadioInput.Root value={visibility} onChange={setVisibility} legend={<HiddenLegend>Profile visibility</HiddenLegend>}>
            <RadioInput.Option value="public" label={<Label>Public</Label>} />
            <RadioInput.Option value="team" label={<Label>Team only</Label>} />
            <RadioInput.Option value="private" label={<Label>Private</Label>} />
          </RadioInput.Root>
        </Form.Row>
        <Form.Row name="agreeToTerms" label={<HiddenLabel>Terms</HiddenLabel>} isInline>
          <Checkbox label={<Label>I agree to the terms of service</Label>} checked={agreeToTerms} onChange={setAgreeToTerms} />
        </Form.Row>
        <div className="pt-5 flex justify-end gap-2">
          <Button variant="secondary" size="lg">Cancel</Button>
          <Button variant="primary" size="lg" type="submit">Save changes</Button>
        </div>
      </Form>
    </ExampleContainer>
  );
}

function SearchFilteredListDemo() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('home');
  const items = [
    { value: 'home', label: 'Home' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'settings', label: 'Settings' },
    { value: 'profile', label: 'Profile' },
    { value: 'notifications', label: 'Notifications' },
    { value: 'help', label: 'Help' },
  ];
  const filtered = items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <ExampleContainer width={200}>
      <div className="p-2 border-b border-border">
        <SearchInput aria-label="Search pages" placeholder="Search..." value={search} onChange={setSearch} />
      </div>
      <div className="py-1">
        {filtered.length > 0 ? (
          <NavList
            aria-label="Pages"
            value={selected}
            onChange={setSelected}
            items={filtered}
            selectedVariant="default"
          />
        ) : (
          <div className="px-3 py-2"><Text color="tertiary">No results</Text></div>
        )}
      </div>
    </ExampleContainer>
  );
}

function TabPanelDemo() {
  type DemoTab = 'design' | 'prototype' | 'inspect';
  const TAB_MAP: Record<DemoTab, true> = { design: true, prototype: true, inspect: true };
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<DemoTab>(TAB_MAP, {
    defaultActive: 'design',
  });

  return (
    <ExampleContainer width={300}>
      <div className="p-2 border-b border-border">
      <Tabs.TabStrip manager={tabManager}>
        <Tabs.Tab {...tabPropsMap.design}>Design</Tabs.Tab>
        <Tabs.Tab {...tabPropsMap.prototype}>Prototype</Tabs.Tab>
        <Tabs.Tab {...tabPropsMap.inspect}>Inspect</Tabs.Tab>
      </Tabs.TabStrip>
      </div>
      <Tabs.TabPanel {...tabPanelPropsMap.design}>
        <div className="p-3">
          <Text color="secondary">Design properties panel content</Text>
        </div>
      </Tabs.TabPanel>
      <Tabs.TabPanel {...tabPanelPropsMap.prototype}>
        <div className="p-3">
          <Text color="secondary">Prototype interactions panel content</Text>
        </div>
      </Tabs.TabPanel>
      <Tabs.TabPanel {...tabPanelPropsMap.inspect}>
        <div className="p-3">
          <Text color="secondary">Inspect panel content</Text>
        </div>
      </Tabs.TabPanel>
    </ExampleContainer>
  );
}

function FloatingWindowDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open window</Button>
      {open && (
        <Window.ResizableRoot
          onClose={() => setOpen(false)}
          defaultPosition={{ x: 'center', y: 'center' }}
          defaultWidth={400}
          defaultHeight={250}
          constraints={{ minWidth: 300, minHeight: 200 }}
        >
          <Window.Contents>
            <Window.Header>
              <Window.Title>Floating window</Window.Title>
            </Window.Header>
            <Window.Body>
              <div className="py-2">
              <Text color="secondary">
                Resizable, draggable window content
              </Text>
              </div>
            </Window.Body>
          </Window.Contents>
        </Window.ResizableRoot>
      )}
    </>
  );
}

function BadgeStatusListDemo() {
  const items = [
    { name: 'API Server', status: 'Active', variant: 'successFilled' as const },
    { name: 'Database', status: 'Warning', variant: 'warningFilled' as const },
    { name: 'CDN', status: 'Down', variant: 'dangerFilled' as const },
    { name: 'Auth Service', status: 'Active', variant: 'successFilled' as const },
  ];

  return (
    <ExampleContainer width={260}>
      {items.map((item) => (
        <div key={item.name} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-b-0">
          <Text>{item.name}</Text>
          <Badge variant={item.variant}>{item.status}</Badge>
        </div>
      ))}
    </ExampleContainer>
  );
}

function AvatarNameRowDemo() {
  const users = [
    { name: 'Alice Chen', initial: 'A', color: 'blue' as const },
    { name: 'Bob Kim', initial: 'B', color: 'green' as const },
    { name: 'Carol Diaz', initial: 'C', color: 'pink' as const },
  ];

  return (
    <ExampleContainer width={200} className="flex flex-col gap-2 p-3">
      {users.map((user) => (
        <div key={user.name} className="flex items-center gap-2">
          <Avatar initial={user.initial} color={user.color} size="md" />
          <Text>{user.name}</Text>
        </div>
      ))}
    </ExampleContainer>
  );
}

// -- Table demos --

// ── Recipe 1: Informational Table — API monitoring dashboard ──

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  avgLatency: number;
  requests24h: number;
  errorRate: number;
  status: 'healthy' | 'degraded' | 'down';
}

const API_DATA: ApiEndpoint[] = [
  { id: '1', method: 'GET', path: '/api/v1/users', avgLatency: 45, requests24h: 124500, errorRate: 0.2, status: 'healthy' },
  { id: '2', method: 'POST', path: '/api/v1/users', avgLatency: 120, requests24h: 8300, errorRate: 1.1, status: 'healthy' },
  { id: '3', method: 'GET', path: '/api/v1/projects', avgLatency: 89, requests24h: 67200, errorRate: 0.5, status: 'healthy' },
  { id: '4', method: 'PUT', path: '/api/v1/projects/:id', avgLatency: 210, requests24h: 3100, errorRate: 3.8, status: 'degraded' },
  { id: '5', method: 'DELETE', path: '/api/v1/sessions', avgLatency: 35, requests24h: 15400, errorRate: 0.1, status: 'healthy' },
  { id: '6', method: 'GET', path: '/api/v1/analytics', avgLatency: 890, requests24h: 2200, errorRate: 12.5, status: 'down' },
  { id: '7', method: 'POST', path: '/api/v1/webhooks', avgLatency: 150, requests24h: 41000, errorRate: 0.8, status: 'healthy' },
  { id: '8', method: 'GET', path: '/api/v1/billing', avgLatency: 320, requests24h: 9800, errorRate: 4.2, status: 'degraded' },
];

const METHOD_BADGE_VARIANT: Record<string, 'defaultFilled' | 'brandFilled' | 'warningFilled' | 'dangerFilled'> = {
  GET: 'defaultFilled',
  POST: 'brandFilled',
  PUT: 'warningFilled',
  DELETE: 'dangerFilled',
};

const STATUS_BADGE_VARIANT: Record<string, 'successFilled' | 'warningFilled' | 'dangerFilled'> = {
  healthy: 'successFilled',
  degraded: 'warningFilled',
  down: 'dangerFilled',
};

const API_COLUMNS: TableColumnDef<ApiEndpoint>[] = [
  {
    field: 'method',
    headerName: 'Method',
    width: 100,
    cellRenderer: (params: { value: string }) => (
      <Badge variant={METHOD_BADGE_VARIANT[params.value] ?? 'neutral'}>{params.value}</Badge>
    ),
  },
  { field: 'path', headerName: 'Endpoint', flex: 1 },
  {
    field: 'avgLatency',
    headerName: 'Avg Latency',
    width: 120,
    valueFormatter: (params: { value: number }) => `${params.value} ms`,
  },
  {
    field: 'requests24h',
    headerName: 'Requests (24h)',
    width: 140,
    valueFormatter: (params: { value: number }) => params.value.toLocaleString(),
  },
  {
    field: 'errorRate',
    headerName: 'Error Rate',
    width: 110,
    valueFormatter: (params: { value: number }) => `${params.value}%`,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    cellRenderer: (params: { value: string }) => (
      <Badge variant={STATUS_BADGE_VARIANT[params.value] ?? 'neutral'}>{params.value}</Badge>
    ),
  },
];

function InformationalTableDemo() {
  return (
    <ExampleContainer fullWidth>
      <Table<ApiEndpoint>
        columns={API_COLUMNS}
        data={API_DATA}
        getRowId={(row) => row.id}
        sorting
        columnResizing
        columnMenu
        gridLines={{ vertical: true }}
      />
    </ExampleContainer>
  );
}

function InformationalTableCompactDemo() {
  return (
    <ExampleContainer fullWidth>
      <Table<ApiEndpoint>
        columns={API_COLUMNS}
        data={API_DATA}
        getRowId={(row) => row.id}
        sorting
        columnResizing
        columnMenu
        density="compact"
        gridLines={{ vertical: true }}
      />
    </ExampleContainer>
  );
}

// ── Recipe 2: Action Table — Seat management admin panel ──

interface SeatAssignment {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  plan: string;
  lastActive: string;
  status: 'active' | 'invited' | 'deactivated';
}

const SEAT_DATA: SeatAssignment[] = [
  { id: '1', name: 'Alice Chen', email: 'alice@acme.co', role: 'Admin', plan: 'Enterprise', lastActive: '2026-03-12', status: 'active' },
  { id: '2', name: 'Bob Kim', email: 'bob@acme.co', role: 'Editor', plan: 'Enterprise', lastActive: '2026-03-10', status: 'active' },
  { id: '3', name: 'Carol Diaz', email: 'carol@acme.co', role: 'Editor', plan: 'Professional', lastActive: '2026-03-08', status: 'active' },
  { id: '4', name: 'Dan Park', email: 'dan@acme.co', role: 'Viewer', plan: 'Starter', lastActive: '2026-02-25', status: 'active' },
  { id: '5', name: 'Eva Müller', email: 'eva@acme.co', role: 'Editor', plan: 'Professional', lastActive: '2026-03-11', status: 'active' },
  { id: '6', name: 'Frank Liu', email: 'frank@acme.co', role: 'Viewer', plan: 'Starter', lastActive: '', status: 'invited' },
  { id: '7', name: 'Grace Tanaka', email: 'grace@acme.co', role: 'Admin', plan: 'Enterprise', lastActive: '2026-01-15', status: 'deactivated' },
  { id: '8', name: 'Hiro Sato', email: 'hiro@acme.co', role: 'Editor', plan: 'Professional', lastActive: '2026-03-11', status: 'active' },
];

const ROLE_CHIP_VARIANT: Record<string, 'primary' | 'component' | 'warning'> = {
  Admin: 'primary',
  Editor: 'component',
  Viewer: 'warning',
};

const SEAT_STATUS_BADGE_VARIANT: Record<string, 'successFilled' | 'defaultFilled' | 'dangerFilled'> = {
  active: 'successFilled',
  invited: 'defaultFilled',
  deactivated: 'dangerFilled',
};

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

const SEAT_COLUMNS: TableColumnDef<SeatAssignment>[] = [
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'email', headerName: 'Email', flex: 1 },
  {
    field: 'role',
    headerName: 'Role',
    width: 110,
    cellRenderer: (params: { value: string }) => (
      <Chip variant={ROLE_CHIP_VARIANT[params.value] ?? 'neutral'}>{params.value}</Chip>
    ),
  },
  { field: 'plan', headerName: 'Plan', width: 130 },
  {
    field: 'lastActive',
    headerName: 'Last Active',
    width: 140,
    valueFormatter: (params: { value: string }) => formatRelativeDate(params.value),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    cellRenderer: (params: { value: string }) => (
      <Badge variant={SEAT_STATUS_BADGE_VARIANT[params.value] ?? 'neutral'}>{params.value}</Badge>
    ),
  },
  {
    colId: '__actions',
    headerName: '',
    width: 48,
    maxWidth: 48,
    minWidth: 48,
    sortable: false,
    resizable: false,
    suppressMovable: true,
    pinned: 'right',
    cellRenderer: () => (
      <IconButton variant="ghost" aria-label="More actions">
        <Icon24More />
      </IconButton>
    ),
  },
];

function ActionTableBulkDemo() {
  const [selectedCount, setSelectedCount] = useState(0);

  return (
    <ExampleContainer fullWidth className="flex flex-col gap-2">
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <Text color="secondary">{selectedCount} selected</Text>
          <Button variant="destructiveSecondary">Remove</Button>
        </div>
      )}
      <Table<SeatAssignment>
        columns={SEAT_COLUMNS}
        data={SEAT_DATA}
        getRowId={(row) => row.id}
        sorting
        columnResizing
        columnMenu
        checkboxSelection
        gridLines={{ vertical: true }}
        onSelectionChanged={(event) => {
          setSelectedCount(event.api.getSelectedRows().length);
        }}
      />
    </ExampleContainer>
  );
}

// ── Recipe 3: Complex Table — Design variables editor + CMS ──

// Shared helpers for dynamic column add/delete across complex table demos
function useColumnManagement<T>(initialColumns: TableColumnDef<T>[]) {
  const [columns, setColumns] = useState<TableColumnDef<T>[]>(initialColumns);

  const onDeleteColumn = useCallback((colId: string) => {
    setColumns((prev) => prev.filter((c) => c.field !== colId));
  }, []);

  const onAddColumn = useCallback((colId: string, position: 'left' | 'right') => {
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.field === colId);
      const newCol: TableColumnDef<T> = {
        field: `new_${Date.now()}` as TableColumnDef<T>['field'],
        headerName: 'New Column',
        flex: 1,
      };
      const next = [...prev];
      next.splice(position === 'left' ? idx : idx + 1, 0, newCol);
      return next;
    });
  }, []);

  const onRenameColumn = useCallback((colId: string, newName: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.field === colId ? { ...c, headerName: newName } : c)),
    );
  }, []);

  return { columns, onDeleteColumn, onAddColumn, onRenameColumn };
}

interface VariableAlias {
  name: string;
  color: string;
}

interface DesignVariable {
  id: string;
  name: string;
  group: string;
  light: string;
  dark: string;
  lightEc: string;
  darkEc: string;
  /** Optional per-mode alias references (shown as Chips instead of raw values) */
  lightAlias?: VariableAlias;
  darkAlias?: VariableAlias;
  lightEcAlias?: VariableAlias;
  darkEcAlias?: VariableAlias;
}

const VARIABLES_DATA: DesignVariable[] = [
  {
    id: '1', name: 'bg', group: 'Color', light: '#FFFFFF', dark: '#1E1E1E', lightEc: '#FFFFFF', darkEc: '#000000',
    lightAlias: { name: 'white-1000', color: '#FFFFFF' },
    darkAlias: { name: 'black-1000', color: '#1E1E1E' },
    lightEcAlias: { name: 'white-1000', color: '#FFFFFF' },
    darkEcAlias: { name: 'black-1000', color: '#000000' },
  },
  { id: '2', name: 'bg-secondary', group: 'Color', light: '#F5F5F5', dark: '#2C2C2C', lightEc: '#F0F0F0', darkEc: '#1A1A1A' },
  { id: '3', name: 'text', group: 'Color', light: '#1E1E1E', dark: '#FFFFFF', lightEc: '#000000', darkEc: '#FFFFFF' },
  { id: '4', name: 'text-secondary', group: 'Color', light: '#666666', dark: '#999999', lightEc: '#333333', darkEc: '#CCCCCC' },
  { id: '5', name: 'brand', group: 'Color', light: '#0D99FF', dark: '#0D99FF', lightEc: '#0066CC', darkEc: '#3DB8FF' },
  { id: '6', name: 'error', group: 'Color', light: '#F24822', dark: '#FF6647', lightEc: '#CC0000', darkEc: '#FF8A70' },
  { id: '7', name: 'border', group: 'Color', light: '#E5E5E5', dark: '#3D3D3D', lightEc: '#000000', darkEc: '#FFFFFF' },
  { id: '8', name: 'sm', group: 'Spacing', light: '8', dark: '8', lightEc: '8', darkEc: '8' },
  { id: '9', name: 'md', group: 'Spacing', light: '16', dark: '16', lightEc: '16', darkEc: '16' },
  { id: '10', name: 'lg', group: 'Spacing', light: '24', dark: '24', lightEc: '24', darkEc: '24' },
  { id: '11', name: 'sm', group: 'Radius', light: '4', dark: '4', lightEc: '4', darkEc: '4' },
  { id: '12', name: 'md', group: 'Radius', light: '8', dark: '8', lightEc: '8', darkEc: '8' },
  { id: '13', name: 'full', group: 'Radius', light: '9999', dark: '9999', lightEc: '9999', darkEc: '9999' },
];

function ColorSwatchRenderer(params: { data: DesignVariable; value: string; colDef: { field?: string } }) {
  const group = params.data.group;
  if (group !== 'Color') return params.value;

  // Check for an alias on this column's mode
  const field = params.colDef.field as keyof DesignVariable | undefined;
  const aliasKey = field ? `${field}Alias` as keyof DesignVariable : undefined;
  const alias = aliasKey ? params.data[aliasKey] as VariableAlias | undefined : undefined;

  if (alias) {
    return (
      <span className="variable-alias-cell">
        <Chip
          leading={<Swatch colors={[alias.color]} size="sm" padding={false} />}
          onClick={() => {}}
        >
          {alias.name}
        </Chip>
        <IconButton variant="ghost" aria-label="Detach variable" onClick={() => {}}>
          <Icon24Detach />
        </IconButton>
      </span>
    );
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Swatch colors={[params.value]} size="sm" padding={false} />
      {params.value}
    </span>
  );
}

function VariableActionsHeaderRenderer() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <IconButton variant="ghost" aria-label="Add variable" size="md">
        <Icon24Plus />
      </IconButton>
    </div>
  );
}

function VariableActionsCellRenderer() {
  return (
    <IconButton variant="ghost" aria-label="Edit variable" size="md">
      <Icon24Adjust />
    </IconButton>
  );
}

// Editable unless cell has an alias reference
function isVariableCellEditable(params: { data?: DesignVariable; colDef: { field?: string } }) {
  if (!params.data) return false;
  const field = params.colDef.field as keyof DesignVariable | undefined;
  const aliasKey = field ? `${field}Alias` as keyof DesignVariable : undefined;
  return !(aliasKey && params.data[aliasKey]);
}

const VARIABLE_COLUMNS: TableColumnDef<DesignVariable>[] = [
  { field: 'name', headerName: 'Name', flex: 1, editable: true },
  { field: 'light', headerName: 'Light', flex: 1, editable: isVariableCellEditable, cellRenderer: ColorSwatchRenderer },
  { field: 'dark', headerName: 'Dark', flex: 1, editable: isVariableCellEditable, cellRenderer: ColorSwatchRenderer },
  { field: 'lightEc', headerName: 'Light EC', flex: 1, editable: isVariableCellEditable, cellRenderer: ColorSwatchRenderer },
  { field: 'darkEc', headerName: 'Dark EC', flex: 1, editable: isVariableCellEditable, cellRenderer: ColorSwatchRenderer },
  {
    colId: '__actions',
    headerName: '',
    width: 48,
    maxWidth: 48,
    minWidth: 48,
    sortable: false,
    resizable: false,
    suppressMovable: true,
    pinned: 'right',
    headerComponent: VariableActionsHeaderRenderer,
    cellRenderer: VariableActionsCellRenderer,
    cellClass: 'ag-cell-actions',
  },
];

function ComplexTableVariablesDemo() {
  const [data, setData] = useState(VARIABLES_DATA);
  const { columns, onAddColumn, onDeleteColumn, onRenameColumn } = useColumnManagement(VARIABLE_COLUMNS);

  return (
    <ExampleContainer fullWidth>
      <Table<DesignVariable>
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        sectionField="group"
        sections={[
          { field: 'Color', label: 'Color' },
          { field: 'Spacing', label: 'Spacing' },
          { field: 'Radius', label: 'Radius' },
        ]}
        cellEditing
        rowDrag
        columnResizing
        columnMenu
        density="comfortable"
        gridLines={{ vertical: true }}
        rowSelectColumns={['name']}
        onCellValueChanged={(event) => {
          setData((prev) =>
            prev.map((row) => (row.id === event.data.id ? { ...event.data } : row)),
          );
        }}
        onAddColumn={onAddColumn}
        onDeleteColumn={onDeleteColumn}
        onRenameColumn={onRenameColumn}
      />
    </ExampleContainer>
  );
}

interface ContentEntry {
  id: string;
  title: string;
  slug: string;
  author: string;
  status: 'published' | 'draft' | 'archived';
  updatedAt: string;
  wordCount: number;
}

const CMS_DATA: ContentEntry[] = [
  { id: '1', title: 'Getting Started with Design Tokens', slug: 'design-tokens-intro', author: 'Alice Chen', status: 'published', updatedAt: '2026-03-11', wordCount: 2400 },
  { id: '2', title: 'Component Architecture Guide', slug: 'component-architecture', author: 'Bob Kim', status: 'published', updatedAt: '2026-03-09', wordCount: 3100 },
  { id: '3', title: 'Accessibility Best Practices', slug: 'a11y-best-practices', author: 'Carol Diaz', status: 'draft', updatedAt: '2026-03-12', wordCount: 1800 },
  { id: '4', title: 'Migration to v2 API', slug: 'v2-migration', author: 'Dan Park', status: 'draft', updatedAt: '2026-03-10', wordCount: 950 },
  { id: '5', title: 'Deprecated: Legacy Endpoints', slug: 'legacy-endpoints', author: 'Eva Müller', status: 'archived', updatedAt: '2026-01-20', wordCount: 1200 },
  { id: '6', title: 'Performance Optimization Tips', slug: 'perf-optimization', author: 'Hiro Sato', status: 'published', updatedAt: '2026-03-07', wordCount: 2800 },
];

const CMS_STATUS_BADGE_VARIANT: Record<string, 'successFilled' | 'warningFilled' | 'inactiveFilled'> = {
  published: 'successFilled',
  draft: 'warningFilled',
  archived: 'inactiveFilled',
};

const CMS_COLUMNS: TableColumnDef<ContentEntry>[] = [
  { field: 'title', headerName: 'Title', flex: 1, editable: true },
  { field: 'slug', headerName: 'Slug', flex: 1 },
  { field: 'author', headerName: 'Author', width: 140 },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    cellRenderer: (params: { value: string }) => (
      <Badge variant={CMS_STATUS_BADGE_VARIANT[params.value] ?? 'neutral'}>{params.value}</Badge>
    ),
  },
  {
    field: 'updatedAt',
    headerName: 'Updated',
    width: 130,
    valueFormatter: (params: { value: string }) => formatRelativeDate(params.value),
  },
  {
    field: 'wordCount',
    headerName: 'Words',
    width: 100,
    valueFormatter: (params: { value: number }) => params.value.toLocaleString(),
  },
];

function ComplexTableCmsDemo() {
  const [data, setData] = useState(CMS_DATA);
  const { columns, onAddColumn, onDeleteColumn, onRenameColumn } = useColumnManagement(CMS_COLUMNS);

  return (
    <ExampleContainer fullWidth>
      <Table<ContentEntry>
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        cellEditing
        checkboxSelection
        sorting
        columnResizing
        columnMenu
        gridLines={{ vertical: true }}
        rowSelectColumns={['title']}
        onCellValueChanged={(event) => {
          setData((prev) =>
            prev.map((row) => (row.id === event.data.id ? { ...event.data } : row)),
          );
        }}
        onAddColumn={onAddColumn}
        onDeleteColumn={onDeleteColumn}
        onRenameColumn={onRenameColumn}
      />
    </ExampleContainer>
  );
}

function SkeletonListDemo() {
  return (
    <ExampleContainer bare>
      <Skeleton>
        <div className="flex flex-col">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton.Bone variant="icon" size="md" />
              <Skeleton.Bone variant="text" size="md" width="100px" />
            </div>
          ))}
        </div>
      </Skeleton>
    </ExampleContainer>
  );
}

function SkeletonCardDemo() {
  return (
    <ExampleContainer bare>
    <Skeleton>
      <div className="border border-border rounded-lg overflow-hidden" style={{ width: 240 }}>
        <Skeleton.Bone variant="thumbnail" width="100%" height={120} className="rounded-none" />
        <div className="flex flex-col gap-2 p-3">
          <Skeleton.Bone variant="heading" size="md" width="70%" />
          <Skeleton.Bone variant="text" size="sm" />
          <Skeleton.Bone variant="text" size="sm" width="85%" />
        </div>
      </div>
    </Skeleton>
    </ExampleContainer>
  );
}

function LoadingStatesDemo() {
  return (
    <ExampleContainer bare className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <Button variant="primary" loading="Saving">
          Save
        </Button>
        <Text mono color="tertiary">In button</Text>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-[200px] h-[80px] border border-border rounded-lg flex items-center justify-center bg-bg">
          <LoadingSpinner />
        </div>
        <Text mono color="tertiary">In container</Text>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingSpinner />
        <Text mono color="tertiary">Standalone</Text>
      </div>
    </ExampleContainer>
  );
}

function LinkButtonDemo() {
  return (
    <ExampleContainer bare className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <div className="flex items-center gap-3 px-2">
        <Button variant="link">Link style button</Button>
        </div>
      </div>
      <div className="flex items-center gap-2 py-2">
        This is an <Link href="https://fpl.figma.design" target="_blank">inline link</Link>
      </div>
    </ExampleContainer>
  );
}

function GhostContainedDemo() {
  return (
    <ExampleContainer bare className="flex items-center gap-2">
      <div className="flex items-center gap-1">
      <IconButton variant="ghost" aria-label="Collapse">
        <Icon24Collapse />
      </IconButton>
      <IconButton variant="ghost" aria-label="Settings">
        <Icon24Adjust />
      </IconButton>
      </div>
      <Button variant="primary">Share</Button>
    </ExampleContainer>
  );
}

function FooterActionsDemo() {
  return (
    <ExampleContainer className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between p-3">
        <Button variant="link" iconPrefix={<Icon24Link />}>Copy link</Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Save changes</Button>
        </div>
      </div>
    </ExampleContainer>
  );
}

function HeaderButtonsDemo() {
  return (
    <ExampleContainer className="flex items-center justify-between w-full p-3">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="lg" iconPrefix={<Icon24Plus />}>Create</Button>
        <Button size="lg" variant="secondary" iconPrefix={<Icon24Import />}>Import</Button>
      </div>
      <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
      <IconButton size='lg' variant="ghost" aria-label="Collapse">
        <Icon24Collapse />
      </IconButton>
      <IconButton size='lg' variant="ghost" aria-label="Settings">
        <Icon24Adjust />
      </IconButton>
      </div>
        <Button variant="primary" size="lg">Share</Button>
      </div>
    </ExampleContainer>
  );
}

function TypographyDemo() {
  return (
    <ExampleContainer className="w-full flex flex-col gap-4" bare>

      <div className="flex flex-col gap-3">
      <Heading size="lg">Created a confirmation modal</Heading>

      <Text size="lg" as="p">
        I added a new <Code>ConfirmDeleteModal</Code> component that handles
        destructive actions with a two-step confirmation flow. The modal uses
        the{' '}
        <Link href="https://fpl.figma.com/components/modal">
          FPL Modal
        </Link>{' '}
        compound component and is controlled via the <Code>useModal</Code> hook.
      </Text>
      </div>

      <div className="flex flex-col gap-3">

      <Heading size="md">What changed</Heading>

      <Text size="lg" as="p">
        The implementation touches three files. The modal itself lives in{' '}
        <Code>ConfirmDeleteModal.tsx</Code> and exposes a simple{' '}
        <Code>onConfirm</Code> callback. I wired it into the existing{' '}
        <Code>ProjectSettings</Code> page and added a{' '}
        <Text strong>type-to-confirm</Text> input that requires the user to
        type the project name before the delete button enables. Here is the
        core of the component:
      </Text>

      <Pre lineNumbers syntax="jsx">{`function ConfirmDeleteModal({ projectName, onConfirm, onClose }) {
  const [typed, setTyped] = useState('');
  const confirmed = typed === projectName;

  return (
    <Modal.Root manager={manager} width="sm">
      <Modal.Contents>
        <Modal.Header>
          <Modal.Title>Delete {projectName}?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Text color="secondary">
            This action cannot be undone. Type the project
            name to confirm.
          </Text>
          <Input value={typed} onChange={setTyped} />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!confirmed}
            onClick={onConfirm}
          >
            Delete project
          </Button>
        </Modal.Footer>
      </Modal.Contents>
    </Modal.Root>
  );
}`}</Pre>
</div>

<div className="flex flex-col gap-3">

      <Heading size="md">Key decisions</Heading>

      <UnorderedList size="lg">
        <ListItem>Used <Code>width=&quot;sm&quot;</Code> to keep the modal compact since it only contains a single input</ListItem>
        <ListItem>The <Code>destructive</Code> button variant signals danger without needing extra color tokens</ListItem>
        <ListItem>Moved the <Code>onClose</Code> handler into the hook so the <Link href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement">escape key</Link> and backdrop click work automatically</ListItem>
        <ListItem>Added a <Text strong>300ms debounce</Text> on the confirm comparison to avoid flicker while typing</ListItem>
      </UnorderedList>

      <Text size="lg" as="p">
        Let me know if you want me to add unit tests or adjust the
        confirmation logic.
      </Text>
      </div>
    </ExampleContainer>
  );
}

function TypographyWithHeadingDemo() {
  return (
    <ExampleContainer className="flex flex-col w-[320px]">
      <div className="flex flex-col p-3">
        <Text strong as="p">Project settings</Text>
        <Text color="secondary">Configure your project preferences and team access.</Text>
      </div>
      <div className="border-t border-border p-3">
        <Text strong as="p">Notifications</Text>
        <Text color="secondary">Choose which updates you want to receive.</Text>
      </div>
      <div className="border-t border-border p-3">
        <Text strong as="p" color="danger">Danger zone</Text>
        <Text color="secondary">Irreversible actions that affect your entire project.</Text>
      </div>
    </ExampleContainer>
  );
}

// ---------------------------------------------------------------------------
// Property Panel Demos
// ---------------------------------------------------------------------------

const sizeFormatter = new NumberFormatter({ min: 0, maximumFractionDigits: 2 });

/** 24x24 text icon for ScrubbableInput labels (X, Y, W, H, etc.) */
function CharIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center w-24px h-24px text-bodyMd text-text-secondary">
      {children}
    </span>
  );
}

// Recipe 1: Position & Size — numeric fields + alignment buttons
function PositionSizeDemo() {
  const [x, setX] = useState(120);
  const [y, setY] = useState(340);
  const [w, setW] = useState(200);
  const [h, setH] = useState(150);

  return (
    <ExampleContainer width={240}>
    <PropertySection title="Position & Size">
      {/* Row 1: Alignment button groups — columns="1fr 1fr 24px", trailing slot empty */}
      <PropertyRow>
        <div className="flex items-center gap-px">
          <ButtonPrimitive
            className="flex flex-1 items-center justify-center h-24px bg-bg-secondary rounded-none rounded-l hover:bg-bg-tertiary"
            aria-label="Align left"
          >
            <Icon24LayoutAlignLeft />
          </ButtonPrimitive>
          <ButtonPrimitive
            className="flex flex-1 items-center justify-center h-24px bg-bg-secondary rounded-none hover:bg-bg-tertiary"
            aria-label="Align center"
          >
            <Icon24LayoutAlignHorizontalCenter />
          </ButtonPrimitive>
          <ButtonPrimitive
            className="flex flex-1 items-center justify-center h-24px bg-bg-secondary rounded-none rounded-r hover:bg-bg-tertiary"
            aria-label="Align right"
          >
            <Icon24LayoutAlignRight />
          </ButtonPrimitive>
        </div>
        <div className="flex items-center gap-px">
          <ButtonPrimitive
            className="flex flex-1 items-center justify-center h-24px bg-bg-secondary rounded-none rounded-l hover:bg-bg-tertiary"
            aria-label="Align top"
          >
            <Icon24LayoutAlignTop />
          </ButtonPrimitive>
          <ButtonPrimitive
            className="flex flex-1 items-center justify-center h-24px bg-bg-secondary rounded-none hover:bg-bg-tertiary"
            aria-label="Align center"
          >
            <Icon24LayoutAlignVerticalCenter />
          </ButtonPrimitive>
          <ButtonPrimitive
            className="flex flex-1 items-center justify-center h-24px bg-bg-secondary rounded-none rounded-r hover:bg-bg-tertiary"
            aria-label="Align bottom"
          >
            <Icon24LayoutAlignBottom />
          </ButtonPrimitive>
        </div>
        {/* Empty trailing slot keeps alignment with rows below */}
        <div />
      </PropertyRow>
      {/* Row 2: X/Y coordinate fields — columns="1fr 1fr 24px", trailing slot empty */}
      <PropertyRow>
        <ScrubbableInput.Root>
          <ScrubbableInput.Icon><CharIcon>X</CharIcon></ScrubbableInput.Icon>
          <ScrubbableInput.Field aria-label="X" value={x} formatter={sizeFormatter} onChange={setX} />
        </ScrubbableInput.Root>
        <ScrubbableInput.Root>
          <ScrubbableInput.Icon><CharIcon>Y</CharIcon></ScrubbableInput.Icon>
          <ScrubbableInput.Field aria-label="Y" value={y} formatter={sizeFormatter} onChange={setY} />
        </ScrubbableInput.Root>
        <div />
      </PropertyRow>
      {/* Row 3: W/H dimension fields — columns="1fr 1fr 24px", trailing slot has icon */}
      <PropertyRow>
        <ScrubbableInput.Root>
          <ScrubbableInput.Icon><CharIcon>W</CharIcon></ScrubbableInput.Icon>
          <ScrubbableInput.Field aria-label="Width" value={w} formatter={sizeFormatter} onChange={setW} />
        </ScrubbableInput.Root>
        <ScrubbableInput.Root>
          <ScrubbableInput.Icon><CharIcon>H</CharIcon></ScrubbableInput.Icon>
          <ScrubbableInput.Field aria-label="Height" value={h} formatter={sizeFormatter} onChange={setH} />
        </ScrubbableInput.Root>
        <IconButton aria-label="Constrain proportions"><Icon24AspectRatio /></IconButton>
      </PropertyRow>
    </PropertySection>
    </ExampleContainer>
  );
}

// Recipe 2: Typography — mixed control types stacked
function TypographyPanelDemo() {
  const [fontFamily, setFontFamily] = useState('Inter');
  const [weight, setWeight] = useState('400');
  const [size, setSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(24);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [hAlign, setHAlign] = useState('LEFT');
  const [vAlign, setVAlign] = useState('TOP');

  return (
    <ExampleContainer width={240}>
    <PropertySection title="Typography">
      {/* Row 1: Font family Select — columns="1fr 24px" */}
      <PropertyRow columns="1fr 24px">
        <Select.Root value={fontFamily} onChange={(v) => v && setFontFamily(v)}>
          <Select.Trigger label={<HiddenLabel>Font family</HiddenLabel>} width="fill" />
          <Select.Container>
            <Select.Option value="Inter">Inter</Select.Option>
            <Select.Option value="Roboto">Roboto</Select.Option>
            <Select.Option value="Arial">Arial</Select.Option>
            <Select.Option value="Georgia">Georgia</Select.Option>
            <Select.Option value="monospace">Monospace</Select.Option>
          </Select.Container>
        </Select.Root>
        <div />
      </PropertyRow>
      {/* Row 2: Weight Select + Size ScrubbableInput — columns="1fr 1fr 24px" */}
      <PropertyRow>
        <Select.Root value={weight} onChange={(v) => v && setWeight(v)}>
          <Select.Trigger label={<HiddenLabel>Font weight</HiddenLabel>} width="fill" />
          <Select.Container>
            <Select.Option value="300">Light</Select.Option>
            <Select.Option value="400">Regular</Select.Option>
            <Select.Option value="500">Medium</Select.Option>
            <Select.Option value="600">Semi Bold</Select.Option>
            <Select.Option value="700">Bold</Select.Option>
          </Select.Container>
        </Select.Root>
        <ScrubbableInput.Root>
          <ScrubbableInput.Icon><CharIcon>Sz</CharIcon></ScrubbableInput.Icon>
          <ScrubbableInput.Field aria-label="Font size" value={size} formatter={sizeFormatter} onChange={setSize} />
        </ScrubbableInput.Root>
        <div />
      </PropertyRow>
      {/* Row 3: Line height + Letter spacing with icon labels — columns="1fr 1fr 24px" */}
      <PropertyRow>
        <ScrubbableInput.Root>
          <ScrubbableInput.Icon><Icon24TextLineHeight /></ScrubbableInput.Icon>
          <ScrubbableInput.Field aria-label="Line height" value={lineHeight} formatter={sizeFormatter} onChange={setLineHeight} />
        </ScrubbableInput.Root>
        <ScrubbableInput.Root>
          <ScrubbableInput.Icon><Icon24TextLetterSpacing /></ScrubbableInput.Icon>
          <ScrubbableInput.Field aria-label="Letter spacing" value={letterSpacing} formatter={sizeFormatter} onChange={setLetterSpacing} />
        </ScrubbableInput.Root>
        <div />
      </PropertyRow>
      {/* Row 4: H-align + V-align SegmentedControls — columns="1fr 1fr 24px", trailing has icon */}
      <PropertyRow>
        <SegmentedControl.Root
          value={hAlign}
          onChange={setHAlign}
          legend={<HiddenLegend>Horizontal alignment</HiddenLegend>}
        >
          <SegmentedControl.Option value="LEFT" icon={<Icon24TextAlignLeft />} aria-label="Align left" />
          <SegmentedControl.Option value="CENTER" icon={<Icon24TextAlignCenter />} aria-label="Align center" />
          <SegmentedControl.Option value="RIGHT" icon={<Icon24TextAlignRight />} aria-label="Align right" />
        </SegmentedControl.Root>
        <SegmentedControl.Root
          value={vAlign}
          onChange={setVAlign}
          legend={<HiddenLegend>Vertical alignment</HiddenLegend>}
        >
          <SegmentedControl.Option value="TOP" icon={<Icon24TextAlignTop />} aria-label="Align top" />
          <SegmentedControl.Option value="CENTER" icon={<Icon24TextAlignMiddle />} aria-label="Align middle" />
          <SegmentedControl.Option value="BOTTOM" icon={<Icon24TextAlignBottom />} aria-label="Align bottom" />
        </SegmentedControl.Root>
        <IconButton aria-label="Type settings"><Icon24Adjust /></IconButton>
      </PropertyRow>
    </PropertySection>
    </ExampleContainer>
  );
}

// Recipe 3: Fill & Layout — color rows + checkbox + SegmentedControl
function FillLayoutDemo() {
  const [hex, setHex] = useState('4A90D9');
  const [opacity, setOpacity] = useState('100');
  const [visible, setVisible] = useState(true);
  const [direction, setDirection] = useState('NONE');
  const [w, setW] = useState(200);
  const [h, setH] = useState(150);
  const [clip, setClip] = useState(false);

  return (
    <ExampleContainer width={240}>
      {/* Fill subsection — uses columns="1fr auto auto" for color rows */}
      <PropertySection
        title="Fill"
        headerActions={<IconButton aria-label="Add fill"><Icon24Styles /></IconButton>}
      >
        <PropertyRow columns="1fr auto auto" style={{ opacity: visible ? 1 : 0.4 }}>
          <Input.Group columns="1fr 52px">
            <Input.Root>
              <Swatch colors={[`#${hex}`]} onClick={() => {}} />
              <Input aria-label="Hex color" value={hex} onChange={setHex} />
            </Input.Root>
            <Input aria-label="Opacity" value={opacity} onChange={setOpacity} />
          </Input.Group>
          <IconButton aria-label="Toggle visibility" onClick={() => setVisible(!visible)}>
            {visible ? <Icon24Eye /> : <Icon24Hidden />}
          </IconButton>
          <IconButton aria-label="Remove fill"><Icon24Minus /></IconButton>
        </PropertyRow>
      </PropertySection>

      {/* Empty sections — PlaceholderSection for Stroke and Effects */}
      <PlaceholderSection title="Stroke" actions />
      <PlaceholderSection title="Effects" actions />

      {/* Layout subsection — mixes columns="1fr 24px", "1fr 1fr 24px", and "auto 1fr 24px" */}
      <PropertySection title="Layout">
        {/* Direction SegmentedControl — columns="1fr 24px" */}
        <PropertyRow columns="1fr 24px">
          <SegmentedControl.Root
            value={direction}
            onChange={setDirection}
            legend={<HiddenLegend>Layout direction</HiddenLegend>}
          >
            <SegmentedControl.Option value="NONE" icon={<Icon24AlLayoutGridNone />} aria-label="No auto layout" />
            <SegmentedControl.Option value="VERTICAL" icon={<Icon24AlLayoutGridVertical />} aria-label="Vertical" />
            <SegmentedControl.Option value="HORIZONTAL" icon={<Icon24AlLayoutGridHorizontal />} aria-label="Horizontal" />
            <SegmentedControl.Option value="GRID" icon={<Icon24GridView />} aria-label="Grid" />
          </SegmentedControl.Root>
          <div />
        </PropertyRow>
        {/* W/H fields — columns="1fr 1fr 24px", trailing has lock icon */}
        <PropertyRow>
          <ScrubbableInput.Root>
            <ScrubbableInput.Icon><CharIcon>W</CharIcon></ScrubbableInput.Icon>
            <ScrubbableInput.Field aria-label="Width" value={w} formatter={sizeFormatter} onChange={setW} />
          </ScrubbableInput.Root>
          <ScrubbableInput.Root>
            <ScrubbableInput.Icon><CharIcon>H</CharIcon></ScrubbableInput.Icon>
            <ScrubbableInput.Field aria-label="Height" value={h} formatter={sizeFormatter} onChange={setH} />
          </ScrubbableInput.Root>
          <IconButton aria-label="Constrain proportions"><Icon24AspectRatio /></IconButton>
        </PropertyRow>
        {/* Clip content checkbox — columns="auto 1fr 24px" */}
        <PropertyRow columns="auto 1fr 24px">
          <Checkbox
            checked={clip}
            onChange={setClip}
            label={<Label>Clip content</Label>}
            variant="muted"
          />
          <div />
          <div />
        </PropertyRow>
      </PropertySection>
    </ExampleContainer>
  );
}

// Recipe 4: Component Properties — chip-based property bindings
function ComponentPropertiesDemo() {
  return (
    <ExampleContainer width={240}>
      <PropertySection title="Properties">
        <PropertyRow columns="1fr 24px">
          <Chip size="fill" leading={<Icon24Component />}>
            State <Text className="pl-1" color="secondary">Default, Hover, Pressed</Text>
          </Chip>
        </PropertyRow>
        <PropertyRow columns="1fr 24px">
          <Chip size="fill" leading={<Icon24Text />} >
            Action <Text className="pl-1" color="secondary">Log in</Text>
          </Chip>
        </PropertyRow>
        <PropertyRow columns="1fr 24px">
          <Chip size="fill" leading={<Icon24Instance />}>
            Instance <Text className="pl-1" color="secondary">icon.24.plus</Text>
          </Chip>
        </PropertyRow>
      </PropertySection>
    </ExampleContainer>
  );
}

// Recipe 5: Instance Properties — label-left / control-right grid
function InstancePropertiesDemo() {
  const [variant, setVariant] = useState('Primary');
  const [state, setState] = useState('Default');
  const [label, setLabel] = useState('Share');
  const [showIcon, setShowIcon] = useState(true);

  return (
    <ExampleContainer width={240}>
      <PropertySection title="Instance properties">
        <PropertyRow columns="1fr 1fr 24px">
          <Text color="secondary">Variant</Text>
          <Select.Root value={variant} onChange={(v) => v && setVariant(v)}>
            <Select.Trigger label={<HiddenLabel>Variant</HiddenLabel>} width="fill" />
            <Select.Container>
              <Select.Option value="Primary">Primary</Select.Option>
              <Select.Option value="Hover">Hover</Select.Option>
              <Select.Option value="Pressed">Pressed</Select.Option>
            </Select.Container>
          </Select.Root>
        </PropertyRow>
        <PropertyRow columns="1fr 1fr 24px">
          <Text color="secondary">State</Text>
          <Select.Root value={state} onChange={(v) => v && setState(v)}>
            <Select.Trigger label={<HiddenLabel>State</HiddenLabel>} width="fill" />
            <Select.Container>
              <Select.Option value="Default">Default</Select.Option>
              <Select.Option value="Hover">Hover</Select.Option>
              <Select.Option value="Pressed">Pressed</Select.Option>
            </Select.Container>
          </Select.Root>
        </PropertyRow>
        <PropertyRow columns="1fr 1fr 24px">
          <Text color="secondary">Label</Text>
          <Input aria-label="Label" value={label} onChange={setLabel} />
        </PropertyRow>
        <PropertyRow columns="1fr 1fr 24px">
          <Text color="secondary">Show icon</Text>
          <Switch label={<HiddenLabel>Show icon</HiddenLabel>} checked={showIcon} onChange={setShowIcon} />
        </PropertyRow>
      </PropertySection>
    </ExampleContainer>
  );
}

// ---------------------------------------------------------------------------
// Card demos
// ---------------------------------------------------------------------------

function CardBasicDemo() {
  return (
    <ExampleContainer width={200} bare>
      <Card
        label="Library name"
        subtext="100 components"
        onClick={() => {}}
      >
        <div className="overflow-hidden border border-border rounded-md aspect-[16/9] bg-bg-secondary" />
      </Card>
    </ExampleContainer>
  );
}

const CARD_GRID_ITEMS = [
  { id: '1', title: 'Wireframe kit', subtitle: 'UI Design' },
  { id: '2', title: 'Brand guidelines', subtitle: 'Branding' },
  { id: '3', title: 'App prototype', subtitle: 'Mobile' },
];

function CardGridDemo() {
  return (
    <ExampleContainer fullWidth bare>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {CARD_GRID_ITEMS.map(item => (
          <Card key={item.id} size="lg" label={item.title} subtext={item.subtitle} onClick={() => {}}>
            <div className="overflow-hidden border border-border rounded-lg aspect-[16/9] bg-bg-secondary" />
          </Card>
        ))}
      </div>
    </ExampleContainer>
  );
}

const CARD_TRAILING_SECTIONS = [
  { id: 'timer', name: 'Timer', description: '5 minute countdown' },
  { id: 'music', name: 'Music', description: 'Acoustic ambient' },
];

function CardTrailingDemo() {
  return (
    <ExampleContainer width={240} bare>
      <div className="flex flex-col gap-1" style={{ margin: '0 -8px' }}>
        {CARD_TRAILING_SECTIONS.map(section => (
          <Card
            key={section.id}
            label={section.name}
            subtext={section.description}
            onClick={() => {}}
            trailing={
              <IconButton aria-label="Play" variant="primaryCircle" size="lg">
                <Icon24PlayLarge />
              </IconButton>
            }
          >
            <div className="overflow-hidden border border-border rounded-md aspect-[16/9] bg-bg-secondary" />
          </Card>
        ))}
      </div>
    </ExampleContainer>
  );
}

// ---------------------------------------------------------------------------
// AI demo helpers
// ---------------------------------------------------------------------------

function PromptPanelDemo({ isWorking = false }: { isWorking?: boolean }) {
  const [value, setValue] = useState('');
  const [model, setModel] = useState('claude-4-sonnet');

  return (
    <ExampleContainer width={400} bare>
      <PromptPanel
        value={isWorking ? 'Make the sidebar collapsible' : value}
        onChange={setValue}
        selectedModel={model}
        onModelChange={setModel}
        onSubmit={() => setValue('')}
        isWorking={isWorking}
        onStop={() => {}}
        placeholder="Ask for changes"
      />
    </ExampleContainer>
  );
}

function PromptPanelWithAttachmentsDemo() {
  const [value, setValue] = useState('Fix the layout on these elements');
  const [model, setModel] = useState('claude-4-sonnet');

  return (
    <ExampleContainer width={400} bare>
      <PromptPanel
        value={value}
        onChange={setValue}
        selectedModel={model}
        onModelChange={setModel}
        onSubmit={() => setValue('')}
        placeholder="Ask for changes"
        inspectedElements={MOCK_INSPECTED_ELEMENTS}
        onRemoveElement={() => {}}
      />
    </ExampleContainer>
  );
}

function PromptPanelWithImageDemo() {
  const [value, setValue] = useState('Update the hero section to match this design');
  const [model, setModel] = useState('claude-4-sonnet');

  return (
    <ExampleContainer width={400} bare>
      <div className="flex flex-col w-full border border-bordertranslucent hover:border-bordertranslucentstrong rounded-lg overflow-hidden">
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <AttachmentThumbnail
              attachment={MOCK_ATTACHMENTS[0]}
              onRemove={() => {}}
            />
          </div>
        </div>
        <div className="[&>div]:border-none [&>div]:shadow-none">
          <PromptPanel
            value={value}
            onChange={setValue}
            selectedModel={model}
            onModelChange={setModel}
            onSubmit={() => setValue('')}
            placeholder="Ask for changes"
          />
        </div>
      </div>
    </ExampleContainer>
  );
}

function TodoListWithConfirmDemo() {
  const [started, setStarted] = useState(false);

  const tasks: Task[] = started
    ? MOCK_TASKS
    : MOCK_TASKS.map((t) => ({ ...t, status: 'pending' as const }));

  return (
    <ExampleContainer width={400} bare>
      <div className="p-4">
        <SystemMessage icon={<Icon24ListView />} label="To do list">
          <TodoList tasks={tasks} />
          {!started && (
            <div className="px-3 pb-3">
              <Button variant="primary" size="lg" onClick={() => setStarted(true)}>
                Start tasks
              </Button>
            </div>
          )}
        </SystemMessage>
      </div>
    </ExampleContainer>
  );
}

function StreamingWordDemo() {
  return (
    <ExampleContainer width={400} padding bare>
      <StreamingContent
        content="The quick brown fox jumps over the lazy dog. This text streams in word by word to demonstrate the streaming content component."
        status="active"
        chunkBy="words"
        speed={8}
        fade={false}
      >
        {(visible) => <span className="text-text">{visible}</span>}
      </StreamingContent>
    </ExampleContainer>
  );
}

function StreamingLineDemo() {
  return (
    <ExampleContainer width={400} padding bare>
      <StreamingContent
        content={`Step 1: Analyze the component structure\nStep 2: Identify the collapsible regions\nStep 3: Add state management for open/closed\nStep 4: Wire up the toggle button\nStep 5: Add transition animations`}
        status="active"
        chunkBy="lines"
        speed={2}
        fade={false}
      >
        {(visible) => <span className="text-text-secondary whitespace-pre-line">{visible}</span>}
      </StreamingContent>
    </ExampleContainer>
  );
}

// ---------------------------------------------------------------------------
// Simple syntax highlighting (mirrors templates/make CodeView.tsx)
// ---------------------------------------------------------------------------

const KEYWORD_RE = /\b(import|export|from|const|let|var|function|return|if|else|default|typeof|new|class|extends|interface|type|as)\b/g;
const STRING_RE = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
const COMMENT_RE = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
const JSX_TAG_RE = /(<\/?)([\w.]+)/g;
const ATTR_RE = /\b([a-zA-Z-]+)(=)/g;

function highlightLine(line: string): React.ReactNode[] {
  type Span = { start: number; end: number; cls: string };
  const spans: Span[] = [];

  const collect = (re: RegExp, cls: string, group?: number) => {
    const pattern = new RegExp(re.source, re.flags);
    let m = pattern.exec(line);
    while (m !== null) {
      const idx = group !== undefined ? m.index + (m[0].indexOf(m[group]) - 0) : m.index;
      const text = group !== undefined ? m[group] : m[0];
      spans.push({ start: group !== undefined ? idx : m.index, end: (group !== undefined ? idx : m.index) + text.length, cls });
      m = pattern.exec(line);
    }
  };

  collect(COMMENT_RE, 'text-text-success');
  collect(STRING_RE, 'text-text-warning');
  collect(KEYWORD_RE, 'text-text-brand');
  collect(JSX_TAG_RE, 'text-text-danger', 2);
  collect(ATTR_RE, 'text-text-component', 1);

  spans.sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  let cursor = 0;
  spans.forEach((s) => {
    if (s.start >= cursor) {
      merged.push(s);
      cursor = s.end;
    }
  });

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  merged.forEach((s) => {
    if (s.start > pos) {
      nodes.push(line.slice(pos, s.start));
    }
    nodes.push(
      <span key={s.start} className={s.cls}>
        {line.slice(s.start, s.end)}
      </span>,
    );
    pos = s.end;
  });
  if (pos < line.length) {
    nodes.push(line.slice(pos));
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Streaming code demo
// ---------------------------------------------------------------------------

const STREAMING_CODE_CONTENT = `import { useState } from 'react';
import { Sidebar } from './Sidebar';

export function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}`;

function StreamingCodeDemo() {
  return (
    <ExampleContainer width={400} bare>
      <FileCard variant="writing" fileName="Layout.tsx" loading>
        <StreamingContent
          content={STREAMING_CODE_CONTENT}
          status="active"
          chunkBy="lines"
          speed={2}
          maxHeight={200}
        >
          {(visible) => {
            const lines = visible.split('\n');
            return (
              <table className="w-full border-collapse font-mono text-bodyMd">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={`line-${i}`}>
                      <td className="select-none text-right px-3 text-text-tertiary w-[1%] whitespace-nowrap align-top">
                        {i + 1}
                      </td>
                      <td className="text-text font-mono pr-16px whitespace-pre">
                        {highlightLine(line)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        </StreamingContent>
      </FileCard>
    </ExampleContainer>
  );
}

// ---------------------------------------------------------------------------
// AI Chat demo helpers
// ---------------------------------------------------------------------------

const MOCK_TASKS: Task[] = [
  { label: 'Analyze component structure', status: 'complete' },
  { label: 'Update imports', status: 'complete' },
  { label: 'Refactor state management', status: 'in_progress' },
  { label: 'Add tests', status: 'pending' },
  { label: 'Update documentation', status: 'pending' },
];

const MOCK_ATTACHMENTS = [
  { id: '1', url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="%23e2e2e2" width="80" height="80"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10">image</text></svg>', fileName: 'screenshot.png', loading: false },
];

const MOCK_INSPECTED_ELEMENTS = [
  { id: 'el-1', type: 'div', label: 'div' },
  { id: 'el-2', type: 'button', label: 'button' },
];

// ---------------------------------------------------------------------------
// Navigation demo helpers
// ---------------------------------------------------------------------------

function FilePanel() {
  return <div className="p-3"><Text color="secondary">File browser panel</Text></div>;
}
function AssetsPanel() {
  return <div className="p-3"><Text color="secondary">Assets panel</Text></div>;
}
function SearchPanel() {
  return <div className="p-3"><Text color="secondary">Search panel</Text></div>;
}
function VariablesPanel() {
  return <div className="p-3"><Text color="secondary">Variables panel</Text></div>;
}

function LeftSidebarDemo() {
  const [activeItem, setActiveItem] = useState('file');

  return (
    <ExampleContainer className="w-full h-[400px]">
      <div className="flex h-full">
        <LeftSidebar.Provider activeItem={activeItem} onItemChange={setActiveItem}>
          <LeftSidebar.Rail>
            <LeftSidebar.NavGroup>
              <LeftSidebar.NavItem id="file" icon={Icon24Page} label="File" />
              <LeftSidebar.NavItem id="assets" icon={Icon24Add} label="Assets" />
              <LeftSidebar.NavItem id="search" icon={Icon24Search} label="Find" />
            </LeftSidebar.NavGroup>
            <LeftSidebar.Divider />
            <LeftSidebar.NavGroup>
              <LeftSidebar.NavItem id="variables" icon={Icon24Variable} label="Variables" />
            </LeftSidebar.NavGroup>
          </LeftSidebar.Rail>
          <LeftSidebar.Panel
            panels={{
              file: FilePanel,
              assets: AssetsPanel,
              search: SearchPanel,
              variables: VariablesPanel,
            }}
            fallback={FilePanel}
          />
        </LeftSidebar.Provider>
        <div className="flex-1 flex items-center justify-center bg-bg-secondary">
          <Text color="tertiary">Main content area</Text>
        </div>
      </div>
    </ExampleContainer>
  );
}

function NavListCompoundDemo() {
  const [selected, setSelected] = useState('layers');

  return (
    <div className="flex gap-4 flex-wrap">
      <ExampleContainer width={220}>
        <div className="p-2">
          <NavList.Root
            aria-label="Pages"
            value={selected}
            onChange={setSelected}
            selectedVariant="default"
            size="lg"
          >
            <NavList.Item value="layers" icon={Icon24ExpandLayers} label="Layers" trailing={<div className="px-1"><Badge>12</Badge></div>} />
            <NavList.Item value="components" icon={Icon24Component} label="Components" trailing={<div className="px-1"><Badge>4</Badge></div>} />
            <NavList.Item
              value="styles"
              icon={Icon24Styles}
              label="Styles"
              trailingOnInteraction={<IconButton size="md" aria-label="More" variant="ghost"><Icon24More /></IconButton>}
            />
            <NavList.Item value="settings" icon={Icon24Settings} label="Settings" />
          </NavList.Root>
        </div>
      </ExampleContainer>
      <ExampleContainer width={220}>
        <div className="p-2">
          <NavList.Root
            aria-label="Pages highlighted"
            value={selected}
            onChange={setSelected}
            selectedVariant="highlighted"
            size="lg"
          >
            <NavList.Item value="layers" icon={Icon24ExpandLayers} label="Layers" trailing={<div className="px-1"><Badge>12</Badge></div>} />
            <NavList.Item value="components" icon={Icon24Component} label="Components" trailing={<div className="px-1"><Badge>4</Badge></div>} />
            <NavList.Item
              value="styles"
              icon={Icon24Styles}
              label="Styles"
              trailingOnInteraction={<IconButton size="md" aria-label="More" variant="ghost"><Icon24More /></IconButton>}
            />
            <NavList.Item value="settings" icon={Icon24Settings} label="Settings" />
          </NavList.Root>
        </div>
      </ExampleContainer>
    </div>
  );
}

const SHAPE_SUB_TOOLS: SubTool[] = [
  { id: 'rectangle', label: 'Rectangle', Icon: Icon24Rectangle, LargeIcon: Icon24RectangleLarge, shortcut: 'R' },
  { id: 'line', label: 'Line', Icon: Icon24Line, LargeIcon: Icon24LineLarge, shortcut: 'L' },
  { id: 'arrow', label: 'Arrow', Icon: Icon24Arrow, LargeIcon: Icon24ArrowLarge, shortcut: '⇧L' },
  { id: 'ellipse', label: 'Ellipse', Icon: Icon24Ellipse, LargeIcon: Icon24EllipseLarge, shortcut: 'O' },
];

function PrimaryToolbarDemo() {
  const [activeTool, setActiveTool] = useState('move');
  const [selectedSubToolId, setSelectedSubToolId] = useState('rectangle');

  const handleSelectTool = (id: string) => {
    setActiveTool(id);
    if (SHAPE_SUB_TOOLS.some((st) => st.id === id)) {
      setSelectedSubToolId(id);
    }
  };

  return (
    <ExampleContainer bare padding>
      <div className="flex justify-center">
        <Toolbar.Shell>
          <div className="flex items-center gap-2 p-2">
            <Toolbar.FlatToolButton icon={Icon24MoveLarge} label="Move" isActive={activeTool === 'move'} onClick={() => handleSelectTool('move')} />
            <Toolbar.FlatToolButton icon={Icon24HandLarge} label="Hand" isActive={activeTool === 'hand'} onClick={() => handleSelectTool('hand')} />
            <Toolbar.ToolButton
              id="shapes"
              Icon={Icon24RectangleLarge}
              label="Shape tools"
              activeTool={activeTool}
              selectedSubToolId={selectedSubToolId}
              subTools={SHAPE_SUB_TOOLS}
              onSelectTool={handleSelectTool}
            />
            <Toolbar.FlatToolButton icon={Icon24PenLarge} label="Pen" isActive={activeTool === 'pen'} onClick={() => handleSelectTool('pen')} />
            <Toolbar.FlatToolButton icon={Icon24TextLarge} label="Text" isActive={activeTool === 'text'} onClick={() => handleSelectTool('text')} />
            
          </div>
        </Toolbar.Shell>
      </div>
    </ExampleContainer>
  );
}

// ---------------------------------------------------------------------------
// Secondary toolbar demo (color/option bar above primary toolbar)
// ---------------------------------------------------------------------------

const SECONDARY_COLORS = [
  { id: 'black', label: 'Black', css: '#1B1B1B' },
  { id: 'grey', label: 'Grey', css: '#A5A5A5' },
  { id: 'red', label: 'Red', css: '#F24822' },
  { id: 'orange', label: 'Orange', css: '#FFA629' },
  { id: 'yellow', label: 'Yellow', css: '#FFCD29' },
  { id: 'green', label: 'Green', css: '#14AE5C' },
  { id: 'blue', label: 'Blue', css: '#0D99FF' },
  { id: 'purple', label: 'Purple', css: '#9747FF' },
];

function SecondaryToolbarDemo() {
  const [activeColor, setActiveColor] = useState('#0D99FF');
  const [activeOption, setActiveOption] = useState('shape-rect');

  return (
    <ExampleContainer bare padding>
      <div className="flex flex-col items-center gap-2">
        {/* Secondary toolbar (appears above primary) */}
        <div className="flex items-center bg-bg rounded-lg shadow-300 px-1 gap-1">
          {/* Color section */}
          <div className="flex items-center gap-1 p-1">
            {SECONDARY_COLORS.map((c) => (
              <IconButton
                key={c.id}
                aria-label={c.label}
                variant="ghost"
                onClick={() => setActiveColor(c.css)}
              >
                <Swatch
                  type="circle"
                  colors={[c.css]}
                  padding={false}
                  selected={activeColor === c.css}
                />
              </IconButton>
            ))}
          </div>
          <div className="border-l border-border self-stretch" />
          {/* Shape options */}
          <div className="flex items-center gap-1 py-2 px-2">
            <IconButton aria-label="Rectangle" variant={activeOption === 'shape-rect' ? 'highlighted' : 'ghost'} onClick={() => setActiveOption('shape-rect')}><Icon24ListView /></IconButton>
            <IconButton aria-label="Ellipse" variant={activeOption === 'shape-ellipse' ? 'highlighted' : 'ghost'} onClick={() => setActiveOption('shape-ellipse')}><Icon24GridView /></IconButton>
          </div>
        </div>
        {/* Primary toolbar below */}
        <Toolbar.Shell>
          <div className="flex items-center gap-2 p-2">
            <Toolbar.FlatToolButton icon={Icon24MoveLarge} label="Move" isActive={false} onClick={() => {}} />
            <Toolbar.FlatToolButton icon={Icon24HandLarge} label="Hand" isActive={false} onClick={() => {}} />
          </div>
        </Toolbar.Shell>
      </div>
    </ExampleContainer>
  );
}

// ---------------------------------------------------------------------------
// Floating object toolbar demos (dark popover above selection)
// ---------------------------------------------------------------------------

const FLOATING_COLORS = [
  { id: 'yellow', css: '#FFD966' },
  { id: 'orange', css: '#FFB347' },
  { id: 'red', css: '#FF6B6B' },
  { id: 'pink', css: '#F9A8D4' },
  { id: 'purple', css: '#C4B5FD' },
  { id: 'blue', css: '#93C5FD' },
  { id: 'teal', css: '#5EEAD4' },
  { id: 'green', css: '#86EFAC' },
];

function FloatingShapeToolbarDemo() {
  const [fillColor, setFillColor] = useState('#93C5FD');
  const [showColors, setShowColors] = useState(false);
  const [align, setAlign] = useState('left');

  return (
    <ExampleContainer bare padding>
      <div className="flex justify-center">
        <div data-preferred-theme="dark" className="relative">
          <div className="flex items-center bg-bg rounded-lg shadow-300 p-1 gap-1">
            {/* Color swatch */}
            <div className="relative">
              <IconButton
                size="lg"
                aria-label="Fill color"
                variant="ghost"
                onClick={() => setShowColors((v) => !v)}
              >
                <Swatch type="circle" colors={[fillColor]} size="sm" padding={false} />
              </IconButton>
              {showColors && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-bg rounded-lg shadow-300 p-2 flex gap-1">
                  {FLOATING_COLORS.map((c) => (
                    <IconButton
                      key={c.id}
                      aria-label={c.id}
                      variant="ghost"
                      onClick={() => { setFillColor(c.css); setShowColors(false); }}
                    >
                      <Swatch type="circle" colors={[c.css]} size="sm" padding={false} />
                    </IconButton>
                  ))}
                </div>
              )}
            </div>
            <div className="border-l border-border h-4" />
            {/* Text formatting */}
            <IconButton size="lg" aria-label="Bold" variant="ghost"><Icon24Bold /></IconButton>
            <IconButton size="lg" aria-label="Strikethrough" variant="ghost"><Icon24StrikeThrough /></IconButton>
            <div className="border-l border-border h-4" />
            {/* Alignment */}
            <IconButton size="lg" aria-label="Align left" variant={align === 'left' ? 'highlighted' : 'ghost'} onClick={() => setAlign('left')}><Icon24TextAlignLeft /></IconButton>
            <IconButton size="lg" aria-label="Align center" variant={align === 'center' ? 'highlighted' : 'ghost'} onClick={() => setAlign('center')}><Icon24TextAlignCenter /></IconButton>
            <IconButton size="lg" aria-label="Align right" variant={align === 'right' ? 'highlighted' : 'ghost'} onClick={() => setAlign('right')}><Icon24TextAlignRight /></IconButton>
            <div className="border-l border-border h-4" />
            {/* Actions */}
            <IconButton size="lg" aria-label="Duplicate" variant="ghost"><Icon24Duplicate /></IconButton>
            <IconButton size="lg" aria-label="Lock" variant="ghost"><Icon24Lock /></IconButton>
          </div>
        </div>
      </div>
    </ExampleContainer>
  );
}


// ---------------------------------------------------------------------------
// Right-Click Context Menu Demo
// ---------------------------------------------------------------------------

function RightClickContextMenuDemo() {
  const { handleOpen, manager } = useContextMenu();

  const menuItems: MenuItemDef[] = [
    { type: 'item', id: 'copy', label: 'Copy', shortcut: '⌘C', onClick: () => {} },
    { type: 'item', id: 'paste', label: 'Paste here', shortcut: '⌘V', onClick: () => {} },
    { type: 'item', id: 'rename', label: 'Rename', onClick: () => {} },
    { type: 'separator' },
    { type: 'item', id: 'delete', label: 'Delete', shortcut: '⌫', onClick: () => {} },
    { type: 'separator' },
    { type: 'submenu', id: 'more', label: 'More options', children: [
      { type: 'item', id: 'export', label: 'Export…', onClick: () => {} },
      { type: 'item', id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', onClick: () => {} },
    ]},
  ];

  return (
    <ExampleContainer>
      <div
        className="bg-bg-secondary p-3 w-full h-[200px] flex items-center justify-center select-none"
        onContextMenu={(e) => {
          e.preventDefault();
          handleOpen('canvas', e.clientX, e.clientY);
        }}
      >
        <Text color="secondary">Right-click anywhere in this area</Text>
      </div>
      <ContextMenuRenderer manager={manager} items={menuItems} />
    </ExampleContainer>
  );
}

// ---------------------------------------------------------------------------
// Feedback & messages demos
// ---------------------------------------------------------------------------

function InlineBannerFormDemo() {
  return (
    <ExampleContainer width={320}>
      <div className="flex flex-col gap-3 p-3">
        <Text strong>Publish settings</Text>
        <Banner.Inline variant="warn">
          <Banner.Message title="Caution">Publishing will replace the current live version.</Banner.Message>
        </Banner.Inline>
        <div className="flex flex-col gap-2">
          <Label>
            Version name
            <Input value="v2.4.1" id="version-name" />
          </Label>
          <Label>
            Description
            <Textarea id="description" value="Bug fixes and performance improvements" />
          </Label>
        </div>
        <div className="flex justify-end">
          <Button variant="primary">Publish</Button>
        </div>
      </div>
    </ExampleContainer>
  );
}

function InlineBannerPropertyPanelDemo() {
  return (
    <ExampleContainer width={260}>
      <PropertySection title="Export settings">
        <Banner.Informational variant="default">
          <Banner.Message>SVG exports will flatten all layers.</Banner.Message>
        </Banner.Informational>
        <div className="flex flex-col pt-3">
        <PropertyRow columns="1fr 1fr 24px">
          <Select.Root value="svg" onChange={() => {}}>
            <Select.Trigger label={<HiddenLabel>Format</HiddenLabel>} width="fill" />
            <Select.Container>
              <Select.Option value="svg">SVG</Select.Option>
              <Select.Option value="png">PNG</Select.Option>
              <Select.Option value="pdf">PDF</Select.Option>
            </Select.Container>
          </Select.Root>
          <Input value="1x" id="scale" />
          <IconButton aria-label="Remove"><Icon24Minus /></IconButton>
        </PropertyRow>
        <PropertyRow columns="1fr 1fr 24px">
          <Select.Root value="svg" onChange={() => {}}>
            <Select.Trigger label={<HiddenLabel>Format</HiddenLabel>} width="fill" />
            <Select.Container>
              <Select.Option value="svg">SVG</Select.Option>
              <Select.Option value="png">PNG</Select.Option>
              <Select.Option value="pdf">PDF</Select.Option>
            </Select.Container>
          </Select.Root>
          <Input value="2x" id="scale" />
          <IconButton aria-label="Remove"><Icon24Minus /></IconButton>
        </PropertyRow>
        </div>
        <div className="px-3 py-1"><Button variant="secondary" width="fill">Export</Button></div>
      </PropertySection>
    </ExampleContainer>
  );
}

function GlobalBannerDemo() {
  const [visible, setVisible] = useState(true);
  return (
    <ExampleContainer className="w-full">
      <div className="flex flex-col">
        {visible && (
          <Banner.FullWidth variant="brand" onDismiss={() => setVisible(false)}>
            <Banner.Message>New version available — improvements to auto layout and components.</Banner.Message>
            <Banner.Button onClick={() => setVisible(false)}>Update now</Banner.Button>
          </Banner.FullWidth>
        )}
        <div className="p-4 flex flex-col gap-2">
          <Text color="secondary">My designs</Text>
          <div className="flex gap-2">
            <div className="w-24 h-16 rounded bg-bg-secondary" />
            <div className="w-24 h-16 rounded bg-bg-secondary" />
            <div className="w-24 h-16 rounded bg-bg-secondary" />
          </div>
        </div>
      </div>
    </ExampleContainer>
  );
}

function DeleteConfirmationDemo() {
  const [isOpen, setIsOpen] = useState(false);

  const modalManager = Modal.useModal({
    open: isOpen,
    onClose: () => setIsOpen(false),
  });

  return (
    <ExampleContainer bare>
      <Button variant="destructive" onClick={() => setIsOpen(true)}>Delete file</Button>
      <Modal.Root manager={modalManager} width="sm">
        <Modal.Contents>
          <Modal.Header>
            <Modal.Title>Delete design-system-v2.fig?</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Text color="secondary">
              This file will be permanently deleted. This action cannot be undone.
            </Text>
          </Modal.Body>
          <Modal.Footer>
            <Modal.ActionStrip>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => setIsOpen(false)}>Delete</Button>
            </Modal.ActionStrip>
          </Modal.Footer>
        </Modal.Contents>
      </Modal.Root>
    </ExampleContainer>
  );
}

function CriticalToastDemo() {
  const [showToast, setShowToast] = useState(false);

  return (
    <ExampleContainer bare className="flex flex-col items-start gap-3">
      <Button variant="primary" onClick={() => setShowToast(true)}>Publish changes</Button>
      {showToast && (
        <div data-preferred-theme="dark">
          <Toast.Root variant="danger" onClose={() => setShowToast(false)} timeout={8000}>
            <Icon24Warning />
            <Toast.Message role="alert">Failed to publish changes</Toast.Message>
            <Toast.ActionButton action={() => setShowToast(false)}>Retry</Toast.ActionButton>
            <Toast.DismissButton />
          </Toast.Root>
        </div>
      )}
    </ExampleContainer>
  );
}

// ---------------------------------------------------------------------------
// Recipe Registry
// ---------------------------------------------------------------------------

const FPL_DOCS = 'https://fpl.figma.design';

export const RECIPE_REGISTRY: Recipe[] = [
  // ── Data Display ──────────────────────────────────────────────────────
  {
    id: 'action-table',
    name: 'Action table',
    category: 'data-display',
    description: 'Table with bulk actions via checkbox selection. Useful for admin panels and settings pages.',
    components: [
      { name: 'Table', source: 'shared' },
      { name: 'Badge', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Chip', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Seat management with bulk actions',
        render: () => <ActionTableBulkDemo />,
        code: `const [selectedCount, setSelectedCount] = useState(0);

{selectedCount > 0 && (
  <div>
    <Text>{selectedCount} selected</Text>
    <Button size="sm">Change role</Button>
    <Button size="sm" variant="danger">Remove</Button>
  </div>
)}
<Table
  columns={columns}
  data={data}
  checkboxSelection
  sorting
  columnResizing
  columnMenu
  gridLines={{ vertical: true }}
  onSelectionChanged={(event) => {
    setSelectedCount(event.api.getSelectedRows().length);
  }}
/>`,
      },
    ],
    tags: ['table', 'checkbox', 'selection', 'bulk-actions', 'column-menu', 'admin'],
  },

  {
    id: 'avatar-name-row',
    name: 'Avatar + name rows',
    category: 'data-display',
    description: 'Simple list of avatar and name pairs. Uses the Avatar shared component with Text.',
    components: [
      { name: 'Avatar', source: 'shared' },
      { name: 'Text', source: 'shared' },
    ],
    examples: [
      {
        label: 'User list with avatars',
        render: () => <AvatarNameRowDemo />,
        code: `import { Avatar, Text } from '@prototype/shared';

{users.map(user => (
  <div className="flex items-center gap-2">
    <Avatar initial={user.initial} color={user.color} size="md" />
    <Text size="sm">{user.name}</Text>
  </div>
))}`,
      },
    ],
    tags: ['avatar', 'user', 'list', 'name'],
  },

  {
    id: 'badge-status-list',
    name: 'Badge status list',
    category: 'data-display',
    description: 'List items with trailing Badge indicators showing status. Uses Badge variants for semantic colors.',
    components: [
      { name: 'Badge', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Service status list',
        render: () => <BadgeStatusListDemo />,
        code: `import { Badge } from '@figma/fpl-components';

const items = [
  { name: 'API Server', status: 'Active', variant: 'successFilled' },
  { name: 'Database', status: 'Warning', variant: 'warningFilled' },
  { name: 'CDN', status: 'Down', variant: 'dangerFilled' },
];

{items.map(item => (
  <div className="flex items-center justify-between px-3 py-2">
    <Text size="sm">{item.name}</Text>
    <Badge variant={item.variant}>{item.status}</Badge>
  </div>
))}`,
      },
    ],
    tags: ['badge', 'status', 'list', 'indicator'],
  },

  {
    id: 'complex-table',
    name: 'Complex table',
    category: 'data-display',
    description: 'Advanced table combining sections, cell editing, drag reorder, custom renderers, and dynamic column management. Shows how to compose multiple table features together.',
    components: [
      { name: 'Table', source: 'shared' },
      { name: 'Badge', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Variables editor with sections',
        render: () => <ComplexTableVariablesDemo />,
        code: `const [data, setData] = useState(variablesData);
const { columns, onAddColumn, onDeleteColumn, onRenameColumn } = useColumnManagement(initialColumns);

<Table
  columns={columns}
  data={data}
  sectionField="group"
  sections={[
    { field: 'Color', label: 'Color' },
    { field: 'Spacing', label: 'Spacing' },
    { field: 'Radius', label: 'Radius' },
  ]}
  cellEditing
  rowDrag
  columnResizing
  columnMenu
  density="comfortable"
  gridLines={{ vertical: true }}
  onCellValueChanged={(event) => {
    setData(prev => prev.map(row =>
      row.id === event.data.id ? { ...event.data } : row
    ));
  }}
  onAddColumn={onAddColumn}
  onDeleteColumn={onDeleteColumn}
  onRenameColumn={onRenameColumn}  // double-click header to rename
/>`,
      },
      {
        label: 'CMS content table',
        render: () => <ComplexTableCmsDemo />,
        code: `const { columns, onAddColumn, onDeleteColumn, onRenameColumn } = useColumnManagement(cmsColumns);

<Table
  columns={columns}
  data={data}
  cellEditing
  checkboxSelection
  sorting
  columnResizing
  columnMenu
  gridLines={{ vertical: true }}
  onCellValueChanged={(event) => {
    setData(prev => prev.map(row =>
      row.id === event.data.id ? { ...event.data } : row
    ));
  }}
  onAddColumn={onAddColumn}
  onDeleteColumn={onDeleteColumn}
  onRenameColumn={onRenameColumn}
/>`,
      },
    ],
    tags: ['table', 'sections', 'editable', 'drag', 'reorder', 'inline-edit', 'grouping', 'cms', 'variables', 'selection', 'add-column', 'delete-column', 'rename-column', 'column-menu'],
  },

  {
    id: 'informational-table',
    name: 'Informational table',
    category: 'data-display',
    description: 'Read-only data table with custom cell renderers (Badge for status, formatted numbers). Ideal for dashboards and monitoring views.',
    components: [
      { name: 'Table', source: 'shared' },
      { name: 'Badge', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'API monitoring dashboard',
        render: () => <InformationalTableDemo />,
        code: `import { Table, TableColumnDef } from '@prototype/shared';
import { Badge } from '@figma/fpl-components';

interface ApiEndpoint {
  id: string; method: string; path: string;
  avgLatency: number; requests24h: number;
  errorRate: number; status: string;
}

const columns: TableColumnDef<ApiEndpoint>[] = [
  {
    field: 'method', headerName: 'Method', width: 100,
    cellRenderer: ({ value }) => <Badge variant={methodVariant[value]}>{value}</Badge>,
  },
  { field: 'path', headerName: 'Endpoint', flex: 1 },
  { field: 'avgLatency', headerName: 'Avg Latency', width: 120,
    valueFormatter: ({ value }) => \`\${value} ms\` },
  { field: 'requests24h', headerName: 'Requests (24h)', width: 140,
    valueFormatter: ({ value }) => value.toLocaleString() },
  { field: 'status', headerName: 'Status', width: 110,
    cellRenderer: ({ value }) => <Badge variant={statusVariant[value]}>{value}</Badge>,
  },
];

<Table columns={columns} data={data} sorting columnResizing columnMenu gridLines={{ vertical: true }} />`,
      },
      {
        label: 'Compact density',
        render: () => <InformationalTableCompactDemo />,
        code: `<Table
  columns={columns}
  data={data}
  sorting
  columnResizing
  columnMenu
  density="compact"
  gridLines={{ vertical: true }}
/>`,
      },
    ],
    tags: ['table', 'grid', 'data', 'sort', 'resize', 'column-menu', 'badge', 'dashboard', 'density', 'compact'],
  },

  // ── Feedback ───────────────────────────────────────────────────────────
  {
    id: 'confirmation-dialog',
    name: 'Confirmation',
    category: 'feedback',
    description: 'A blocking confirmation dialog for destructive or irreversible actions. Uses a modal to ensure the user explicitly confirms before proceeding.',
    components: [
      { name: 'Modal.Root', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Modal.Contents', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Modal.Header', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Modal.Title', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Modal.Body', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Modal.Footer', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Modal.ActionStrip', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Delete file confirmation',
        render: () => <DeleteConfirmationDemo />,
        code: `import { Modal, Button } from '@figma/fpl-components';
import { useState } from 'react';

const [isOpen, setIsOpen] = useState(false);

const modalManager = Modal.useModal({
  open: isOpen,
  onClose: () => setIsOpen(false),
});

<Button variant="destructive" onClick={() => setIsOpen(true)}>
  Delete file
</Button>

<Modal.Root manager={modalManager} width="sm">
  <Modal.Contents>
    <Modal.Header>
      <Modal.Title>Delete design-system-v2.fig?</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Text color="secondary">
        This file will be permanently deleted. This action cannot be undone.
      </Text>
    </Modal.Body>
    <Modal.Footer>
      <Modal.ActionStrip>
        <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
        <Button variant="destructive" onClick={() => setIsOpen(false)}>Delete</Button>
      </Modal.ActionStrip>
    </Modal.Footer>
  </Modal.Contents>
</Modal.Root>`,
      },
    ],
    tags: ['confirmation', 'dialog', 'modal', 'delete', 'destructive', 'confirm', 'feedback'],
  },

  {
    id: 'critical-alert',
    name: 'Critical',
    category: 'feedback',
    description: 'An urgent transient alert for critical failures. Uses a danger toast with a retry action to communicate errors that need immediate attention.',
    components: [
      { name: 'Toast.Root', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Toast.Message', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Toast.ActionButton', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Toast.DismissButton', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Failed publish with retry',
        render: () => <CriticalToastDemo />,
        code: `import { Toast, Button } from '@figma/fpl-components';
import { Icon24Warning } from '@figma/fpl-icons';
import { useState } from 'react';

const [showToast, setShowToast] = useState(false);

<Button variant="primary" onClick={() => setShowToast(true)}>
  Publish changes
</Button>

{showToast && (
  <Toast.Root variant="danger" onClose={() => setShowToast(false)} timeout={8000}>
    <Icon24Warning />
    <Toast.Message role="alert">Failed to publish changes</Toast.Message>
    <Toast.ActionButton action={() => setShowToast(false)}>Retry</Toast.ActionButton>
    <Toast.DismissButton />
  </Toast.Root>
)}`,
      },
    ],
    tags: ['critical', 'alert', 'danger', 'toast', 'error', 'failure', 'retry', 'feedback'],
  },

  {
    id: 'informational-banners',
    name: 'Informational',
    category: 'feedback',
    description: 'Non-blocking contextual messages using banners. Inline banners provide context within forms or panels, while full-width banners announce global information above app content.',
    components: [
      { name: 'Banner.FullWidth', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Banner.Inline', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Banner.Message', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Banner.Button', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Inline banner in a form',
        render: () => <InlineBannerFormDemo />,
        code: `import { Banner, Label, Input, Textarea, Button } from '@figma/fpl-components';

<div className="flex flex-col gap-3">
  <Text weight="bold">Publish settings</Text>
  <Banner.Inline variant="warn">
    <Banner.Message>Publishing will replace the current live version.</Banner.Message>
  </Banner.Inline>
  <Label>
    Version name
    <Input defaultValue="v2.4.1" />
  </Label>
  <Button variant="primary">Publish</Button>
</div>`,
      },
      {
        label: 'Inline banner in a property panel',
        render: () => <InlineBannerPropertyPanelDemo />,
        code: `import { Banner, Select, Input, HiddenLabel } from '@figma/fpl-components';
import { PropertySection, PropertyRow } from '@prototype/shared';

<PropertySection label="Export settings">
  <Banner.Inline variant="default">
    <Banner.Message>SVG exports will flatten all layers.</Banner.Message>
  </Banner.Inline>
  <PropertyRow label="Format">
    <Select.Root value="svg" onChange={() => {}}>
      <Select.Trigger label={<HiddenLabel>Format</HiddenLabel>} width="fill" />
      <Select.Container>
        <Select.Option value="svg">SVG</Select.Option>
        <Select.Option value="png">PNG</Select.Option>
      </Select.Container>
    </Select.Root>
  </PropertyRow>
</PropertySection>`,
      },
      {
        label: 'Full-width banner above app content',
        render: () => <GlobalBannerDemo />,
        code: `import { Banner } from '@figma/fpl-components';
import { useState } from 'react';

const [visible, setVisible] = useState(true);

{visible && (
  <Banner.FullWidth variant="brand" onDismiss={() => setVisible(false)}>
    <Banner.Message>
      New version available — improvements to auto layout and components.
    </Banner.Message>
    <Banner.Button onClick={() => setVisible(false)}>
      Update now
    </Banner.Button>
  </Banner.FullWidth>
)}`,
      },
    ],
    tags: ['banner', 'inline', 'fullwidth', 'info', 'warning', 'contextual', 'message', 'feedback'],
  },

  {
    id: 'toast-snackbar',
    name: 'Toasts',
    category: 'feedback',
    description: 'Toasts provide brief, non-blocking feedback messages. Supports auto-dismiss with timeout, action buttons, danger variant for errors, and progress indicators.',
    components: [
      { name: 'Toast.Root', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Toast.Message', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Toast.DismissButton', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Toast.ActionButton', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Toast.Progress', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Trigger with showToast()',
        render: () => (
          <ExampleContainer bare>
            <div data-preferred-theme="dark">
              <Toast.Root>
                <Toast.Message>Changes saved</Toast.Message>
                <Toast.DismissButton />
              </Toast.Root>
            </div>
          </ExampleContainer>
        ),
        code: `import { showToast } from '../components/toast';

// Each template includes a showToast() function that renders
// a toast above the app toolbar. Auto-dismisses after 5s.
showToast({ message: 'Changes saved' });

// With action button:
showToast({
  message: 'Component deleted',
  button: { label: 'Undo', onClick: handleUndo },
});

// Danger variant:
showToast({
  message: 'Failed to publish',
  variant: 'danger',
  button: { label: 'Retry', onClick: handleRetry },
});`,
      },
      {
        label: 'Default with dismiss',
        render: () => (
          <ExampleContainer bare>
            <Toast.Root>
              <Toast.Message>Changes saved</Toast.Message>
              <Toast.DismissButton />
            </Toast.Root>
          </ExampleContainer>
        ),
        code: `import { Toast } from '@figma/fpl-components';

<Toast.Root onClose={() => setIsVisible(false)} timeout={5000}>
  <Toast.Message>Changes saved</Toast.Message>
  <Toast.DismissButton />
</Toast.Root>`,
      },
      {
        label: 'With action button',
        render: () => (
          <ExampleContainer bare>
            <Toast.Root>
              <Toast.Message>Component deleted</Toast.Message>
              <Toast.ActionButton action={() => {}}>Undo</Toast.ActionButton>
              <Toast.DismissButton />
            </Toast.Root>
          </ExampleContainer>
        ),
        code: `import { Toast } from '@figma/fpl-components';

<Toast.Root onClose={() => setIsVisible(false)} timeout={8000}>
  <Toast.Message>Component deleted</Toast.Message>
  <Toast.ActionButton action={handleUndo}>Undo</Toast.ActionButton>
  <Toast.DismissButton />
</Toast.Root>`,
      },
      {
        label: 'Danger variant',
        render: () => (
          <ExampleContainer bare>
            <Toast.Root variant="danger">
            <Icon24Warning />
              <Toast.Message role="alert">Failed to publish changes</Toast.Message>
              <Toast.ActionButton action={() => {}}>Retry</Toast.ActionButton>
              <Toast.DismissButton />
            </Toast.Root>
          </ExampleContainer>
        ),
        code: `import { Toast } from '@figma/fpl-components';

<Toast.Root variant="danger" onClose={() => setIsVisible(false)}>
  <Toast.Message role="alert">Failed to publish changes</Toast.Message>
  <Toast.ActionButton action={handleRetry}>Retry</Toast.ActionButton>
  <Toast.DismissButton />
</Toast.Root>`,
      },
      {
        label: 'With progress bar',
        render: () => (
          <ExampleContainer bare>
            <Toast.Root>
              <Toast.Progress progressFraction={0.6} />
              <Toast.Message>Uploading file…</Toast.Message>
            </Toast.Root>
          </ExampleContainer>
        ),
        code: `import { Toast } from '@figma/fpl-components';

<Toast.Root onClose={() => setIsVisible(false)}>
  <Toast.Message>Uploading file…</Toast.Message>
  <Toast.Progress progressFraction={progress} />
</Toast.Root>`,
      },
    ],
    tags: ['toast', 'snackbar', 'notification', 'feedback', 'alert', 'undo', 'error', 'progress'],
  },

  // ── Forms ──────────────────────────────────────────────────────────────
  {
    id: 'information-form',
    name: 'Information form',
    category: 'forms',
    description: 'A form using the FPL Form system at large size with zod validation, a Textarea, a Select, a RadioInput group, and a Checkbox.',
    components: [
      { name: 'Form', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Form.Row', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Form.Label', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'TextInput', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Textarea', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Select', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'RadioInput', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Checkbox', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Information form',
        render: () => <InformationFormDemo />,
        code: `import { Form, TextInput, useForm } from '@figma/fpl-components/form';
import { Button, Select, RadioInput, Checkbox, Label, Legend, Textarea } from '@figma/fpl-components';
import { z } from 'zod';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

const { manager } = useForm({ schema, size: 'lg', defaultValues: { ... } });
const [bio, setBio] = useState('...');
const [role, setRole] = useState('editor');
const [visibility, setVisibility] = useState('team');
const [agreeToTerms, setAgreeToTerms] = useState(false);

<Form manager={manager} onSubmit={handleSubmit}>
  <Form.Row name="firstName" label={<Form.Label>First name</Form.Label>}>
    <TextInput type="text" placeholder="Jane" autoComplete="given-name" />
  </Form.Row>
  ...
  <Label>Bio</Label>
  <Textarea size="lg" value={bio} onChange={setBio} rows={3} />

  <Select.Root value={role} onChange={setRole}>
    <Select.Trigger label={<Label>Role</Label>} width="fill" size="lg" />
    <Select.Container>
      <Select.Option value="viewer">Viewer</Select.Option>
      <Select.Option value="editor">Editor</Select.Option>
      <Select.Option value="admin">Admin</Select.Option>
    </Select.Container>
  </Select.Root>

  <RadioInput.Root value={visibility} onChange={setVisibility}
    legend={<Legend>Profile visibility</Legend>}>
    <RadioInput.Option value="public" label={<Label>Public</Label>} />
    <RadioInput.Option value="team" label={<Label>Team only</Label>} />
    <RadioInput.Option value="private" label={<Label>Private</Label>} />
  </RadioInput.Root>

  <Checkbox label={<Label>I agree to the terms of service</Label>}
    checked={agreeToTerms} onChange={setAgreeToTerms} />

  <Button variant="secondary" size="lg">Cancel</Button>
  <Button variant="primary" size="lg" type="submit">Save changes</Button>
</Form>`,
      },
    ],
    tags: ['form', 'account', 'user', 'input', 'textarea', 'select', 'radio', 'checkbox', 'validation', 'zod', 'settings'],
  },

  {
    id: 'modal-form',
    name: 'Modal with form',
    category: 'forms',
    description: 'A controlled modal dialog with form fields, labels, and action buttons. Uses Modal.useModal hook for open/close state.',
    components: [
      { name: 'Modal.Root', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Modal.useModal', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Form', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Form.Row', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'useForm', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'TextInput', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Modal.ActionStrip', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Profile edit modal',
        render: () => <ModalFormDemo />,
        code: `import { Form, TextInput, useForm } from '@figma/fpl-components/form';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

const [isOpen, setIsOpen] = useState(false);
const { manager: formManager } = useForm({
  schema,
  defaultValues: { name: '', email: '' },
});
const modalManager = Modal.useModal({
  open: isOpen,
  onClose: () => setIsOpen(false),
});

<Button onClick={() => setIsOpen(true)}>Open modal</Button>
<Modal.Root manager={modalManager} width="sm">
  <Modal.Contents>
    <Modal.Header>
      <Modal.Title>Edit profile</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form manager={formManager} onSubmit={() => setIsOpen(false)}>
        <Form.Row name="name" label={<Form.Label>Name</Form.Label>}>
          <TextInput type="text" placeholder="Jane Doe" autoComplete="name" />
        </Form.Row>
        <Form.Row name="email" label={<Form.Label>Email</Form.Label>}>
          <TextInput type="email" placeholder="jane@example.com" autoComplete="email" />
        </Form.Row>
      </Form>
    </Modal.Body>
    <Modal.Footer>
      <Modal.ActionStrip>
        <Button onClick={() => setIsOpen(false)}>Cancel</Button>
        <Button variant="primary" onClick={() => setIsOpen(false)}>Save</Button>
      </Modal.ActionStrip>
    </Modal.Footer>
  </Modal.Contents>
</Modal.Root>`,
      },
    ],
    tags: ['modal', 'form', 'dialog', 'input', 'label'],
  },

  // ── Layout ─────────────────────────────────────────────────────────────
  {
    id: 'button-variants',
    name: 'Button & link variants',
    category: 'layout',
    description: 'All Button variants and Link component for actions and navigation.',
    components: [
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'IconButton', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Link', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Button variants + links',
        render: () => <LinkButtonDemo />,
        code: `import { Button, Link } from '@figma/fpl-components';

<div className="flex items-center gap-2">
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="ghost">Ghost</Button>
  <Button variant="destructive">Destructive</Button>
</div>
<Link href="https://fpl.figma.design" target="_blank">
  FPL docs
</Link>`,
      },
      {
        label: 'Ghost + contained combo',
        render: () => <GhostContainedDemo />,
        code: `import { Button, IconButton } from '@figma/fpl-components';
import { Icon24Collapse, Icon24Adjust } from '@figma/fpl-icons';

<div className="flex items-center gap-2">
  <IconButton variant="ghost" aria-label="Collapse">
    <Icon24Collapse />
  </IconButton>
  <IconButton variant="ghost" aria-label="Settings">
    <Icon24Adjust />
  </IconButton>
  <Button variant="primary">Share</Button>
  <Button variant="destructive">Delete</Button>
</div>`,
      },
      {
        label: 'Footer action strip',
        render: () => <FooterActionsDemo />,
        code: `import { Button } from '@figma/fpl-components';
import { Icon24Link } from '@figma/fpl-icons';

{/* Link left, Cancel + Save right */}
<div className="flex items-center justify-between border-t border-border pt-3">
  <Button variant="link" iconPrefix={<Icon24Link />}>Copy link</Button>
  <div className="flex items-center gap-2">
    <Button>Cancel</Button>
    <Button variant="primary">Save changes</Button>
  </div>
</div>

{/* Full-width primary */}
<div className="border-t border-border pt-3">
  <Button variant="primary" width="fill">Publish</Button>
</div>`,
      },
      {
        label: 'Header with large buttons',
        render: () => <HeaderButtonsDemo />,
        code: `import { Button, IconButton } from '@figma/fpl-components';
import { Icon24Plus, Icon24Import, Icon24Collapse } from '@figma/fpl-icons';

<div className="flex items-center justify-between w-full">
  <div className="flex items-center gap-2">
    <Button variant="primary" size="lg" iconPrefix={<Icon24Plus />}>Create</Button>
    <Button size="lg" iconPrefix={<Icon24Import />}>Import</Button>
  </div>
  <div className="flex items-center gap-2">
    <IconButton aria-label="Collapse"><Icon24Collapse /></IconButton>
    <Button variant="primary" size="lg">Share</Button>
  </div>
</div>`,
      },
    ],
    tags: ['button', 'link', 'action', 'variant', 'ghost', 'icon', 'toolbar', 'header', 'footer'],
  },

  {
    id: 'card-preview',
    name: 'Card',
    category: 'layout',
    description: 'Clickable card with preview image, label, and optional trailing actions. Used for asset libraries, templates, and media grids.',
    components: [
      { name: 'Card', source: 'shared' },
      { name: 'CardPrimitive', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'IconButton', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Basic preview card',
        render: () => <CardBasicDemo />,
        code: `import { Card } from '@prototype/shared';

<Card
  label="Library name"
  subtext="100 components"
  onClick={() => {}}
>
  <div className="overflow-hidden border border-border rounded-md aspect-[16/9] bg-bg-secondary" />
</Card>`,
      },
      {
        label: 'Card grid (large)',
        render: () => <CardGridDemo />,
        code: `import { Card } from '@prototype/shared';

const ITEMS = [
  { id: '1', title: 'Wireframe kit', subtitle: 'UI Design' },
  { id: '2', title: 'Brand guidelines', subtitle: 'Branding' },
  { id: '3', title: 'App prototype', subtitle: 'Mobile' },
];

<div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 400px))' }}>
  {ITEMS.map(item => (
    <Card key={item.id} size="lg" label={item.title} subtext={item.subtitle} onClick={() => {}}>
      <div className="overflow-hidden border border-border rounded-lg aspect-[16/9] bg-bg-secondary" />
    </Card>
  ))}
</div>`,
      },
      {
        label: 'Card with trailing action',
        render: () => <CardTrailingDemo />,
        code: `import { Card } from '@prototype/shared';
import { IconButton } from '@figma/fpl-components';
import { Icon24PlayLarge } from '@figma/fpl-icons';

const SECTIONS = [
  { id: 'timer', name: 'Timer', description: '5 minute countdown' },
  { id: 'music', name: 'Music', description: 'Acoustic ambient' },
];

<div className="flex flex-col gap-1" style={{ margin: '0 -8px' }}>
  {SECTIONS.map(section => (
    <Card
      key={section.id}
      label={section.name}
      subtext={section.description}
      onClick={() => {}}
      trailing={
        <IconButton aria-label="Play" variant="primaryCircle" size="lg">
          <Icon24PlayLarge />
        </IconButton>
      }
    >
      <div className="overflow-hidden border border-border rounded-md aspect-[16/9] bg-bg-secondary" />
    </Card>
  ))}
</div>`,
      },
    ],
    tags: ['card', 'preview', 'thumbnail', 'grid', 'asset'],
  },

  {
    id: 'typography',
    name: 'Typography',
    category: 'layout',
    description: 'Text, Heading, Code, Pre, UnorderedList, OrderedList, and ListItem components for rich typography. Demonstrated as a mock AI agent response with headings, body copy, inline code, syntax-highlighted code blocks, bulleted lists, and links.',
    components: [
      { name: 'Text', source: 'shared' },
      { name: 'Heading', source: 'shared' },
      { name: 'Code', source: 'shared' },
      { name: 'Pre', source: 'shared' },
      { name: 'UnorderedList', source: 'shared' },
      { name: 'OrderedList', source: 'shared' },
      { name: 'ListItem', source: 'shared' },
    ],
    examples: [
      {
        label: 'AI agent response — headings, code, list & links',
        render: () => <TypographyDemo />,
        code: `import { Text, Heading, Code, Pre, UnorderedList, ListItem } from '@prototype/shared';
import { Link } from '@figma/fpl-components';

{/* Title */}
<Heading size="lg">Created a confirmation modal</Heading>

{/* Body with inline code and links */}
<Text>
  I added a new <Code>ConfirmDeleteModal</Code> component
  using the <Link href="...">FPL Modal</Link> compound
  component, controlled via <Code>useModal</Code>.
</Text>

{/* Section heading */}
<Heading size="md">What changed</Heading>
<Text>
  The modal uses a <Text strong>type-to-confirm</Text> input.
</Text>

{/* Syntax-highlighted code block */}
<Pre syntax="jsx">{\`function ConfirmDeleteModal({ onConfirm }) {
  const [typed, setTyped] = useState('');
  // ...
}\`}</Pre>

{/* Bulleted list */}
<Heading size="md">Key decisions</Heading>
<UnorderedList>
  <ListItem>Used <Code>width="sm"</Code> for a compact layout</ListItem>
  <ListItem>The <Code>destructive</Code> variant signals danger</ListItem>
</UnorderedList>

{/* Secondary closing text */}
<Text size="sm" color="secondary">
  Let me know if you want me to add unit tests.
</Text>`,
      },
      {
        label: 'Section headings with descriptions',
        render: () => <TypographyWithHeadingDemo />,
        code: `import { Text } from '@prototype/shared';

<div className="flex flex-col">
  <div className="p-3">
    <Text strong as="p">Project settings</Text>
    <Text color="secondary">
      Configure your project preferences and team access.
    </Text>
  </div>
  <div className="border-t border-border p-3">
    <Text strong as="p">Notifications</Text>
    <Text color="secondary">
      Choose which updates you want to receive.
    </Text>
  </div>
</div>`,
      },
    ],
    tags: ['text', 'heading', 'typography', 'font', 'label', 'title', 'paragraph', 'code', 'pre', 'syntax', 'link', 'list', 'ai', 'agent'],
  },

  // ── Navigation ─────────────────────────────────────────────────────────
  {
    id: 'left-sidebar-navigation',
    name: 'Left sidebar with rail + panel',
    category: 'navigation',
    description: 'A vertical navigation rail with icon buttons and a resizable side panel. Uses LeftSidebar compound components with Provider context.',
    components: [
      { name: 'LeftSidebar.Provider', source: 'shared' },
      { name: 'LeftSidebar.Rail', source: 'shared' },
      { name: 'LeftSidebar.NavGroup', source: 'shared' },
      { name: 'LeftSidebar.NavItem', source: 'shared' },
      { name: 'LeftSidebar.Divider', source: 'shared' },
      { name: 'LeftSidebar.Footer', source: 'shared' },
      { name: 'LeftSidebar.Panel', source: 'shared' },
    ],
    examples: [
      {
        label: 'Sidebar with rail and panels',
        render: () => <LeftSidebarDemo />,
        code: `import { LeftSidebar } from '@figma/ppg-shared';
import { Icon24Page, Icon24Add, Icon24Search, Icon24Variable } from '@figma/fpl-icons';

const [activeItem, setActiveItem] = useState('file');

<LeftSidebar.Provider activeItem={activeItem} onItemChange={setActiveItem}>
  <LeftSidebar.Rail>
    <LeftSidebar.NavGroup>
      <LeftSidebar.NavItem id="file" icon={Icon24Page} label="File" />
      <LeftSidebar.NavItem id="assets" icon={Icon24Add} label="Assets" />
      <LeftSidebar.NavItem id="search" icon={Icon24Search} label="Find" />
    </LeftSidebar.NavGroup>
    <LeftSidebar.Divider />
    <LeftSidebar.NavGroup>
      <LeftSidebar.NavItem id="variables" icon={Icon24Variable} label="Variables" />
    </LeftSidebar.NavGroup>
  </LeftSidebar.Rail>
  <LeftSidebar.Panel
    panels={{
      file: FilePanel,
      assets: AssetsPanel,
      search: SearchPanel,
      variables: VariablesPanel,
    }}
    fallback={FilePanel}
  />
</LeftSidebar.Provider>`,
      },
    ],
    tags: ['sidebar', 'rail', 'panel', 'navigation', 'left-sidebar', 'icon'],
  },

  {
    id: 'navlist-compound',
    name: 'NavList with icons and badges',
    category: 'navigation',
    description: 'NavList using the compound API (Root + Item) with icons, trailing badges, and hover-only actions. Shows both default and highlighted selection variants.',
    components: [
      { name: 'NavList.Root', source: 'shared' },
      { name: 'NavList.Item', source: 'shared' },
      { name: 'Badge', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'IconButton', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Default vs highlighted variants',
        render: () => <NavListCompoundDemo />,
        code: `import { NavList } from '@figma/ppg-shared';
import { Badge, IconButton } from '@figma/fpl-components';
import { Icon24ExpandLayers, Icon24Component, Icon24Styles, Icon24More } from '@figma/fpl-icons';

const [selected, setSelected] = useState('layers');

<NavList.Root aria-label="Pages" value={selected} onChange={setSelected} selectedVariant="highlighted">
  <NavList.Item value="layers" icon={Icon24ExpandLayers} label="Layers" trailing={<Badge>12</Badge>} />
  <NavList.Item value="components" icon={Icon24Component} label="Components" trailing={<Badge>4</Badge>} />
  <NavList.Item
    value="styles"
    icon={Icon24Styles}
    label="Styles"
    trailingOnInteraction={<IconButton size="md" aria-label="More" variant="ghost"><Icon24More /></IconButton>}
  />
</NavList.Root>`,
      },
    ],
    tags: ['navlist', 'list', 'navigation', 'badge', 'icon', 'compound'],
  },

  {
    id: 'search-filtered-list',
    name: 'Search + filtered list',
    category: 'navigation',
    description: 'SearchInput filtering a list of items. Common pattern for sidebar panels with search.',
    components: [
      { name: 'SearchInput', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'NavList', source: 'shared' },
      { name: 'Text', source: 'shared' },
    ],
    examples: [
      {
        label: 'Page navigation with search',
        render: () => <SearchFilteredListDemo />,
        code: `import { SearchInput } from '@figma/fpl-components';

const [search, setSearch] = useState('');
const items = ['Home', 'Dashboard', 'Settings', 'Profile'];
const filtered = items.filter(i =>
  i.toLowerCase().includes(search.toLowerCase())
);

<div className="w-[200px] border border-border rounded-lg">
  <div className="p-2 border-b border-border">
    <SearchInput
      aria-label="Search pages"
      placeholder="Search..."
      value={search}
      onChange={setSearch}
    />
  </div>
  <div className="py-1">
    {filtered.map(item => (
      <Text key={item} size="sm" className="px-3 py-1.5 hover:bg-bg-hover">
        {item}
      </Text>
    ))}
  </div>
</div>`,
      },
    ],
    tags: ['search', 'filter', 'list', 'sidebar', 'nav'],
  },

  {
    id: 'tab-panel-switching',
    name: 'Tab-based panel switching',
    category: 'navigation',
    description: 'Tabs with TabStrip and TabPanels for switching between content sections. Uses Tabs.useTabs hook.',
    components: [
      { name: 'Tabs.useTabs', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Tabs.TabStrip', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Tabs.Tab', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Tabs.TabPanel', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Right panel tabs',
        render: () => <TabPanelDemo />,
        code: `import { Tabs } from '@figma/fpl-components';

type PanelTab = 'design' | 'prototype' | 'inspect';
const TAB_MAP: Record<PanelTab, true> = {
  design: true, prototype: true, inspect: true
};

const [tabPropsMap, tabPanelPropsMap, tabManager] =
  Tabs.useTabs<PanelTab>(TAB_MAP, { defaultActive: 'design' });

<Tabs.TabStrip manager={tabManager}>
  <Tabs.Tab {...tabPropsMap.design}>Design</Tabs.Tab>
  <Tabs.Tab {...tabPropsMap.prototype}>Prototype</Tabs.Tab>
  <Tabs.Tab {...tabPropsMap.inspect}>Inspect</Tabs.Tab>
</Tabs.TabStrip>
<Tabs.TabPanel {...tabPanelPropsMap.design}>
  Design content
</Tabs.TabPanel>
<Tabs.TabPanel {...tabPanelPropsMap.prototype}>
  Prototype content
</Tabs.TabPanel>`,
      },
    ],
    tags: ['tabs', 'panel', 'navigation', 'switching'],
  },

  // ── Overlays ───────────────────────────────────────────────────────────
  {
    id: 'floating-window',
    name: 'Floating resizable window',
    category: 'overlays',
    description: 'A draggable, resizable window using Window.ResizableRoot. Common for inspector panels, variables, and floating tools.',
    components: [
      { name: 'Window.ResizableRoot', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Window.Contents', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Window.Header', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Window.Title', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Window.Body', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Basic floating window',
        render: () => <FloatingWindowDemo />,
        code: `import { Window } from '@figma/fpl-components';

const [open, setOpen] = useState(false);

{open && (
  <Window.ResizableRoot
    onClose={() => setOpen(false)}
    defaultPosition={{ x: 'center', y: 'center' }}
    defaultWidth={400}
    defaultHeight={250}
    constraints={{ minWidth: 300, minHeight: 200 }}
  >
    <Window.Contents>
      <Window.Header>
        <Window.Title>My window</Window.Title>
      </Window.Header>
      <Window.Body>
        <div className="p-3">Window content here</div>
      </Window.Body>
    </Window.Contents>
  </Window.ResizableRoot>
)}`,
      },
    ],
    tags: ['window', 'floating', 'resizable', 'draggable', 'overlay'],
  },

  {
    id: 'window-with-sidebar',
    name: 'Window with sidebar',
    category: 'overlays',
    description: 'A floating window with a sidebar panel and main body. Uses Window.Sidebar for the sidebar layout.',
    components: [
      { name: 'Window.ResizableRoot', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Window.Sidebar', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Window.Body', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'SearchInput', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Library-style window',
        render: () => (
          <Text color="secondary">
            See the Component Gallery itself — it uses this exact pattern: Window.ResizableRoot + Window.Sidebar + Window.Body.
          </Text>
        ),
        code: `import { Window, SearchInput } from '@figma/fpl-components';

<Window.ResizableRoot
  onClose={onClose}
  defaultPosition={{ x: 'center', y: 'center' }}
  defaultWidth={700}
  defaultHeight={500}
  constraints={{ minWidth: 600, minHeight: 400 }}
>
  <Window.Contents>
    <Window.Header>
      <Window.Title>My panel</Window.Title>
    </Window.Header>
    <Window.Sidebar width={220}>
      <div className="p-2">
        <SearchInput aria-label="Search" placeholder="Search..." />
      </div>
      {/* Sidebar navigation items */}
    </Window.Sidebar>
    <Window.Body>
      {/* Main content */}
    </Window.Body>
  </Window.Contents>
</Window.ResizableRoot>`,
      },
    ],
    tags: ['window', 'sidebar', 'panel', 'library'],
  },

  // ── Progress ───────────────────────────────────────────────────────────
  {
    id: 'loading-states',
    name: 'Loading states',
    category: 'progress',
    description: 'Spinners for indeterminate waits and skeleton loaders for placeholder content. Skeleton bones use a viewport-synced shimmer so all elements animate together.',
    components: [
      { name: 'LoadingSpinner', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Skeleton', source: 'shared' },
      { name: 'Skeleton.Bone', source: 'shared' },
    ],
    examples: [
      {
        label: 'Spinner contexts',
        render: () => <LoadingStatesDemo />,
        code: `import { Button, LoadingSpinner } from '@figma/fpl-components';

{/* In button */}
<Button variant="primary" loading="Saving">
  Save
</Button>

{/* In container */}
<div className="w-[200px] h-[80px] flex items-center justify-center">
  <LoadingSpinner />
</div>

{/* Standalone */}
<LoadingSpinner />`,
      },
      {
        label: 'Skeleton list',
        render: () => <SkeletonListDemo />,
        code: `import { Skeleton } from '@prototype/shared';

<Skeleton>
  <div className="flex flex-col">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="flex items-center gap-3 px-2 py-6px">
        <Skeleton.Bone variant="icon" size="md" />
        <Skeleton.Bone variant="text" size="md" width={\`\${60 + ((i * 17) % 30)}%\`} />
      </div>
    ))}
  </div>
</Skeleton>`,
      },
      {
        label: 'Skeleton card',
        render: () => <SkeletonCardDemo />,
        code: `import { Skeleton } from '@prototype/shared';

<Skeleton>
  <div className="border border-border rounded-lg overflow-hidden" style={{ width: 240 }}>
    <Skeleton.Bone variant="thumbnail" width="100%" height={120} className="rounded-none" />
    <div className="flex flex-col gap-2 p-3">
      <Skeleton.Bone variant="heading" size="md" width="70%" />
      <Skeleton.Bone variant="text" size="sm" />
      <Skeleton.Bone variant="text" size="sm" width="85%" />
    </div>
  </div>
</Skeleton>`,
      },
    ],
    tags: ['loading', 'spinner', 'async', 'progress', 'skeleton', 'placeholder', 'shimmer'],
  },

  // ── Property Panels ────────────────────────────────────────────────────
  {
    id: 'component-properties-panel',
    name: 'Component properties panel',
    category: 'property-panels',
    description: 'Chip-based property bindings showing component properties as icon + name + Chip value. Uses PropertyRow columns="auto 1fr" for icon+label layouts without the trailing 24px icon slot. Chip variant="component" represents bound variables.',
    components: [
      { name: 'PropertySection', source: 'shared' },
      { name: 'PropertyRow', source: 'shared' },
      { name: 'Chip', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Component property bindings',
        render: () => <ComponentPropertiesDemo />,
        code: `import { Chip } from '@figma/fpl-components';
import { Icon24Component, Icon24Text, Icon24Instance } from '@figma/fpl-icons';
import { PropertySection, PropertyRow } from '@prototype/shared';

<PropertySection title="Properties">
  {/* Each row: icon + label on left, Chip on right — columns="auto 1fr" */}
  <PropertyRow columns="auto 1fr">
    <div className="flex items-center gap-1">
      <Icon24Component />
      <Text size="sm" color="secondary">State</Text>
    </div>
    <Chip variant="component" size="fill" onClick={() => cycleVariant()}>
      Default
    </Chip>
  </PropertyRow>
  <PropertyRow columns="auto 1fr">
    <div className="flex items-center gap-1">
      <Icon24Text />
      <Text size="sm" color="secondary">Action</Text>
    </div>
    <Chip variant="component" size="fill" onClick={() => cycleLabel()}>
      Log in
    </Chip>
  </PropertyRow>
  <PropertyRow columns="auto 1fr">
    <div className="flex items-center gap-1">
      <Icon24Instance />
      <Text size="sm" color="secondary">Instance</Text>
    </div>
    <Chip variant="component" size="fill">
      icon.24.plus, ico...
    </Chip>
  </PropertyRow>
</PropertySection>`,
      },
    ],
    tags: ['property', 'component', 'chip', 'binding', 'panel', 'instance'],
  },

  {
    id: 'fill-layout-panel',
    name: 'Fill & Layout panel',
    category: 'property-panels',
    description: 'Multi-section composition combining Fill color rows, empty placeholder sections (Stroke, Effects), and Layout controls. Shows different column grids within the same panel: 1fr auto auto for color rows, 1fr 24px for SegmentedControl, 1fr 1fr 24px for numeric fields, auto 1fr 24px for checkboxes.',
    components: [
      { name: 'PropertySection', source: 'shared' },
      { name: 'PropertyRow', source: 'shared' },
      { name: 'PlaceholderSection', source: 'shared' },
      { name: 'Input.Group', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Input', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'ScrubbableInput', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'SegmentedControl', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Checkbox', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'IconButton', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Fill + Stroke/Effects placeholders + Layout',
        render: () => <FillLayoutDemo />,
        code: `import { Input, ScrubbableInput, NumberFormatter, SegmentedControl, HiddenLegend, Checkbox, Label, IconButton } from '@figma/fpl-components';
import { Icon24Eye, Icon24Hidden, Icon24Minus, Icon24Styles, Icon24AspectRatio, Icon24AlLayoutGridNone, /* ... */ } from '@figma/fpl-icons';
import { PropertySection, PropertyRow, PlaceholderSection } from '@prototype/shared';

{/* Fill section — columns="1fr auto auto" for color + trailing icons */}
<PropertySection
  title="Fill"
  headerActions={<IconButton aria-label="Add fill"><Icon24Styles /></IconButton>}
>
  <PropertyRow columns="1fr auto auto" style={{ opacity: visible ? 1 : 0.4 }}>
    <Input.Group columns="1fr 52px">
      <Input aria-label="Hex color" value={hex} onChange={setHex} />
      <Input aria-label="Opacity" value={opacity} onChange={setOpacity} />
    </Input.Group>
    <IconButton aria-label="Toggle visibility" onClick={() => setVisible(!visible)}>
      {visible ? <Icon24Eye /> : <Icon24Hidden />}
    </IconButton>
    <IconButton aria-label="Remove fill"><Icon24Minus /></IconButton>
  </PropertyRow>
</PropertySection>

{/* Empty sections */}
<PlaceholderSection title="Stroke" actions />
<PlaceholderSection title="Effects" actions />

{/* Layout section — mixes three different column grids */}
<PropertySection title="Layout">
  {/* Direction — columns="1fr 24px" */}
  <PropertyRow columns="1fr 24px">
    <SegmentedControl.Root value={direction} onChange={setDirection} legend={<HiddenLegend>Layout direction</HiddenLegend>}>
      <SegmentedControl.Option value="NONE" icon={<Icon24AlLayoutGridNone />} aria-label="None" />
      {/* ... */}
    </SegmentedControl.Root>
    <div />
  </PropertyRow>

  {/* W/H fields — columns="1fr 1fr 24px" (default) */}
  <PropertyRow>
    <ScrubbableInput.Root>{/* W */}</ScrubbableInput.Root>
    <ScrubbableInput.Root>{/* H */}</ScrubbableInput.Root>
    <IconButton aria-label="Constrain proportions"><Icon24AspectRatio /></IconButton>
  </PropertyRow>

  {/* Clip content — columns="auto 1fr 24px" */}
  <PropertyRow columns="auto 1fr 24px">
    <Checkbox checked={clip} onChange={setClip} label={<Label>Clip content</Label>} variant="muted" />
    <div />
    <div />
  </PropertyRow>
</PropertySection>`,
      },
    ],
    tags: ['property', 'fill', 'color', 'layout', 'segmented', 'checkbox', 'placeholder', 'panel', 'multi-row'],
  },

  {
    id: 'instance-properties-panel',
    name: 'Instance properties panel',
    category: 'property-panels',
    description: 'Label-left / control-right layout using PropertyRow columns="auto 1fr". Each row has a text label on the left and a control (Select, Input, Switch) on the right. No trailing 24px icon column — contrasts with the 1fr 1fr 24px default used in Design-mode recipes.',
    components: [
      { name: 'PropertySection', source: 'shared' },
      { name: 'PropertyRow', source: 'shared' },
      { name: 'Select', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Input', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Switch', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Instance property controls',
        render: () => <InstancePropertiesDemo />,
        code: `import { Select, HiddenLabel, Input, Switch } from '@figma/fpl-components';
import { PropertySection, PropertyRow } from '@prototype/shared';

<PropertySection title="Instance properties">
  {/* Each row: label on left, control on right — columns="auto 1fr" */}
  <PropertyRow columns="auto 1fr">
    <Text size="sm" color="secondary">Variant</Text>
    <Select.Root value={variant} onChange={(v) => v && setVariant(v)}>
      <Select.Trigger label={<HiddenLabel>Variant</HiddenLabel>} width="fill" />
      <Select.Container>
        <Select.Option value="Primary">Primary</Select.Option>
        <Select.Option value="Hover">Hover</Select.Option>
        <Select.Option value="Pressed">Pressed</Select.Option>
      </Select.Container>
    </Select.Root>
  </PropertyRow>
  <PropertyRow columns="auto 1fr">
    <Text size="sm" color="secondary">Label</Text>
    <Input aria-label="Label" value={label} onChange={setLabel} />
  </PropertyRow>
  <PropertyRow columns="auto 1fr">
    <Text size="sm" color="secondary">Show icon</Text>
    <Switch label={<HiddenLabel>Show icon</HiddenLabel>} checked={showIcon} onChange={setShowIcon} />
  </PropertyRow>
</PropertySection>`,
      },
    ],
    tags: ['property', 'instance', 'select', 'input', 'switch', 'panel', 'label-control'],
  },

  {
    id: 'position-size-panel',
    name: 'Position & Size panel',
    category: 'property-panels',
    description: 'Multi-row composition showing alignment buttons, X/Y coordinates, and W/H dimensions stacked together. Demonstrates how empty trailing <div /> spacers maintain 24px column alignment across rows.',
    components: [
      { name: 'PropertySection', source: 'shared' },
      { name: 'PropertyRow', source: 'shared' },
      { name: 'ScrubbableInput', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'NumberFormatter', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'IconButton', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'ButtonPrimitive', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Alignment + coordinates + dimensions',
        render: () => <PositionSizeDemo />,
        code: `import { ScrubbableInput, NumberFormatter, IconButton, ButtonPrimitive } from '@figma/fpl-components';
import { Icon24AspectRatio, Icon24LayoutAlignLeft, /* ... */ } from '@figma/fpl-icons';
import { PropertySection, PropertyRow } from '@prototype/shared';

const formatter = new NumberFormatter({ min: 0, maximumFractionDigits: 2 });

<PropertySection title="Position & Size">
  {/* Row 1: Alignment button groups — columns="1fr 1fr 24px" */}
  <PropertyRow>
    <div className="flex items-center gap-px">
      <ButtonPrimitive className="..." aria-label="Align left"><Icon24LayoutAlignLeft /></ButtonPrimitive>
      <ButtonPrimitive className="..." aria-label="Align center">...</ButtonPrimitive>
      <ButtonPrimitive className="..." aria-label="Align right">...</ButtonPrimitive>
    </div>
    <div className="flex items-center gap-px">{/* vertical alignment group */}</div>
    <div />  {/* ← empty trailing slot maintains column alignment */}
  </PropertyRow>

  {/* Row 2: X/Y coordinates — columns="1fr 1fr 24px" */}
  <PropertyRow>
    <ScrubbableInput.Root>
      <ScrubbableInput.Icon><CharIcon>X</CharIcon></ScrubbableInput.Icon>
      <ScrubbableInput.Field aria-label="X" value={x} formatter={formatter} onChange={setX} />
    </ScrubbableInput.Root>
    <ScrubbableInput.Root>
      <ScrubbableInput.Icon><CharIcon>Y</CharIcon></ScrubbableInput.Icon>
      <ScrubbableInput.Field aria-label="Y" value={y} formatter={formatter} onChange={setY} />
    </ScrubbableInput.Root>
    <div />  {/* ← empty trailing slot */}
  </PropertyRow>

  {/* Row 3: W/H dimensions — columns="1fr 1fr 24px", trailing slot has icon */}
  <PropertyRow>
    <ScrubbableInput.Root>
      <ScrubbableInput.Icon><CharIcon>W</CharIcon></ScrubbableInput.Icon>
      <ScrubbableInput.Field aria-label="W" value={w} formatter={formatter} onChange={setW} />
    </ScrubbableInput.Root>
    <ScrubbableInput.Root>
      <ScrubbableInput.Icon><CharIcon>H</CharIcon></ScrubbableInput.Icon>
      <ScrubbableInput.Field aria-label="H" value={h} formatter={formatter} onChange={setH} />
    </ScrubbableInput.Root>
    <IconButton aria-label="Constrain proportions"><Icon24AspectRatio /></IconButton>
  </PropertyRow>
</PropertySection>`,
      },
    ],
    tags: ['property', 'numeric', 'scrubbable', 'position', 'alignment', 'size', 'panel', 'multi-row'],
  },

  {
    id: 'typography-panel',
    name: 'Typography panel',
    category: 'property-panels',
    description: 'Multi-row composition mixing Select, ScrubbableInput, and SegmentedControl rows. Shows how rows with different column values (1fr 24px vs 1fr 1fr 24px) coexist while the trailing 24px column stays consistent.',
    components: [
      { name: 'PropertySection', source: 'shared' },
      { name: 'PropertyRow', source: 'shared' },
      { name: 'Select', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'ScrubbableInput', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'SegmentedControl', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'IconButton', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Font family → weight/size → spacing → alignment',
        render: () => <TypographyPanelDemo />,
        code: `import { Select, HiddenLabel, ScrubbableInput, NumberFormatter, SegmentedControl, HiddenLegend, IconButton } from '@figma/fpl-components';
import { Icon24TextLineHeight, Icon24TextLetterSpacing, Icon24TextAlignLeft, /* ... */ Icon24Adjust } from '@figma/fpl-icons';
import { PropertySection, PropertyRow } from '@prototype/shared';

const formatter = new NumberFormatter({ min: 0, maximumFractionDigits: 2 });

<PropertySection title="Typography">
  {/* Row 1: Font family — columns="1fr 24px" (full-width select) */}
  <PropertyRow columns="1fr 24px">
    <Select.Root value={fontFamily} onChange={(v) => v && setFontFamily(v)}>
      <Select.Trigger label={<HiddenLabel>Font family</HiddenLabel>} width="fill" />
      <Select.Container>
        <Select.Option value="Inter">Inter</Select.Option>
        {/* ... */}
      </Select.Container>
    </Select.Root>
    <div />
  </PropertyRow>

  {/* Row 2: Weight + Size — columns="1fr 1fr 24px" (default) */}
  <PropertyRow>
    <Select.Root value={weight} onChange={(v) => v && setWeight(v)}>
      <Select.Trigger label={<HiddenLabel>Font weight</HiddenLabel>} width="fill" />
      <Select.Container>{/* ... */}</Select.Container>
    </Select.Root>
    <ScrubbableInput.Root>
      <ScrubbableInput.Icon><CharIcon>Sz</CharIcon></ScrubbableInput.Icon>
      <ScrubbableInput.Field aria-label="Font size" value={size} formatter={formatter} onChange={setSize} />
    </ScrubbableInput.Root>
    <div />
  </PropertyRow>

  {/* Row 3: Line height + Letter spacing — columns="1fr 1fr 24px" */}
  <PropertyRow>
    <ScrubbableInput.Root>
      <ScrubbableInput.Icon><Icon24TextLineHeight /></ScrubbableInput.Icon>
      <ScrubbableInput.Field aria-label="Line height" value={lineHeight} formatter={formatter} onChange={setLineHeight} />
    </ScrubbableInput.Root>
    <ScrubbableInput.Root>
      <ScrubbableInput.Icon><Icon24TextLetterSpacing /></ScrubbableInput.Icon>
      <ScrubbableInput.Field aria-label="Letter spacing" value={letterSpacing} formatter={formatter} onChange={setLetterSpacing} />
    </ScrubbableInput.Root>
    <div />
  </PropertyRow>

  {/* Row 4: H-align + V-align — columns="1fr 1fr 24px", trailing has settings icon */}
  <PropertyRow>
    <SegmentedControl.Root value={hAlign} onChange={setHAlign} legend={<HiddenLegend>Horizontal alignment</HiddenLegend>}>
      <SegmentedControl.Option value="LEFT" icon={<Icon24TextAlignLeft />} aria-label="Left" />
      <SegmentedControl.Option value="CENTER" icon={<Icon24TextAlignCenter />} aria-label="Center" />
      <SegmentedControl.Option value="RIGHT" icon={<Icon24TextAlignRight />} aria-label="Right" />
    </SegmentedControl.Root>
    <SegmentedControl.Root value={vAlign} onChange={setVAlign} legend={<HiddenLegend>Vertical alignment</HiddenLegend>}>
      <SegmentedControl.Option value="TOP" icon={<Icon24TextAlignTop />} aria-label="Top" />
      {/* ... */}
    </SegmentedControl.Root>
    <IconButton aria-label="Type settings"><Icon24Adjust /></IconButton>
  </PropertyRow>
</PropertySection>`,
      },
    ],
    tags: ['property', 'typography', 'select', 'segmented', 'scrubbable', 'alignment', 'font', 'panel', 'multi-row'],
  },

  // ── Toolbars ───────────────────────────────────────────────────────────
  {
    id: 'floating-object-toolbar',
    name: 'Floating object toolbar (dark)',
    category: 'toolbars',
    description: 'A dark-themed floating toolbar that appears above a selected object, like the FigJam/Buzz selection toolbars. Uses data-preferred-theme="dark" with IconButton and Swatch color popovers. Shows two variants: shape styling and frame presets.',
    components: [
      { name: 'IconButton', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Swatch', source: 'shared' },
    ],
    examples: [
      {
        label: 'Shape styling toolbar',
        render: () => <FloatingShapeToolbarDemo />,
        code: `import { IconButton } from '@figma/fpl-components';
import { Swatch } from '@figma/ppg-shared';
import { Icon24Bold, Icon24StrikeThrough, Icon24TextAlignLeft, Icon24TextAlignCenter,
  Icon24TextAlignRight, Icon24Duplicate, Icon24Lock } from '@figma/fpl-icons';

// Wrap in data-preferred-theme="dark" for dark mode
<div data-preferred-theme="dark">
  <div className="flex items-center bg-bg rounded-lg shadow-300 p-1 gap-1">
    {/* Color swatch with popover */}
    <IconButton size="lg" aria-label="Fill color" variant="ghost" onClick={toggleColors}>
      <Swatch type="circle" colors={[fillColor]} size="sm" padding={false} />
    </IconButton>
    <div className="border-l border-border h-5" />
    {/* Formatting */}
    <IconButton size="lg" aria-label="Bold" variant="ghost"><Icon24Bold /></IconButton>
    <IconButton size="lg" aria-label="Strikethrough" variant="ghost"><Icon24StrikeThrough /></IconButton>
    <div className="border-l border-border h-5" />
    {/* Alignment */}
    <IconButton size="lg" aria-label="Align left" variant={align === 'left' ? 'secondary' : 'ghost'}
      onClick={() => setAlign('left')}><Icon24TextAlignLeft /></IconButton>
    <div className="border-l border-border h-5" />
    {/* Actions */}
    <IconButton size="lg" aria-label="Duplicate" variant="ghost"><Icon24Duplicate /></IconButton>
    <IconButton size="lg" aria-label="Lock" variant="ghost"><Icon24Lock /></IconButton>
  </div>
</div>`,
      },
    ],
    tags: ['toolbar', 'floating', 'dark', 'popover', 'selection', 'object', 'figjam', 'buzz', 'color'],
  },

  {
    id: 'primary-toolbar',
    name: 'Primary toolbar',
    category: 'toolbars',
    description: 'The main canvas toolbar with tool buttons and sub-tool dropdown menus. Uses Toolbar.Shell, ToolButton (with sub-tools and LargeIcon variants), and FlatToolButton.',
    components: [
      { name: 'Toolbar.Shell', source: 'shared' },
      { name: 'Toolbar.ToolButton', source: 'shared' },
      { name: 'Toolbar.FlatToolButton', source: 'shared' },
    ],
    examples: [
      {
        label: 'Primary toolbar with large icons',
        render: () => <PrimaryToolbarDemo />,
        code: `import { Toolbar } from '@figma/ppg-shared';
import type { SubTool } from '@figma/ppg-shared';
import { Icon24MoveLarge, Icon24RectangleLarge, Icon24PenLarge, Icon24TextLarge, Icon24HandLarge,
  Icon24Rectangle, Icon24Line, Icon24LineLarge, Icon24Arrow, Icon24ArrowLarge,
  Icon24Ellipse, Icon24EllipseLarge } from '@figma/fpl-icons';

const SHAPE_SUB_TOOLS: SubTool[] = [
  { id: 'rectangle', label: 'Rectangle', Icon: Icon24Rectangle, LargeIcon: Icon24RectangleLarge, shortcut: 'R' },
  { id: 'line', label: 'Line', Icon: Icon24Line, LargeIcon: Icon24LineLarge, shortcut: 'L' },
  { id: 'arrow', label: 'Arrow', Icon: Icon24Arrow, LargeIcon: Icon24ArrowLarge, shortcut: '⇧L' },
  { id: 'ellipse', label: 'Ellipse', Icon: Icon24Ellipse, LargeIcon: Icon24EllipseLarge, shortcut: 'O' },
];

const [activeTool, setActiveTool] = useState('move');
const [selectedSubToolId, setSelectedSubToolId] = useState('rectangle');

<Toolbar.Shell>
  <div className="flex items-center gap-1 p-2">
    <Toolbar.FlatToolButton icon={Icon24MoveLarge} label="Move"
      isActive={activeTool === 'move'} onClick={() => setActiveTool('move')} />
    <Toolbar.ToolButton
      id="shapes" Icon={Icon24RectangleLarge} label="Shape tools"
      activeTool={activeTool} selectedSubToolId={selectedSubToolId}
      subTools={SHAPE_SUB_TOOLS} onSelectTool={setActiveTool} />
    <Toolbar.FlatToolButton icon={Icon24PenLarge} label="Pen"
      isActive={activeTool === 'pen'} onClick={() => setActiveTool('pen')} />
    <Toolbar.FlatToolButton icon={Icon24TextLarge} label="Text"
      isActive={activeTool === 'text'} onClick={() => setActiveTool('text')} />
    <Toolbar.FlatToolButton icon={Icon24HandLarge} label="Hand"
      isActive={activeTool === 'hand'} onClick={() => setActiveTool('hand')} />
  </div>
</Toolbar.Shell>`,
      },
    ],
    tags: ['toolbar', 'tool', 'button', 'sub-tool', 'dropdown', 'primary'],
  },

  {
    id: 'secondary-toolbar',
    name: 'Secondary toolbar',
    category: 'toolbars',
    description: 'A contextual toolbar that appears above the primary toolbar when a tool is active. Shows color palettes with active ring indicators and shape/option pickers. Based on FigJam secondary toolbars (marker colors, shape options).',
    components: [
      { name: 'Toolbar.Shell', source: 'shared' },
      { name: 'Toolbar.FlatToolButton', source: 'shared' },
      { name: 'IconButton', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Swatch', source: 'shared' },
    ],
    examples: [
      {
        label: 'Color palette + shape options',
        render: () => <SecondaryToolbarDemo />,
        code: `import { IconButton } from '@figma/fpl-components';
import { Toolbar, Swatch } from '@figma/ppg-shared';
import { Icon24RectangleLarge, Icon24GridView } from '@figma/fpl-icons';

const COLORS = [
  { id: 'black', label: 'Black', css: '#1B1B1B' },
  { id: 'red', label: 'Red', css: '#F24822' },
  { id: 'blue', label: 'Blue', css: '#0D99FF' },
  // ...
];

const [activeColor, setActiveColor] = useState('#0D99FF');
const [activeOption, setActiveOption] = useState('shape-rect');

{/* Secondary toolbar — stacks above primary */}
<div className="flex items-center bg-bg rounded-lg shadow-300 px-1 gap-1">
  {/* Color palette with active ring */}
  <div className="flex items-center gap-1 p-1">
    {COLORS.map((c) => (
      <IconButton key={c.id} size="lg" aria-label={c.label}
        variant="ghost" onClick={() => setActiveColor(c.css)}>
        <Swatch type="circle" colors={[c.css]} size="sm"
          padding={false} selected={activeColor === c.css} />
      </IconButton>
    ))}
  </div>
  <div className="border-l border-border self-stretch" />
  {/* Shape option buttons */}
  <div className="flex items-center gap-1 py-1 px-2">
    <IconButton size="lg" aria-label="Rectangle"
      variant={activeOption === 'rect' ? 'highlighted' : 'ghost'}
      onClick={() => setActiveOption('rect')}>
      <Icon24RectangleLarge />
    </IconButton>
  </div>
</div>

{/* Primary toolbar below */}
<Toolbar.Shell>...</Toolbar.Shell>`,
      },
    ],
    tags: ['toolbar', 'secondary', 'color', 'palette', 'shapes', 'figjam', 'contextual'],
  },

  // ── AI ────────────────────────────────────────────────────────────────

  {
    id: 'prompt-panel',
    name: 'Prompt panel',
    category: 'ai',
    description: 'Chat input with model selector dropdown. Supports an isWorking state that swaps the submit button for a stop button. Attachments (images, files) and inspected elements appear as thumbnails and chips above the textarea.',
    components: [
      { name: 'PromptPanel', source: 'shared' },
      { name: 'AttachmentThumbnail', source: 'shared' },
    ],
    examples: [
      {
        label: 'Idle prompt',
        render: () => <PromptPanelDemo />,
        code: `import { PromptPanel } from '@figma/ppg-shared';

const [value, setValue] = useState('');
const [model, setModel] = useState('claude-4-sonnet');

<PromptPanel
  value={value}
  onChange={setValue}
  selectedModel={model}
  onModelChange={setModel}
  onSubmit={() => {}}
  placeholder="Ask for changes"
/>`,
      },
      {
        label: 'Working state (stop button)',
        render: () => <PromptPanelDemo isWorking />,
        code: `<PromptPanel
  value="Make the sidebar collapsible"
  onChange={setValue}
  selectedModel={model}
  onModelChange={setModel}
  onSubmit={() => {}}
  isWorking
  onStop={() => {}}
  placeholder="Ask for changes"
/>`,
      },
      {
        label: 'With inspected elements',
        render: () => <PromptPanelWithAttachmentsDemo />,
        code: `<PromptPanel
  value="Fix the layout on these elements"
  onChange={setValue}
  selectedModel={model}
  onModelChange={setModel}
  onSubmit={() => {}}
  inspectedElements={[
    { id: 'el-1', type: 'div', label: 'Container' },
    { id: 'el-2', type: 'button', label: 'Submit button' },
  ]}
  onRemoveElement={(id) => {}}
  placeholder="Ask for changes"
/>`,
      },
      {
        label: 'With attached image',
        render: () => <PromptPanelWithImageDemo />,
        code: `import { PromptPanel, AttachmentThumbnail } from '@figma/ppg-shared';

{/* PromptPanel manages attachments internally via AttachMenu.
    Users click the attach button to select files, which appear
    as thumbnails above the textarea. */}
<PromptPanel
  value="Update the hero section to match this design"
  onChange={setValue}
  selectedModel={model}
  onModelChange={setModel}
  onSubmit={handleSubmit}
  placeholder="Ask for changes"
/>`,
      },
    ],
    tags: ['prompt', 'chat', 'input', 'model', 'ai', 'stop', 'submit', 'attachment', 'inspect', 'image'],
  },

  {
    id: 'streaming-content',
    name: 'Streaming content',
    category: 'ai',
    description: 'Progressively reveals text word-by-word or line-by-line. Useful for AI response streaming, step-by-step output, and code generation previews.',
    components: [
      { name: 'StreamingContent', source: 'shared' },
      { name: 'FileCard', source: 'shared' },
    ],
    examples: [
      {
        label: 'Word-by-word streaming',
        render: () => <StreamingWordDemo />,
        code: `import { StreamingContent } from '@figma/ppg-shared';

<StreamingContent
  content="The quick brown fox jumps over the lazy dog."
  status="active"
  chunkBy="words"
  speed={8}
  fade={false}
>
  {(visible) => <span className="text-text">{visible}</span>}
</StreamingContent>`,
      },
      {
        label: 'Line-by-line streaming',
        render: () => <StreamingLineDemo />,
        code: `<StreamingContent
  content={\`Step 1: Analyze the component structure
Step 2: Identify the collapsible regions
Step 3: Add state management\`}
  status="active"
  chunkBy="lines"
  speed={2}
  fade={false}
>
  {(visible) => <span className="text-text-secondary whitespace-pre-line">{visible}</span>}
</StreamingContent>`,
      },
      {
        label: 'Code streaming with syntax highlighting',
        render: () => <StreamingCodeDemo />,
        code: `import { StreamingContent, FileCard } from '@figma/ppg-shared';

<FileCard variant="writing" fileName="Layout.tsx" loading>
  <StreamingContent
    content={codeString}
    status="active"
    chunkBy="lines"
    speed={2}
    maxHeight={200}
  >
    {(visible) => (
      <pre className="font-mono text-bodyMd">{visible}</pre>
    )}
  </StreamingContent>
</FileCard>`,
      },
    ],
    tags: ['streaming', 'text', 'animation', 'ai', 'code', 'progressive', 'reveal'],
  },

  {
    id: 'chat-message',
    name: 'Chat message',
    category: 'ai',
    description:
      'Chat bubble for user and AI messages. User messages render right-aligned with avatar; AI messages render as left-aligned plain text.',
    components: [{ name: 'ChatMessage', source: 'shared' }],
    examples: [
      {
        label: 'User message',
        render: () => (
          <ExampleContainer width={400} bare>
            <div className="p-4">
              <ChatMessage sender="user">
                Can you make the sidebar collapsible?
              </ChatMessage>
            </div>
          </ExampleContainer>
        ),
        code: `import { ChatMessage } from '@figma/ppg-shared';

<ChatMessage sender="user">
  Can you make the sidebar collapsible?
</ChatMessage>`,
      },
      {
        label: 'AI message',
        render: () => (
          <ExampleContainer width={400} bare>
            <div className="p-4">
              <ChatMessage sender="ai">
                Sure! I'll add a collapse toggle to the sidebar header and manage
                the expanded/collapsed state with useState.
              </ChatMessage>
            </div>
          </ExampleContainer>
        ),
        code: `<ChatMessage sender="ai">
  Sure! I'll add a collapse toggle to the sidebar header and manage
  the expanded/collapsed state with useState.
</ChatMessage>`,
      },
      {
        label: 'With attachments',
        render: () => (
          <ExampleContainer width={400} bare>
            <div className="p-4">
              <ChatMessage
                sender="user"
                attachments={MOCK_ATTACHMENTS}
                inspectedElements={MOCK_INSPECTED_ELEMENTS}
              >
                Fix the layout on these elements
              </ChatMessage>
            </div>
          </ExampleContainer>
        ),
        code: `<ChatMessage
  sender="user"
  attachments={[
    { id: '1', url: 'screenshot.png', fileName: 'screenshot.png', loading: false },
  ]}
  inspectedElements={[
    { id: 'el-1', type: 'div', label: 'Container' },
    { id: 'el-2', type: 'button', label: 'Submit button' },
  ]}
>
  Fix the layout on these elements
</ChatMessage>`,
      },
    ],
    tags: ['chat', 'message', 'bubble', 'user', 'ai', 'avatar', 'attachment'],
  },

  {
    id: 'thinking-and-reasoning',
    name: 'Thinking & reasoning',
    category: 'ai',
    description:
      'Expandable sections for AI reasoning with streaming animation, paired with inline progress indicators.',
    components: [
      { name: 'CollapsibleSection', source: 'shared' },
      { name: 'ProgressIndicator', source: 'shared' },
    ],
    examples: [
      {
        label: 'Active (streaming)',
        render: () => (
          <ExampleContainer width={400} bare>
            <div className="p-4">
              <CollapsibleSection label="Thinking..." status="active">
                I need to analyze the component hierarchy to find where the sidebar
                state is managed. The LeftSidebar component uses a context provider,
                so I should add a collapsed state there and pass it down to child
                components.
              </CollapsibleSection>
            </div>
          </ExampleContainer>
        ),
        code: `import { CollapsibleSection } from '@figma/ppg-shared';

<CollapsibleSection label="Thinking..." status="active">
  I need to analyze the component hierarchy to find where the sidebar
  state is managed...
</CollapsibleSection>`,
      },
      {
        label: 'Complete (collapsed)',
        render: () => (
          <ExampleContainer width={400} bare>
            <div className="p-4">
              <CollapsibleSection label="Thought for 12 seconds" status="complete">
                I analyzed the component tree and found that the sidebar state lives
                in the LeftSidebar provider. Adding a collapsed boolean to the context
                will let all children respond to the toggle.
              </CollapsibleSection>
            </div>
          </ExampleContainer>
        ),
        code: `<CollapsibleSection label="Thought for 12 seconds" status="complete">
  I analyzed the component tree and found that the sidebar state lives
  in the LeftSidebar provider...
</CollapsibleSection>`,
      },
      {
        label: 'Progress indicators',
        render: () => (
          <ExampleContainer width={400} bare>
            <div className="p-4 flex flex-col gap-2">
              <ProgressIndicator label="Analyzing component structure..." spinner />
              <ProgressIndicator label="Reading sidebar implementation..." spinner />
              <ProgressIndicator label="Updated 3 files" />
            </div>
          </ExampleContainer>
        ),
        code: `import { ProgressIndicator } from '@figma/ppg-shared';

<ProgressIndicator label="Analyzing component structure..." spinner />
<ProgressIndicator label="Reading sidebar implementation..." spinner />
<ProgressIndicator label="Updated 3 files" />`,
      },
    ],
    tags: ['thinking', 'reasoning', 'collapsible', 'streaming', 'progress', 'ai', 'spinner'],
  },

  {
    id: 'artifacts',
    name: 'Artifacts',
    category: 'ai',
    description:
      'Cards and containers for AI-generated output: system messages with action buttons, task lists with status tracking, and version history with restore.',
    components: [
      { name: 'SystemMessage', source: 'shared' },
      { name: 'TodoList', source: 'shared' },
      { name: 'VersionCard', source: 'shared' },
      { name: 'Text', source: 'shared' },
      { name: 'Input', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'System message with form content',
        render: () => (
          <ExampleContainer width={400} bare>
            <div className="p-4">
              <SystemMessage icon={<Icon24Key />} label="Create a secret">
                <div className="flex flex-col gap-3 px-12px pb-3">
                  <Text size="lg" color="secondary">
                    Please add your secret name and value. You can manage your secret in Supabase.
                  </Text>
                  <Input size="lg" aria-label="Secret name" value="STELLAR_NEXUS_API_KEY"/>
                  <Input size="lg" aria-label="Secret value" value="sn_7f9e2b4d1c8a6e3p5q0r9t2u5v8w1z4y7x"/>
                  <div>
                    <Button variant="primary">Save secret</Button>
                  </div>
                </div>
              </SystemMessage>
            </div>
          </ExampleContainer>
        ),
        code: `import { SystemMessage } from '@figma/ppg-shared';
import { Icon24Key } from '@figma/fpl-icons';
import { Input, Button } from '@figma/fpl-components';

<SystemMessage icon={<Icon24Key />} label="Create a secret">
  <div className="flex flex-col gap-3 px-12px pb-3">
    <span className="text-text-secondary">
      Please add your secret name and value. You can manage your secret in Supabase.
    </span>
    <Input aria-label="Secret name" value={name} readOnly />
    <Input aria-label="Secret value" value={value} readOnly />
    <div>
      <Button variant="primary">Save secret</Button>
    </div>
  </div>
</SystemMessage>`,
      },
      {
        label: 'Todo list with confirmation',
        render: () => <TodoListWithConfirmDemo />,
        code: `import { SystemMessage, TodoList } from '@figma/ppg-shared';
import { Icon24ListView } from '@figma/fpl-icons';
import { Button } from '@figma/fpl-components';
import type { Task } from '@figma/ppg-shared';

const tasks: Task[] = [
  { label: 'Analyze component structure', status: 'pending' },
  { label: 'Update imports', status: 'pending' },
  { label: 'Refactor state management', status: 'pending' },
  { label: 'Add tests', status: 'pending' },
  { label: 'Update documentation', status: 'pending' },
];

<SystemMessage icon={<Icon24ListView />} label="To do list">
  <TodoList tasks={tasks} />
  {awaitingUserAction && (
    <div className="px-3 pb-3">
      <Button variant="primary" size="lg" onClick={onStartTasks}>
        Start tasks
      </Button>
    </div>
  )}
</SystemMessage>`,
      },
      {
        label: 'Todo list (in progress)',
        render: () => (
          <ExampleContainer width={400} bare>
            <div className="p-4">
              <SystemMessage icon={<Icon24ListView />} label="Implementation plan">
                <TodoList tasks={MOCK_TASKS} />
              </SystemMessage>
            </div>
          </ExampleContainer>
        ),
        code: `const tasks: Task[] = [
  { label: 'Analyze component structure', status: 'complete' },
  { label: 'Update imports', status: 'complete' },
  { label: 'Refactor state management', status: 'in_progress' },
  { label: 'Add tests', status: 'pending' },
  { label: 'Update documentation', status: 'pending' },
];

<SystemMessage icon={<Icon24ListView />} label="Implementation plan">
  <TodoList tasks={tasks} />
</SystemMessage>`,
      },
      {
        label: 'Version cards',
        render: () => (
          <ExampleContainer width={400} bare>
            <div className="p-4 flex flex-col gap-2">
              <VersionCard
                label="Added collapsible sidebar"
                variant="current"
              />
              <VersionCard
                label="Initial layout"
                variant="previous"
                versionNumber={1}
                onRestore={() => {}}
              />
            </div>
          </ExampleContainer>
        ),
        code: `import { VersionCard } from '@figma/ppg-shared';

<VersionCard
  label="Added collapsible sidebar"
  variant="current"
/>
<VersionCard
  label="Initial layout"
  variant="previous"
  versionNumber={1}
  onRestore={() => {}}
/>`,
      },
    ],
    tags: ['system', 'message', 'todo', 'task', 'version', 'artifact', 'ai', 'card'],
  },

  // ── Interactions ─────────────────────────────────────────────────────

  {
    id: 'right-click-context-menu',
    name: 'Right-click context menu',
    category: 'interactions',
    description: 'Custom context menu triggered by right-click. Supports items with keyboard shortcuts, separators, and nested submenus.',
    components: [
      { name: 'useContextMenu', source: 'shared' },
      { name: 'ContextMenuRenderer', source: 'shared' },
      { name: 'Text', source: 'shared' },
    ],
    examples: [
      {
        label: 'Canvas context menu with submenus',
        render: () => <RightClickContextMenuDemo />,
        code: `import { useContextMenu, ContextMenuRenderer } from '@figma/ppg-shared';
import type { MenuItemDef } from '@figma/ppg-shared';

const { handleOpen, manager } = useContextMenu();

const menuItems: MenuItemDef[] = [
  { type: 'item', id: 'copy', label: 'Copy', shortcut: '⌘C', onClick: () => {} },
  { type: 'item', id: 'paste', label: 'Paste here', shortcut: '⌘V', onClick: () => {} },
  { type: 'separator' },
  { type: 'item', id: 'delete', label: 'Delete', shortcut: '⌫', onClick: () => {} },
  { type: 'submenu', id: 'more', label: 'More options', children: [
    { type: 'item', id: 'export', label: 'Export…', onClick: () => {} },
  ]},
];

<div onContextMenu={(e) => {
  e.preventDefault();
  handleOpen('canvas', e.clientX, e.clientY);
}}>
  Right-click anywhere
</div>
<ContextMenuRenderer manager={manager} items={menuItems} />`,
      },
    ],
    tags: ['context-menu', 'right-click', 'menu', 'submenu', 'shortcut', 'interaction'],
  },
];

