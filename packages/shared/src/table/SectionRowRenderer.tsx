import { IconButton } from '@figma/fpl-components';
import { Icon16ChevronDown, Icon16ChevronRight } from '@figma/fpl-icons';
import type { SectionMarkerRow } from './types';
import styles from './table.module.css';

interface SectionRowRendererProps {
  data: SectionMarkerRow;
  onToggle: (sectionKey: string) => void;
}

export function SectionRowRenderer({ data, onToggle }: SectionRowRendererProps) {
  return (
    <div className={styles.sectionRow}>
      <IconButton
        onClick={() => onToggle(data.__sectionField)}
        aria-label={data.__sectionCollapsed ? 'Expand section' : 'Collapse section'}
        variant="ghost"
      >
        {data.__sectionCollapsed ? <Icon16ChevronRight /> : <Icon16ChevronDown />}
      </IconButton>
      <span>{data.__sectionLabel}</span>
      <span className={styles.sectionCount}>{data.__sectionCount}</span>
    </div>
  );
}
