import { useState } from 'react';
import {
  Badge,
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
  Window,
} from '@figma/fpl-components';
import {
  Icon24Adjust,
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
  Icon24Plus,
  Icon24Text,
} from '@figma/fpl-icons';
import { Form, TextInput, useForm } from '@figma/fpl-components/form';
import { z } from 'zod';
import type { Recipe } from './types';
import { PropertySection, PropertyRow, PlaceholderSection } from '../PropertyLayout';
import { Avatar } from '../Avatar';
import { Text } from '../Text';
import { Heading } from '../Heading';
import { NavList } from '../NavList';
import { Table } from '../table';
import type { TableColumnDef } from '../table';

// ---------------------------------------------------------------------------
// ExampleContainer — visual wrapper for recipe demos only.
// This is NOT part of the component library. Do not copy into prototypes.
// ---------------------------------------------------------------------------

function ExampleContainer({
  children,
  width,
  padding = false,
  fullWidth = false,
  className,
}: {
  children: React.ReactNode;
  width?: number;
  padding?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
  if (fullWidth) {
    return <div className={`w-full${className ? ` ${className}` : ''}`}>{children}</div>;
  }
  return (
    <div
      className={`border border-border rounded-lg overflow-hidden bg-bg${padding ? ' p-4' : ''}${className ? ` ${className}` : ''}`}
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

function AccountInfoFormDemo() {
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
          <Text size="sm" color="tertiary" className="px-3 py-1.5">No results</Text>
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
    <div className="flex flex-col gap-2">
      {users.map((user) => (
        <div key={user.name} className="flex items-center gap-2">
          <Avatar initial={user.initial} color={user.color} size="md" />
          <Text>{user.name}</Text>
        </div>
      ))}
    </div>
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
];

function ActionTableBulkDemo() {
  const [selectedCount, setSelectedCount] = useState(0);

  return (
    <div className="flex flex-col gap-2 w-full">
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <Text size="sm" color="secondary">{selectedCount} selected</Text>
          <Button>Change role</Button>
          <Button variant="destructive">Remove</Button>
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
    </div>
  );
}

function ActionTableColumnDemo() {
  const [columns, setColumns] = useState<TableColumnDef<SeatAssignment>[]>(SEAT_COLUMNS);

  return (
    <ExampleContainer fullWidth>
      <Table<SeatAssignment>
        columns={columns}
        data={SEAT_DATA}
        getRowId={(row) => row.id}
        sorting
        columnResizing
        columnMenu
        gridLines={{ vertical: true }}
        onDeleteColumn={(colId) => {
          setColumns((prev) => prev.filter((c) => c.field !== colId));
        }}
        onAddColumn={(colId, position) => {
          setColumns((prev) => {
            const idx = prev.findIndex((c) => c.field === colId);
            const newCol: TableColumnDef<SeatAssignment> = {
              field: `new_${Date.now()}` as keyof SeatAssignment & string,
              headerName: 'New Column',
              flex: 1,
            };
            const next = [...prev];
            next.splice(position === 'left' ? idx : idx + 1, 0, newCol);
            return next;
          });
        }}
      />
    </ExampleContainer>
  );
}

// ── Recipe 3: Complex Table — Design variables editor + CMS ──

interface DesignVariable {
  id: string;
  name: string;
  group: string;
  light: string;
  dark: string;
  lightEc: string;
  darkEc: string;
}

const VARIABLES_DATA: DesignVariable[] = [
  { id: '1', name: 'bg', group: 'Color', light: '#FFFFFF', dark: '#1E1E1E', lightEc: '#FFFFFF', darkEc: '#000000' },
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
  if (group === 'Color') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            borderRadius: 3,
            backgroundColor: params.value,
            border: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        />
        {params.value}
      </span>
    );
  }
  return params.value;
}

const VARIABLE_COLUMNS: TableColumnDef<DesignVariable>[] = [
  { field: 'name', headerName: 'Name', flex: 1, editable: true },
  { field: 'light', headerName: 'Light', flex: 1, editable: true, cellRenderer: ColorSwatchRenderer },
  { field: 'dark', headerName: 'Dark', flex: 1, editable: true, cellRenderer: ColorSwatchRenderer },
  { field: 'lightEc', headerName: 'Light EC', flex: 1, editable: true, cellRenderer: ColorSwatchRenderer },
  { field: 'darkEc', headerName: 'Dark EC', flex: 1, editable: true, cellRenderer: ColorSwatchRenderer },
];

function ComplexTableVariablesDemo() {
  const [data, setData] = useState(VARIABLES_DATA);

  return (
    <ExampleContainer fullWidth>
      <Table<DesignVariable>
        columns={VARIABLE_COLUMNS}
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
        density="comfortable"
        gridLines={{ vertical: true }}
        onCellValueChanged={(event) => {
          setData((prev) =>
            prev.map((row) => (row.id === event.data.id ? { ...event.data } : row)),
          );
        }}
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

  return (
    <ExampleContainer fullWidth>
      <Table<ContentEntry>
        columns={CMS_COLUMNS}
        data={data}
        getRowId={(row) => row.id}
        cellEditing
        checkboxSelection
        sorting
        columnResizing
        columnMenu
        gridLines={{ vertical: true }}
        onCellValueChanged={(event) => {
          setData((prev) =>
            prev.map((row) => (row.id === event.data.id ? { ...event.data } : row)),
          );
        }}
      />
    </ExampleContainer>
  );
}

function ComplexTableRowClickDemo() {
  return (
    <ExampleContainer fullWidth>
      <Table<DesignVariable>
        columns={VARIABLE_COLUMNS}
        data={VARIABLES_DATA}
        getRowId={(row) => row.id}
        selectionMode="singleRow"
        sorting
        columnResizing
        density="compact"
        gridLines={{ vertical: true }}
      />
    </ExampleContainer>
  );
}

function LoadingStatesDemo() {
  return (
    <div className="flex items-center gap-6">
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
    </div>
  );
}

function LinkButtonDemo() {
  return (
    <div className="flex flex-col gap-2">
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
    </div>
  );
}

function GhostContainedDemo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
      <IconButton variant="ghost" aria-label="Collapse">
        <Icon24Collapse />
      </IconButton>
      <IconButton variant="ghost" aria-label="Settings">
        <Icon24Adjust />
      </IconButton>
      </div>
      <Button variant="primary">Share</Button>
    </div>
  );
}

