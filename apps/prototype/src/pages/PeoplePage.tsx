import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import {
  Badge,
  Button,
  ButtonPrimitive,
  HiddenLabel,
  IconButton,
  SearchInput,
  Select,
  Tabs,
  ToggleTip,
} from '@figma/fpl-components';
import {
  Icon16ChevronDown,
  Icon24BorderSquareLarge,
  Icon24Calendar,
  Icon24ChevronRightLarge,
  Icon24Close,
  Icon24Export,
  Icon24Filter,
  Icon24Insert,
  Icon24Person,
  Icon24Plus,
  Icon24SeatCollab,
  Icon24SeatDev,
  Icon24SeatFull,
  Icon24SeatView,
  Icon24Team,
  Icon24UserGroups,
} from '@figma/fpl-icons';
import { Avatar, Table, Text, type TableColumnDef, type MultiplayerColor } from '@prototype/shared';
import { showToast } from '../components/toast';
import { useResearch } from '../research/researchCopy';
import {
  buildResolvedBillingCopy,
  resolveBillingScenario,
  seatPriceOnlyForVariant,
  seatTooltipsForVariant,
} from '../research/billingResearch';

/* -------------------------------------------------------------------------- */
/*  Layout: match ContentPage inset column (mx-32px + w-[calc(100%-64px)])      */
/* -------------------------------------------------------------------------- */

type PeopleTab = 'people' | 'groups';

const PEOPLE_TAB_MAP: Record<PeopleTab, true> = { people: true, groups: true };

type FlyoutMemberTab = 'manage' | 'activity';

const FLYOUT_MEMBER_TAB_MAP: Record<FlyoutMemberTab, true> = {
  manage: true,
  activity: true,
};

export type SeatKind = 'full' | 'collab' | 'dev' | 'view';

/** Tinted surface + `--fpl-icon-color` per seat kind (member flyout, dashboard request avatars, etc.). */
export const SEAT_KIND_VISUAL: Record<SeatKind, { surfaceClass: string; iconColor: string }> = {
  full: { surfaceClass: 'bg-bg-selected', iconColor: 'var(--color-icon-brand)' },
  collab: { surfaceClass: 'bg-bg-figjam-tertiary', iconColor: 'var(--color-icon-component)' },
  dev: { surfaceClass: 'bg-bg-handoff-tertiary', iconColor: 'var(--color-icon-success)' },
  view: { surfaceClass: 'bg-bg-secondary', iconColor: 'var(--color-icon-secondary)' },
};

const AI_CREDIT_LIMIT_BY_SEAT: Record<SeatKind, number> = {
  collab: 500,
  dev: 500,
  full: 4250,
  view: 500,
};

export type AvatarSpec =
  | { kind: 'photo'; src: string }
  | { kind: 'initial'; initial: string; color?: MultiplayerColor };

export interface PersonRow {
  id: string;
  name: string;
  email: string;
  guest?: boolean;
  avatar: AvatarSpec;
  seatType: SeatKind;
  lastActive: string;
}

/** Dashboard “seat request” flyout: user asked for a specific seat (see Figma User Details / approval). */
export type SeatRequestApprovalContext = {
  requestedSeat: SeatKind;
};

/** One table row per person: email is the stable org identity; first row wins. */
function dedupePersonRowsByEmail(rows: PersonRow[]): PersonRow[] {
  const byEmail = new Map<string, PersonRow>();
  for (const row of rows) {
    const key = row.email.trim().toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, row);
  }
  return [...byEmail.values()];
}

const SEAT_META: Record<
  SeatKind,
  { Icon: typeof Icon24SeatFull; label: string; iconWrapClass: string; iconColor: string }
> = {
  full: {
    Icon: Icon24SeatFull,
    label: 'Full',
    iconWrapClass: clsx(
      'relative shrink-0 size-24px rounded-md flex items-center justify-center overflow-hidden',
      SEAT_KIND_VISUAL.full.surfaceClass,
    ),
    iconColor: SEAT_KIND_VISUAL.full.iconColor,
  },
  collab: {
    Icon: Icon24SeatCollab,
    label: 'Collab',
    iconWrapClass: clsx(
      'relative shrink-0 size-24px rounded-md flex items-center justify-center overflow-hidden',
      SEAT_KIND_VISUAL.collab.surfaceClass,
    ),
    iconColor: SEAT_KIND_VISUAL.collab.iconColor,
  },
  dev: {
    Icon: Icon24SeatDev,
    label: 'Dev',
    iconWrapClass: clsx(
      'relative shrink-0 size-24px rounded-md flex items-center justify-center overflow-hidden',
      SEAT_KIND_VISUAL.dev.surfaceClass,
    ),
    iconColor: SEAT_KIND_VISUAL.dev.iconColor,
  },
  view: {
    Icon: Icon24SeatView,
    label: 'View',
    iconWrapClass: clsx(
      'relative shrink-0 size-24px rounded-md flex items-center justify-center overflow-hidden',
      SEAT_KIND_VISUAL.view.surfaceClass,
    ),
    iconColor: SEAT_KIND_VISUAL.view.iconColor,
  },
};

export function seatTierLabel(kind: SeatKind): string {
  return SEAT_META[kind].label;
}

const SEAT_PICKER_ORDER: SeatKind[] = ['full', 'dev', 'collab', 'view'];

const FLYOUT_PRORATED_COST_TOOLTIP =
  'Prorated charges reflect the time remaining in your billing period before your next invoice.';

const FLYOUT_SEAT_CREDITS_USED_TOOLTIP =
  "Credits this member has used toward their seat's AI credit limit for the current billing period.";

/**
 * Dotted / underlined flyout terms using FPL ToggleTip (hover, `placement: 'top'`).
 * `ButtonPrimitive` + `getTriggerProps()` keeps the text look; `disableTransform` helps inside the transformed flyout panel.
 */
function FlyoutDottedTermTooltip({
  children,
  tooltip,
  className,
  fillRow = false,
  onTriggerClick,
  /** When true, trigger is not `disabled` (so ToggleTip hover still works); omit `onTriggerClick` to block selection. */
  triggerInert = false,
}: {
  children: React.ReactNode;
  tooltip: React.ReactNode;
  className?: string;
  fillRow?: boolean;
  onTriggerClick?: React.MouseEventHandler<HTMLButtonElement>;
  triggerInert?: boolean;
}) {
  const manager = ToggleTip.useUncontrolledToggleTip({
    placement: 'top',
    padding: 12,
    disableTransform: true,
  });

  const triggerProps = manager.getTriggerProps();

  return (
    <>
      <ButtonPrimitive
        type="button"
        {...triggerProps}
        aria-disabled={triggerInert ? true : undefined}
        onClick={(e) => {
          triggerProps.onClick?.(e);
          if (!triggerInert) onTriggerClick?.(e);
        }}
        className={clsx(
          'pointer-events-auto max-w-full border-0 bg-transparent p-0 font-[inherit] leading-[inherit]',
          triggerInert ? 'cursor-not-allowed' : 'cursor-inherit',
          fillRow
            ? 'block min-w-0 w-full truncate text-left'
            : 'inline-block w-fit max-w-full shrink-0',
          className,
        )}
      >
        {children}
      </ButtonPrimitive>
      <ToggleTip.Container manager={manager}>
        <ToggleTip.Content maxWidth="min(320px, calc(100vw - 48px))">{tooltip}</ToggleTip.Content>
      </ToggleTip.Container>
    </>
  );
}

