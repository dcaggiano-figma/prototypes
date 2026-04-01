import { ButtonPrimitive, IconButton } from '@figma/fpl-components';
import { Icon24ChevronRightLarge } from '@figma/fpl-icons';
import { Text } from '@prototype/shared';
import { clsx } from 'clsx';

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

interface SettingRow {
  title: string;
  description?: string;
  meta?: string;
  action?: 'enabled' | 'manage' | string;
  noteLink?: string;
}

interface SettingSection {
  heading: string;
  topNote?: React.ReactNode;
  rows: SettingRow[];
}

const SETTINGS: SettingSection[] = [
  {
    heading: 'Organization profile',
    rows: [
      {
        title: 'Add or change your organization\'s public profile handle',
        description: 'Organization handle',
        meta: '@figma',
      },
      {
        title: 'Brand/sharing profile',
        description: 'Manage your organization\'s public profile, including all published files, plugins, likes, and follow data',
        action: 'enabled',
      },
      {
        title: 'Restricted commenters',
        description: 'Manage Community members who have been restricted from commenting on your organization\'s resources',
        action: 'enabled',
      },
    ],
  },
  {
    heading: 'Team management',
    rows: [
      {
        title: 'Add or change your organization\'s public profile handle',
        description: 'Organization handle',
        action: 'enabled',
      },
    ],
  },
  {
    heading: 'External access',
    rows: [
      {
        title: 'Guest membership',
        description: 'Control how external users can join your organization as guests',
        action: 'enabled',
      },
      {
        title: 'Access to external content',
        description: 'Choose how members access files, projects, and teams from outside Figma Staging Org',
        action: 'enabled',
      },
      {
        title: 'Web publishing',
        description: 'Allow members to publish and maintain sites and web apps',
        action: 'enabled',
      },
      {
        title: 'Backend integration',
        description: 'Allow members to use Supabase for site and web app backends',
        action: 'enabled',
      },
      {
        title: 'Public sharing',
        description: 'Allow members to share links outside of your organization',
        action: 'enabled',
      },
      {
        title: 'File exporting',
        description: 'Choose who can copy, save, and export from your organization\'s files',
        action: 'enabled',
      },
      {
        title: 'Password protection options',
        description: 'Choose what type of passwords people can set for Figma files and published sites/apps',
        action: 'enabled',
      },
      {
        title: 'Restrict personal access on this network',
        description: 'Choose if access to Figma on the Figma Staging Org network is only allowed for approved accounts',
        meta: 'Current IP range(s): 47.47.47.47/32',
        action: 'enabled',
      },
    ],
  },
  {
    heading: 'Login and provisioning',
    rows: [
      {
        title: 'Manage domains',
        description: 'Control which domains are associated with your organization',
        action: 'enabled',
      },
      {
        title: 'Authentication',
        description: 'Change how users log in and authenticate to Figma',
        meta: 'Any method',
        action: 'manage',
      },
      {
        title: 'Manage identity providers (IdP)',
        description: 'Configure identity providers for your organization',
        action: 'enabled',
      },
      {
        title: 'IP allowlisting',
        description: 'Specify which IP addresses members must use to access your organization',
        action: 'enabled',
      },
      {
        title: 'Idle session timeout',
        description: 'Choose when to automatically log out inactive accounts',
        meta: 'Default (21 days)',
        action: 'manage',
      },
      {
        title: 'Workspace selector',
        description: 'Show a prompt asking new and unassigned users to select a workspace when they log in',
        noteLink: 'Learn more',
        action: 'enabled',
      },
    ],
  },
  {
    heading: 'Billing',
    topNote: (
      <p className="text-bodyMd text-text-secondary m-0">
        Your annual renewal on March 25, 2025, 10:00 PM UTC will renew automatically.{' '}
        <ButtonPrimitive type="button" className="text-text underline bg-transparent border-0 p-0 cursor-pointer text-bodyMd">Learn more</ButtonPrimitive>
      </p>
    ),
    rows: [
      {
        title: 'Payment details',
        description: 'Update the payment method and billing address on file',
        action: 'enabled',
      },
      {
        title: 'Invoice details',
        description: 'Update the shipping address that appears on your invoices',
        action: 'enabled',
      },
      {
        title: 'Seat approval settings',
        description: 'Configure how seat requests and upgrades are approved',
        action: 'enabled',
      },
      {
        title: 'Auto-approve seat digests',
        description: 'Get emailed when members move to a higher-priced seat through your approval settings',
        action: 'enabled',
      },
      {
        title: 'Billing contacts',
        description: 'Choose who gets email notifications about renewals, invoices, and payments',
        action: 'enabled',
      },
    ],
  },
  {
    heading: 'Resources',
    rows: [
      {
        title: 'Plugin approval',
        description: 'Require admin approval for Community plugins',
        action: 'enabled',
      },
      {
        title: 'Widget approval',
        description: 'Require admin approval for Community widgets',
        action: 'enabled',
      },
      {
        title: 'Dev Mode settings',
        description: 'Customize the experience of all Dev Mode users in your organization',
        action: 'enabled',
      },
      {
        title: 'UI kits',
        description: 'Enable libraries made by Figma and selected partners to be available by default in design files',
        action: 'enabled',
      },
      {
        title: 'Community Resources',
        description: 'Let users browse Community resources from the file browser',
        action: 'enabled',
      },
      {
        title: 'Unsplash images',
        description: 'Let users browse and add free stock images from Unsplash (Figma Buzz only)',
        action: 'enabled',
      },
    ],
  },
  {
    heading: 'AI',
    rows: [
      {
        title: 'AI features',
        description: 'Connect your organization on Figma AI',
        noteLink: 'Learn more',
        action: 'enabled',
      },
      {
        title: 'Content training',
        description: 'Set Figma to use your organization\'s content to improve AI features',
        action: 'enabled',
      },
    ],
  },
  {
    heading: 'Data',
    rows: [
      {
        title: 'Discovery API',
        description: 'Extract text-based communication from your organization via downloadable files',
        noteLink: 'Learn more',
        action: 'enabled',
      },
      {
        title: 'Data storage localization',
        description: 'Store localization-supported data in the US or EU. To change storage location please contact support',
        meta: 'Current location: United States',
        action: 'enabled',
      },
      {
        title: 'Audio',
        description: "Enable users to use audio in your organization's files",
        action: 'enabled',
      },
    ],
  },
  {
    heading: 'Other',
    rows: [
      {
        title: 'Template publishing',
        description: 'Let users publish and use templates within your organization in FigJam, Figma Slides, and Figma Buzz',
        action: 'enabled',
      },
      {
        title: 'Cursor chat',
        description: 'Enable cursor chat for all files in your organization',
        action: 'enabled',
      },
      {
        title: 'Community file publishing',
        description: 'Allow organization admins to publish files to their personal profiles on Community',
        action: 'enabled',
      },
      {
        title: 'Member metadata',
        description: 'Change which SCIM metadata shows on the members tab',
        meta: 'Cost center',
        action: 'manage',
      },
      {
        title: 'Connected apps',
        description: 'Manage which third-party apps have access to your organization',
        action: 'enabled',
      },
      {
        title: 'Compliance Hub',
        description: "Administrators can access the Figma compliance hub to access Figma's compliance documents and answers to common questions",
        action: 'enabled',
      },
      {
        title: 'Windows Enterprise installer',
        description: "Download Figma's machine-wide MSI for Windows",
        action: 'enabled',
      },
      {
        title: 'macOS Enterprise installer',
        description: "Download Figma's PKG for macOS",
        action: 'enabled',
      },
    ],
  },
  {
    heading: 'Danger zone',
    rows: [
      {
        title: 'Delete this organization',
        description: 'Request to delete this organization',
        action: 'manage',
      },
      {
        title: 'Delete user and their data',
        description: 'Request to permanently delete a user and their data',
        action: 'manage',
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Components                                                                  */
/* -------------------------------------------------------------------------- */

import React from 'react';

function ActionButton({ action }: { action?: string }) {
  if (!action) return null;
  return (
    <IconButton variant="ghost" aria-label="Open">
      <Icon24ChevronRightLarge />
    </IconButton>
  );
}

function SettingRowItem({ row, first }: { row: SettingRow; first?: boolean }) {
  return (
    <div className={clsx('flex items-start justify-between gap-24px pb-16px', first ? 'pt-0' : 'pt-16px border-t border-border')}>
      <div className="flex flex-col gap-4px min-w-0">
        <Text>{row.title}</Text>
        {row.description && (
          <span className="text-bodyMd text-text-secondary">{row.description}</span>
        )}
        {row.meta && (
          <span className="text-bodyMd text-text-secondary">{row.meta}</span>
        )}
        {row.noteLink && (
          <ButtonPrimitive type="button" className="text-bodyMd text-text underline bg-transparent border-0 p-0 cursor-pointer text-left w-fit">
            {row.noteLink}
          </ButtonPrimitive>
        )}
      </div>
      <div className="shrink-0">
        <ActionButton action={row.action} />
      </div>
    </div>
  );
}

function SettingSectionBlock({ section, first }: { section: SettingSection; first?: boolean }) {
  return (
    <div className={clsx('flex gap-32px py-24px', !first && 'border-t border-border')}>
      <div className="w-[200px] shrink-0">
        <Text size='lg' strong>{section.heading}</Text>
      </div>
      <div className="flex-1 min-w-0">
        {section.topNote && (
          <div className="pb-8px">{section.topNote}</div>
        )}
        {section.rows.map((row, i) => (
          <SettingRowItem key={row.title} row={row} first={i === 0} />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                        */
/* -------------------------------------------------------------------------- */

function SettingsPage() {
  return (
    <div className="flex w-full flex-col h-full">
      <div className="w-full px-32px pb-24px border-b border-border shrink-0">
        <h1 className="text-headingLg font-bold text-text m-0">Settings</h1>
      </div>
      <div className="px-32px flex-1 overflow-y-auto">
        {SETTINGS.map((section, i) => (
          <SettingSectionBlock key={section.heading} section={section} first={i === 0} />
        ))}
      </div>
    </div>
  );
}

export default SettingsPage;
