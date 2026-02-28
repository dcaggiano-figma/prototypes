import { useRef, useState } from 'react';
import { IconButton, TextareaPrimitive, InputPrimitive } from '@figma/fpl-components';
import { Icon24More, Icon24Resolve, Icon24Emoji, Icon24Mention, Icon24Image, Icon24Close, Icon24ArrowUp } from '@figma/fpl-icons';
import { UserAvatar } from '../user-config';
import { CommentMessage } from './CommentMessage';
import type { CommentThread } from './types';
import styles from './comments.module.css';

interface CommentThreadWindowProps {
  thread: CommentThread;
  onClose: () => void;
  onResolve: () => void;
  onReply: (body: string) => void;
}

export function CommentThreadWindow({
  thread,
  onClose,
  onResolve,
  onReply,
}: CommentThreadWindowProps) {
  const [replyText, setReplyText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [shaking, setShaking] = useState(false);
  const escapeCountRef = useRef(0);
  const escapeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSubmit = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onReply(trimmed);
    setReplyText('');
    setExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!replyText.trim()) {
        if (expanded) {
          setExpanded(false);
        } else {
          onClose();
        }
        return;
      }
      escapeCountRef.current++;
      if (escapeCountRef.current >= 2) {
        setReplyText('');
        setExpanded(false);
        escapeCountRef.current = 0;
        return;
      }
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
      clearTimeout(escapeTimerRef.current);
      escapeTimerRef.current = setTimeout(() => {
        escapeCountRef.current = 0;
      }, 1500);
    }
  };

  const hasText = replyText.trim().length > 0;

  return (
    <div
      className="bg-bg rounded-lg border border-border flex flex-col overflow-hidden"
      style={{
        width: 300,
        maxHeight: 400,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header */}
      <div className="flex items-center pl-3 pr-2 py-2 shrink-0 border-b border-border">
        <span className="text-bodyMdStrong text-text flex-1">Comment</span>
        <div className="flex items-center gap-1">
          <IconButton aria-label="More options">
            <Icon24More />
          </IconButton>
          <IconButton
            aria-label={thread.resolved ? 'Unresolve' : 'Resolve'}
            onClick={onResolve}
          >
            <Icon24Resolve />
          </IconButton>
          <IconButton aria-label="Close" onClick={onClose}>
            <Icon24Close />
          </IconButton>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {thread.comments.map((comment) => (
          <CommentMessage
            key={comment.id}
            authorName={comment.authorName}
            authorInitial={comment.authorInitial}
            avatarUrl={comment.avatarUrl}
            body={comment.body}
            createdAt={comment.createdAt}
          />
        ))}
      </div>

      {/* Reply footer */}
      <div
        className={`${shaking ? styles.shake : ''} px-3 py-3 shrink-0`}
        onKeyDown={handleKeyDown}
      >
        {!expanded ? (
          <div className="flex items-center gap-2">
            <UserAvatar size="md" />
            <div className="flex-1 gap-2 flex py-2 pl-3 pr-2 items-center bg-bg-secondary rounded-lg">
              <InputPrimitive
                aria-label="Reply"
                placeholder="Reply"
                value={replyText}
                onChange={setReplyText}
                onFocus={() => setExpanded(true)}
                className="w-full text-bodyLg text-text bg-bg-secondary rounded-full"
              />
              <IconButton
                aria-label="Send"
                variant="primaryCircle"
                disabled={!hasText}
                onClick={handleSubmit}
              >
                <Icon24ArrowUp />
              </IconButton>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-shrink-0 py-2"><UserAvatar size="md" /></div>
            <div className="flex-1">
              <div className="bg-bg-secondary rounded-lg overflow-hidden">
                <TextareaPrimitive.Root className="w-full bg-bg-secondary">
                  <TextareaPrimitive
                    aria-label="Reply"
                    placeholder="Reply"
                    value={replyText}
                    onChange={setReplyText}
                    autoFocus
                    rows={2}
                    expandable
                    maxHeight={100}
                    className="text-bodyLg text-text flex w-full bg-bg-secondary rounded-lg px-3 py-2 resize-none border-none outline-none"
                  />
                  <div className="flex items-center mt-2 p-2 border-t border-border">
                  <div className="flex gap-1">
                    <IconButton aria-label="Emoji">
                      <Icon24Emoji />
                    </IconButton>
                    <IconButton aria-label="Mention">
                      <Icon24Mention />
                    </IconButton>
                    <IconButton aria-label="Attach image">
                      <Icon24Image />
                    </IconButton>
                  </div>
                  <div className="ml-auto">
                    <IconButton
                      aria-label="Send"
                      variant="primaryCircle"
                      disabled={!hasText}
                      onClick={handleSubmit}
                    >
                      <Icon24ArrowUp />
                    </IconButton>
                  </div>
                </div>
                </TextareaPrimitive.Root>
              </div>
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


