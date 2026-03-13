import type { ICellRendererParams } from 'ag-grid-community';
import { Icon16DragHandle } from '@figma/fpl-icons';
import styles from '../table.module.css';

export function DragHandleCellRenderer(_props: ICellRendererParams) {
  return (
    <div className={styles.dragHandle}>
      <Icon16DragHandle />
    </div>
  );
}
