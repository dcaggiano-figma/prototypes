import { Button, SearchInput, IconButton } from '@figma/fpl-components';
import { Icon24Adjust } from '@figma/fpl-icons';
import { Card } from '@prototype/shared';

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
        <Card
          label="Library name"
          subtext="100 components"
          onClick={() => console.log("Library clicked")}
        >
          <div className="overflow-hidden border border-border rounded-md aspect-[16/9] bg-bg-secondary"> </div>
        </Card>
        <div className="flex py-3 px-2">
        <Button variant="secondary" width='fill' aria-label="Add more">Add more libraries</Button>
        </div>
      </div>
    </>
  );
}
