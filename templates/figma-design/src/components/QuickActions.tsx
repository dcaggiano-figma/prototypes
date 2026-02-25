import { useState, useLayoutEffect, useEffect } from 'react';
import {
  AutocompletePrimitive,
  Badge,
  Checkbox,
  HiddenLabel,
  IconButton,
  SearchInput,
  Popover,
  PopoverPrimitive,
  Tabs,
} from '@figma/fpl-components';
import {
  Icon24ActionsLarge,
  Icon24AiEdit,
  Icon24Check,
  Icon24Checklist,
  Icon24ExtendImage,
  Icon24FirstDraft,
  Icon24ImageToDesign,
  Icon24Instance,
  Icon24Interactive,
  Icon24Pencil,
  Icon24ReadyForDev,
  Icon24RemoveBackground,
  Icon24Rename,
  Icon24ReplaceContent,
  Icon24Rewrite,
  Icon24Settings,
  Icon24Shorten,
  Icon24Translate,
  Icon24VisualSearch,
  Icon24Wand,
} from '@figma/fpl-icons';
import type { ComponentType } from 'react';


// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

interface ActionItem {
  id: string;
  icon?: ComponentType;
  label: string;
  onClick?: () => void;
  badge?: string;
  checkbox?: boolean;
  defaultChecked?: boolean;
}

interface ActionSection {
  title: string;
  items: ActionItem[];
}

interface TabConfig {
  key: string;
  label: string;
  sections: ActionSection[];
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// Tab data
// ---------------------------------------------------------------------------

const TABS: TabConfig[] = [
  {
    key: 'all',
    label: 'All',
    sections: [
      {
        title: 'Recents',
        items: [
          { id: 'preferences', icon: Icon24Settings, label: 'Preferences' },
          { id: 'mark-ready', icon: Icon24Check, label: 'Mark as ready' },
          { id: 'image-to-design', icon: Icon24ImageToDesign, label: 'Image to design' },
        ],
      },
      {
        title: 'Suggestions',
        items: [
          { id: 'rename', icon: Icon24Pencil, label: 'Rename selection' },
          { id: 'ai-assistant', icon: Icon24Wand, label: 'AI assistant', badge: 'New' },
          { id: 'create-component', icon: Icon24Instance, label: 'Create component' },
          { id: 'checklist', icon: Icon24Checklist, label: 'Design review checklist' },
          { id: 'mcp-toggle', label: 'Enable desktop MCP server', checkbox: true, defaultChecked: true },
        ],
      },
      {
        title: 'Image editing',
        items: [
          { id: 'remove-background', icon: Icon24RemoveBackground, label: 'Remove background', badge: 'AI' },
          { id: 'boost-resolution', icon: Icon24ExtendImage, label: 'Boost resolution' },
          { id: 'edit-image-prompt', icon: Icon24AiEdit, label: 'Edit image with prompt' },
        ],
      },
      {
        title: 'Design tools',
        items: [
          { id: 'rename-layers', icon: Icon24Rename, label: 'Rename layers' },
          { id: 'replace-content', icon: Icon24ReplaceContent, label: 'Replace content' },
          { id: 'search-image-selection', icon: Icon24VisualSearch, label: 'Search with image or selection' },
          { id: 'first-draft', icon: Icon24FirstDraft, label: 'First Draft' },
          { id: 'add-interactions', icon: Icon24Interactive, label: 'Add interactions' },
          { id: 'check-designs', icon: Icon24ReadyForDev, label: 'Check designs', badge: 'New' },
        ],
      },
      {
        title: 'Riffing and writing',
        items: [
          { id: 'rewrite', icon: Icon24Rewrite, label: 'Rewrite this...' },
          { id: 'shorten', icon: Icon24Shorten, label: 'Shorten' },
          { id: 'translate', icon: Icon24Translate, label: 'Translate to...' },
        ],
      },
    ],
  },
  {
    key: 'assets',
    label: 'Assets',
    sections: [],
    emptyMessage: 'No recent assets',
  },
  {
    key: 'plugins',
    label: 'Plugins & widgets',
    sections: [],
    emptyMessage: 'No plugins installed',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter sections by search query, removing sections with no matches. */
function filterSections(sections: ActionSection[], query: string): ActionSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.label.toLowerCase().includes(q)),
    }))
    .filter((section) => section.items.length > 0);
}

/** Collect all checkbox item IDs into a Set for quick lookup. */
function getCheckboxIds(tabs: TabConfig[]): Set<string> {
  const ids = new Set<string>();
  for (const tab of tabs) {
    for (const section of tab.sections) {
      for (const item of section.items) {
        if (item.checkbox) ids.add(item.id);
      }
    }
  }
  return ids;
}

/** Build initial checked state from tab data. */
function getInitialCheckedState(tabs: TabConfig[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const tab of tabs) {
    for (const section of tab.sections) {
      for (const item of section.items) {
        if (item.checkbox) {
          state[item.id] = item.defaultChecked ?? false;
        }
      }
    }
  }
  return state;
}

// ---------------------------------------------------------------------------
// QuickActions component
// ---------------------------------------------------------------------------

const CHECKBOX_IDS = getCheckboxIds(TABS);
const INITIAL_CHECKED = getInitialCheckedState(TABS);

