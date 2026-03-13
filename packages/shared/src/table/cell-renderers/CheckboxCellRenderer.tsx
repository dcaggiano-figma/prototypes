import { useState, useEffect } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import { Checkbox } from '@figma/fpl-components';
import styles from '../table.module.css';

export function CheckboxCellRenderer(props: ICellRendererParams) {
  const [checked, setChecked] = useState(props.node.isSelected() ?? false);

  useEffect(() => {
    const listener = () => {
      setChecked(props.node.isSelected() ?? false);
    };
    props.node.addEventListener('rowSelected', listener);
    return () => {
      props.node.removeEventListener('rowSelected', listener);
    };
  }, [props.node]);

  const handleChange = (value: boolean) => {
    props.node.setSelected(value);
  };

  return (
    <div className={styles.checkboxCell}>
      <Checkbox checked={checked} onChange={handleChange} label={<span />} />
    </div>
  );
}
