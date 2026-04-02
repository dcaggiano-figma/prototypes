import { Button, Tabs } from '@figma/fpl-components';
import { Icon24Plus } from '@figma/fpl-icons';
import { WorkspacesTab } from './content/WorkspacesTab';
import { TeamsTab } from './content/TeamsTab';
import { DraftsTab } from './content/DraftsTab';

type ContentTab = 'workspaces' | 'teams' | 'drafts' | 'connectedProjects';

const TAB_MAP: Record<ContentTab, true> = {
  workspaces: true,
  teams: true,
  drafts: true,
  connectedProjects: true,
};

function ContentPage() {
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<ContentTab>(TAB_MAP, {
    defaultActive: 'workspaces',
  });

  return (
    <div className="flex w-full min-w-0 max-w-none flex-col h-full">
      <div className="w-full px-32px pb-24px border-b border-border shrink-0">
        <h1 className="text-headingLg font-bold text-text m-0">Content</h1>
      </div>

      <div className="mx-32px flex w-[calc(100%-64px)] max-w-none min-w-0 flex-col pt-16px gap-16px flex-1 min-h-0">
        <div className="flex items-center justify-between gap-16px shrink-0">
          <Tabs.TabStrip manager={tabManager}>
            <Tabs.Tab {...tabPropsMap.workspaces}>Workspaces</Tabs.Tab>
            <Tabs.Tab {...tabPropsMap.teams}>Teams</Tabs.Tab>
            <Tabs.Tab {...tabPropsMap.drafts}>Unassigned drafts</Tabs.Tab>
            <Tabs.Tab {...tabPropsMap.connectedProjects}>Connected projects</Tabs.Tab>
          </Tabs.TabStrip>
          <Button variant="primary" iconPrefix={<Icon24Plus />}>
            Create workspace
          </Button>
        </div>

        <Tabs.TabPanel {...tabPanelPropsMap.workspaces} height="fill" width="fill">
          <WorkspacesTab />
        </Tabs.TabPanel>

        <Tabs.TabPanel {...tabPanelPropsMap.teams} height="fill" width="fill">
          <TeamsTab />
        </Tabs.TabPanel>

        <Tabs.TabPanel {...tabPanelPropsMap.drafts} height="fill" width="fill">
          <DraftsTab />
        </Tabs.TabPanel>

        <Tabs.TabPanel {...tabPanelPropsMap.connectedProjects} height="fill" width="fill">
          <p className="text-bodyMd text-text-secondary m-0">Connected projects</p>
        </Tabs.TabPanel>
      </div>
    </div>
  );
}

export default ContentPage;
