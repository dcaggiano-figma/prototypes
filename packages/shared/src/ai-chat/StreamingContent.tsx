import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import styles from './StreamingContent.module.css';

export interface StreamingContentProps {
  /** Full text content to stream */
  content: string;
  /** Whether actively streaming or complete */
  status?: 'active' | 'complete';
  /** Max container height in px before scrolling kicks in */
  maxHeight?: number;
  /** How to chunk content for streaming: 'words' splits on whitespace, 'lines' splits on newlines */
  chunkBy?: 'words' | 'lines';
  /** Chunks revealed per second */
  speed?: number;
  /** Render function receiving the visible portion of content */
  children: (visibleContent: string) => ReactNode;
  /** Show top/bottom fade overlays (useful for fixed-height containers). Defaults to true. */
  fade?: boolean;
  /** Whether to animate content with streaming effect. When false, shows all content immediately. Defaults to true. */
  streaming?: boolean;
  /** Fires once when all chunks have been revealed */
  onComplete?: () => void;
  className?: string;
}

export function StreamingContent({
  content,
  status = 'complete',
  maxHeight = 180,
  chunkBy = 'words',
  speed = 20,
  fade = true,
  streaming = true,
  children,
  onComplete,
  className,
}: StreamingContentProps) {
  const isActive = status === 'active';

  const chunks = chunkBy === 'words'
    ? content.split(/\s+/).filter(Boolean)
    : content.split('\n');

  const shouldAnimate = streaming && isActive;
  const [visibleCount, setVisibleCount] = useState(shouldAnimate ? 0 : chunks.length);
  const scrollRef = useRef<HTMLDivElement>(null);
  const completeFired = useRef(false);

  // Apply maxHeight via ref to avoid inline style prop
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.style.maxHeight = `${maxHeight}px`;
    }
  }, [maxHeight]);

  // Streaming interval — skip when streaming is disabled
  useEffect(() => {
    if (!shouldAnimate) {
      setVisibleCount(chunks.length);
      return undefined;
    }
    setVisibleCount(0);
    completeFired.current = false;
    const intervalMs = 1000 / speed;
    const id = setInterval(() => {
      setVisibleCount((c) => {
        if (c >= chunks.length) {
          clearInterval(id);
          return chunks.length;
        }
        return c + 1;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [shouldAnimate, chunks.length, speed]);

  // Fire onComplete when streaming finishes
  useEffect(() => {
    if (visibleCount >= chunks.length && chunks.length > 0 && !completeFired.current && shouldAnimate) {
      completeFired.current = true;
      onComplete?.();
    }
  }, [visibleCount, chunks.length, onComplete, shouldAnimate]);

  // Auto-scroll to follow new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el && shouldAnimate) {
      el.scrollTop = el.scrollHeight;
    }
  }, [visibleCount, shouldAnimate]);

  const visibleContent = chunkBy === 'words'
    ? chunks.slice(0, visibleCount).join(' ')
    : chunks.slice(0, visibleCount).join('\n');

  return (
    <div className={clsx(styles.container, className)}>
      {fade && <div className={styles.fadeTop} />}
      <div ref={scrollRef} className={styles.scrollArea}>
        {children(visibleContent)}
      </div>
      {fade && <div className={styles.fadeBottom} />}
    </div>
  );
}
