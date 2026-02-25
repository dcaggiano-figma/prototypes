import { useState } from 'react';
import {
  Window,
  Button,
  Input,
  Switch,
  Label,
  Link,
  Badge,
} from '@figma/fpl-components';
import { Icon24Info } from '@figma/fpl-icons';

/* ------------------------------------------------------------------ */
/*  PublishWindow                                                        */
/* ------------------------------------------------------------------ */

export interface PublishWindowProps {
  onClose: () => void;
  fileName?: string;
  /** Bounding rect of the trigger button, used to anchor the window */
  triggerRect?: DOMRect | null;
}

export function PublishWindow({ onClose, fileName = 'Untitled', triggerRect }: PublishWindowProps) {
  const [title, setTitle] = useState(fileName);
  const [featureOnCommunity, setFeatureOnCommunity] = useState(true);

  const handlePublish = () => {
    console.log('Publishing:', { title, featureOnCommunity });
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
      <Window.Contents className='w-[320px]'>
        <Window.Header>
          <Window.Title>Publish to the web</Window.Title>
        </Window.Header>

        <Window.Body>
          <div className="flex flex-col gap-16px">
            {/* Title / URL / Status rows */}
            <div className="flex flex-col gap-12px py-2">
              {/* Title */}
              <div className="flex items-center gap-12px">
                <span className="text-bodyLg text-text-secondary w-[64px] shrink-0">Title</span>
                <Input
                  aria-label="Title"
                  value={title}
                  onChange={setTitle}
                />
              </div>

              {/* URL */}
              <div className="flex items-center gap-12px">
                <span className="text-text-secondary w-[64px] shrink-0">URL</span>
                <div className="flex items-center gap-4px flex-1 text-text-secondary">
                  <span className="truncate">example.figma.community.site</span>
                  <Icon24Info className="fill-icon-tertiary shrink-0 w-16px h-16px" />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-12px">
                <span className="text-text-secondary w-[64px] shrink-0">Status</span>
                <Badge>Not published</Badge>
              </div>
            </div>

            {/* Feature on Community */}
            <div className="flex flex-col gap-8px py-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-bodyMdStrong text-text">Feature on Community</span>
                <Switch
                  label={<Label hidden>Feature on Community</Label>}
                  checked={featureOnCommunity}
                  onChange={setFeatureOnCommunity}
                />
              </div>
              <p className="text-bodyMd text-text-secondary">
                Share your work with Figma Community, where people can remix your file and see chat history
              </p>
            </div>

          </div>
        </Window.Body>

        <Window.Footer>
          <div className="flex flex-col gap-12px w-full py-3">
            <p className="text-bodyMd text-text-secondary">
              {'By publishing to Community, you agree to '}
              <Link href="https://www.figma.com/community/creator-agreement">
                Figma&apos;s Creator Agreement
              </Link>
            </p>
            <Button width="fill" variant="primary" onClick={handlePublish}>
              Publish
            </Button>
          </div>
        </Window.Footer>
      </Window.Contents>
    </Window.Root>
  );
}
