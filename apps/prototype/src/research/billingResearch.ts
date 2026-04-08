import type { ResearchVariant } from './researchCopy';

/** Seat tier order by cost (low → high) for upgrade / downgrade detection. */
export const SEAT_COST_RANK: Record<'full' | 'dev' | 'collab' | 'view', number> = {
  view: 0,
  collab: 1,
  dev: 2,
  full: 3,
};

export type SeatKind = keyof typeof SEAT_COST_RANK;

export function isSeatUpgrade(from: SeatKind, to: SeatKind): boolean {
  return SEAT_COST_RANK[to] > SEAT_COST_RANK[from];
}

export function isSeatDowngrade(from: SeatKind, to: SeatKind): boolean {
  return SEAT_COST_RANK[to] < SEAT_COST_RANK[from];
}

export type BillingScenarioId =
  | 'ORG_UPGRADE_PURCHASE_REQUIRED'
  | 'ORG_DOWNGRADE_NEW_SEAT_PURCHASED'
  | 'ORG_REQUEST_UPGRADE_AVAILABLE_SEAT'
  | 'PRO_MONTHLY_UPGRADE_PURCHASE_REQUIRED'
  | 'PRO_MONTHLY_DOWNGRADE_PURCHASE_REQUIRED'
  | 'PRO_ANNUAL_REQUEST_UPGRADE_AVAILABLE_SEAT';

export type BillingScenarioDef = {
  id: BillingScenarioId;
  confirmation_body: string;
  billing_preview_lines: string[];
  helper_text_lines: string[];
  /** Shown in the “Prorated cost” (and “Prorated cost / credit”) billing-preview ToggleTip. */
  prorated_cost_tooltip?: string;
  toast_body: string;
  /** Dollar / date mocks from spec; seat-name placeholders come from live UI. */
  mock_values: Record<string, string>;
};

const ORG_SCENARIOS = {
  ORG_UPGRADE_PURCHASE_REQUIRED: {
    id: 'ORG_UPGRADE_PURCHASE_REQUIRED' as const,
    confirmation_body:
      'This will add one [NEW SEAT NAME] seat to [ORG NAME]. Their [OLD SEAT NAME] seat will be removed from your plan and credited on your [INVOICE DATE] invoice.',
    billing_preview_lines: [
      'Prorated cost: [PRORATED COST]',
      'Credit, [OLD SEAT NAME] seat: +[CREDIT AMOUNT]',
    ],
    helper_text_lines: [],
    prorated_cost_tooltip:
      '$660/year cost is prorated from today until your [PLAN RENEWAL DATE] plan renewal.',
    toast_body: 'Seat changed from [OLD SEAT NAME] to [NEW SEAT NAME]',
    mock_values: {
      '[PRORATED COST]': '$120',
      '[CREDIT AMOUNT]': '$20',
    },
  },
  ORG_DOWNGRADE_NEW_SEAT_PURCHASED: {
    id: 'ORG_DOWNGRADE_NEW_SEAT_PURCHASED' as const,
    confirmation_body:
      'This will add one [NEW SEAT NAME] seat to [ORG NAME]. You can assign their previous [OLD SEAT NAME] seat to someone else, or remove it at your plan\'s [PLAN RENEWAL DATE] renewal.',
    billing_preview_lines: ['Prorated cost: [PRORATED COST]'],
    helper_text_lines: [],
    prorated_cost_tooltip:
      '$60/year cost is prorated from today until your [PLAN RENEWAL DATE] plan renewal.',
    toast_body: 'Seat changed from [OLD SEAT NAME] to [NEW SEAT NAME]',
    mock_values: {
      '[PRORATED COST]': '$20',
    },
  },
  ORG_REQUEST_UPGRADE_AVAILABLE_SEAT: {
    id: 'ORG_REQUEST_UPGRADE_AVAILABLE_SEAT' as const,
    confirmation_body:
      'This will use one of your plan\'s available [SEAT NAME] seats. You can assign their previous [OLD SEAT NAME] seat to someone else, or remove it at your plan\'s [PLAN RENEWAL DATE] renewal.',
    billing_preview_lines: [],
    helper_text_lines: [],
    toast_body: 'Seat changed from [OLD SEAT NAME] to [NEW SEAT NAME]',
    mock_values: {},
  },
} satisfies Record<string, BillingScenarioDef>;

