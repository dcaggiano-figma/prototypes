import { useState } from 'react';
import { IconButton, Window } from '@figma/fpl-components';
import { Icon24Expand, Icon24SidebarOpen } from '@figma/fpl-icons';
import { VariablesMainContent } from './VariablesMainContent';
import { VariablesSidebarContent } from './VariablesSidebarContent';

interface VariablesWindowProps {
  onExpand: () => void;
  onClose: () => void;
}

export function VariablesWindow({ onExpand, onClose }: VariablesWindowProps) {
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <Window.ResizableRoot
      onClose={onClose}
      defaultPosition={{ x: 100, y: 100 }}
      defaultWidth={600}
      defaultHeight={400}
      constraints={{ minWidth: 600, minHeight: 300 }}
    >
      <Window.Contents>
        <Window.Header>
          {showSidebar ? (
          <div className="w-[233px] border-r border-border flex items-center justify-between pr-2">
          <Window.Title>Variables</Window.Title>
          <IconButton aria-label="Toggle sidebar" onClick={() => setShowSidebar(!showSidebar)}>
            <Icon24SidebarOpen />
          </IconButton>
          </div>
          ) : (
            <div className="flex items-center">
              <IconButton aria-label="Toggle sidebar" onClick={() => setShowSidebar(!showSidebar)}>
                <Icon24SidebarOpen />
              </IconButton>
              <Window.Title>Variables</Window.Title>
            </div>
          )}
          <div className="flex flex-1 items-center justify-end gap-1 px-1">
          <IconButton aria-label="Expand" onClick={onExpand}>
            <Icon24Expand />
          </IconButton>
          </div>
        </Window.Header>
          {showSidebar && (
            <Window.Sidebar width={240}>
              <VariablesSidebarContent />
            </Window.Sidebar>
          )}
          <Window.Body>
            <VariablesMainContent />
          </Window.Body>
      </Window.Contents>
    </Window.ResizableRoot>
  );
}
