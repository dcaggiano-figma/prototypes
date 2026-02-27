import { useRef, useState } from 'react';
import { IconButton, ScrollContainer, TextareaPrimitive, InputPrimitive, Window } from '@figma/fpl-components';
import { Icon24More, Icon24Resolve, Icon24Emoji, Icon24Mention, Icon24Image } from '@figma/fpl-icons';
import { Avatar } from '../Avatar';
import { CommentMessage } from './CommentMessage';
import type { CommentThread } from './types';
import styles from './comments.module.css';

interface CommentThreadWindowProps {
  thread: CommentThread;
  onClose: () => void;
  onResolve: () => void;
  onReply: (body: string) => void;
  style?: React.CSSProperties;
}

export function CommentThreadWindow({
  thread,
  onClose,
  onResolve,
  onReply,
  style,
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
        setExpanded(false);
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
    <Window.Root
      width={300}
      defaultPosition={style ? undefined : { right: 60, top: 100 }}
      onClose={onClose}
      draggable="header"
    >
      <Window.Contents>
        <Window.Header>
          <Window.Title>Comment</Window.Title>
          <Window.ActionStrip>
            <IconButton aria-label="More options">
              <Icon24More />
            </IconButton>
            <IconButton
              aria-label={thread.resolved ? 'Unresolve' : 'Resolve'}
              onClick={onResolve}
            >
              <Icon24Resolve />
            </IconButton>
          </Window.ActionStrip>
        </Window.Header>
        <Window.Body>
          <ScrollContainer scroll="y" fill>
            {thread.comments.map((comment, i) => (
              <CommentMessage
                key={comment.id}
                authorName={comment.authorName}
                authorInitial={comment.authorInitial}
                avatarUrl={comment.avatarUrl}
                body={comment.body}
                createdAt={comment.createdAt}
                showSeparator={i > 0}
              />
            ))}
          </ScrollContainer>
        </Window.Body>
        {/* Reply footer */}
        <div
          className={`${shaking ? styles.shake : ''} bg-bg-secondary border-t border-border px-3 py-2`}
          onKeyDown={handleKeyDown}
        >
          {!expanded ? (
            <div className="flex items-center gap-2">
              <Avatar size="md" initial="Y" alt="You" />
              <div className="flex-1">
                <InputPrimitive
                  aria-label="Reply"
                  placeholder="Reply..."
                  value={replyText}
                  onChange={setReplyText}
                  onFocus={() => setExpanded(true)}
                  className="w-full"
                />
              </div>
              <IconButton
                aria-label="Send"
                variant={hasText ? 'primaryCircle' : 'secondary'}
                disabled={!hasText}
                onClick={handleSubmit}
              >
                <SendIcon />
              </IconButton>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-2">
                <Avatar size="md" initial="Y" alt="You" />
                <div className="flex-1">
                  <TextareaPrimitive.Root className="w-full">
                    <TextareaPrimitive
                      aria-label="Reply"
                      placeholder="Reply..."
                      value={replyText}
                      onChange={setReplyText}
                      rows={2}
                      expandable
                      maxHeight={100}
                      className="w-full bg-bg rounded-md px-2 py-1.5 text-bodyMd text-text resize-none border-none outline-none"
                    />
                  </TextareaPrimitive.Root>
                </div>
              </div>
              <div className="flex items-center mt-1.5 pl-8">
                <div className="flex gap-0.5">
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
                    variant={hasText ? 'primaryCircle' : 'secondary'}
                    disabled={!hasText}
                    onClick={handleSubmit}
                  >
                    <SendIcon />
                  </IconButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </Window.Contents>
    </Window.Root>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3.5L3.5 8L4.56 9.06L7.25 6.38V12.5H8.75V6.38L11.44 9.06L12.5 8L8 3.5Z" />
    </svg>
  );
}
