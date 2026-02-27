import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  CollapsePrimitive,
  Chip,
  IconButton,
  Link,
  ToggleTip,
} from '@figma/fpl-components';
import {
  Icon24AiAsisstantLarge,
  Icon24AiCredit,
  Icon24ChevronDown,
  Icon24Component,
  Icon24Grid,
  Icon24Frame,
  Icon24Comment,
  Icon24ListView,
  Icon24Styles,
  Icon24Text,
  Icon24ThumbDown,
  Icon24ThumbUp,
} from '@figma/fpl-icons';
import clsx from 'clsx';
import {
  ChatMessage,
  CollapsibleSection,
  FileCard,
  ProgressIndicator,
  PromptPanel,
  StreamingContent,
  SystemMessage,
  TodoList,
  VersionCard,
  useChatScript,
  type ChatItem,
  type TransientItem,
  type Task,
  type PromptSubmission,
} from '@prototype/shared';
import { DEFAULT_SCRIPT } from '../../data/chatScript';

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
}: {
  item: ChatItem;
  tasks: Task[];
  awaitingUserAction: boolean;
  onStartTasks: () => void;
  onStreamComplete: () => void;
  toggleTipManager: ReturnType<typeof ToggleTip.useUncontrolledToggleTip>;
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
        <CollapsibleSection label={`Worked with ${String(item.files.length)} file${item.files.length !== 1 ? 's' : ''}`}>
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
      return <VersionCard label={item.label} variant="current" />;

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
                      <tr key={`line-${String(i)}`}>
                        <td className="select-none text-right px-3 text-text-tertiary w-[1%] whitespace-nowrap align-top">
                          {i + 1}
                        </td>
                        <td className="text-text font-mono pr-16px whitespace-pre">
                          {line}
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
/*  Suggestions data                                                    */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  {
    id: 'design-systems',
    icon: Icon24Component,
    label: 'Use design systems',
    description: 'Apply styles and check consistency',
    chips: ['Find components', 'Lint designs'],
  },
  { id: 'bulk-edits', icon: Icon24Grid, label: 'Bulk edits' },
  { id: 'new-designs', icon: Icon24Frame, label: 'New designs' },
  { id: 'feedback', icon: Icon24Comment, label: 'Ask for feedback' },
  { id: 'content', icon: Icon24Text, label: 'Update content' },
  { id: 'style', icon: Icon24Styles, label: 'Style changes' },
] as const;

/* ------------------------------------------------------------------ */
/*  AiChatPanel                                                         */
/* ------------------------------------------------------------------ */

export function AiChatPanel() {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('default');
  const [phase, setPhase] = useState<'idle' | 'active'>('idle');
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const script = useChatScript(DEFAULT_SCRIPT, phase === 'active');
  const toggleTipManager = ToggleTip.useUncontrolledToggleTip({ placement: 'top' });

  /* Auto-scroll when new items arrive */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [script.items, script.transient]);

  const handleSubmit = (submission: PromptSubmission) => {
    if (!submission.text.trim()) return;
    setSubmittedPrompt(submission.text);
    setPrompt('');
    setPhase('active');
  };

  if (phase === 'active') {
    return (
      <>
        {/* Header */}
        <div className="flex items-center px-3 py-12px border-b border-border justify-between">
          <span className="text-bodyLgStrong text-text">New chat</span>
          <Badge variant="defaultOutline">AI</Badge>
        </div>

        {/* Scrollable conversation */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 text-bodyLg text-text">
          <div className="flex flex-col gap-3 py-3">
            {/* User message */}
            <ChatMessage sender="user">{submittedPrompt}</ChatMessage>

            {/* Script items */}
            {script.items.map((item) => (
              <ChatPanelItem
                key={item.id}
                item={item}
                tasks={script.tasks}
                awaitingUserAction={script.awaitingUserAction}
                onStartTasks={script.onStartTasks}
                onStreamComplete={script.onStreamComplete}
                toggleTipManager={toggleTipManager}
              />
            ))}

            {/* Transient element */}
            {script.transient && (
              <TransientElement
                transient={script.transient}
                onStreamComplete={script.onStreamComplete}
              />
            )}
          </div>
        </div>

        {/* Bottom prompt input */}
        <div className="p-3">
          <PromptPanel
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleSubmit}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            isWorking={script.isWorking}
            placeholder="Ask anything..."
          />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center px-3 py-12px border-b border-border justify-between">
        <span className="text-bodyLgStrong text-text">New chat</span>
        <Badge variant="defaultOutline">AI</Badge>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Greeting */}
        <div className="flex flex-col items-center py-4 px-3">
          <div className="w-6 h-6 rounded-full bg-bg-brand-tertiary flex items-center justify-center icon-brand mb-2">
            <Icon24AiAsisstantLarge />
          </div>
          <span className="text-headingMd text-text">Good morning!</span>
          <span className="text-bodyLg text-text-secondary">
            What do you want to do today?
          </span>
        </div>

        {/* Accordion suggestions */}
        <div className="flex flex-col mx-3 rounded-lg border border-border">
          {SUGGESTIONS.map((item, index) => {
            const isLast = index === SUGGESTIONS.length - 1;
            return (
              <CollapsePrimitive.Root
                key={item.id}
                isOpen={openItem === item.id}
                setOpen={(open) => setOpenItem(open ? item.id : null)}
              >
                <CollapsePrimitive.Header className={clsx('flex items-center gap-1 px-2.5 py-2.5', !isLast && openItem !== item.id && 'border-b border-border')}>
                  <CollapsePrimitive.Label className="flex items-center gap-2 flex-1 text-bodyMd text-text">
                    <item.icon />
                    <span className="text-bodyMdStrong">{item.label}</span>
                  </CollapsePrimitive.Label>
                  <CollapsePrimitive.Trail>
                    <Icon24ChevronDown
                      className={clsx(
                        'transition-transform duration-sm',
                        openItem === item.id ? 'rotate-0' : '-rotate-90',
                      )}
                    />
                  </CollapsePrimitive.Trail>
                </CollapsePrimitive.Header>
                <CollapsePrimitive.Content className={clsx('px-3 pb-2', openItem === item.id && !isLast && 'border-b border-border')}>
                  {'description' in item && item.description && (
                    <p className="text-bodyMd text-text-secondary pb-1">
                      {item.description}
                    </p>
                  )}
                  {'chips' in item && item.chips && (
                    <div className="flex gap-2 py-2 flex-wrap">
                      {item.chips.map((c) => (
                        <Chip onClick={() => {}} key={c}>{c}</Chip>
                      ))}
                    </div>
                  )}
                </CollapsePrimitive.Content>
              </CollapsePrimitive.Root>
            );
          })}
        </div>
      </div>

      {/* Prompt input */}
      <div className="p-3">
        <PromptPanel
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          placeholder="Ask anything..."
        />
      </div>
    </>
  );
}
