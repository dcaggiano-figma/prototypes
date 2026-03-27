import { useState } from 'react';
import { Button, ButtonPrimitive, Collapse, HiddenLabel, IconButton, Select, Tabs } from '@figma/fpl-components';
import { Icon16ChevronDown, Icon24Link, Icon24More, Icon24Page, Icon24Help } from '@figma/fpl-icons';

type DevTab = 'inspect' | 'strings' | 'plugins';

export function DevModeContent() {
  const [language, setLanguage] = useState<string | undefined>('css');
  const [unit, setUnit] = useState<string | undefined>('px');
  const [imageSource, setImageSource] = useState<string | undefined>('local-server');

  const [tabPropsMap, tabPanelPropsMap, tabManager] = Tabs.useTabs<DevTab>(
    { inspect: true, strings: true, plugins: true },
    { defaultActive: 'inspect' },
  );

  return (
    <>
      {/* Tab strip */}
      <div className="border-b border-border flex items-center pl-2 pr-1 pb-2">
        <Tabs.TabStrip manager={tabManager}>
          <Tabs.Tab {...tabPropsMap.inspect}>Inspect</Tabs.Tab>
          <Tabs.Tab {...tabPropsMap.strings}>Strings</Tabs.Tab>
          <Tabs.Tab {...tabPropsMap.plugins}>Plugins</Tabs.Tab>
        </Tabs.TabStrip>
        <div className="ml-auto pr-8px">
          <ButtonPrimitive aria-label="Zoom level" className="flex items-center p-1 pl-2 rounded-md gap-4px text-bodyMd text-text hover:bg-bg-hover active:bg-bg-pressed">
            <span>50%</span>
            <Icon16ChevronDown />
          </ButtonPrimitive>
        </div>
      </div>

      {/* Inspect tab panel */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <Tabs.TabPanel {...tabPanelPropsMap.inspect} height="fill">
          <div className="flex flex-col flex-1">
            {/* Dev Mode header */}
            <div className="pl-3 pr-2 py-2">
              <div className="flex items-center justify-between">
                <span className="text-bodyMdStrong text-text">Dev Mode</span>
                <div className="flex items-center gap-1">
                  <IconButton aria-label="Copy link">
                    <Icon24Link />
                  </IconButton>
                  <IconButton aria-label="More options">
                    <Icon24More />
                  </IconButton>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Icon24Page />
                <span className="text-bodyMd text-text-secondary">Page</span>
              </div>
            </div>
            <div className="border-t border-border" />

            {/* Code settings */}
            <Collapse.Root defaultOpen={true}>
              <Collapse.Header variant="leftPanel" size="lg">
                <Collapse.Label size="md">Code settings</Collapse.Label>
                <Collapse.Trail>
                  <IconButton aria-label="Code settings options">
                    <Icon24More />
                  </IconButton>
                </Collapse.Trail>
              </Collapse.Header>
              <Collapse.Content>
                <div className="grid grid-cols-[1fr_1fr] items-center gap-y-2 gap-x-4 pl-3 pr-2 pb-3">
                  <span className="text-bodyMd text-text-secondary">Language</span>
                  <Select.Root value={language} onChange={(v) => setLanguage(v)}>
                    <Select.Trigger label={<HiddenLabel>Language</HiddenLabel>} />
                    <Select.Container>
                      <Select.Option value="css">CSS</Select.Option>
                      <Select.Option value="scss">SCSS</Select.Option>
                      <Select.Option value="less">Less</Select.Option>
                      <Select.Option value="tailwind">Tailwind</Select.Option>
                    </Select.Container>
                  </Select.Root>
                  <span className="text-bodyMd text-text-secondary">Unit</span>
                  <Select.Root value={unit} onChange={(v) => setUnit(v)}>
                    <Select.Trigger label={<HiddenLabel>Unit</HiddenLabel>} />
                    <Select.Container>
                      <Select.Option value="px">px</Select.Option>
                      <Select.Option value="rem">rem</Select.Option>
                      <Select.Option value="dp">dp</Select.Option>
                    </Select.Container>
                  </Select.Root>
                </div>
              </Collapse.Content>
            </Collapse.Root>
            <div className="border-t border-border" />

            {/* MCP */}
            <Collapse.Root defaultOpen={true}>
              <Collapse.Header variant="leftPanel" size="lg">
                <Collapse.Label size="md">MCP</Collapse.Label>
                <Collapse.Trail>
                  <div className="flex items-center gap-1">
                    <IconButton aria-label="MCP help">
                      <Icon24Help />
                    </IconButton>
                    <IconButton aria-label="MCP options">
                      <Icon24More />
                    </IconButton>
                  </div>
                </Collapse.Trail>
              </Collapse.Header>
              <Collapse.Content>
                <div className="grid grid-cols-[1fr_1fr] items-center gap-y-2 gap-x-4 px-3 pb-3">
                  <span className="text-bodyMd text-text-secondary">Server status</span>
                  <div className="flex items-center gap-1">
                    <div className="w-8px h-8px rounded-full bg-bg-success" />
                    <span className="text-bodyMd text-text">Enabled</span>
                  </div>
                  <span className="text-bodyMd text-text-secondary">Image source</span>
                  <Select.Root value={imageSource} onChange={(v) => setImageSource(v)}>
                    <Select.Trigger label={<HiddenLabel>Image source</HiddenLabel>} />
                    <Select.Container>
                      <Select.Option value="local-server">Local server</Select.Option>
                      <Select.Option value="cdn">CDN</Select.Option>
                    </Select.Container>
                  </Select.Root>
                </div>
              </Collapse.Content>
            </Collapse.Root>
            <div className="border-t border-border" />

            {/* Code Connect */}
            <Collapse.Root defaultOpen={true}>
              <Collapse.Header variant="leftPanel" size="lg">
                <Collapse.Label size="md">Code Connect</Collapse.Label>
                <Collapse.Trail>
                  {/* Progress bar */}
                  <div className="flex items-center gap-1">
                    <div className="w-[48px] h-4px rounded-full bg-bg-tertiary overflow-hidden flex">
                      <div className="w-[60%] h-full bg-bg-brand rounded-full" />
                    </div>
                  </div>
                </Collapse.Trail>
              </Collapse.Header>
              <Collapse.Content>
                <div className="flex flex-col gap-3 px-3 pb-3">
                  <span className="text-bodyMd text-text-secondary">
                    Improve MCP server performance by connecting design components to your codebase.{' '}
                    <ButtonPrimitive className="text-text-brand hover:underline text-bodyMd">
                      Learn more
                    </ButtonPrimitive>
                  </span>
                  <Button variant="secondary" width="fill">
                    Connect components
                  </Button>
                </div>
              </Collapse.Content>
            </Collapse.Root>
          </div>
        </Tabs.TabPanel>

        {/* Strings tab panel */}
        <Tabs.TabPanel {...tabPanelPropsMap.strings} height="fill">
          <div className="flex flex-col flex-1 px-3 py-3">
            <span className="text-bodyMd text-text-tertiary">
              String translations and localization
            </span>
          </div>
        </Tabs.TabPanel>

        {/* Plugins tab panel */}
        <Tabs.TabPanel {...tabPanelPropsMap.plugins} height="fill">
          <div className="flex flex-col flex-1 px-3 py-3">
            <span className="text-bodyMd text-text-tertiary">
              Installed plugins
            </span>
          </div>
        </Tabs.TabPanel>
      </div>
    </>
  );
}
