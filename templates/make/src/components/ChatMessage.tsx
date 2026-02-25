import {
  type ReactNode, useCallback, useEffect, useRef, useState,
} from 'react';
import { ButtonPrimitive, Chip, LoadingSpinner } from '@figma/fpl-components';
import { Icon16ChevronRight } from '@figma/fpl-icons';
import type { Attachment, InspectedElement } from '../types';
import Avatar from './Avatar';
import { AttachmentThumbnail } from './AttachmentThumbnail';
import { getElementIcon } from '../helpers/elementIcons';
import styles from './CollapsibleSection.module.css';
import shimmerStyles from './ShimmerText.module.css';
import { StreamingContent } from './StreamingContent';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/*  Chat message bubble                                                */
/* ------------------------------------------------------------------ */

export interface ChatMessageProps {
  /** 'user' renders right-aligned dark bubble; 'ai' renders left-aligned text */
  sender: 'user' | 'ai';
  children: ReactNode;
  attachments?: Attachment[];
  inspectedElements?: InspectedElement[];
}

export function ChatMessage({
  sender,
  children,
  attachments,
  inspectedElements,
}: ChatMessageProps) {
  if (sender === 'user') {
    return (
      <div className="flex items-end gap-2 justify-end">
        <div className="flex flex-col gap-2 justify-end max-w-[85%] items-end">
          {/* Image / Design Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {attachments.map((att) => (
                <AttachmentThumbnail key={att.id} attachment={att} />
              ))}
            </div>
          )}
          {/* Inspect Elements */}
          {inspectedElements && inspectedElements.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {inspectedElements.map((el) => (
                <Chip key={el.id} leading={getElementIcon(el.type)}>
                  {el.label}
                </Chip>
              ))}
            </div>
          )}
          {/* Message bubble */}
          <div className="rounded-lg bg-bg-secondary px-12px py-8px">
            <span className="leading-[1.5] block">{children}</span>
          </div>
        </div>
        <div className="flex items-end"><Avatar size="md" src="/assets/avatar.jpg" /></div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex flex-col gap-4px py-1">
      <span className="leading-[1.5] block">{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible section (Reasoning, Worked with…)                      */
/* ------------------------------------------------------------------ */

export interface CollapsibleSectionProps {
  label: string;
  children?: ReactNode;
  /** Content streams in word-by-word when active, then collapses when done */
  status?: 'active' | 'complete';
  /** Called when streaming finishes (before the collapse animation) */
  onStreamComplete?: () => void;
}

/**
 * Extract all text from a ReactNode tree so we can stream it word-by-word.
 */
function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText(node.props.children);
  }
  return '';
}

const WORDS_PER_SECOND = 20;
const ACTIVE_MAX_HEIGHT = 180;

function getMaxHeight(showActive: boolean, expanded: boolean, contentHeight: number): number {
  if (showActive) return ACTIVE_MAX_HEIGHT;
  if (expanded) return contentHeight;
  return 0;
}

export function CollapsibleSection({
  label,
  children,
  status = 'complete',
  onStreamComplete,
}: CollapsibleSectionProps) {
  const isActive = status === 'active';
  const fullText = children ? extractText(children) : '';

  // --- collapsed toggle (for complete state) ---
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Track when streaming finishes (via StreamingContent callback)
  const [streamingComplete, setStreamingComplete] = useState(!isActive);
  const handleStreamComplete = useCallback(() => {
    setStreamingComplete(true);
    onStreamComplete?.();
  }, [onStreamComplete]);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, fullText]);

  const toggleExpanded = useCallback(() => {
    if (!isActive || streamingComplete) setExpanded((v) => !v);
  }, [isActive, streamingComplete]);

  // When active and streaming finishes, stay expanded briefly then collapse
  const [collapsing, setCollapsing] = useState(false);
  useEffect(() => {
    if (isActive && streamingComplete && fullText.length > 0) {
      const timeout = setTimeout(() => setCollapsing(true), 400);
      return () => clearTimeout(timeout);
    }
    setCollapsing(false);
    setStreamingComplete(!isActive);
    return undefined;
  }, [isActive, streamingComplete, fullText.length]);

  const showActive = isActive && !collapsing;

  // Drive dynamic maxHeight + opacity via ref to avoid inline style prop
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const h = getMaxHeight(showActive, expanded, contentHeight);
    el.style.maxHeight = `${h}px`;
    el.style.opacity = showActive || expanded ? '1' : '0';
  }, [showActive, expanded, contentHeight]);

  const chevronOpen = showActive || expanded;

  return (
    <div className="flex flex-col">
      {/* Summary row */}
      <ButtonPrimitive
        onClick={toggleExpanded}
        className={clsx(`cursor-pointer align-baseline select-none flex items-center border-none text-left`,  expanded ? 'text-text' : 'text-text-secondary')}
      >
        <span>{label}</span>
        {!showActive && (
          <span className={clsx('text-text-secondary transition-transform duration-sm', chevronOpen && 'rotate-90')}>
            <Icon16ChevronRight />
          </span>
        )}
      </ButtonPrimitive>

      {/* Content area with animated height + opacity */}
      {children && (
        <div ref={wrapperRef} className={styles.content}>
          <div ref={contentRef}>
            {/* Active state: left border + streaming fade container */}
            {showActive ? (
              <div className="flex pt-2">
                <div className="border-l border-border pl-16px">
                  <StreamingContent
                    content={fullText}
                    status={status}
                    maxHeight={172}
                    chunkBy="words"
                    speed={WORDS_PER_SECOND}
                    onComplete={handleStreamComplete}
                  >
                    {(visible) => <span className="text-text-secondary">{visible}</span>}
                  </StreamingContent>
                </div>
              </div>
            ) : (
              /* Complete / collapsed state: no border, no fixed height */
              <div className="pt-4px text-text-secondary">
                {children}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress indicator row                                             */
/* ------------------------------------------------------------------ */

export interface ProgressIndicatorProps {
  label: string;
  spinner?: boolean;
}

export function ProgressIndicator({ label, spinner = false }: ProgressIndicatorProps) {
  return (
    <div className="items-center gap-8px inline-flex">
      {spinner && <LoadingSpinner size="sm" />}
      <span className={clsx('text-text truncate', shimmerStyles.shimmer)}>{label}</span>
    </div>
  );
}
