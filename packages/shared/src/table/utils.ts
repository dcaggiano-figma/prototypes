import type { SectionMarkerRow, TableSection } from './types';

export function isSectionMarker(row: unknown): row is SectionMarkerRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    '__sectionMarker' in row &&
    (row as SectionMarkerRow).__sectionMarker === true
  );
}

/**
 * Injects section marker rows at group boundaries.
 * Returns a new array with marker rows inserted before each group.
 */
export function injectSectionRows<TData>(
  data: TData[],
  sectionField: keyof TData & string,
  sections?: TableSection[],
  collapsedSections?: Set<string>,
): (TData | SectionMarkerRow)[] {
  const grouped = new Map<string, TData[]>();
  const order: string[] = [];

  for (const row of data) {
    const key = String(row[sectionField] ?? '');
    if (!grouped.has(key)) {
      grouped.set(key, []);
      order.push(key);
    }
    grouped.get(key)!.push(row);
  }

  const result: (TData | SectionMarkerRow)[] = [];

  for (const key of order) {
    const rows = grouped.get(key)!;
    const section = sections?.find((s) => s.field === key);
    const isCollapsed = collapsedSections?.has(key) ?? section?.collapsed ?? false;

    const marker: SectionMarkerRow = {
      __sectionMarker: true,
      __sectionField: key,
      __sectionLabel: section?.label ?? key,
      __sectionCount: rows.length,
      __sectionCollapsed: isCollapsed,
    };

    result.push(marker);
    if (!isCollapsed) {
      result.push(...rows);
    }
  }

  return result;
}
