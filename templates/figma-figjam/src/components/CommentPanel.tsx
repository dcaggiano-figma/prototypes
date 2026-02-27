import { IconButton, ScrollContainer, SearchInput, Window } from '@figma/fpl-components';
import {
  Icon24Comment,
  Icon24Filter,
  Icon24More,
} from '@figma/fpl-icons';
import { CommentListItem, useComments } from '@prototype/shared';

interface CommentPanelProps {
  onClose: () => void;
}

export function CommentPanel({ onClose }: CommentPanelProps) {
  const { threads, setSelectedThreadId, setInteraction } = useComments();

  const handleThreadClick = (threadId: string) => {
    setSelectedThreadId(threadId);
    setInteraction({ type: 'viewing', threadId });
  };

  return (
    <Window.Root
      width={240}
      defaultPosition={{ right: 12, top: 72 }}
      onClose={onClose}
      draggable="header"
    >
      <Window.Contents>
        <Window.Header>
          <SearchInput aria-label="Search comments" placeholder="Search" />
          <Window.ActionStrip>
            <div className="flex items-center gap-1 mr-1 ml-2">
              <IconButton aria-label="Filter"><Icon24Filter /></IconButton>
              <IconButton aria-label="More options"><Icon24More /></IconButton>
            </div>
          </Window.ActionStrip>
        </Window.Header>
        <Window.Body>
          <ScrollContainer scroll="y" fill>
            {threads.length === 0 ? (
              <div className="flex items-start justify-center gap-2 py-2">
                <div className="text-icon-tertiary">
                  <Icon24Comment />
                </div>
                <p className="text-bodyMd text-text">
                  Give feedback, ask a question, or just leave a note of appreciation.
                  Click anywhere in the file to leave a comment.
                </p>
              </div>
            ) : (
              threads.map((thread) => (
                <CommentListItem
                  key={thread.id}
                  thread={thread}
                  onClick={() => handleThreadClick(thread.id)}
                />
              ))
            )}
          </ScrollContainer>
        </Window.Body>
      </Window.Contents>
    </Window.Root>
  );
}
