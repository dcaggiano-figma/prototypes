import { Button, IconButton } from '@figma/fpl-components';
import { Icon24Collapse } from '@figma/fpl-icons';
import { VariablesMainContent } from './VariablesMainContent';
import { ShareModal } from '../ShareModal';

interface VariablesViewProps {
  onMinimize: () => void;
}

export function VariablesView({ onMinimize }: VariablesViewProps) {
  const { trigger, modal } = ShareModal();

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-8px border-b border-border">
        <span className="text-bodyLgStrong text-text">Collection</span>
        <div className="flex items-center gap-3">
          <IconButton aria-label="Minimize" onClick={onMinimize}>
            <Icon24Collapse />
          </IconButton>
          <Button variant="primary" size="lg" onClick={trigger}>Share</Button>
        </div>
      </div>
      {/* Content */}
      <VariablesMainContent />
      {modal}
    </div>
  );
}