const PRO_SCENARIOS = {
  PRO_MONTHLY_UPGRADE_PURCHASE_REQUIRED: {
    id: 'PRO_MONTHLY_UPGRADE_PURCHASE_REQUIRED' as const,
    confirmation_body:
      'This will add one monthly [NEW SEAT NAME] seat to [ORG NAME]. Their previous monthly [OLD SEAT NAME] seat will be removed on your [INVOICE DATE] invoice.',
    billing_preview_lines: [
      'Prorated cost: [PRORATED COST]',
      'Monthly cost, starting [START DATE]: [MONTHLY COST]',
      'Credit, [OLD SEAT NAME] seat: +[CREDIT AMOUNT]',
    ],
    helper_text_lines: ['This adds a monthly seat to your annual Professional plan.'],
    prorated_cost_tooltip:
      '$20/mo cost is prorated from today until next month\'s invoice.',
    toast_body: 'Seat changed from [OLD SEAT NAME] to [NEW SEAT NAME]',
    mock_values: {
      '[PRORATED COST]': '$12',
      '[MONTHLY COST]': '$20/mo',
      '[CREDIT AMOUNT]': '$3',
    },
  },
  PRO_MONTHLY_DOWNGRADE_PURCHASE_REQUIRED: {
    id: 'PRO_MONTHLY_DOWNGRADE_PURCHASE_REQUIRED' as const,
    confirmation_body:
      'This will add one monthly [NEW SEAT NAME] seat to [ORG NAME]. Their previous monthly [OLD SEAT NAME] seat will be removed from your plan on your [INVOICE DATE] monthly invoice.',
    billing_preview_lines: ['Prorated cost / credit: [PRORATED COST]'],
    helper_text_lines: [],
    prorated_cost_tooltip: '$5/mo cost is prorated from today until next month\'s invoice.',
    toast_body: 'Seat changed from [OLD SEAT NAME] to [NEW SEAT NAME]',
    mock_values: {
      '[PRORATED COST]': '$1.5',
    },
  },
  PRO_ANNUAL_REQUEST_UPGRADE_AVAILABLE_SEAT: {
    id: 'PRO_ANNUAL_REQUEST_UPGRADE_AVAILABLE_SEAT' as const,
    confirmation_body:
      'This will use one of your plan\'s available annual [SEAT NAME] seats. Their previous annual [OLD SEAT NAME] seat will be removed on your [INVOICE DATE] invoice.',
    billing_preview_lines: [],
    helper_text_lines: [],
    toast_body: 'Seat changed from [OLD SEAT NAME] to [NEW SEAT NAME]',
    mock_values: {},
  },
} satisfies Record<string, BillingScenarioDef>;

/** Org seat row tooltips (annual). Lead with price, no seat name prefix. */
export const ORG_SEAT_TOOLTIPS: Record<SeatKind, string> = {
  full: '$660/yr · Includes access to all Figma products and 4,250 AI credits/mo',
  dev: '$300/yr · Includes access to Dev Mode, FigJam, Figma Slides, and 500 AI credits/mo',
  collab: '$60/yr · Includes access to FigJam, Figma Slides, and 500 AI credits/mo',
  view: 'Free · View-only with 500 AI credits/mo',
};

/** Pro seat row tooltips (monthly). Lead with price, no seat name prefix. */
export const PRO_SEAT_TOOLTIPS: Record<SeatKind, string> = {
  full: '$20/mo · Includes access to all Figma products and 4,250 AI credits/mo',
  dev: '$15/mo · Includes access to Dev mode, FigJam, Figma Slides, and 500 AI credits/mo',
  collab: '$5/mo · Includes access to FigJam, Figma Slides, and 500 AI credits/mo',
  view: 'Free · View only and 500 AI credits/mo',
};

export const ORG_SEAT_PRICE_ROW: Record<SeatKind, string> = {
  full: 'Full — $660/year',
  dev: 'Dev — $300/year',
  collab: 'Collab — $60/year',
  view: 'View — Free',
};

export const PRO_SEAT_PRICE_ROW: Record<SeatKind, string> = {
  full: 'Full — $20/mo',
  dev: 'Dev — $15/mo',
  collab: 'Collab — $5/mo',
  view: 'View — Free',
};

/** Flyout picker right column: price only (no seat name prefix). */
export const ORG_SEAT_PRICE_ONLY: Record<SeatKind, string> = {
  full: '$660/year',
  dev: '$300/year',
  collab: '$60/year',
  view: 'Free',
};

