import { useState, useEffect, useCallback } from 'react';
import type { IHeaderParams } from 'ag-grid-community';
import { Checkbox } from '@figma/fpl-components';
import styles from '../table.module.css';

export function CheckboxHeaderRenderer(props: IHeaderParams) {
  const [selectState, setSelectState] = useState<
    'checked' | 'unchecked' | 'mixed'
  >('unchecked');

  const updateState = useCallback(() => {
    const api = props.api;
    const totalRows = api.getDisplayedRowCount();
    let selectedCount = 0;
    api.forEachNode((node) => {
      if (node.isSelected()) selectedCount++;
    });

    if (selectedCount === 0) setSelectState('unchecked');
    else if (selectedCount === totalRows) setSelectState('checked');
    else setSelectState('mixed');
  }, [props.api]);

  useEffect(() => {
    props.api.addEventListener('selectionChanged', updateState);
    props.api.addEventListener('modelUpdated', updateState);
    updateState();
    return () => {
      props.api.removeEventListener('selectionChanged', updateState);
      props.api.removeEventListener('modelUpdated', updateState);
    };
  }, [props.api, updateState]);

  const handleChange = () => {
    if (selectState === 'checked') {
      props.api.deselectAll();
    } else {
      props.api.selectAll();
    }
  };

  return (
    <div className={styles.checkboxCell}>
      <Checkbox
        checked={selectState === 'checked'}
        mixed={selectState === 'mixed'}
        onChange={handleChange}
        label={<span />}
      />
    </div>
  );
}
