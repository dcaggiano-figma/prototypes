import { Button, CardPrimitive, SearchInput, IconButton } from '@figma/fpl-components';
import { Icon24Adjust } from '@figma/fpl-icons';

export function AssetsPanel() {
  return (
    <>
      <div className="px-3 py-12px border-b border-border">
        <span className="text-bodyLgStrong text-text">Assets</span>
      </div>
      <div className="pl-3 pr-12px py-12px flex items-center gap-2">
        <SearchInput aria-label="File search" placeholder="Search all libraries..." />
        <IconButton aria-label="Filter">
          <Icon24Adjust/>
        </IconButton>
      </div>
      <div className="flex flex-col px-2 pt-2 border-t border-border">
        <CardPrimitive.Root
          className="relative flex flex-col gap-2 p-2"
        >
          <CardPrimitive.MainButton
            onClick={() => console.log("Library clicked")}
            className="absolute inset-0 rounded-lg hover:bg-bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-selected"
          />
          <div className="overflow-hidden border border-border rounded-md aspect-[16/9] bg-bg-secondary"> </div>
          <div className="flex flex-col">
            <span className="text-bodyMd text-text">Library name</span>
            <span className="text-bodyMd text-text-secondary">100 components</span>
          </div>
        </CardPrimitive.Root>
        <div className="flex py-3 px-2">
        <Button variant="secondary" width='fill' aria-label="Add more">Add more libraries</Button>
        </div>
      </div>
    </>
  );
}