export const PRO_SEAT_PRICE_ONLY: Record<SeatKind, string> = {
  full: '$20/mo',
  dev: '$15/mo',
  collab: '$5/mo',
  view: 'Free',
};

export function seatTooltipsForVariant(variant: ResearchVariant): Record<SeatKind, string> {
  return variant === 'pro' ? PRO_SEAT_TOOLTIPS : ORG_SEAT_TOOLTIPS;
}

export function seatPriceRowForVariant(variant: ResearchVariant): Record<SeatKind, string> {
  return variant === 'pro' ? PRO_SEAT_PRICE_ROW : ORG_SEAT_PRICE_ROW;
}

export function seatPriceOnlyForVariant(variant: ResearchVariant): Record<SeatKind, string> {
  return variant === 'pro' ? PRO_SEAT_PRICE_ONLY : ORG_SEAT_PRICE_ONLY;
}

export type SeatChangeBillingContext = {
  variant: ResearchVariant;
  /** Dashboard seat-request approval (vs People manual change). */
  isSeatRequestApproval: boolean;
  effectiveSeat: SeatKind;
  pendingSeat: SeatKind;
};

/**
 * Maps the prototype surface to an authored scenario. Unlisted combinations return null
 * (caller keeps legacy copy).
 */
export function resolveBillingScenario(ctx: SeatChangeBillingContext): BillingScenarioDef | null {
  const { variant, isSeatRequestApproval, effectiveSeat, pendingSeat } = ctx;
  if (pendingSeat === effectiveSeat) return null;

  if (isSeatRequestApproval) {
    if (variant === 'org') return ORG_SCENARIOS.ORG_REQUEST_UPGRADE_AVAILABLE_SEAT;
    return PRO_SCENARIOS.PRO_ANNUAL_REQUEST_UPGRADE_AVAILABLE_SEAT;
  }

  if (variant === 'org') {
    if (isSeatUpgrade(effectiveSeat, pendingSeat)) return ORG_SCENARIOS.ORG_UPGRADE_PURCHASE_REQUIRED;
    if (isSeatDowngrade(effectiveSeat, pendingSeat)) return ORG_SCENARIOS.ORG_DOWNGRADE_NEW_SEAT_PURCHASED;
    return null;
  }

  if (isSeatUpgrade(effectiveSeat, pendingSeat)) return PRO_SCENARIOS.PRO_MONTHLY_UPGRADE_PURCHASE_REQUIRED;
  if (isSeatDowngrade(effectiveSeat, pendingSeat)) return PRO_SCENARIOS.PRO_MONTHLY_DOWNGRADE_PURCHASE_REQUIRED;
  return null;
}

export type BillingPlaceholdersInput = {
  orgName: string;
  invoiceDate: string;
  planRenewalDate: string;
  startDate: string;
  oldSeatLabel: string;
  newSeatLabel: string;
  /** Request flows: available tier name (e.g. Full). */
  requestSeatTierLabel: string;
};

function substituteAll(template: string, map: Record<string, string>): string {
  let out = template;
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const val = map[key];
    if (val === undefined) continue;
    out = out.split(key).join(val);
  }
  return out;
}

export function buildResolvedBillingCopy(
  scenario: BillingScenarioDef,
  input: BillingPlaceholdersInput,
): {
  confirmationBody: string;
  billingPreviewLines: string[];
  helperTextLines: string[];
  proratedCostTooltip?: string;
  toastBody: string;
} {
  const valueMap: Record<string, string> = {
    '[ORG NAME]': input.orgName,
    '[INVOICE DATE]': input.invoiceDate,
    '[PLAN RENEWAL DATE]': input.planRenewalDate,
    '[START DATE]': input.startDate,
    '[SEAT NAME]': input.requestSeatTierLabel,
    '[OLD SEAT NAME]': input.oldSeatLabel,
    '[NEW SEAT NAME]': input.newSeatLabel,
    ...scenario.mock_values,
  };

  return {
    confirmationBody: substituteAll(scenario.confirmation_body, valueMap),
    billingPreviewLines: scenario.billing_preview_lines.map((line) => substituteAll(line, valueMap)),
    helperTextLines: scenario.helper_text_lines.map((line) => substituteAll(line, valueMap)),
    proratedCostTooltip: scenario.prorated_cost_tooltip
      ? substituteAll(scenario.prorated_cost_tooltip, valueMap)
      : undefined,
    toastBody: substituteAll(scenario.toast_body, valueMap),
  };
}
