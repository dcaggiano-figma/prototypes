import { createContext, useContext, type ReactNode } from 'react';

/**
 * Research variants (`?variant=org` | `?variant=pro` in the URL) swap strings from this file
 * and `billingResearch.ts` (seat tooltips, prices, seat-change scenarios).
 *
 * `PRO_COPY_OVERRIDES` merges on top of base org-oriented defaults.
 */
export type ResearchVariant = 'org' | 'pro';

export type ResearchCopy = {
  productAdminTitle: string;
  shellAdminLabel: string;
  /** @deprecated Prefer billingOrgName for new copy; kept for any non-billing use. */
  seatFlyoutEntityName: string;
  removeMemberLabel: string;
  /** Substitutes [ORG NAME] in billing / seat-change strings. */
  billingOrgName: string;
  billingPlanTitle: string;
  /** Shown before renewal date on Billing overview (plan billing model). */
  billingPlanDescriptor: string;
  /** Plan renewal date label (not including the word “Renews”). */
  planRenewalDate: string;
  /** [START DATE] for Pro monthly billing preview lines. */
  billingMonthlyStartDate: string;
  /** [INVOICE DATE] in seat-change / billing copy (fixed mock for research). */
  billingInvoiceDate: string;
};

const BASE_COPY: ResearchCopy = {
  productAdminTitle: 'Twigma admin',
  shellAdminLabel: 'Admin',
  seatFlyoutEntityName: 'Twigma',
  removeMemberLabel: 'Remove from organization',
  billingOrgName: 'Twigma',
  billingPlanTitle: 'Your Organization plan',
  billingPlanDescriptor: 'Billed annually',
  planRenewalDate: 'July 30, 2026',
  billingMonthlyStartDate: 'May 1, 2026',
  billingInvoiceDate: 'April 30, 2026',
};

const PRO_COPY_OVERRIDES: Partial<ResearchCopy> = {
  productAdminTitle: 'Twigma Pro admin',
  removeMemberLabel: 'Remove from workspace',
  billingPlanTitle: 'Your Professional plan',
  billingPlanDescriptor: 'Can include annual seats, monthly seats, or both',
};

function copyForVariant(variant: ResearchVariant): ResearchCopy {
  if (variant === 'org') return BASE_COPY;
  return { ...BASE_COPY, ...PRO_COPY_OVERRIDES };
}

type ResearchContextValue = { variant: ResearchVariant; copy: ResearchCopy };

const ResearchContext = createContext<ResearchContextValue | null>(null);

export function ResearchCopyProvider({
  variant,
  children,
}: {
  variant: ResearchVariant;
  children: ReactNode;
}) {
  const value: ResearchContextValue = { variant, copy: copyForVariant(variant) };
  return <ResearchContext.Provider value={value}>{children}</ResearchContext.Provider>;
}

export function useResearch(): ResearchContextValue {
  const ctx = useContext(ResearchContext);
  if (!ctx) {
    throw new Error('useResearch must be used within ResearchCopyProvider');
  }
  return ctx;
}
