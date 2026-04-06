import { createContext, useContext, type ReactNode } from 'react';

/**
 * Research variants (`?variant=org` | `?variant=pro` in the URL) only swap strings
 * from this file. Everything else (layout, flows, data) you edit like any other prototype.
 *
 * `PRO_COPY_OVERRIDES` is merged on top of the base copy. Leave it empty until you have
 * final pro wording — then add only the fields that should differ (org and pro can match
 * for everything you don’t override).
 */
export type ResearchVariant = 'org' | 'pro';

export type ResearchCopy = {
  productAdminTitle: string;
  shellAdminLabel: string;
  /** Used in seat-approval flyout (“… will assign them a … seat”). */
  seatFlyoutEntityName: string;
  removeMemberLabel: string;
};

/** Default strings (also used for `org`, and as the fallback for `pro`). */
const BASE_COPY: ResearchCopy = {
  productAdminTitle: 'Twigma admin',
  shellAdminLabel: 'Admin',
  seatFlyoutEntityName: 'Twigma',
  removeMemberLabel: 'Remove from organization',
};

/** Pro-only differences. Empty = pro matches org until you add entries. */
const PRO_COPY_OVERRIDES: Partial<ResearchCopy> = {};

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
