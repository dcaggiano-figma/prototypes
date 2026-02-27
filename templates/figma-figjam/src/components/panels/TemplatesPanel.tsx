import { Button, SearchInput, IconButton } from '@figma/fpl-components';
import { Icon24Adjust } from '@figma/fpl-icons';
import { Card } from '@prototype/shared';

const TEMPLATES = [
  { id: 'brainstorming', name: 'Brainstorming', category: 'Ideation' },
  { id: 'retrospective', name: 'Retrospective', category: 'Agile' },
  { id: 'workflow-map', name: 'Workflow Map', category: 'Planning' },
  { id: 'user-journey', name: 'User Journey', category: 'Research' },
];

export function TemplatesPanel() {
  return (
    <>
      <div className="px-3 py-12px border-b border-border">
        <span className="text-bodyLgStrong text-text">Templates</span>
      </div>
      <div className="pl-3 pr-12px py-12px flex items-center gap-2">
        <SearchInput aria-label="Search templates" placeholder="Search templates..." />
        <IconButton aria-label="Filter">
          <Icon24Adjust />
        </IconButton>
      </div>
      <div className="flex flex-col px-2 pt-2 gap-1 border-t border-border overflow-y-auto flex-1">
        {TEMPLATES.map((template) => (
          <Card
            key={template.id}
            label={template.name}
            subtext={template.category}
            onClick={() => console.log(`Template clicked: ${template.name}`)}
          >
            <div className="overflow-hidden border border-border rounded-md aspect-[16/9] bg-bg-secondary" />
          </Card>
        ))}
        <div className="flex py-3 px-2">
          <Button variant="secondary" width="fill" aria-label="Browse all templates">
            Browse all templates
          </Button>
        </div>
      </div>
    </>
  );
}
