import type { ICellRendererParams } from 'ag-grid-community';
import styles from '../table.module.css';

export function RowNumberCellRenderer(props: ICellRendererParams) {
  return (
    <div className={styles.rowNumberCell}>
      {props.node.rowIndex != null ? props.node.rowIndex + 1 : ''}
    </div>
  );
}