function FlyoutSeatUnderlinedWithTooltip({
  kind,
  seatTooltip,
  triggerClassName,
  muted,
  fillRow = false,
  onTriggerClick,
  /** Picker: current seat row — keep tooltip hover, block choosing this seat. */
  selectionDisabled = false,
}: {
  kind: SeatKind;
  seatTooltip: string;
  /** Optional; defaults to picker row label styles */
  triggerClassName?: string;
  muted?: boolean;
  fillRow?: boolean;
  onTriggerClick?: React.MouseEventHandler<HTMLButtonElement>;
  selectionDisabled?: boolean;
}) {
  const { label } = SEAT_META[kind];
  return (
    <FlyoutDottedTermTooltip
      fillRow={fillRow}
      triggerInert={selectionDisabled}
      onTriggerClick={onTriggerClick}
      tooltip={seatTooltip}
      className={clsx(
        triggerClassName,
        !triggerClassName &&
          'rounded-sm text-bodyLg font-bold underline decoration-dotted underline-offset-2',
        !triggerClassName && !selectionDisabled && 'hover:bg-bg-hover',
        selectionDisabled ? 'text-text-disabled' : muted ? 'text-text-secondary' : !triggerClassName && 'text-text',
      )}
    >
      {label}
    </FlyoutDottedTermTooltip>
  );
}

