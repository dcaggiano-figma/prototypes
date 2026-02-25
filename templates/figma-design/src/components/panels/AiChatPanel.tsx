import { useState } from 'react';
import {
  Badge,
  Button,
  CollapsePrimitive,
  Chip,
  IconButton,
  Menu,
  TextareaPrimitive,
} from '@figma/fpl-components';
import {
  Icon16ChevronDown,
  Icon24AiAsisstantLarge,
  Icon24ChevronDown,
  Icon24Component,
  Icon24Grid,
  Icon24Frame,
  Icon24Comment,
  Icon24Image,
  Icon24McpConnector,
  Icon24Microphone,
  Icon24Paperclip,
  Icon24Plus,
  Icon24Send,
  Icon24Styles,
  Icon24Text,
} from '@figma/fpl-icons';
import clsx from 'clsx';

const MODEL_OPTIONS = [
  { value: 'default', label: 'Default', description: 'Standard setup' },
  { value: 'claude-opus', label: 'Claude Opus 4.6', description: 'Proactive, thorough' },
  { value: 'gemini-flash', label: 'Gemini 3 Flash', description: 'Fast, iterative' },
  { value: 'gemini-pro', label: 'Gemini 3 Pro', description: 'Deep, creative' },
];

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

export function AiChatPanel() {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('default');
  const modelMenu = Menu.useMenu();
  const attachMenu = Menu.useMenu();

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
        <div className="flex flex-col border border-bordertranslucent hover:border-bordertranslucentstrong focus-within:border-bordertranslucentstrong focus-within:shadow-100 rounded-lg overflow-hidden">
          <TextareaPrimitive.Root className="flex w-full">
            <TextareaPrimitive
              aria-label="Ask AI"
              value={prompt}
              onChange={setPrompt}
              placeholder="Ask anything..."
              rows={3}
              expandable
              maxHeight={200}
              className="flex-1 border-none outline-none text-bodyLg text-text px-3 py-12px resize-none bg-bg"
            />
          </TextareaPrimitive.Root>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-4px">
              <Menu.Root manager={attachMenu.manager}>
                <IconButton
                  aria-label="Attach"
                  variant="ghost"
                  {...attachMenu.getTriggerProps()}
                >
                  <Icon24Plus />
                </IconButton>
                <Menu.Container>
                  <Menu.Group>
                    <Menu.Item onClick={() => {}}>
                      <Menu.ItemLead><Icon24Paperclip /></Menu.ItemLead>
                      Add images & files
                    </Menu.Item>
                    <Menu.Item onClick={() => {}}>
                      <Menu.ItemLead><Icon24Component /></Menu.ItemLead>
                      Attach a design
                    </Menu.Item>
                  </Menu.Group>
                  <Menu.Group>
                    <Menu.Item onClick={() => {}}>
                      <Menu.ItemLead><Icon24McpConnector /></Menu.ItemLead>
                      Connectors
                    </Menu.Item>
                  </Menu.Group>
                </Menu.Container>
              </Menu.Root>
              <IconButton aria-label="Layout" variant="ghost">
                <Icon24Image />
              </IconButton>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Menu.Root manager={modelMenu.manager}>
                  <Button
                    aria-label="Select model"
                    variant="ghost"
                    {...modelMenu.getTriggerProps()}
                  >
                    <span className="flex items-center gap-4px">
                      <span className="max-w-[80px] truncate">{MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label ?? 'Default'}</span>
                      <span className="flex-shrink w-12px"><Icon16ChevronDown /></span>
                    </span>
                  </Button>
                  <Menu.Container>
                    <Menu.RadioGroup
                      title={<Menu.Title>Select model</Menu.Title>}
                      value={selectedModel}
                      onChange={(v) => setSelectedModel(v as string)}
                    >
                      {MODEL_OPTIONS.map((model) => (
                        <Menu.RadioGroupItem key={model.value} value={model.value}>
                          <span>
                            {model.label}
                            <Menu.SubText>{model.description}</Menu.SubText>
                          </span>
                        </Menu.RadioGroupItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Container>
                </Menu.Root>
                <IconButton aria-label="Voice" variant="ghost">
                  <Icon24Microphone />
                </IconButton>
              </div>
              <IconButton aria-label="Send" variant="primaryCircle" disabled={!prompt.trim()}>
                <Icon24Send />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
