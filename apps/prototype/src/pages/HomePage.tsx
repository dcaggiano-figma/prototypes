import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useResearch } from '../research/researchCopy';
import { Avatar, Heading, Text } from '@prototype/shared';
import { Badge, Button, IconButton } from '@figma/fpl-components';
import {
  PersonDetailFlyout,
  SEAT_KIND_VISUAL,
  type PersonRow,
  type SeatKind,
  type SeatRequestApprovalContext,
} from './PeoplePage';
import { showToast } from '../components/toast';
import {
  Icon16SeatCollab,
  Icon16SeatDev,
  Icon16SeatFull,
  Icon16SeatView,
  Icon24AiCredit,
  Icon24ApprovedCheckmark,
  Icon24ChevronRightLarge,
  Icon24Eye,
  Icon24Placeholder,
} from '@figma/fpl-icons';

/** Twigma mark — Figma uses #32a468; token-backed fill, fully rounded container. */
function TwigmaMark() {
  return (
    <div
      className="w-32px h-32px rounded-full shrink-0 overflow-hidden bg-bg-success flex items-center justify-center"
      aria-hidden
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="text-text-onsuccess shrink-0"
      >
        <path
          d="M12 3C10.5 6 8 9 8 14c0 3 2 5.5 4.5 6.5 1-4 3.5-7.5 3.5-12.5 0-2.5-1-4-4-5Z"
          fill="currentColor"
          opacity="0.95"
        />
        <path
          d="M9 15c-1.5 1-2.5 3-2.5 5h11c0-2.5-1.5-4.5-3.5-6-1.2 0-2.2.4-3 1Z"
          fill="currentColor"
          opacity="0.75"
        />
      </svg>
    </div>
  );
}

type SeatRequest = {
  id: string;
  name: string;
  seatKind: SeatKind;
  subhead: string;
  metaParts: { email: string; guest?: boolean; time: string };
  avatar: { type: 'photo'; src: string; alt: string } | { type: 'initial'; initial: string; color: 'green' | 'purple' };
};

const INITIAL_SEAT_REQUESTS: SeatRequest[] = [
  {
    id: '1',
    name: 'Mariko Hyder-Fukawa',
    seatKind: 'collab',
    subhead: 'Wants to create a file in the team Mobile Space Explorers',
    metaParts: { email: 'mfukawa@memorymachines.com', time: '1 hour ago' },
    avatar: {
      type: 'photo',
      src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop',
      alt: 'Mariko Hyder-Fukawa',
    },
  },
  {
    id: '2',
    name: 'Molly Sapiro',
    seatKind: 'full',
    subhead: 'Wants to edit the file Galaxy Design System, in the team Dream Team',
    metaParts: { email: 'msapiro@memorymachines.com', time: '1 day ago' },
    avatar: { type: 'initial', initial: 'M', color: 'green' },
  },
  {
    id: '3',
    name: 'Austin Cheng',
    seatKind: 'full',
    subhead: '“I’m a new grad joining the team and my manager approved me for Figma.”',
    metaParts: { email: 'acheng@gmail.com', guest: true, time: '1 day ago' },
    avatar: { type: 'initial', initial: 'A', color: 'purple' },
  },
  {
    id: '4',
    name: 'Lena Miao',
    seatKind: 'dev',
    subhead: 'Wants to use Dev Mode in file Jupiter 2.0, in the team Mobile Space Explorers',
    metaParts: { email: 'lmiao@memorymachines.com', time: '1 week ago' },
    avatar: {
      type: 'photo',
      src: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop',
      alt: 'Lena Miao',
    },
  },
];

const SEAT_LABEL: Record<SeatKind, string> = {
  collab: 'Collab seat',
  full: 'Full seat',
  dev: 'Dev seat',
  view: 'View seat',
};

/** Pause after toast + flyout close so the list row disappearing reads clearly. */
const SEAT_REQUEST_ROW_REMOVE_DELAY_MS = 450;

/** FPL seat glyphs for the dashboard request avatar chip (icon.16.seat-* in UI3). */
const SEAT_REQUEST_AVATAR_BADGE_ICON: Record<SeatKind, ReactNode> = {
  collab: <Icon16SeatCollab className="size-16px shrink-0" aria-hidden />,
  full: <Icon16SeatFull className="size-16px shrink-0" aria-hidden />,
  dev: <Icon16SeatDev className="size-16px shrink-0" aria-hidden />,
  view: <Icon16SeatView className="size-16px shrink-0" aria-hidden />,
};

function seatRequestToPersonRow(req: SeatRequest): PersonRow {
  return {
    id: `seat-req-${req.id}`,
    name: req.name,
    email: req.metaParts.email,
    guest: req.metaParts.guest,
    avatar:
      req.avatar.type === 'photo'
        ? { kind: 'photo', src: req.avatar.src }
        : { kind: 'initial', initial: req.avatar.initial, color: req.avatar.color },
    seatType: 'view',
    lastActive: req.metaParts.time,
  };
}

