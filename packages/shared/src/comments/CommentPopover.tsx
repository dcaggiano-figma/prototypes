import { useEffect, useRef, useState } from 'react';
import { IconButton, InputPrimitive, TextareaPrimitive } from '@figma/fpl-components';
import { Icon24Emoji, Icon24Mention, Icon24Image, Icon24ArrowUp } from '@figma/fpl-icons';
import { TimestampChip } from './TimestampChip';
import { UserAvatar } from '../user-config';
import styles from './comments.module.css';

interface CommentPopoverProps {
  onSubmit: (body: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
  timestampMs?: number;
}

export function CommentPopover({ onSubmit, onClose, style, timestampMs }: CommentPopoverProps) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [shaking, setShaking] = useState(false);
  const escapeCountRef = useRef(0);
  const escapeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    requestAnimationFrame(() => {
      if (expanded) {
        textareaRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    });
  }, [expanded]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!text.trim()) {
        onClose();
        return;
      }
      // First escape: shake. Second escape within 1500ms: close
      escapeCountRef.current++;
      if (escapeCountRef.current >= 2) {
        onClose();
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

  const handleInputFocus = () => {
    if (!expanded) setExpanded(true);
  };

  const hasText = text.trim().length > 0;

  return (
    <div
      className={`${shaking ? styles.shake : ''} bg-bg-elevated rounded-lg shadow-300 pointer-events-auto`}
      style={{ width: 280, ...style }}
      onKeyDown={handleKeyDown}
    >
      {timestampMs != null && (
        <div className="px-3 pt-2">
          <TimestampChip timestampMs={timestampMs} />
        </div>
      )}
      {!expanded ? (
        <div className="flex items-center gap-2 p-2">
          <UserAvatar size="md" />
          <div className="flex-1">
            <InputPrimitive
              ref={inputRef}
              aria-label="Add comment"
              placeholder="Add a comment..."
              value={text}
              onChange={setText}
              onFocus={handleInputFocus}
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
        <div className="">
          <div className="flex items-start gap-2">
            <div className="flex-1 p-2">
              <TextareaPrimitive.Root className="w-full">
                <TextareaPrimitive
                  ref={textareaRef}
                  aria-label="Add comment"
                  placeholder="Add a comment..."
                  value={text}
                  onChange={setText}
                  rows={2}
                  expandable
                  maxHeight={120}
                  className="w-full px-2 py-1 text-bodyLg text-text resize-none border-none outline-none bg-bg-elevated"
                />
              </TextareaPrimitive.Root>
            </div>
          </div>
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
        </div>
      )}
    </div>
  );
}

/** Simple send/up-arrow icon inline SVG */
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3.5L3.5 8L4.56 9.06L7.25 6.38V12.5H8.75V6.38L11.44 9.06L12.5 8L8 3.5Z" />
    </svg>
  );
}