/** Relative “last updated” after a seat change (matches flyout design, e.g. “1 min ago”). */
function formatFlyoutSeatLastUpdatedRelative(changedAtMs: number, nowMs: number = Date.now()): string {
  const sec = Math.max(0, Math.floor((nowMs - changedAtMs) / 1000));
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? '1 min ago' : `${min} mins ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? '1 hour ago' : `${hr} hours ago`;
  const day = Math.floor(hr / 24);
  return day === 1 ? '1 day ago' : `${day} days ago`;
}

/** Seat kinds shown in the People tab toolbar (order matches layout). Counts are derived from live `peopleRows`. */
const PEOPLE_TOOLBAR_SEAT_KINDS: SeatKind[] = ['view', 'collab', 'dev', 'full'];

const WORKSPACE_OPTIONS = [
  { value: 'ws-default', label: 'Workspace' },
  { value: 'ws-design', label: 'Design systems' },
  { value: 'ws-marketing', label: 'Marketing' },
];

const BILLING_OPTIONS = [
  { value: 'bg-default', label: 'Billing group' },
  { value: 'bg-eng', label: 'Engineering' },
  { value: 'bg-growth', label: 'Growth' },
];

const TOOLBAR_BILLING_OPTIONS = [
  { value: 'all', label: 'Billing group' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'contractors', label: 'Contractors' },
];

const AVATAR_1 = 'https://i.pravatar.cc/150?img=47';
const AVATAR_2 = 'https://i.pravatar.cc/150?img=11';
const AVATAR_3 = 'https://i.pravatar.cc/150?img=32';
const AVATAR_4 = 'https://i.pravatar.cc/150?img=20';
const AVATAR_5 = 'https://i.pravatar.cc/150?img=52';

const PEOPLE_DATA: PersonRow[] = [
  {
    id: '1',
    name: 'Alex Rivera',
    email: 'alex.rivera@acme.com',
    avatar: { kind: 'photo', src: AVATAR_1 },
    seatType: 'full',
    lastActive: '1 minute ago',
  },
  {
    id: '2',
    name: 'Brandon Kent',
    email: 'bkent@huge.com',
    guest: true,
    avatar: { kind: 'photo', src: AVATAR_2 },
    seatType: 'view',
    lastActive: '12 minutes ago',
  },
  {
    id: '3',
    name: 'Casey Nguyen',
    email: 'casey@acme.com',
    avatar: { kind: 'photo', src: AVATAR_3 },
    seatType: 'collab',
    lastActive: '2 hours ago',
  },
  {
    id: '4',
    name: 'Dana Singh',
    email: 'dana.singh@acme.com',
    avatar: { kind: 'photo', src: AVATAR_4 },
    seatType: 'dev',
    lastActive: 'Yesterday',
  },
  {
    id: '5',
    name: 'Ellis Park',
    email: 'ellis@acme.com',
    avatar: { kind: 'initial', initial: 'E', color: 'purple' },
    seatType: 'collab',
    lastActive: '3 days ago',
  },
  {
    id: '6',
    name: 'Jordan Lee',
    email: 'jordan.lee@acme.com',
    avatar: { kind: 'initial', initial: 'J', color: 'blue' },
    seatType: 'full',
    lastActive: '1 week ago',
  },
  {
    id: '7',
    name: 'Morgan Blake',
    email: 'morgan@acme.com',
    avatar: { kind: 'initial', initial: 'M', color: 'green' },
    seatType: 'collab',
    lastActive: '2 weeks ago',
  },
  {
    id: '8',
    name: 'Riley Chen',
    email: 'riley.chen@acme.com',
    avatar: { kind: 'initial', initial: 'R', color: 'yellow' },
    seatType: 'view',
    lastActive: '1 month ago',
  },
  { id: '9',  name: 'Sam Okafor',       email: 'sam.okafor@acme.com',       avatar: { kind: 'initial', initial: 'S', color: 'red' }, seatType: 'full',   lastActive: '2 minutes ago' },
  { id: '10', name: 'Taylor Reyes',     email: 'taylor.r@acme.com',         avatar: { kind: 'initial', initial: 'T', color: 'pink' },   seatType: 'dev',    lastActive: '15 minutes ago' },
  { id: '11', name: 'Avery Kim',        email: 'avery.kim@acme.com',        avatar: { kind: 'photo',   src: AVATAR_5 },                 seatType: 'collab', lastActive: '1 hour ago' },
  { id: '12', name: 'Blake Torres',     email: 'blake.torres@acme.com',     avatar: { kind: 'initial', initial: 'B', color: 'green' },   seatType: 'view',   lastActive: '3 hours ago' },
  { id: '13', name: 'Cameron Patel',    email: 'cpatel@acme.com',           avatar: { kind: 'initial', initial: 'C', color: 'blue' },   seatType: 'full',   lastActive: 'Yesterday' },
  { id: '14', name: 'Devon Walsh',      email: 'devon.walsh@acme.com',      avatar: { kind: 'photo',   src: AVATAR_2 },                 seatType: 'dev',    lastActive: 'Yesterday' },
  { id: '15', name: 'Emery Foster',     email: 'emery@acme.com',            avatar: { kind: 'initial', initial: 'E', color: 'green' },  seatType: 'collab', lastActive: '2 days ago' },
  { id: '16', name: 'Finley Ruiz',      email: 'finley.ruiz@acme.com',      avatar: { kind: 'initial', initial: 'F', color: 'red' },    seatType: 'view',   lastActive: '3 days ago' },
  { id: '17', name: 'Grey Anderson',    email: 'grey.anderson@acme.com',    avatar: { kind: 'photo',   src: AVATAR_3 },                 seatType: 'full',   lastActive: '4 days ago' },
  { id: '18', name: 'Harper Gonzalez',  email: 'harper.g@acme.com',         avatar: { kind: 'initial', initial: 'H', color: 'yellow' }, seatType: 'collab', lastActive: '5 days ago' },
  { id: '19', name: 'Indigo Perez',     email: 'indigo.perez@acme.com',     avatar: { kind: 'initial', initial: 'I', color: 'purple' }, seatType: 'dev',    lastActive: '1 week ago' },
  { id: '20', name: 'Jamie Scott',      email: 'jamie.scott@acme.com',      avatar: { kind: 'photo',   src: AVATAR_4 },                 seatType: 'view',   lastActive: '1 week ago' },
  { id: '21', name: 'Kendall Morris',   email: 'kmorris@acme.com',          avatar: { kind: 'initial', initial: 'K', color: 'red' }, seatType: 'full',   lastActive: '1 week ago' },
  { id: '22', name: 'Logan Murphy',     email: 'logan.m@acme.com',          avatar: { kind: 'initial', initial: 'L', color: 'green' },   seatType: 'collab', lastActive: '2 weeks ago' },
  { id: '23', name: 'Milan Cooper',     email: 'milan.cooper@acme.com',     avatar: { kind: 'photo',   src: AVATAR_1 },                 seatType: 'dev',    lastActive: '2 weeks ago' },
  { id: '24', name: 'Nico Richardson',  email: 'nico.r@acme.com',           avatar: { kind: 'initial', initial: 'N', color: 'blue' },   seatType: 'view',   lastActive: '2 weeks ago' },
  { id: '25', name: 'Oakley Cox',       email: 'oakley.cox@acme.com',       avatar: { kind: 'initial', initial: 'O', color: 'pink' },   seatType: 'full',   lastActive: '3 weeks ago' },
  { id: '26', name: 'Parker Howard',    email: 'parker.h@acme.com',         avatar: { kind: 'photo',   src: AVATAR_2 },                 seatType: 'collab', lastActive: '3 weeks ago' },
  { id: '27', name: 'Quinn Ward',       email: 'quinn.ward@acme.com',       avatar: { kind: 'initial', initial: 'Q', color: 'green' },  seatType: 'dev',    lastActive: '3 weeks ago' },
  { id: '28', name: 'Reese James',      email: 'reese.james@acme.com',      avatar: { kind: 'initial', initial: 'R', color: 'red' },    seatType: 'view',   lastActive: '1 month ago' },
  { id: '29', name: 'Sage Brooks',      email: 'sage.brooks@acme.com',      avatar: { kind: 'photo',   src: AVATAR_3 },                 seatType: 'full',   lastActive: '1 month ago' },
  { id: '30', name: 'Tatum Kelly',      email: 'tatum.k@acme.com',          avatar: { kind: 'initial', initial: 'T', color: 'purple' }, seatType: 'collab', lastActive: '1 month ago' },
];

/* -------------------------------------------------------------------------- */
/*  User groups data                                                          */
/* -------------------------------------------------------------------------- */

const CREATOR_AVATAR = 'https://i.pravatar.cc/150?img=47';

interface UserGroupRow {
  id: string;
  name: string;
  scim?: boolean;
  people: number;
  iconColor: string;
  lastUpdated: string;
}

const USER_GROUP_ROWS: UserGroupRow[] = [
  { id: 'g1',  name: 'Affiliates',                 scim: true, people: 0,  iconColor: '#4B7BF5', lastUpdated: '1 minute ago' },
  { id: 'g2',  name: 'AI features',                            people: 55, iconColor: '#00796B', lastUpdated: '1 minute ago' },
  { id: 'g3',  name: 'AMER Mid Market',             scim: true, people: 17, iconColor: '#E91E63', lastUpdated: '1 minute ago' },
  { id: 'g4',  name: 'AMER Commercial Sales Leads', scim: true, people: 0,  iconColor: '#F06292', lastUpdated: '1 minute ago' },
  { id: 'g5',  name: 'Campus Leaders',                         people: 30, iconColor: '#E53935', lastUpdated: '1 minute ago' },
  { id: 'g6',  name: 'Core Data Engineering',       scim: true, people: 7,  iconColor: '#1565C0', lastUpdated: '1 minute ago' },
  { id: 'g7',  name: 'Data Infra Team',             scim: true, people: 16, iconColor: '#388E3C', lastUpdated: '1 minute ago' },
  { id: 'g8',  name: 'Deal Desk',                              people: 4,  iconColor: '#5C6BC0', lastUpdated: '1 minute ago' },
  { id: 'g9',  name: 'Design',                      scim: true, people: 74, iconColor: '#1976D2', lastUpdated: '1 minute ago' },
  { id: 'g10', name: 'Engineering',                 scim: true, people: 48, iconColor: '#00838F', lastUpdated: '2 minutes ago' },
  { id: 'g11', name: 'Executive Leadership',                   people: 8,  iconColor: '#7B1FA2', lastUpdated: '5 minutes ago' },
  { id: 'g12', name: 'Finance',                                people: 22, iconColor: '#F57F17', lastUpdated: '10 minutes ago' },
];

/* -------------------------------------------------------------------------- */
/*  User groups table cells                                                   */
/* -------------------------------------------------------------------------- */

function UgNameCell({ data }: { data?: UserGroupRow }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-8px min-w-0 w-full">
      <div
        className="shrink-0 size-24px rounded-md flex items-center justify-center"
        style={{ backgroundColor: data.iconColor, '--fpl-icon-color': 'white' } as React.CSSProperties}
      >
        <Icon24UserGroups />
      </div>
      <span className="text-bodyMd text-text truncate">{data.name}</span>
      {data.scim && (
        <Badge variant="defaultOutline">SCIM</Badge>
      )}
    </div>
  );
}

function UgPeopleCell({ data }: { data?: UserGroupRow }) {
  if (!data) return null;
  return <span className="text-bodyMd text-text">{data.people} people</span>;
}

function UgCreatorCell() {
  return (
    <div className="flex items-center gap-8px min-w-0 w-full">
      <Avatar size="md" src={CREATOR_AVATAR} alt="Mia" />
      <div className="flex flex-col min-w-0">
        <span className="text-bodyMd text-text truncate">
          Mia <span className="text-text-secondary">(you)</span>
        </span>
        <span className="text-bodyMd text-text-secondary truncate">mia@twigma.com</span>
      </div>
    </div>
  );
}

function UgLastUpdatedCell({ data }: { data?: UserGroupRow }) {
  if (!data) return null;
  return <span className="text-bodyMd text-text-secondary">{data.lastUpdated}</span>;
}

function UgChevronCell({ data }: { data?: UserGroupRow }) {
  if (!data) return null;
  return (
    <IconButton variant="ghost" aria-label={`Open ${data.name}`}>
      <Icon24ChevronRightLarge />
    </IconButton>
  );
}

const USER_GROUP_COLUMNS: TableColumnDef<UserGroupRow>[] = [
  {
    field: 'name',
    headerName: 'Name ↓',
    flex: 1,
    minWidth: 200,
    sortable: false,
    cellRenderer: UgNameCell,
  },
  {
    field: 'people',
    headerName: 'People',
    width: 160,
    minWidth: 120,
    sortable: false,
    cellRenderer: UgPeopleCell,
  },
  {
    colId: 'creator',
    headerName: 'Creator',
    width: 240,
    minWidth: 180,
    sortable: false,
    cellRenderer: UgCreatorCell,
  },
  {
    field: 'lastUpdated',
    headerName: 'Last updated',
    flex: 1,
    minWidth: 140,
    sortable: false,
    cellRenderer: UgLastUpdatedCell,
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
    cellRenderer: UgChevronCell,
  },
];

function RowAvatar({ spec, name }: { spec: AvatarSpec; name: string }) {
  if (spec.kind === 'photo') {
    return <Avatar size="md" src={spec.src} alt={name} />;
  }
  return (
    <Avatar size="md" initial={spec.initial} color={spec.color ?? 'grey'} alt={name} />
  );
}

/* -------------------------------------------------------------------------- */
/*  Table cells                                                               */
/* -------------------------------------------------------------------------- */

function PersonNameCell({ data }: { data?: PersonRow }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-8px min-w-0 w-full">
      <RowAvatar spec={data.avatar} name={data.name} />
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-8px min-w-0">
          <span className="text-bodyMd font-bold text-text truncate">{data.name}</span>
          {data.guest && (
            <Badge variant="defaultOutline" size="md">Guest</Badge>
          )}
        </div>
        <span className="text-bodyMd text-text-secondary truncate">{data.email}</span>
      </div>
    </div>
  );
}

function PersonSeatCell({ data }: { data?: PersonRow }) {
  if (!data) return null;
  const { Icon, label, iconWrapClass, iconColor } = SEAT_META[data.seatType];
  return (
    <div className="flex min-w-0 w-full items-center gap-8px">
      <div className={iconWrapClass} style={{ '--fpl-icon-color': iconColor } as React.CSSProperties}>
        <Icon />
      </div>
      <span className="min-w-0 truncate text-bodyMd text-text">{label}</span>
    </div>
  );
}

function PersonWorkspaceCell() {
  const [ws, setWs] = useState<string | undefined>('ws-default');
  return (
    <div
      className="-ml-8px w-[calc(100%+8px)] [&_[data-fpl-component]]:bg-transparent [&_[data-fpl-component]]:border-transparent [&_[data-fpl-component]:hover]:border-transparent [&_[data-fpl-component]_div]:flex [&_[data-fpl-component]_div]:w-auto [&_[data-fpl-component]_div]:gap-4px [&_[data-fpl-component]]:text-bodyMd"
    >
      <Select.Root value={ws} onChange={setWs}>
        <Select.Trigger width="fill" size="md" label={<HiddenLabel>Workspace assignment</HiddenLabel>} />
        <Select.Container>
          {WORKSPACE_OPTIONS.map((o) => (
            <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
          ))}
        </Select.Container>
      </Select.Root>
    </div>
  );
}

function PersonBillingCell() {
  const [bill, setBill] = useState<string | undefined>('bg-default');
  return (
    <div
      className="-ml-8px w-[calc(100%+8px)] [&_[data-fpl-component]]:bg-transparent [&_[data-fpl-component]]:border-transparent [&_[data-fpl-component]_div]:flex [&_[data-fpl-component]_div]:w-auto [&_[data-fpl-component]_div]:gap-4px [&_[data-fpl-component]]:text-bodyMd"
    >
      <Select.Root value={bill} onChange={setBill}>
        <Select.Trigger width="fill" size="md" label={<HiddenLabel>Billing group assignment</HiddenLabel>} />
        <Select.Container>
          {BILLING_OPTIONS.map((o) => (
            <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
          ))}
        </Select.Container>
      </Select.Root>
    </div>
  );
}

function PersonLastActiveCell({ data }: { data?: PersonRow }) {
  if (!data) return null;
  return (
    <span className="text-bodyMd text-text-secondary truncate">{data.lastActive}</span>
  );
}

function PersonChevronCell({ data }: { data?: PersonRow }) {
  if (!data) return null;
  return (
    <IconButton variant="ghost" aria-label={`Open ${data.name}`}>
      <Icon24ChevronRightLarge />
    </IconButton>
  );
}

const FLYOUT_DOT_LINK_CLASS =
  'cursor-pointer border-0 bg-transparent p-0 text-left font-bold text-bodyLg text-text underline decoration-dotted underline-offset-2 hover:bg-bg-hover rounded-sm';

function flyoutAiCreditsUsed(personId: string, limit: number): number {
  if (limit <= 0) return 0;
  let h = 0;
  for (let i = 0; i < personId.length; i += 1) {
    h = (h * 31 + personId.charCodeAt(i)) >>> 0;
  }
  const ratio = 0.12 + (h % 55) / 100;
  const raw = Math.round(limit * ratio);
  return Math.min(limit, Math.max(0, raw));
}

function flyoutMockDetails(person: PersonRow) {
  const n = parseInt(person.id, 10) || 0;
  const workspaces = ['New York', 'Design systems', 'Marketing', 'Workspace'];
  const billings = ['Vibers', 'Engineering', 'Growth', 'Billing group'];
  const roles = ['Designer', 'Developer', 'Product designer', 'Content designer'];
  return {
    role: roles[n % roles.length],
    workspaceLabel: workspaces[n % workspaces.length],
    billingLabel: billings[n % billings.length],
    joinedLabel: 'March 11, 2025',
    seatLastUpdated: 'Mar 12, 2024',
    aiResetLabel: 'August 5',
  };
}

/** Flyout header: Figma admin “Avatar / Avatar-Large” = 32×32 — use shared `Avatar` `lg` for photo + initial. */
function FlyoutHeaderAvatar({ spec, name }: { spec: AvatarSpec; name: string }) {
  if (spec.kind === 'photo') {
    return <Avatar size="lg" src={spec.src} alt={name} />;
  }
  return <Avatar size="lg" initial={spec.initial} color={spec.color ?? 'grey'} alt={name} />;
}

function FlyoutDetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex w-full items-center justify-between py-4px">
      <div className="flex min-w-0 items-center gap-8px">
        <span
          className="flex size-24px shrink-0 items-center justify-center text-icon"
          style={{ '--fpl-icon-color': 'var(--color-icon)' } as React.CSSProperties}
        >
          {icon}
        </span>
        <span className="truncate text-bodyLg font-normal text-text">{label}</span>
      </div>
      <span className="truncate text-right text-bodyLg font-normal text-text-secondary">{value}</span>
    </div>
  );
}

function flyoutSeatPickerBadge(kind: SeatKind, currentSeat: SeatKind) {
  if (kind !== currentSeat) return null;
  /** Picker only: current row is non-selectable — `inactiveOutline` matches FPL disabled list / option tone. */
  return (
    <Badge variant="inactiveOutline" size="md">
      Current
    </Badge>
  );
}

/** One row in seat-change billing preview; label/value split on last ": ". */
function BillingFlyoutPreviewLine({
  line,
  proratedDetailTooltip,
}: {
  line: string;
  /** Scenario-specific prorated explanation; falls back to generic copy. */
  proratedDetailTooltip?: string;
}) {
  const lastSep = line.lastIndexOf(': ');
  if (lastSep === -1) {
    return (
      <div className="flex w-full items-center justify-between gap-8px">
        <span className="text-bodyLg text-text-secondary">{line}</span>
      </div>
    );
  }
  const labelPart = line.slice(0, lastSep);
  const valuePart = line.slice(lastSep + 2);
  return (
    <div className="flex w-full items-center justify-between gap-8px">
      {labelPart.startsWith('Prorated cost') ? (
        <FlyoutDottedTermTooltip
          className="cursor-default border-0 bg-transparent p-0 text-left text-bodyLg font-normal text-text-secondary underline decoration-dotted underline-offset-2"
          tooltip={proratedDetailTooltip ?? FLYOUT_PRORATED_COST_TOOLTIP}
        >
          {labelPart}
        </FlyoutDottedTermTooltip>
      ) : (
        <span className="text-bodyLg font-normal text-text-secondary">{labelPart}</span>
      )}
      <span
        className={clsx(
          'text-bodyLg font-normal tabular-nums shrink-0',
          valuePart.startsWith('+') ? 'text-text-handoff' : 'text-text-secondary',
        )}
      >
        {valuePart}
      </span>
    </div>
  );
}

function FlyoutSeatPickerRow({
  kind,
  currentSeat,
  pendingSeatKind,
  onPick,
  seatTooltips,
  seatPrices,
  /** Dashboard seat request: highlight the row the user asked for (Figma “Requested”). */
  requestedSeat,
  /** When set with `requestedSeat`, that row shows “N available” instead of price. */
  requestedSeatAvailableCount,
}: {
  kind: SeatKind;
  currentSeat: SeatKind;
  pendingSeatKind: SeatKind | null;
  onPick: (k: SeatKind) => void;
  seatTooltips: Record<SeatKind, string>;
  seatPrices: Record<SeatKind, string>;
  requestedSeat?: SeatKind;
  requestedSeatAvailableCount?: number;
}) {
  const { Icon, iconWrapClass, iconColor } = SEAT_META[kind];
  const isRowDisabled = kind === currentSeat;
  const isRequestedRow = requestedSeat !== undefined && kind === requestedSeat;
  const rightLabel =
    requestedSeat !== undefined &&
    requestedSeatAvailableCount !== undefined &&
    kind === requestedSeat
      ? `${String(requestedSeatAvailableCount)} available`
      : seatPrices[kind];
  /** Single selection: only the row matching pending choice is highlighted (Requested badge still marks the request). */
  const isRowSelected = pendingSeatKind !== null && pendingSeatKind === kind && !isRowDisabled;
  return (
    <div
      role="button"
      tabIndex={isRowDisabled ? -1 : 0}
      aria-disabled={isRowDisabled}
      aria-label={
        isRowDisabled
          ? `${SEAT_META[kind].label} seat, current seat, cannot select`
          : `${SEAT_META[kind].label} seat`
      }
      onClick={() => {
        if (!isRowDisabled) onPick(kind);
      }}
      onKeyDown={(e) => {
        if (isRowDisabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(kind);
        }
      }}
      className={clsx(
        'flex w-full items-center justify-between rounded-md border border-solid px-12px py-4px text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-selected focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        isRowDisabled && 'cursor-not-allowed border-border bg-bg focus-visible:ring-0',
        !isRowDisabled && isRowSelected && 'cursor-pointer border-border-selected bg-bg-selected hover:bg-bg-selected',
        !isRowDisabled && !isRowSelected && 'cursor-pointer border-border hover:bg-bg-hover',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-8px py-4px">
        <div
          className={clsx(iconWrapClass, isRowDisabled && 'opacity-60')}
          style={{ '--fpl-icon-color': iconColor } as React.CSSProperties}
        >
          <Icon />
        </div>
        {/* Let hovers/clicks on empty label hit the row; only the underlined name keeps pointer events for ToggleTip */}
        <div className="pointer-events-none min-w-0 flex-1">
          <FlyoutSeatUnderlinedWithTooltip
            kind={kind}
            seatTooltip={seatTooltips[kind]}
            selectionDisabled={isRowDisabled}
            onTriggerClick={(e) => {
              e.stopPropagation();
              onPick(kind);
            }}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-8px">
        {isRequestedRow ? (
          <Badge variant="brandOutline" size="md">
            Requested
          </Badge>
        ) : (
          flyoutSeatPickerBadge(kind, currentSeat)
        )}
        <span
          className={clsx(
            'shrink-0 text-bodyLg font-normal tabular-nums',
            isRowDisabled ? 'text-text-disabled' : 'text-text',
          )}
        >
          {rightLabel}
        </span>
      </div>
    </div>
  );
}

function PersonFlyoutInner({
  person,
  onClose,
  onSeatChange,
  seatApproval,
}: {
  person: PersonRow;
  onClose: () => void;
  onSeatChange?: (personId: string, seatKind: SeatKind, toastMessage?: string) => void;
  seatApproval?: SeatRequestApprovalContext;
}) {
  const { copy, variant } = useResearch();
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<FlyoutMemberTab>(FLYOUT_MEMBER_TAB_MAP, {
    defaultActive: 'manage',
  });

  const [flyoutSeatKind, setFlyoutSeatKind] = useState<SeatKind | null>(null);
  const [seatChangeOpen, setSeatChangeOpen] = useState(() => Boolean(seatApproval));
  const [pendingSeatKind, setPendingSeatKind] = useState<SeatKind | null>(() =>
    seatApproval ? seatApproval.requestedSeat : null,
  );
  /** Wall-clock ms when the user last confirmed a seat change in this flyout session. */
  const [flyoutSeatChangedAt, setFlyoutSeatChangedAt] = useState<number | null>(null);
  const [, setSeatUpdatedTick] = useState(0);

  const effectiveSeat = flyoutSeatKind ?? person.seatType;

  useEffect(() => {
    setFlyoutSeatKind(null);
    setFlyoutSeatChangedAt(null);
    if (seatApproval) {
      setSeatChangeOpen(true);
      setPendingSeatKind(seatApproval.requestedSeat);
    } else {
      setSeatChangeOpen(false);
      setPendingSeatKind(null);
    }
  }, [person.id, seatApproval?.requestedSeat]);

  useEffect(() => {
    if (flyoutSeatChangedAt === null) return;
    const id = window.setInterval(() => setSeatUpdatedTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [flyoutSeatChangedAt]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (seatChangeOpen) {
        setSeatChangeOpen(false);
        setPendingSeatKind(null);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, seatChangeOpen]);

  const details = useMemo(() => flyoutMockDetails(person), [person]);

  /** Credits used stay fixed for this member while the flyout is open; only the limit changes with seat preview/change. */
  const [stableAiCreditsUsed, setStableAiCreditsUsed] = useState(() =>
    flyoutAiCreditsUsed(person.id, AI_CREDIT_LIMIT_BY_SEAT[person.seatType]),
  );
  useEffect(() => {
    setStableAiCreditsUsed(flyoutAiCreditsUsed(person.id, AI_CREDIT_LIMIT_BY_SEAT[person.seatType]));
  }, [person.id]);

  /** Limit follows the confirmed seat only; no preview while a new seat is selected in the picker. */
  const previewLimit = AI_CREDIT_LIMIT_BY_SEAT[effectiveSeat];
  const aiCreditsOverLimit = previewLimit > 0 && stableAiCreditsUsed > previewLimit;
  const aiCreditsFillPct =
    previewLimit <= 0
      ? 0
      : aiCreditsOverLimit
        ? 100
        : Math.min(100, Math.max(0, (stableAiCreditsUsed / previewLimit) * 100));
  const seatLastUpdatedSuffix =
    flyoutSeatChangedAt !== null
      ? formatFlyoutSeatLastUpdatedRelative(flyoutSeatChangedAt)
      : details.seatLastUpdated;
  const seatMeta = SEAT_META[effectiveSeat];
  const { Icon: SeatIcon, iconWrapClass, iconColor } = seatMeta;

  const canConfirmSeatChange =
    pendingSeatKind !== null && pendingSeatKind !== effectiveSeat;

  const seatTooltips = useMemo(() => seatTooltipsForVariant(variant), [variant]);
  const seatPrices = useMemo(() => seatPriceOnlyForVariant(variant), [variant]);

  /** Dashboard requests always assume seats available for the requested tier (stable per open). */
  const dashboardRequestedAvailableCount = useMemo(() => {
    if (!seatApproval) return undefined;
    return Math.floor(Math.random() * 12) + 4;
  }, [person.id, seatApproval]);

  const billingScenario = useMemo(() => {
    if (!canConfirmSeatChange || pendingSeatKind === null) return null;
    return resolveBillingScenario({
      variant,
      isSeatRequestApproval: Boolean(seatApproval),
      effectiveSeat,
      pendingSeat: pendingSeatKind,
    });
  }, [canConfirmSeatChange, pendingSeatKind, seatApproval, effectiveSeat, variant]);

  const resolvedSeatChangeCopy = useMemo(() => {
    if (!billingScenario || pendingSeatKind === null) return null;
    return buildResolvedBillingCopy(billingScenario, {
      orgName: copy.billingOrgName,
      invoiceDate: copy.billingInvoiceDate,
      planRenewalDate: copy.planRenewalDate,
      startDate: copy.billingMonthlyStartDate,
      oldSeatLabel: SEAT_META[effectiveSeat].label,
      newSeatLabel: SEAT_META[pendingSeatKind].label,
      requestSeatTierLabel: SEAT_META[pendingSeatKind].label,
    });
  }, [billingScenario, pendingSeatKind, effectiveSeat, copy]);

  const cancelSeatChange = () => {
    setSeatChangeOpen(false);
    setPendingSeatKind(null);
  };

  const confirmSeatChange = () => {
    if (!canConfirmSeatChange || pendingSeatKind === null) return;
    const next = pendingSeatKind;
    const scenario = resolveBillingScenario({
      variant,
      isSeatRequestApproval: Boolean(seatApproval),
      effectiveSeat,
      pendingSeat: next,
    });
    const resolved = scenario
      ? buildResolvedBillingCopy(scenario, {
          orgName: copy.billingOrgName,
          invoiceDate: copy.billingInvoiceDate,
          planRenewalDate: copy.planRenewalDate,
          startDate: copy.billingMonthlyStartDate,
          oldSeatLabel: SEAT_META[effectiveSeat].label,
          newSeatLabel: SEAT_META[next].label,
          requestSeatTierLabel: SEAT_META[next].label,
        })
      : null;
    setFlyoutSeatKind(next);
    setFlyoutSeatChangedAt(Date.now());
    setSeatChangeOpen(false);
    setPendingSeatKind(null);
    onSeatChange?.(person.id, next, resolved?.toastBody);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex min-h-96px w-full shrink-0 items-start gap-16px px-24px py-24px">
        <FlyoutHeaderAvatar spec={person.avatar} name={person.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-4px">
          <div className="flex min-w-0 flex-wrap items-center gap-8px">
            <span id="person-flyout-name" className="truncate text-headingMd font-bold text-text">
              {person.name}
            </span>
            <Badge variant={person.guest ? 'defaultOutline' : 'defaultFilled'} size="md">
              {person.guest ? 'Guest' : 'Member'}
            </Badge>
          </div>
          <span className="break-all text-bodyMd text-text-secondary">{person.email}</span>
        </div>
        <div className="shrink-0">
          <IconButton variant="ghost" aria-label="Close member details" onClick={onClose}>
            <Icon24Close />
          </IconButton>
        </div>
      </div>

      <div className="flex h-42px w-full min-w-0 shrink-0 items-center border-t border-b border-border px-16px py-8px">
        <Tabs.TabStrip manager={tabManager}>
          <Tabs.Tab {...tabPropsMap.manage}>Manage</Tabs.Tab>
          <Tabs.Tab {...tabPropsMap.activity}>Activity</Tabs.Tab>
        </Tabs.TabStrip>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Tabs.TabPanel {...tabPanelPropsMap.manage} height="fill" width="fill">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-24px overflow-y-auto overscroll-y-contain p-24px">
            <div className="flex w-full shrink-0 flex-col gap-16px rounded-[6px] border border-border border-solid p-16px">
              {!seatChangeOpen ? (
                <>
                  <div className="flex w-full items-center justify-between">
                    <span className="text-bodyLg font-bold text-text">Seat</span>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSeatChangeOpen(true);
                        setPendingSeatKind(null);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                  <div className="flex h-32px w-full items-center justify-between py-4px">
                    <div className="flex min-w-0 flex-1 items-center gap-8px">
                      <div
                        className={iconWrapClass}
                        style={{ '--fpl-icon-color': iconColor } as React.CSSProperties}
                      >
                        <SeatIcon />
                      </div>
                      <div className="min-w-0 shrink-0">
                        <FlyoutSeatUnderlinedWithTooltip
                          kind={effectiveSeat}
                          seatTooltip={seatTooltips[effectiveSeat]}
                          triggerClassName={FLYOUT_DOT_LINK_CLASS}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 pl-8px text-right text-bodyLg font-normal text-text-secondary">
                      Last updated {seatLastUpdatedSuffix}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex w-full items-center justify-between">
                    <span className="text-bodyLg font-bold text-text">Seat</span>
                    <ButtonPrimitive
                      type="button"
                      onClick={cancelSeatChange}
                      className="cursor-pointer border-0 bg-transparent p-0 text-bodyLg text-text-brand"
                    >
                      Cancel
                    </ButtonPrimitive>
                  </div>
                  <div className="flex w-full flex-col gap-8px">
                    {SEAT_PICKER_ORDER.map((kind) => (
                      <FlyoutSeatPickerRow
                        key={kind}
                        kind={kind}
                        currentSeat={effectiveSeat}
                        pendingSeatKind={pendingSeatKind}
                        onPick={setPendingSeatKind}
                        seatTooltips={seatTooltips}
                        seatPrices={seatPrices}
                        requestedSeat={seatApproval?.requestedSeat}
                        requestedSeatAvailableCount={dashboardRequestedAvailableCount}
                      />
                    ))}
                  </div>
                  {canConfirmSeatChange && pendingSeatKind !== null ? (
                    <div className="flex w-full flex-col gap-12px">
                      <div className="flex w-full flex-col gap-8px">
                        <Text as="p" size="lg" strong className="m-0">
                          {seatApproval
                            ? `Approve ${person.name}'s request for a ${SEAT_META[pendingSeatKind].label} seat?`
                            : `Change ${person.name} from ${SEAT_META[effectiveSeat].label} to ${SEAT_META[pendingSeatKind].label}?`}
                        </Text>
                        {billingScenario && resolvedSeatChangeCopy ? (
                          <Text as="p" size="lg" className="m-0">
                            {resolvedSeatChangeCopy.confirmationBody}
                          </Text>
                        ) : seatApproval ? (
                          <Text as="p" size="lg" className="m-0">
                            If you approve, {copy.seatFlyoutEntityName} will assign them a{' '}
                            {SEAT_META[pendingSeatKind].label} seat and use one seat from your plan. Their{' '}
                            {SEAT_META[effectiveSeat].label} seat will become available to assign later.
                          </Text>
                        ) : (
                          <Text as="p" size="lg" className="m-0">
                            This will add one {SEAT_META[pendingSeatKind].label} seat to {copy.seatFlyoutEntityName}.
                            Their {SEAT_META[effectiveSeat].label} seat will be removed from your plan and credited
                            on your {copy.billingInvoiceDate} invoice.
                          </Text>
                        )}
                      </div>
                      {billingScenario && resolvedSeatChangeCopy && resolvedSeatChangeCopy.billingPreviewLines.length > 0 ? (
                        <div className="flex w-full flex-col gap-[5px]">
                          <div className="flex w-full flex-col gap-4px">
                            <Text as="span" size="lg" strong>
                              Billing preview
                            </Text>
                          </div>
                          <div className="flex w-full flex-col gap-4px">
                            {resolvedSeatChangeCopy.billingPreviewLines.map((line) => (
                              <BillingFlyoutPreviewLine
                                key={line}
                                line={line}
                                proratedDetailTooltip={resolvedSeatChangeCopy.proratedCostTooltip}
                              />
                            ))}
                          </div>
                        </div>
                      ) : !billingScenario ? (
                        <div className="flex w-full flex-col gap-[5px]">
                          <div className="flex w-full flex-col gap-4px">
                            <Text as="span" size="lg" strong>
                              Billing preview
                            </Text>
                          </div>
                          <div className="flex w-full flex-col gap-4px">
                            <div className="flex w-full items-center justify-between gap-8px">
                              <div className="shrink-0">
                                <FlyoutDottedTermTooltip
                                  className="cursor-default border-0 bg-transparent p-0 text-left text-bodyLg font-normal text-text-secondary underline decoration-dotted underline-offset-2"
                                  tooltip={FLYOUT_PRORATED_COST_TOOLTIP}
                                >
                                  Prorated cost
                                </FlyoutDottedTermTooltip>
                              </div>
                              <span className="text-bodyLg font-normal text-text-secondary tabular-nums">$120</span>
                            </div>
                            <div className="flex w-full items-center justify-between">
                              <span className="text-bodyLg font-normal text-text-secondary">
                                {SEAT_META[effectiveSeat].label} seat credit
                              </span>
                              <span className="text-bodyLg font-normal tabular-nums text-text-handoff">+$70</span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {resolvedSeatChangeCopy && resolvedSeatChangeCopy.helperTextLines.length > 0 ? (
                        <div className="flex flex-col gap-4px">
                          {resolvedSeatChangeCopy.helperTextLines.map((h) => (
                            <Text key={h} as="p" size="md" className="m-0 text-text-secondary">
                              {h}
                            </Text>
                          ))}
                        </div>
                      ) : null}
                      <div className="h-px w-full bg-border" />
                      <Button variant="primary" width="fill" onClick={confirmSeatChange}>
                        {seatApproval ? 'Approve seat request' : 'Change seat'}
                      </Button>
                      {seatApproval ? (
                        <Button variant="secondary" width="fill" onClick={onClose}>
                          Decline request
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="flex w-full shrink-0 flex-col rounded-[5px] border border-border border-solid bg-bg">
              <div className="flex w-full items-center justify-between px-16px pb-12px pt-16px">
                <span className="text-bodyLg font-bold text-text">AI Credits</span>
                <span className="text-bodyLg font-normal text-text-secondary">
                  Reset: {details.aiResetLabel}
                </span>
              </div>
              <div className="flex w-full flex-col gap-8px px-16px pb-12px">
                <div className="flex h-32px w-full items-center justify-between gap-8px py-4px">
                  <div className="shrink-0">
                    <FlyoutDottedTermTooltip
                      className={FLYOUT_DOT_LINK_CLASS}
                      tooltip={FLYOUT_SEAT_CREDITS_USED_TOOLTIP}
                    >
                      Seat credits used
                    </FlyoutDottedTermTooltip>
                  </div>
                  <span
                    className={clsx(
                      'text-bodyLg font-normal tabular-nums',
                      aiCreditsOverLimit ? 'text-text-danger' : 'text-text-secondary',
                    )}
                  >
                    {stableAiCreditsUsed.toLocaleString('en-US')} / {previewLimit.toLocaleString('en-US')}
                  </span>
                </div>
                <div
                  className={clsx(
                    'relative h-8px w-full min-w-0 overflow-hidden rounded-md transition-colors duration-200',
                    aiCreditsOverLimit ? 'bg-bg-danger-tertiary' : 'bg-bg-hover',
                  )}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={previewLimit}
                  aria-valuenow={stableAiCreditsUsed}
                  aria-label="Seat credits used"
                >
                  <div
                    className={clsx(
                      'box-border absolute left-0 top-1/2 h-6px max-w-full -translate-y-1/2 border-solid transition-[width] duration-200 ease-out',
                      aiCreditsOverLimit
                        ? 'rounded-full border-0 bg-bg-danger'
                        : 'rounded-l-full border-r-2 border-icon-onbrand bg-bg-brand',
                    )}
                    style={{ width: `${aiCreditsFillPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col rounded-[5px] border border-border border-solid bg-bg">
              <div className="flex w-full items-center justify-between px-16px pb-12px pt-16px">
                <span className="text-bodyLg font-bold text-text">Details</span>
                <Button variant="secondary" onClick={() => undefined}>
                  Edit
                </Button>
              </div>
              <div className="flex w-full flex-col gap-8px px-16px pb-12px">
                <FlyoutDetailRow icon={<Icon24Person />} label="Role" value={details.role} />
                <FlyoutDetailRow
                  icon={<Icon24BorderSquareLarge />}
                  label="Workspaces"
                  value={details.workspaceLabel}
                />
                <FlyoutDetailRow icon={<Icon24Team />} label="Billing group" value={details.billingLabel} />
                <FlyoutDetailRow icon={<Icon24Calendar />} label="Joined" value={details.joinedLabel} />
              </div>
            </div>
            </div>
          </div>
        </Tabs.TabPanel>

        <Tabs.TabPanel {...tabPanelPropsMap.activity} height="fill" width="fill">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 w-full overflow-y-auto bg-bg" aria-label="Activity" />
          </div>
        </Tabs.TabPanel>
      </div>

      <div className="shrink-0 border-t border-border p-24px">
        <Button variant="destructiveSecondary" onClick={() => undefined}>
          {copy.removeMemberLabel}
        </Button>
      </div>
    </div>
  );
}

export function PersonDetailFlyout({
  person,
  onClose,
  onSeatChange,
  seatApproval,
}: {
  person: PersonRow | null;
  onClose: () => void;
  onSeatChange?: (personId: string, seatKind: SeatKind, toastMessage?: string) => void;
  seatApproval?: SeatRequestApprovalContext;
}) {
  return (
    <AnimatePresence>
      {person ? (
        <motion.aside
          key={person.id}
          role="dialog"
          aria-modal="true"
          aria-labelledby="person-flyout-name"
          className="pointer-events-auto fixed top-0 right-0 bottom-0 z-[101] flex h-full min-h-0 w-[min(480px,100vw)] flex-col overflow-hidden border border-border bg-bg"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          <PersonFlyoutInner
            person={person}
            onClose={onClose}
            onSeatChange={onSeatChange}
            seatApproval={seatApproval}
          />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

const PEOPLE_COLUMNS: TableColumnDef<PersonRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 200,
    sortable: false,
    cellRenderer: PersonNameCell,
  },
  {
    field: 'seatType',
    headerName: 'Seat type',
    width: 200,
    minWidth: 140,
    sortable: false,
    cellRenderer: PersonSeatCell,
  },
  {
    colId: 'workspace',
    headerName: 'Workspace',
    width: 200,
    minWidth: 140,
    sortable: false,
    cellRenderer: PersonWorkspaceCell,
  },
  {
    colId: 'billingGroup',
    headerName: 'Billing group',
    width: 200,
    minWidth: 140,
    sortable: false,
    cellRenderer: PersonBillingCell,
  },
  {
    field: 'lastActive',
    headerName: 'Last active',
    width: 160,
    minWidth: 120,
    sortable: false,
    cellRenderer: PersonLastActiveCell,
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
    cellRenderer: PersonChevronCell,
  },
];

type PeopleTableGridApi = {
  refreshCells: (params?: { force?: boolean }) => void;
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

function PeoplePage() {
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<PeopleTab>(PEOPLE_TAB_MAP, {
    defaultActive: 'people',
  });
  const [search, setSearch] = useState('');
  const [toolbarBilling, setToolbarBilling] = useState<string | undefined>('all');
  const [groupSearch, setGroupSearch] = useState('');
  const [peopleRows, setPeopleRows] = useState<PersonRow[]>(() =>
    dedupePersonRowsByEmail(PEOPLE_DATA.map((r) => ({ ...r }))),
  );
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const flyoutPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return peopleRows.find((p) => p.id === selectedPersonId) ?? null;
  }, [selectedPersonId, peopleRows]);

  const peopleGridApiRef = useRef<PeopleTableGridApi | null>(null);

  const handleSeatChange = useCallback((personId: string, seatKind: SeatKind, toastMessage?: string) => {
    let changed = false;
    setPeopleRows((prev) => {
      const row = prev.find((p) => p.id === personId);
      if (!row || row.seatType === seatKind) return prev;
      changed = true;
      queueMicrotask(() => {
        showToast({
          message:
            toastMessage ?? `${row.name} is now on a ${SEAT_META[seatKind].label} seat.`,
        });
      });
      return prev.map((p) => (p.id === personId ? { ...p, seatType: seatKind } : p));
    });
    if (changed) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          peopleGridApiRef.current?.refreshCells({ force: true });
        });
      });
    }
  }, []);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    return q ? USER_GROUP_ROWS.filter((r) => r.name.toLowerCase().includes(q)) : USER_GROUP_ROWS;
  }, [groupSearch]);

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    const data = q
      ? peopleRows.filter(
          (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
        )
      : peopleRows;
    return dedupePersonRowsByEmail(data).sort((a, b) => a.name.localeCompare(b.name));
  }, [search, peopleRows]);

  const seatToolbarCounts = useMemo(
    () =>
      PEOPLE_TOOLBAR_SEAT_KINDS.map((kind) => ({
        kind,
        count: peopleRows.filter((p) => p.seatType === kind).length,
      })),
    [peopleRows],
  );

  return (
    <div className="flex w-full flex-col h-full">
      <div className="w-full px-32px pb-24px border-b border-border shrink-0">
        <h1 className="text-headingLg font-bold text-text m-0">People</h1>
      </div>

      <div className="px-32px flex flex-col min-w-0 pt-16px gap-16px flex-1 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-16px shrink-0">
        <Tabs.TabStrip manager={tabManager}>
          <Tabs.Tab {...tabPropsMap.people}>People</Tabs.Tab>
          <Tabs.Tab {...tabPropsMap.groups}>User groups</Tabs.Tab>
        </Tabs.TabStrip>
        {tabManager.activeTab === 'groups' ? (
          <Button variant="primary" iconPrefix={<Icon24Plus />}>
            <span className="flex items-center gap-4px">
              User group
              <span style={{ '--fpl-icon-color': 'var(--color-icon-onbrand)' } as React.CSSProperties}>
                <Icon16ChevronDown />
              </span>
            </span>
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-16px shrink-0 justify-end">
            <div className="flex items-center gap-16px h-24px">
              {seatToolbarCounts.map(({ count, kind }) => {
                const { Icon, iconColor } = SEAT_META[kind];
                return (
                  <div key={kind} className="flex items-center gap-4px shrink-0">
                    <div className="border border-border h-16px flex items-center px-4px rounded">
                      <span className="text-bodyMd text-text tabular-nums">{count}</span>
                    </div>
                    <span
                      className="shrink-0 flex size-24px items-center justify-center"
                      style={{ '--fpl-icon-color': iconColor } as React.CSSProperties}
                    >
                      <Icon />
                    </span>
                  </div>
                );
              })}
            </div>
            <Button variant="primary" iconPrefix={<Icon24Plus />}>
              Invite users
            </Button>
          </div>
        )}
      </div>

      <Tabs.TabPanel {...tabPanelPropsMap.people} height="fill" width="fill">
        <div className="flex w-full flex-col h-full min-h-0">
          <div className="flex h-[48px] flex-wrap items-center justify-between gap-16px border-t border-border py-8px shrink-0">
            <div className="w-[260px] shrink-0 [&_input]:text-bodyMd">
              <SearchInput
                aria-label="Search people"
                placeholder="Search people"
                value={search}
                onChange={setSearch}
                size="md"
              />
            </div>
            <div className="flex flex-wrap items-center gap-8px shrink-0">
              <ButtonPrimitive
                type="button"
                className="flex h-24px shrink-0 items-center gap-8px rounded-md border border-dashed border-border pl-4px pr-8px text-bodyMd text-text hover:bg-bg-hover active:bg-bg-transparent-secondary"
                onClick={() => undefined}
              >
                <span className="flex size-24px items-center justify-center text-icon shrink-0">
                  <Icon24Insert />
                </span>
                <span className="whitespace-nowrap">New charges since last invoice</span>
              </ButtonPrimitive>
              <div className="min-w-0 shrink-0 [&_[data-fpl-component]]:text-bodyMd">
                <Select.Root value={toolbarBilling} onChange={(v) => setToolbarBilling(v)}>
                  <Select.Trigger
                    width="hug"
                    size="md"
                    label={<HiddenLabel>Filter by billing group</HiddenLabel>}
                  />
                  <Select.Container>
                    {TOOLBAR_BILLING_OPTIONS.map((o) => (
                      <Select.Option key={o.value} value={o.value}>
                        {o.label}
                      </Select.Option>
                    ))}
                  </Select.Container>
                </Select.Root>
              </div>
              <IconButton variant="ghost" aria-label="Filter">
                <Icon24Filter />
              </IconButton>
              <IconButton variant="ghost" aria-label="Export">
                <Icon24Export />
              </IconButton>
            </div>
          </div>

          <div className="w-full overflow-x-hidden flex-1 min-h-0">
            <Table<PersonRow>
              columns={PEOPLE_COLUMNS}
              data={filteredPeople}
              getRowId={(row) => row.id}
              checkboxSelection
              gridLines={{ horizontal: true }}
              gridOptions={{
                rowHeight: 48,
                headerHeight: 48,
                onGridReady: (e) => {
                  peopleGridApiRef.current = e.api as PeopleTableGridApi;
                },
                onRowClicked: (event) => {
                  const mouse = event.event;
                  const cell =
                    mouse?.target instanceof Element ? mouse.target.closest('.ag-cell') : null;
                  const colId = cell?.getAttribute('col-id');
                  if (colId === '__checkbox' || colId === 'workspace' || colId === 'billingGroup') {
                    return;
                  }
                  const row = event.data;
                  if (row) setSelectedPersonId(row.id);
                },
              }}
            />
          </div>
        </div>
      </Tabs.TabPanel>

      <Tabs.TabPanel {...tabPanelPropsMap.groups} height="fill" width="fill">
        <div className="flex w-full flex-col h-full min-h-0">
          <div className="flex h-[48px] w-full items-center justify-between gap-16px border-t border-border py-8px shrink-0">
            <div className="w-[260px] shrink-0 [&_input]:text-bodyMd">
              <SearchInput
                aria-label="Search user groups"
                placeholder="Search user groups"
                value={groupSearch}
                onChange={setGroupSearch}
                size="md"
              />
            </div>
            <IconButton variant="ghost" aria-label="Filter">
              <Icon24Filter />
            </IconButton>
          </div>
          <div className="w-full overflow-x-hidden flex-1 min-h-0">
            <Table<UserGroupRow>
              columns={USER_GROUP_COLUMNS}
              data={filteredGroups}
              getRowId={(row) => row.id}
              checkboxSelection
              gridLines={{ horizontal: true }}
              gridOptions={{ rowHeight: 48, headerHeight: 48 }}
            />
          </div>
        </div>
      </Tabs.TabPanel>
      </div>

      <PersonDetailFlyout
        person={flyoutPerson}
        onClose={() => setSelectedPersonId(null)}
        onSeatChange={handleSeatChange}
      />
    </div>
  );
}

export default PeoplePage;
