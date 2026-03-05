import { VariablesSidebarContent } from './VariablesSidebarContent';

export function VariablesPanel() {
  return (
    <>
      <div className="flex items-center px-3 py-12px border-b border-border justify-between">
        <span className="text-bodyLgStrong text-text min-h-4">UI3 Library</span>
      </div>
      <VariablesSidebarContent />
    </>
  );
}
