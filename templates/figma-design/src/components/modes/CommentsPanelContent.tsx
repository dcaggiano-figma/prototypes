import { ButtonPrimitive, IconButton, ScrollContainer, SearchInput } from '@figma/fpl-components';
import {
  Icon16ChevronDown,
  Icon24Comment,
  Icon24Filter,
  Icon24More,
} from '@figma/fpl-icons';
import { CommentListItem, useComments } from '@prototype/shared';

import { useViewport } from '../../canvas';

export function CommentsPanelContent() {
  const { state: { scale } } = useViewport();
  const { threads, setSelectedThreadId, setInteraction } = useComments();

  const handleThreadClick = (threadId: string) => {
    setSelectedThreadId(threadId);
    setInteraction({ type: 'viewing', threadId });
  };

  return (
    <>
      {/* Header row */}
      <div className="border-b border-border flex items-center pl-3 pr-1 pb-2">
        <span className="text-bodyMdStrong text-text">Comments</span>
        <div className="ml-auto pr-8px">
          <ButtonPrimitive
            aria-label="Zoom level"
            className="flex items-center p-1 pl-2 rounded-md gap-4px text-bodyMd text-text hover:bg-bg-hover active:bg-bg-pressed"
          >
            <span>{Math.round(scale * 100)}%</span>
            <Icon16ChevronDown />
          </ButtonPrimitive>
        </div>
      </div>

      {/* Search / filter bar */}
      <div className="flex items-center gap-4px px-2 py-2 border-b border-border">
        <div className="flex-1">
          <SearchInput aria-label="Search comments" placeholder="Search" />
        </div>
        <IconButton aria-label="Filter comments">
          <Icon24Filter />
        </IconButton>
        <IconButton aria-label="More options">
          <Icon24More />
        </IconButton>
      </div>

      {/* Comment threads */}
      <ScrollContainer scroll="y" fill>
        {threads.length === 0 ? (
          <div className="flex items-start justify-center pl-2 pr-3 py-3 gap-2">
            <div className="text-icon-tertiary">
              <Icon24Comment />
            </div>
            <p className="text-bodyMd text-text">
              Give feedback, ask a question, or just leave a note of appreciation.
              Click anywhere in the file to leave a comment.
            </p>
          </div>
        ) : (
          <div className="p-2">
          {threads.map((thread) => (
            <CommentListItem
              key={thread.id}
              thread={thread}
              onClick={() => handleThreadClick(thread.id)}
            />
          ))}
          </div>
        )}
      </ScrollContainer>
    </>
  );
}