type QuickActionsTab = 'all' | 'assets' | 'plugins';

interface QuickActionsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isActive: boolean;
  triggerWidth: number;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
}

export function QuickActions({ isOpen, onOpenChange, isActive, triggerWidth, toolbarRef }: QuickActionsProps) {
  const [search, setSearch] = useState('');
  const [checkedState, setCheckedState] = useState(INITIAL_CHECKED);
  // --- Popover (positioning only) ---
  const { getTriggerProps, getContainerProps, context } = PopoverPrimitive.usePopover({
    isOpen,
    onOpenChange,
    type: 'dialog',
    softDismiss: true,
    placement: 'top-start',
    offset: 8,
  });

  useLayoutEffect(() => {
    if (toolbarRef.current) {
      context.refs.setPositionReference(toolbarRef.current);
    }
  }, [context.refs, toolbarRef]);

  // --- Tabs ---
  const tabKeys = Object.fromEntries(TABS.map((t) => [t.key, true])) as Record<QuickActionsTab, true>;
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<QuickActionsTab>(tabKeys, {
    defaultActive: 'all',
  });

  // --- Autocomplete ---
  const handleAction = (id: string) => {
    console.log(id);
  };

  const autocomplete = AutocompletePrimitive.useAutocomplete({
    expanded: isOpen,
    onExpand: onOpenChange,
    expandOnFocus: false,
    onSelect(value) {
      if (value) {
        if (CHECKBOX_IDS.has(value)) {
          setCheckedState((prev) => ({ ...prev, [value]: !prev[value] }));
        } else {
          handleAction(value);
          onOpenChange(false);
        }
      }
    },
  });

  // --- Reset on close ---
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  // --- Render helpers (closures over autocomplete & search) ---

  function renderTabContent(tab: TabConfig) {
    // Empty tab (assets, plugins)
    if (tab.sections.length === 0) {
      return (
        <div className="flex flex-col py-3 px-3">
          <span className="text-bodyMd text-text-secondary">{tab.emptyMessage}</span>
        </div>
      );
    }

    const filtered = filterSections(tab.sections, search);

    return (
      <div className="flex flex-col gap-4px py-4px">
        <AutocompletePrimitive.List {...autocomplete.getListProps()} aria-label="Actions">
          {filtered.length === 0 ? (
            <div className="py-3 px-3">
              <span className="text-bodyMd text-text-secondary">No results</span>
            </div>
          ) : (
            filtered.map((section) => (
              <AutocompletePrimitive.Group key={section.title} aria-label={section.title}>
                <div className="px-3 py-2 text-bodyMd text-text-secondary">{section.title}</div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="flex items-center px-2">
                      <AutocompletePrimitive.Option value={item.id} className="flex items-center gap-2 py-1 ps-1 pe-2 flex-1 rounded-md text-bodyLg text-text cursor-pointer data-[activedescendant=true]:bg-bg-hover">
                        <div className="flex items-center justify-center h-4 w-4">{item.checkbox ? (
                          <Checkbox label={<HiddenLabel>{item.label}</HiddenLabel>} checked={checkedState[item.id] ?? false} />
                        ) : (
                          Icon && <Icon />
                        )}
                        </div>
                        <span className="truncate flex-1 text-bodyLg text-text">{item.label}</span>
                        {item.badge && <Badge variant="defaultOutline">{item.badge}</Badge>}
                      </AutocompletePrimitive.Option>
                    </div>
                  );
                })}
              </AutocompletePrimitive.Group>
            ))
          )}
        </AutocompletePrimitive.List>
      </div>
    );
  }

  const containerProps = getContainerProps();

  return (
    <>
      <IconButton
        {...getTriggerProps()}
        size="lg"
        aria-label="Actions"
        variant={isActive ? 'primary' : 'ghost'}
      >
        <Icon24ActionsLarge />
      </IconButton>

      <PopoverPrimitive.Container
        {...containerProps}
        style={{
          ...containerProps.style,
          opacity: context.isPositioned ? 1 : 0,
        }}
      >
        <Popover.Contents>
          <div className="h-[360px] flex flex-col overflow-hidden" style={{ width: triggerWidth }}>
            {/* Search */}
            <div className="px-8px pt-8px">
              <SearchInput
                {...autocomplete.getInputProps({
                  value: search,
                  onChange: setSearch,
                  placeholder: 'Search actions...',
                  'aria-label': 'Search actions',
                })}
                size="lg"
              />
            </div>

            {/* Tabs */}
            <div className="p-2 border-b border-border">
              <Tabs.TabStrip manager={tabManager}>
                {TABS.map((tab) => (
                  <Tabs.Tab key={tab.key} {...tabPropsMap[tab.key as QuickActionsTab]}>
                    {tab.label}
                  </Tabs.Tab>
                ))}
              </Tabs.TabStrip>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto pb-2">
              {TABS.map((tab) => (
                <Tabs.TabPanel key={tab.key} {...tabPanelPropsMap[tab.key as QuickActionsTab]}>
                  {renderTabContent(tab)}
                </Tabs.TabPanel>
              ))}
            </div>
          </div>
        </Popover.Contents>
      </PopoverPrimitive.Container>
    </>
  );
}
