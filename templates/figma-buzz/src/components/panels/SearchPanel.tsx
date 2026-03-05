import { SearchInput, IconButton } from '@figma/fpl-components';
import { Icon24Adjust } from '@figma/fpl-icons';

export function SearchPanel() {

  return (
    <>
      <div className="px-3 py-12px border-b border-border">
        <span className="text-bodyLgStrong text-text">Find</span>
      </div>
      <div className="pl-3 pr-12px py-12px flex items-center gap-2">
        <SearchInput aria-label="File search" placeholder="Find..." />
        <IconButton aria-label="Filter">
          <Icon24Adjust/>
        </IconButton>
      </div>
      <div className="flex flex-col px-3 pt-3 border-t border-border">
        <span className="text-bodyMd text-text-secondary">No results on this page</span>
      </div>
    </>
  );
}
