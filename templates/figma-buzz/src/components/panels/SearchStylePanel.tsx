import { SearchInput, IconButton } from '@figma/fpl-components';
import { Icon24Adjust } from '@figma/fpl-icons';

interface SearchStylePanelProps {
  title: string;
  searchPlaceholder: string;
  emptyMessage?: string;
  children?: React.ReactNode;
}

export function SearchStylePanel({
  title,
  searchPlaceholder,
  emptyMessage,
  children,
}: SearchStylePanelProps) {
  return (
    <>
      <div className="px-3 py-12px border-b border-border">
        <span className="text-bodyLgStrong text-text">{title}</span>
      </div>
      <div className="pl-3 pr-12px py-12px flex items-center gap-2">
        <SearchInput aria-label={`${title} search`} placeholder={searchPlaceholder} />
        <IconButton aria-label="Filter">
          <Icon24Adjust />
        </IconButton>
      </div>
      {children ?? (
        <div className="flex flex-col px-3 pt-3 border-t border-border">
          <span className="text-bodyMd text-text-secondary">{emptyMessage}</span>
        </div>
      )}
    </>
  );
}
