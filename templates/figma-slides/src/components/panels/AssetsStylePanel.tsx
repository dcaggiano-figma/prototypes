import { Button, CardPrimitive, SearchInput, IconButton } from '@figma/fpl-components';
import { Icon24Adjust } from '@figma/fpl-icons';

interface AssetsStylePanelProps {
  title: string;
  searchPlaceholder: string;
  cardLabel: string;
  cardDescription: string;
  buttonLabel: string;
}

export function AssetsStylePanel({
  title,
  searchPlaceholder,
  cardLabel,
  cardDescription,
  buttonLabel,
}: AssetsStylePanelProps) {
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
      <div className="flex flex-col px-2 pt-2 border-t border-border">
        <CardPrimitive.Root className="relative flex flex-col gap-2 p-2">
          <CardPrimitive.MainButton
            onClick={() => console.log(`${cardLabel} clicked`)}
            className="absolute inset-0 rounded-lg hover:bg-bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-selected"
          />
          <div className="overflow-hidden border border-border rounded-md aspect-[16/9] bg-bg-secondary" />
          <div className="flex flex-col">
            <span className="text-bodyMd text-text">{cardLabel}</span>
            <span className="text-bodyMd text-text-secondary">{cardDescription}</span>
          </div>
        </CardPrimitive.Root>
        <div className="flex py-3 px-2">
          <Button variant="secondary" width="fill" aria-label={buttonLabel}>
            {buttonLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