function RequestAvatarStack({
  avatar,
  seatKind,
}: {
  avatar: SeatRequest['avatar'];
  seatKind: SeatKind;
}) {
  const { surfaceClass, iconColor } = SEAT_KIND_VISUAL[seatKind];
  return (
    <div className="relative size-32px shrink-0 rounded-[24px]">
      {avatar.type === 'photo' ? (
        <Avatar size="lg" src={avatar.src} alt={avatar.alt} />
      ) : (
        <Avatar size="lg" initial={avatar.initial} color={avatar.color} alt="" />
      )}
      <div
        className={`absolute -right-8px -bottom-8px box-border flex size-24px shrink-0 items-center justify-center overflow-hidden rounded-full border-0 ${surfaceClass}`}
        style={{ '--fpl-icon-color': iconColor } as CSSProperties}
        aria-hidden
      >
        {SEAT_REQUEST_AVATAR_BADGE_ICON[seatKind]}
      </div>
    </div>
  );
}

function HomePage() {
  const { variant, copy } = useResearch();
  const navigate = useNavigate();
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>(() => [...INITIAL_SEAT_REQUESTS]);
  const [seatRequestFlyout, setSeatRequestFlyout] = useState<SeatRequest | null>(null);
  const pendingRowRemoveTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const pending = pendingRowRemoveTimeoutsRef.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.length = 0;
    };
  }, []);

  const creditUsed = 2500;
  const creditTotal = 10000;
  const creditPct = Math.round((creditUsed / creditTotal) * 100);

  const seatApprovalContext = useMemo((): SeatRequestApprovalContext | undefined => {
    if (!seatRequestFlyout) return undefined;
    return { requestedSeat: seatRequestFlyout.seatKind };
  }, [seatRequestFlyout]);

  const approvalPerson = seatRequestFlyout ? seatRequestToPersonRow(seatRequestFlyout) : null;

  const openSeatRequestFlyout = (row: SeatRequest) => setSeatRequestFlyout(row);

  return (
    <div className="flex w-full flex-col">
      <div className="w-full px-32px pb-24px border-b border-border">
        <div className="flex items-center gap-16px">
          <TwigmaMark />
          <Heading as='h1' size='lg'>{copy.productAdminTitle}</Heading>
        </div>
      </div>

      <div className="px-32px pt-24px flex flex-col gap-24px">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-24px items-start">
        {/* Seat requests — 2/3 width on xl */}
        <section className="min-w-0 w-full xl:col-span-2 border border-border rounded-lg bg-bg overflow-hidden">
          <div className="flex flex-wrap items-center gap-12px justify-between px-16px py-16px border-b border-border">
            <div className="flex items-center gap-8px min-w-0">
              <h2 className="text-bodyLg font-bold text-text m-0">Seat requests</h2>
              <Badge variant="brandOutline" size="md">
                {seatRequests.length}
              </Badge>
            </div>
            <div className="flex items-center gap-8px shrink-0">
              <Button variant="secondary" size="md">
                View all
              </Button>
              <Button variant="primary" size="md">
                Approve all
              </Button>
            </div>
          </div>
          <div className="px-16px py-8px">
            <ul className="list-none m-0 p-0">
              {seatRequests.map((row) => (
                <li
                  key={row.id}
                  className="flex gap-24px items-start py-16px [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border"
                >
                  <RequestAvatarStack avatar={row.avatar} seatKind={row.seatKind} />
                  <div className="flex-1 min-w-0 flex flex-col gap-0">
                    <div className="flex h-[28px] items-center justify-between gap-12px w-full">
                      <p className="text-bodyMd text-text m-0 flex flex-wrap items-baseline gap-4px">
                        <Text size='lg' strong>{row.name}</Text>
                        <Text size='lg'>requested a</Text>
                        <Text size='lg' strong>{SEAT_LABEL[row.seatKind]}</Text>
                      </p>
                      <div className="flex items-center gap-8px shrink-0">
                        <Button variant="secondary" size="md" onClick={() => openSeatRequestFlyout(row)}>
                          Approve
                        </Button>
                        <IconButton
                          aria-label={`Open seat request for ${row.name}`}
                          onClick={() => openSeatRequestFlyout(row)}
                        >
                          <Icon24ChevronRightLarge />
                        </IconButton>
                      </div>
                    </div>
                    <p className="text-bodyLg text-text-secondary m-0 mt-4px pr-32px max-w-full truncate">
                      {row.subhead}
                    </p>
                    <div className="flex flex-wrap items-center gap-4px text-bodyMd text-text-secondary m-0 pt-8px">
                      <span>{row.metaParts.email}</span>
                      {row.metaParts.guest ? (
                        <>
                          <Badge variant="defaultOutline" size="md">
                            Guest
                          </Badge>
                          <span className="text-text-tertiary text-bodySm">·</span>
                        </>
                      ) : (
                        <>
                          <span>·</span>
                        </>
                      )}
                      <span>{row.metaParts.time}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="min-w-0 w-full xl:col-span-1 flex flex-col gap-24px">
          <section className="border border-border rounded-lg bg-bg overflow-hidden">
            <div className="flex items-center justify-between pt-16px pb-12px px-16px">
              <div className="flex items-center gap-8px min-w-0">
                <h2 className="text-bodyLg font-bold text-text m-0 whitespace-nowrap">Total seats</h2>
                <Badge variant="defaultOutline" size="md">150</Badge>
              </div>
              <Button variant="secondary" size="md">
                Manage
              </Button>
            </div>
            <div className="flex flex-col gap-8px px-16px pb-16px">
              <div className="flex h-32px items-center justify-between py-4px gap-12px">
                <span className="flex items-center gap-8px text-bodyLg text-text min-w-0">
                  <span className="text-icon shrink-0 inline-flex">
                    <Icon24ApprovedCheckmark />
                  </span>
                  Assigned seats
                </span>
                <span className="text-bodyLg text-text-secondary shrink-0 tabular-nums">100</span>
              </div>
              <div className="flex h-32px items-center justify-between py-4px gap-12px">
                <span className="flex items-center gap-8px text-bodyLg text-text min-w-0">
                  <span className="text-icon shrink-0 inline-flex">
                    <Icon24Placeholder />
                  </span>
                  Available seats
                </span>
                <span className="text-bodyLg text-text-secondary shrink-0 tabular-nums">10</span>
              </div>
              <div className="flex h-32px items-center justify-between py-4px gap-12px">
                <span className="flex items-center gap-8px text-bodyLg text-text min-w-0">
                  <span className="text-icon shrink-0 inline-flex">
                    <Icon24Eye />
                  </span>
                  View seats (free)
                </span>
                <span className="text-bodyLg text-text-secondary shrink-0 tabular-nums">40</span>
              </div>
            </div>
          </section>

          <section className="border border-border rounded-lg bg-bg flex flex-col">
            <div className="flex items-center justify-between p-16px">
              <h2 className="text-bodyLg font-bold text-text m-0">AI credit usage</h2>
              <Button
                variant="secondary"
                size="md"
                onClick={() => void navigate({ to: '/ai-credits', search: { variant } })}
              >
                View
              </Button>
            </div>
            <div className="flex flex-col gap-16px px-16px pb-16px">
              <div className="flex items-center justify-between gap-12px w-full">
                <div className="flex items-center gap-8px min-w-0 h-24px">
                  <span className="inline-flex size-24px shrink-0 items-center justify-center rounded-md bg-bg-selected text-icon-brand">
                    <Icon24AiCredit />
                  </span>
                  <span className="text-bodyLg font-normal text-text truncate">Monthly paid credits</span>
                </div>
                <p className="text-bodyLg font-normal m-0 shrink-0 text-right whitespace-nowrap">
                  <span className="text-text">{creditUsed.toLocaleString()}</span>
                  <span className="text-text-tertiary font-normal">{` / ${creditTotal.toLocaleString()}`}</span>
                </p>
              </div>
              <div
                className="flex h-8px w-full shrink-0 items-center"
                role="progressbar"
                aria-valuenow={creditPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Monthly paid credits used"
              >
                <div className="flex h-8px w-full overflow-hidden rounded-full bg-bg-hover">
                  <div
                    className="h-full shrink-0 rounded-l-full bg-bg-brand-tertiary-pressed"
                    style={{ width: `${String(creditPct)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-border flex px-16px py-12px">
              <p className="text-bodyMd text-text-secondary m-0">Reset: [date]</p>
            </div>
          </section>
        </aside>
      </div>
      </div>

      <PersonDetailFlyout
        person={approvalPerson}
        onClose={() => setSeatRequestFlyout(null)}
        seatApproval={seatApprovalContext}
        onSeatChange={(personId, seatKind) => {
          const name = approvalPerson?.name ?? 'Member';
          showToast({
            message: `Approved ${name} for a ${SEAT_LABEL[seatKind]}.`,
          });
          const approvedId = personId.replace(/^seat-req-/, '');
          setSeatRequestFlyout(null);
          const handle = window.setTimeout(() => {
            pendingRowRemoveTimeoutsRef.current = pendingRowRemoveTimeoutsRef.current.filter((id) => id !== handle);
            setSeatRequests((prev) => prev.filter((r) => r.id !== approvedId));
          }, SEAT_REQUEST_ROW_REMOVE_DELAY_MS);
          pendingRowRemoveTimeoutsRef.current.push(handle);
        }}
      />
    </div>
  );
}

export default HomePage;
