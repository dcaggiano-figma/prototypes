import { useState, useLayoutEffect, useEffect, useMemo } from 'react';
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
import { Icon24ActionsLarge } from '@figma/fpl-icons';
import type { TabConfig, ActionSection } from './types';

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

interface QuickActionsProps {
  tabs: TabConfig[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  /** Explicit popover width. When omitted, measures from toolbarRef. */
  width?: number;
  /** Controls trigger button variant. When omitted, uses isOpen. */
  isActive?: boolean;
  /** Optional callback when an action is selected. */
  onAction?: (id: string) => void;
}

export function QuickActions({
  tabs,
  isOpen,
  onOpenChange,
  toolbarRef,
  width,
  isActive,
  onAction,
}: QuickActionsProps) {
  const [search, setSearch] = useState('');

  const checkboxIds = useMemo(() => getCheckboxIds(tabs), [tabs]);
  const initialChecked = useMemo(() => getInitialCheckedState(tabs), [tabs]);
  const [checkedState, setCheckedState] = useState(initialChecked);

  // If no explicit width, measure from the toolbar ref
  const [measuredWidth, setMeasuredWidth] = useState(400);

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
      if (width == null) {
        setMeasuredWidth(toolbarRef.current.offsetWidth);
      }
    }
  }, [context.refs, toolbarRef, width]);

  const popoverWidth = width ?? measuredWidth;

  // --- Tabs ---
  const tabKeys = Object.fromEntries(tabs.map((t) => [t.key, true])) as Record<string, true>;
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<string>(tabKeys, {
    defaultActive: tabs[0]?.key ?? 'all',
  });

  // --- Autocomplete ---
  const handleAction = (id: string) => {
    onAction?.(id);
  };

  const autocomplete = AutocompletePrimitive.useAutocomplete({
    expanded: isOpen,
    onExpand: onOpenChange,
    expandOnFocus: false,
    onSelect(value) {
      if (value) {
        if (checkboxIds.has(value)) {
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

  // --- Render helpers ---

  function renderTabContent(tab: TabConfig) {
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

  const triggerActive = isActive ?? isOpen;
  const containerProps = getContainerProps();

  return (
    <>
      <IconButton
        {...getTriggerProps()}
        size="lg"
        aria-label="Actions"
        variant={triggerActive ? 'primary' : 'ghost'}
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
          <div className="h-[360px] flex flex-col overflow-hidden" style={{ width: popoverWidth }}>
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
                {tabs.map((tab) => (
                  <Tabs.Tab key={tab.key} {...tabPropsMap[tab.key]}>
                    {tab.label}
                  </Tabs.Tab>
                ))}
              </Tabs.TabStrip>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto pb-2">
              {tabs.map((tab) => (
                <Tabs.TabPanel key={tab.key} {...tabPanelPropsMap[tab.key]}>
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
