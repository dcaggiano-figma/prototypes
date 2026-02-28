import { SearchInput, Tabs, Window } from '@figma/fpl-components';
import {
  Icon24Refresh,
  Icon24Star,
  Icon24Team,
  Icon24Company,
  Icon24Component,
  Icon24Library,
  Icon24BulbOn,
  Icon24Community,
} from '@figma/fpl-icons';

const { Sidebar } = Window;

type LibraryTab =
  | 'thisFile'
  | 'updates'
  | 'recommended'
  | 'yourTeams'
  | 'yourOrganization'
  | 'uiKits';

const TAB_MAP: Record<LibraryTab, true> = {
  thisFile: true,
  updates: true,
  recommended: true,
  yourTeams: true,
  yourOrganization: true,
  uiKits: true,
};

interface LibraryWindowProps {
  onClose: () => void;
}

export function LibraryWindow({ onClose }: LibraryWindowProps) {
  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<LibraryTab>(TAB_MAP, {
    defaultActive: 'updates',
  });

  return (
    <Window.ResizableRoot
      onClose={onClose}
      defaultPosition={{ x: 'center', y: 'center' }}
      defaultWidth={700}
      defaultHeight={580}
      constraints={{ minWidth: 600, minHeight: 400 }}
    >
      <Window.Contents>
        <Window.Header>
          <Window.Title>Manage libraries</Window.Title>
        </Window.Header>

        <Sidebar>
          <Sidebar.Group>
            <SearchInput aria-label="Search all libraries" placeholder="Search all libraries" />
          </Sidebar.Group>
          <Sidebar.TabStrip manager={tabManager}>
            <Sidebar.TabGroup>
              <Sidebar.Tab {...tabPropsMap.thisFile}>
                <Icon24Library />
                This file
              </Sidebar.Tab>
              <Sidebar.Tab {...tabPropsMap.updates}>
                <Icon24Refresh />
                Updates
              </Sidebar.Tab>
            </Sidebar.TabGroup>
            <Sidebar.TabGroup>
              <Sidebar.GroupTitle>Browse libraries</Sidebar.GroupTitle>
              <Sidebar.Tab {...tabPropsMap.recommended}>
                <Icon24BulbOn />
                Recommended
              </Sidebar.Tab>
              <Sidebar.Tab {...tabPropsMap.yourTeams}>
                <Icon24Team />
                Your teams
              </Sidebar.Tab>
              <Sidebar.Tab {...tabPropsMap.yourOrganization}>
                <Icon24Company />
                Your organization
              </Sidebar.Tab>
              <Sidebar.Tab {...tabPropsMap.uiKits}>
                <Icon24Community />
                UI kits
              </Sidebar.Tab>
            </Sidebar.TabGroup>
          </Sidebar.TabStrip>
        </Sidebar>

        <Window.Body>
          <Tabs.TabPanel {...tabPanelPropsMap.thisFile} height="fill">
            <div className="p-2 text-text-secondary text-bodyMd">
              No libraries enabled for this file.
            </div>
          </Tabs.TabPanel>
          <Tabs.TabPanel {...tabPanelPropsMap.updates} height="fill">
            <div className="p-2 text-text-secondary text-bodyMd">
              No updates available.
            </div>
          </Tabs.TabPanel>
          <Tabs.TabPanel {...tabPanelPropsMap.recommended} height="fill">
            <div className="p-2 text-text-secondary text-bodyMd">
              No recommended libraries.
            </div>
          </Tabs.TabPanel>
          <Tabs.TabPanel {...tabPanelPropsMap.yourTeams} height="fill">
            <div className="p-2 text-text-secondary text-bodyMd">
              No team libraries.
            </div>
          </Tabs.TabPanel>
          <Tabs.TabPanel {...tabPanelPropsMap.yourOrganization} height="fill">
            <div className="p-2 text-text-secondary text-bodyMd">
              No organization libraries.
            </div>
          </Tabs.TabPanel>
          <Tabs.TabPanel {...tabPanelPropsMap.uiKits} height="fill">
            <div className="p-2 text-text-secondary text-bodyMd">
              No UI kits available.
            </div>
          </Tabs.TabPanel>
        </Window.Body>
      </Window.Contents>
    </Window.ResizableRoot>
  );
}
