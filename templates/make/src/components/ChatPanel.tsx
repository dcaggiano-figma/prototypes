import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import {
  Icon24AiCredit,
  Icon24ListView,
  Icon24ThumbDown,
  Icon24ThumbUp,
} from '@figma/fpl-icons';
import {
  Button,
  IconButton,
  Link,
  ToggleTip,
} from '@figma/fpl-components';

import { ChatMessage, CollapsibleSection, ProgressIndicator } from './ChatMessage';
import { highlightLine } from './CodeView';
import { FileCard } from './FileCard';
import { PromptInput } from './PromptInput';
import { StreamingContent } from './StreamingContent';
import { SystemMessage } from './SystemMessage';
import { TodoList } from './TodoListCard';
import { VersionCard } from './VersionCard';
import {
  type ChatItem,
  type TransientItem,
  type Task,
} from '../hooks/useChatScript';
import { useWorkingState } from '../helpers/workingState';
import type { Attachment, InspectedElement, PromptSubmission } from '../types';

/* ------------------------------------------------------------------ */
/*  ChatPanelItem – renders a single accumulated chat item              */
/* ------------------------------------------------------------------ */

function ChatPanelItem({
  item,
  tasks,
  awaitingUserAction,
  onStartTasks,
  onStreamComplete,
  toggleTipManager,
  versionVariant = 'current',
  versionNumber,
}: {
  item: ChatItem;
  tasks: Task[];
  awaitingUserAction: boolean;
  onStartTasks: () => void;
  onStreamComplete: () => void;
  toggleTipManager: ReturnType<typeof ToggleTip.useUncontrolledToggleTip>;
  versionVariant?: 'previous' | 'current';
  versionNumber?: number;
}) {
  switch (item.type) {
    case 'reasoning':
      return (
        <CollapsibleSection
          label="Reasoning"
          status={item.status}
          onStreamComplete={onStreamComplete}
        >
          <ChatMessage sender="ai">
            <p>{item.content}</p>
          </ChatMessage>
        </CollapsibleSection>
      );

    case 'ai-message':
      if (item.streaming) {
        return (
          <ChatMessage sender="ai">
            <StreamingContent
              content={item.content}
              status="active"
              maxHeight={10000}
              chunkBy="words"
              speed={20}
              fade={false}
              onComplete={onStreamComplete}
            >
              {(visible) => <span>{visible}</span>}
            </StreamingContent>
          </ChatMessage>
        );
      }
      return (
        <ChatMessage sender="ai">{item.content}</ChatMessage>
      );

    case 'todo-list':
      return (
        <SystemMessage icon={<Icon24ListView />} label="To do list">
          <TodoList tasks={tasks} />
          {awaitingUserAction && (
            <div className="px-3 pb-3">
              <Button variant="primary" size="lg" onClick={onStartTasks}>Start tasks</Button>
            </div>
          )}
        </SystemMessage>
      );

    case 'work-log':
      return (
        <CollapsibleSection label={`Worked with ${item.files.length} file${item.files.length !== 1 ? 's' : ''}`}>
          <ChatMessage sender="ai">
            <ul className="list-none list-inside space-y-1">
              {item.files.map((file) => (
                <li key={file}>
                  {'Edited '}
                  <Link href={file}><span className="text-text-secondary hover:text-text hover:underline">{file}</span></Link>
                </li>
              ))}
            </ul>
          </ChatMessage>
        </CollapsibleSection>
      );

    case 'version':
      return <VersionCard label={item.label} variant={versionVariant} versionNumber={versionNumber} />;

    case 'rating':
      return (
        <div className="flex items-center gap-1">
          <IconButton aria-label="Thumbs up" onClick={() => {}}><Icon24ThumbUp className="fill-icon-secondary" /></IconButton>
          <IconButton aria-label="Thumbs down" onClick={() => {}}><Icon24ThumbDown className="fill-icon-secondary" /></IconButton>
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          <IconButton aria-label="AI credits" {...toggleTipManager.getTriggerProps()}><Icon24AiCredit className="fill-icon-secondary" /></IconButton>
          <ToggleTip.Container manager={toggleTipManager}>
            <ToggleTip.Content>
              Used 16 AI credits
            </ToggleTip.Content>
          </ToggleTip.Container>
        </div>
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  TransientElement – renders the current transient indicator          */
/* ------------------------------------------------------------------ */

function TransientElement({
  transient,
  onStreamComplete,
}: {
  transient: TransientItem;
  onStreamComplete: () => void;
}) {
  switch (transient.type) {
    case 'progress':
      return <ProgressIndicator label={transient.label} spinner />;

    case 'view-file':
      return <FileCard variant="viewing" fileName={transient.fileName} />;

    case 'write-file':
      return (
        <FileCard variant="writing" fileName={transient.fileName}>
          <StreamingContent
            content={transient.code}
            status="active"
            maxHeight={128}
            chunkBy="lines"
            speed={12}
            onComplete={onStreamComplete}
          >
            {(visible) => {
              const lines = visible.split('\n');
              return (
                <table className="w-full border-collapse font-mono text-bodyMd">
                  <tbody>
                    {lines.map((line, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <tr key={`line-${i}`}>
                        <td className="select-none text-right px-3 text-text-tertiary w-[1%] whitespace-nowrap align-top">
                          {i + 1}
                        </td>
                        <td className="text-text font-mono pr-16px whitespace-pre">
                          {highlightLine(line)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }}
          </StreamingContent>
        </FileCard>
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  ChatPanel – left sidebar in the working view                       */
/* ------------------------------------------------------------------ */

export interface ChatPanelProps {
  /** The original user prompt that triggered this view */
  initialPrompt: string;
  /** Prompt input value */
  promptValue: string;
  onPromptChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  /** Called when the chat script finishes working */
  onWorkComplete?: () => void;
  /** Called after the entrance animation to start the chat script */
  onStartScript?: (submission: PromptSubmission) => void;
}

/* Animation phases for the first user message */
type AnimPhase = 'idle' | 'measuring' | 'appearing' | 'rising' | 'settled';

export function ChatPanel({
  initialPrompt,
  promptValue,
  onPromptChange,
  selectedModel,
  onModelChange,
  onWorkComplete,
  onStartScript,
}: ChatPanelProps) {
  const {
    script,
    completedConversations,
    submittedAttachments,
    submittedInspectedElements,
  } = useWorkingState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);

  /* ---- Animation state ---- */
  const [localPrompt, setLocalPrompt] = useState<string | null>(null);
  const [animPhase, setAnimPhase] = useState<AnimPhase>(
    initialPrompt ? 'settled' : 'idle',
  );
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>([]);
  const [localInspectedElements, setLocalInspectedElements] = useState<InspectedElement[]>([]);

  const [inspectedElements, setInspectedElements] = useState<InspectedElement[]>([
    // Inspected element format example:
    // { id: 'el-1', type: 'div', label: 'div' },
  ]);

  const handleRemoveElement = (id: string) => {
    setInspectedElements((prev) => prev.filter((el) => el.id !== id));
  };

  /* ---- Scroll management (only at conversation start) ---- */
  const hasScrolledForConv = useRef(false);

  /* ---- Collapse animation for previous conversations ---- */
  const [collapsingConvVersion, setCollapsingConvVersion] = useState<number | null>(null);
  const [collapsePhase, setCollapsePhase] = useState<'expand' | 'collapse'>('expand');
  const prevConvCountRef = useRef(completedConversations.length);

  const displayedPrompt = localPrompt || initialPrompt;
  const effectiveIsWorking = animating || script.isWorking;

  /* If initialPrompt arrives later (navigation from Home), skip animation */
  useEffect(() => {
    if (animPhase === 'idle' && initialPrompt) {
      setAnimPhase('settled');
    }
  }, [initialPrompt, animPhase]);

  /* Notify parent when work completes (only on true→false transition) */
  const wasWorkingRef = useRef(false);
  useEffect(() => {
    if (wasWorkingRef.current && !script.isWorking) {
      onWorkComplete?.();
    }
    wasWorkingRef.current = script.isWorking;
  }, [script.isWorking, onWorkComplete]);

  /* Scroll to bottom only once when a conversation first settles */
  useEffect(() => {
    if (animPhase === 'settled' && !hasScrolledForConv.current) {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
      hasScrolledForConv.current = true;
    }
  }, [animPhase]);

  /* Detect new completed conversation and start collapse animation */
  useEffect(() => {
    if (completedConversations.length > prevConvCountRef.current) {
      const newConv = completedConversations[completedConversations.length - 1];
      setCollapsingConvVersion(newConv.versionNumber);
      setCollapsePhase('expand');
    }
    prevConvCountRef.current = completedConversations.length;
  }, [completedConversations]);

  /* Trigger collapse after browser paints the expanded state */
  useEffect(() => {
    if (collapsingConvVersion !== null && collapsePhase === 'expand') {
      const frame = requestAnimationFrame(() => {
        setCollapsePhase('collapse');
      });
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [collapsingConvVersion, collapsePhase]);

  /* Measure message height before paint so we can position it at the bottom */
  useLayoutEffect(() => {
    if (animPhase === 'measuring' && scrollRef.current && msgRef.current) {
      const containerH = scrollRef.current.clientHeight;
      setViewportHeight(containerH);
      // Scroll to bottom to show the new conversation area
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      const msgH = msgRef.current.offsetHeight;
      const padding = 24; // p-3 = 12px × 2
      setSpacerHeight(Math.max(0, containerH - msgH - padding));
      setAnimPhase('appearing');
    }
  }, [animPhase]);

  /* appearing → rising after 500 ms */
  useEffect(() => {
    if (animPhase === 'appearing') {
      const timer = setTimeout(() => setAnimPhase('rising'), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [animPhase]);

  /* If spacer is already 0, transitionend won't fire — settle immediately */
  useEffect(() => {
    if (animPhase === 'rising' && spacerHeight === 0) {
      setAnimPhase('settled');
      setAnimating(false);
      if (localPrompt) {
        onStartScript?.({
          text: localPrompt,
          attachments: localAttachments,
          inspectedElements: localInspectedElements,
        });
      }
    }
  }, [animPhase, spacerHeight, localPrompt, onStartScript, localAttachments, localInspectedElements]);

  const handleSpacerTransitionEnd = () => {
    if (animPhase === 'rising') {
      setAnimPhase('settled');
      setAnimating(false);
      if (localPrompt) {
        onStartScript?.({
          text: localPrompt,
          attachments: localAttachments,
          inspectedElements: localInspectedElements,
        });
      }
    }
  };

  /* ---- Submit handler ---- */
  const handleSubmit = (submission: PromptSubmission) => {
    if (!submission.text.trim()) return;
    if (animPhase === 'idle') {
      setLocalPrompt(submission.text);
      setLocalAttachments(submission.attachments);
      setLocalInspectedElements(submission.inspectedElements);
      onPromptChange('');
      setAnimating(true);
      hasScrolledForConv.current = false;
      setAnimPhase('measuring');
    } else if (!effectiveIsWorking) {
      setLocalPrompt(submission.text);
      setLocalAttachments(submission.attachments);
      setLocalInspectedElements(submission.inspectedElements);
      onPromptChange('');
      setAnimating(true);
      hasScrolledForConv.current = false;
      setAnimPhase('measuring');
    }
  };

  const handleCollapseTransitionEnd = (version: number) => {
    if (collapsingConvVersion === version) {
      setCollapsingConvVersion(null);
    }
  };

  // ToggleTip for AI credits (used by rating item)
  const manager = ToggleTip.useUncontrolledToggleTip({ placement: 'top' });

  return (
    <div className="flex-1 flex flex-col min-h-0 text-bodyLg text-text">
      {/* Scrollable message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3">
        {/* Completed conversations */}
        {/* eslint-disable react/forbid-dom-props -- dynamic px height from JS measurement */}
        {completedConversations.map((conv) => {
          const isCollapsing = collapsingConvVersion === conv.versionNumber;
          const collapseStyle = isCollapsing
            ? {
              minHeight: collapsePhase === 'expand' ? `${String(viewportHeight)}px` : '0px',
              transition: collapsePhase === 'collapse' ? 'min-height 400ms ease-out' : undefined,
            }
            : {};

          return (
            <div
              key={`conv-${String(conv.versionNumber)}`}
              className="flex flex-col gap-3 py-3"
              style={collapseStyle}
              onTransitionEnd={isCollapsing ? () => handleCollapseTransitionEnd(conv.versionNumber) : undefined}
            >
              <ChatMessage sender="user" attachments={conv.attachments} inspectedElements={conv.inspectedElements}>{conv.prompt}</ChatMessage>
              {conv.items.map((item) => (
                <ChatPanelItem
                  key={item.id}
                  item={item}
                  tasks={conv.tasks}
                  awaitingUserAction={false}
                  onStartTasks={() => {}}
                  onStreamComplete={() => {}}
                  toggleTipManager={manager}
                  versionVariant="previous"
                  versionNumber={conv.versionNumber}
                />
              ))}
            </div>
          );
        })}

        {/* Active conversation */}
        <div
          className="flex flex-col gap-3 py-3"
          style={viewportHeight ? { minHeight: `${String(viewportHeight)}px` } : undefined}
        >
          {/* Spacer — pushes message to the bottom during animation */}
          {(animPhase === 'appearing' || animPhase === 'rising') && (
            <div
              aria-hidden
              className={clsx('overflow-hidden', animPhase === 'rising' && 'transition-[height] duration-[800ms] ease-out')}
              style={{ height: animPhase === 'rising' ? 0 : spacerHeight }}
              onTransitionEnd={handleSpacerTransitionEnd}
            />
          )}

          {/* User message */}
          {displayedPrompt ? (
            <div
              ref={msgRef}
              className={clsx('transition-opacity duration-sm ease-in', animPhase === 'measuring' ? 'opacity-0' : 'opacity-100')}
            >
              <ChatMessage
                sender="user"
                attachments={localAttachments.length > 0 ? localAttachments : submittedAttachments}
                inspectedElements={localInspectedElements.length > 0 ? localInspectedElements : submittedInspectedElements}
              >
                {displayedPrompt}
              </ChatMessage>
            </div>
          ) : null}

          {/* Script items — only visible once settled */}
          {animPhase === 'settled' && (
            <>
              {script.items.map((item) => (
                <ChatPanelItem
                  key={item.id}
                  item={item}
                  tasks={script.tasks}
                  awaitingUserAction={script.awaitingUserAction}
                  onStartTasks={script.onStartTasks}
                  onStreamComplete={script.onStreamComplete}
                  toggleTipManager={manager}
                />
              ))}

              {script.transient && (
                <TransientElement
                  transient={script.transient}
                  onStreamComplete={script.onStreamComplete}
                />
              )}
            </>
          )}
        </div>
        {/* eslint-enable react/forbid-dom-props */}
      </div>

      {/* Bottom prompt input */}
      <div className="p-3">
        <PromptInput
          variant="chat"
          value={promptValue}
          onChange={onPromptChange}
          onSubmit={handleSubmit}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          isWorking={effectiveIsWorking}
          autoFocus={animPhase === 'idle'}
          inspectedElements={inspectedElements}
          onRemoveElement={handleRemoveElement}
        />
      </div>
    </div>
  );
}
