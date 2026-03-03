import { Button } from '@figma/fpl-components';
import { Icon24Import, Icon24Plus } from '@figma/fpl-icons';

export function VariablesMainContent() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-2 px-6 py-6 text-center">
      <span className="text-headingMd text-text">No variables created in this file</span>
      <span className="text-bodyMd text-text-secondary max-w-[300px]">
        Save colors, numbers, text and states to reuse them in styles, prototypes and across files.
      </span>
      <div className="flex items-center gap-2 mt-2">
        <Button variant="primary" iconPrefix={<Icon24Plus />}>Create</Button>
        <Button variant="secondary" iconPrefix={<Icon24Import />}>Import</Button>
      </div>
    </div>
  );
}
