import { useEffect, useMemo, useState } from 'react';
import { SearchInput, Tabs, Window } from '@figma/fpl-components';
import type { Recipe, RecipeCategory } from './types';
import { CATEGORY_LABELS } from './types';

const { Sidebar } = Window;

interface PatternLibrarySidebarProps {
  recipes: Recipe[];
  onSelect: (id: string) => void;
}

const CATEGORY_ORDER: RecipeCategory[] = [
  'forms',
  'navigation',
  'overlays',
  'data-display',
  'layout',
  'feedback',
  'property-panels',
];

export function PatternLibrarySidebar({ recipes, onSelect }: PatternLibrarySidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.components.some((c) => c.name.toLowerCase().includes(q)),
    );
  }, [recipes, search]);

  const grouped = useMemo(() => {
    const map = new Map<RecipeCategory, Recipe[]>();
    for (const cat of CATEGORY_ORDER) {
      const items = filtered.filter((r) => r.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  // Build a stable tab map from all recipes
  const tabMap = useMemo(() => {
    const map: Record<string, true> = {};
    for (const r of recipes) {
      map[r.id] = true;
    }
    return map;
  }, [recipes]);

  const [tabPropsMap, , tabManager] = Tabs.useTabs(tabMap, {
    defaultActive: recipes[0]?.id,
    onChange: (tabId) => onSelect(tabId),
  });

  // Auto-select first visible recipe when filter narrows and current tab is hidden
  const visibleIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);

  useEffect(() => {
    if (filtered.length > 0 && !visibleIds.has(tabManager.activeTab)) {
      const firstId = filtered[0].id;
      tabManager.setActiveTab(firstId);
    }
  }, [filtered, visibleIds, tabManager]);

  return (
    <>
      <Sidebar.Group>
        <SearchInput
          aria-label="Search recipes"
          placeholder="Search components..."
          value={search}
          onChange={setSearch}
        />
      </Sidebar.Group>
      <div className="overflow-y-auto">
      <Sidebar.TabStrip manager={tabManager}>
        {grouped.size === 0 && (
          <div className="px-3 py-2 text-text-tertiary text-bodySm">No results</div>
        )}
        {[...grouped.entries()].map(([category, items]) => (
          <Sidebar.TabGroup key={category}>
            <Sidebar.GroupTitle>{CATEGORY_LABELS[category]}</Sidebar.GroupTitle>
            {items.map((recipe) =>
              visibleIds.has(recipe.id) ? (
                <Sidebar.Tab key={recipe.id} {...tabPropsMap[recipe.id]}>
                  {recipe.name}
                </Sidebar.Tab>
              ) : null,
            )}
          </Sidebar.TabGroup>
        ))}
      </Sidebar.TabStrip>
      </div>
    </>
  );
}