function FooterActionsDemo() {
  return (
    <ExampleContainer className="flex flex-col gap-3">
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
    <div className="flex items-center justify-between w-full">
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
    </div>
  );
}

function TypographyDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Heading size="lg">Heading large</Heading>
        <Heading size="md">Heading medium</Heading>
        <Heading size="sm">Heading small</Heading>
      </div>
      <div className="flex flex-col gap-1">
        <Text size="lg">Text large — body copy for prominent content</Text>
        <Text size="md">Text medium — default body copy</Text>
        <Text size="sm">Text small — metadata or lebgal text - avoid using for main content</Text>
      </div>
      <div className="flex flex-col gap-1">
        <Text size="md" strong>Strong text for emphasis or section labels</Text>
        <Text size="md" color="secondary">Secondary-colored text for less important content</Text>
        <Text size="md" color="brand">Brand-colored text</Text>
        <Text size="md" color="danger">Danger-colored text for errors</Text>
        <Text size="md" color="success">Success-colored text</Text>
      </div>
      <div className="flex flex-col gap-1">
        <Text mono>Monospace text — code snippets and values</Text>
        <Text mono color="secondary">fontSize: 14px</Text>
        <Text mono color="brand">--color-bg-brand</Text>
      </div>
      <div className="w-[200px]">
        <Text truncate>This is a very long line of text that will be truncated with an ellipsis</Text>
      </div>
    </div>
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
            <Input aria-label="Hex color" value={hex} onChange={setHex} />
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
// Recipe Registry
// ---------------------------------------------------------------------------

