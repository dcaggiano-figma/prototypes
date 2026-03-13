import type { ICellRendererParams } from 'ag-grid-community';
import styles from '../table.module.css';

export function DefaultCellRenderer(params: ICellRendererParams) {
  return (
    <div className={styles.cellContentWrapper}>
      {params.valueFormatted ?? params.value}
    </div>
  );
}
