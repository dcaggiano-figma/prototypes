import { Window, Button } from '@figma/fpl-components';

/* ------------------------------------------------------------------ */
/*  SnapshotWindow                                                       */
/* ------------------------------------------------------------------ */

export interface SnapshotWindowProps {
  onClose: () => void;
  /** Bounding rect of the trigger button, used to anchor the window */
  triggerRect?: DOMRect | null;
}

export function SnapshotWindow({ onClose, triggerRect }: SnapshotWindowProps) {
  const handleCopyDesign = () => {
    console.log('Copy design snapshot');
    onClose();
  };

  const defaultPosition = triggerRect
    ? { right: Math.round(window.innerWidth - triggerRect.right), top: Math.round(triggerRect.bottom + 8) }
    : { x: 'center' as const, y: 'center' as const };

  return (
    <Window.Root
      defaultPosition={defaultPosition}
      onClose={onClose}
      draggable="header"
    >
      <Window.Contents className='w-[360px]'>
        <Window.Header>
          <Window.Title>Design snapshot</Window.Title>
        </Window.Header>

        <Window.Body>
          <div className="flex flex-col gap-16px">
            {/* Placeholder preview image */}
            <div className="w-full aspect-video bg-bg-tertiary rounded-sm overflow-hidden flex items-center justify-center">
              <span className="text-bodyMd text-text-tertiary">Preview snapshot</span>
            </div>

            <p className="text-bodyMd text-text-secondary">
              Copy your current preview as a set of design layers that you can edit in Figma Design.
            </p>
          </div>
        </Window.Body>

        <Window.Footer>
          <div className="w-full py-3">
            <Button width="fill" variant="primary" onClick={handleCopyDesign}>
              Copy design
            </Button>
          </div>
        </Window.Footer>
      </Window.Contents>
    </Window.Root>
  );
}