const FPL_DOCS = 'https://fpl.figma.design';

export const RECIPE_REGISTRY: Recipe[] = [
  // ── Forms ────────────────────────────────────────────────────────────────
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

  {
    id: 'account-info-form',
    name: 'Account information form',
    category: 'forms',
    description: 'A user account form using the FPL Form system at large size with zod validation, a Textarea for bio, a Select for role, a RadioInput group for visibility, and a Checkbox for terms.',
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
        label: 'Account information',
        render: () => <AccountInfoFormDemo />,
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

  // ── Navigation ──────────────────────────────────────────────────────────
  {
    id: 'search-filtered-list',
    name: 'Search + filtered list',
    category: 'navigation',
    description: 'SearchInput filtering a list of items. Common pattern for sidebar panels with search.',
    components: [
      { name: 'SearchInput', source: 'fpl', docsUrl: FPL_DOCS },
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

  // ── Overlays ────────────────────────────────────────────────────────────
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

  // ── Data Display ────────────────────────────────────────────────────────
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
    id: 'avatar-name-row',
    name: 'Avatar + name rows',
    category: 'data-display',
    description: 'User rows with Avatar and name text. Uses shared Avatar component with multiplayer color support.',
    components: [
      { name: 'Avatar', source: 'shared' },
    ],
    examples: [
      {
        label: 'User list',
        render: () => <AvatarNameRowDemo />,
        code: `import { Avatar } from '@prototype/shared';

const users = [
  { name: 'Alice Chen', initial: 'A', color: 'blue' },
  { name: 'Bob Kim', initial: 'B', color: 'green' },
];

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

  // ── Layout ──────────────────────────────────────────────────────────────
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
    id: 'typography',
    name: 'Typography',
    category: 'layout',
    description: 'Text and Heading components for consistent typography. Supports size variants, semantic colors, strong emphasis, monospace, and truncation.',
    components: [
      { name: 'Text', source: 'shared' },
      { name: 'Heading', source: 'shared' },
    ],
    examples: [
      {
        label: 'Sizes, colors & truncation',
        render: () => <TypographyDemo />,
        code: `import { Text, Heading } from '@prototype/shared';

{/* Headings */}
<Heading size="lg">Heading large</Heading>
<Heading size="md">Heading medium</Heading>
<Heading size="sm">Heading small</Heading>

{/* Body text sizes */}
<Text size="lg">Text large</Text>
<Text size="md">Text medium (default)</Text>
<Text size="sm">Text small</Text>

{/* Color variants */}
<Text color="secondary">Secondary text</Text>
<Text color="tertiary">Tertiary text</Text>
<Text color="brand">Brand text</Text>
<Text color="danger">Danger text</Text>
<Text color="success">Success text</Text>

{/* Emphasis */}
<Text strong>Strong text</Text>

{/* Monospace */}
<Text mono>Monospace text — code snippets and values</Text>
<Text mono color="secondary">fontSize: 14px</Text>
<Text mono color="brand">--color-bg-brand</Text>

{/* Truncation */}
<Text truncate>Long text that will be truncated...</Text>
<Text truncate={2}>Multi-line clamp to 2 lines...</Text>

{/* Custom element */}
<Text as="p" size="sm">Paragraph text</Text>
<Heading as="h4" size="sm">Custom heading level</Heading>`,
      },
      {
        label: 'Section headings with descriptions',
        render: () => <TypographyWithHeadingDemo />,
        code: `import { Text, Heading } from '@prototype/shared';

<div className="flex flex-col gap-3">
  <div>
    <Heading size="sm">Project settings</Heading>
    <Text size="sm" color="secondary">
      Configure your project preferences and team access.
    </Text>
  </div>
  <div className="border-t border-border pt-3">
    <Heading size="sm" color="danger">Danger zone</Heading>
    <Text size="sm" color="danger-secondary">
      Irreversible actions that affect your entire project.
    </Text>
  </div>
</div>`,
      },
    ],
    tags: ['text', 'heading', 'typography', 'font', 'label', 'title', 'paragraph', 'mono', 'code'],
  },

  // ── Tables ──────────────────────────────────────────────────────────────
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

  {
    id: 'action-table',
    name: 'Action table',
    category: 'data-display',
    description: 'Table with bulk actions via checkbox selection and dynamic column management. Useful for admin panels and settings pages.',
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
      {
        label: 'Column add/delete',
        render: () => <ActionTableColumnDemo />,
        code: `const [columns, setColumns] = useState(defaultColumns);

<Table
  columns={columns}
  data={data}
  sorting
  columnResizing
  columnMenu
  gridLines={{ vertical: true }}
  onDeleteColumn={(colId) => {
    setColumns(prev => prev.filter(c => c.field !== colId));
  }}
  onAddColumn={(colId, position) => {
    setColumns(prev => {
      const idx = prev.findIndex(c => c.field === colId);
      const newCol = { field: \`new_\${Date.now()}\`, headerName: 'New Column', flex: 1 };
      const next = [...prev];
      next.splice(position === 'left' ? idx : idx + 1, 0, newCol);
      return next;
    });
  }}
/>`,
      },
    ],
    tags: ['table', 'checkbox', 'selection', 'bulk-actions', 'column-menu', 'add-column', 'delete-column', 'admin'],
  },

  {
    id: 'complex-table',
    name: 'Complex table',
    category: 'data-display',
    description: 'Advanced table combining sections, cell editing, drag reorder, and custom renderers. Shows how to compose multiple table features together.',
    components: [
      { name: 'Table', source: 'shared' },
      { name: 'Badge', source: 'fpl', docsUrl: FPL_DOCS },
    ],
    examples: [
      {
        label: 'Variables editor with sections',
        render: () => <ComplexTableVariablesDemo />,
        code: `const [data, setData] = useState(variablesData);

// Columns are modes: Light, Dark, Light EC, Dark EC
const columns = [
  { field: 'name', headerName: 'Name', flex: 1, editable: true },
  { field: 'light', headerName: 'Light', flex: 1, editable: true, cellRenderer: ColorSwatchRenderer },
  { field: 'dark', headerName: 'Dark', flex: 1, editable: true, cellRenderer: ColorSwatchRenderer },
  { field: 'lightEc', headerName: 'Light EC', flex: 1, editable: true, cellRenderer: ColorSwatchRenderer },
  { field: 'darkEc', headerName: 'Dark EC', flex: 1, editable: true, cellRenderer: ColorSwatchRenderer },
];

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
  density="comfortable"
  gridLines={{ vertical: true }}
  onCellValueChanged={(event) => {
    setData(prev => prev.map(row =>
      row.id === event.data.id ? { ...event.data } : row
    ));
  }}
/>`,
      },
      {
        label: 'CMS content table',
        render: () => <ComplexTableCmsDemo />,
        code: `<Table
  columns={cmsColumns}
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
/>`,
      },
      {
        label: 'Row-click selection',
        render: () => <ComplexTableRowClickDemo />,
        code: `<Table
  columns={variableColumns}
  data={variablesData}
  selectionMode="singleRow"
  sorting
  columnResizing
  density="compact"
  gridLines={{ vertical: true }}
/>`,
      },
    ],
    tags: ['table', 'sections', 'editable', 'drag', 'reorder', 'inline-edit', 'grouping', 'cms', 'variables', 'selection'],
  },

  // ── Feedback ────────────────────────────────────────────────────────────
  {
    id: 'loading-states',
    name: 'Loading states',
    category: 'feedback',
    description: 'LoadingSpinner in different contexts: inside a Button, inside a container, and standalone.',
    components: [
      { name: 'LoadingSpinner', source: 'fpl', docsUrl: FPL_DOCS },
      { name: 'Button', source: 'fpl', docsUrl: FPL_DOCS },
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
    ],
    tags: ['loading', 'spinner', 'async', 'progress'],
  },

  // ── Property Panels ─────────────────────────────────────────────────────
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
];
