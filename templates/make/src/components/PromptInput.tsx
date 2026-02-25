import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import {
  Menu,
  IconButton,
  Button,
  InputPrimitive,
  TextareaPrimitive,
  Chip,
} from '@figma/fpl-components';
import {
  Icon16ChevronDown,
  Icon24Plus,
  Icon24Microphone,
  Icon24Send,
  Icon24Library,
  Icon24Image,
  Icon24Stop,
  Icon24Paperclip,
  Icon24Component,
  Icon24McpConnector,
} from '@figma/fpl-icons';

import type { Attachment, InspectedElement, PromptSubmission } from '../types';
import { AttachmentThumbnail } from './AttachmentThumbnail';
import { getElementIcon } from '../helpers/elementIcons';

/* ------------------------------------------------------------------ */
/*  Model options                                                       */
/* ------------------------------------------------------------------ */

const MODEL_OPTIONS = [
  { value: 'default', label: 'Default', description: 'Standard setup' },
  { value: 'claude-opus', label: 'Claude Opus 4.6', description: 'Proactive, thorough' },
  { value: 'gemini-flash', label: 'Gemini 3 Flash', description: 'Fast, iterative' },
  { value: 'gemini-pro', label: 'Gemini 3 Pro', description: 'Deep, creative' },
];

/* ------------------------------------------------------------------ */
/*  PromptInput                                                         */
/* ------------------------------------------------------------------ */

export interface PromptInputProps {
  /** 'home' shows the full centered prompt; 'chat' shows the compact chat input */
  variant: 'home' | 'chat';
  value: string;
  onChange: (value: string) => void;
  onSubmit: (submission: PromptSubmission) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  /** Whether the AI is currently working */
  isWorking?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  inspectedElements?: InspectedElement[];
  onRemoveElement?: (id: string) => void;
}

export function PromptInput({
  variant,
  value,
  onChange,
  onSubmit,
  selectedModel,
  onModelChange,
  isWorking = false,
  placeholder,
  autoFocus = false,
  inspectedElements,
  onRemoveElement,
}: PromptInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelMenu = Menu.useMenu();
  const attachMenu = Menu.useMenu();

  useEffect(() => {
    if (autoFocus) {
      if (variant === 'home') {
        inputRef.current?.focus();
      } else {
        textareaRef.current?.focus();
      }
    }
  }, [autoFocus, variant]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newAttachments: Attachment[] = files.map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      fileName: file.name,
      loading: true,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);

    // Simulate loading for prototype
    newAttachments.forEach((att) => {
      setTimeout(() => {
        setAttachments((prev) => prev.map((a) => (a.id === att.id ? { ...a, loading: false } : a)));
      }, 800 + Math.random() * 400);
    });

    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleInternalSubmit = () => {
    if (!value.trim()) return;
    onSubmit({
      text: value,
      attachments: attachments.filter((a) => !a.loading),
      inspectedElements: inspectedElements ?? [],
    });
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
      e.preventDefault();
      handleInternalSubmit();
    }
  };

  const defaultPlaceholder = variant === 'home'
    ? 'Describe your idea. Attach a design to guide the result.'
    : 'Ask for changes';

  if (variant === 'home') {
    return (
      <InputPrimitive.Root className="rounded-lg bg-bg flex flex-col shadow-200 w-full">
        {/* Attachments container */}
        {(attachments.length > 0) && (
          <div className="flex flex-col px-3 pt-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {attachments.map((att) => (
                <AttachmentThumbnail
                  key={att.id}
                  attachment={att}
                  onRemove={() => handleRemoveAttachment(att.id)}
                />
              ))}
            </div>
          </div>
        )}
        <div className="flex">
          <div className="flex items-center gap-1 p-3">
            <Menu.Root manager={attachMenu.manager}>
              <IconButton
                aria-label="Attach"
                variant="secondary"
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...attachMenu.getTriggerProps()}
              >
                <Icon24Plus />
              </IconButton>
              <Menu.Container>
                <Menu.Group>
                  <Menu.Item onClick={() => fileInputRef.current?.click()}>
                    <Menu.ItemLead><Icon24Paperclip /></Menu.ItemLead>
                    Add images & files
                  </Menu.Item>
                  <Menu.Item onClick={() => console.log('attach-design')}>
                    <Menu.ItemLead><Icon24Component /></Menu.ItemLead>
                    Attach a design
                  </Menu.Item>
                </Menu.Group>
                <Menu.Group>
                  <Menu.Item onClick={() => console.log('connectors')}>
                    <Menu.ItemLead><Icon24McpConnector /></Menu.ItemLead>
                    Connectors
                  </Menu.Item>
                </Menu.Group>
              </Menu.Container>
            </Menu.Root>
          </div>
          <InputPrimitive
            ref={inputRef}
            aria-label="Prompt"
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? defaultPlaceholder}
            className="flex-1 border-none outline-none text-bodyLg text-text py-4px bg-bg"
          />
          <div className="flex items-center gap-2 p-3">
            <div className="flex gap-1">
              <Menu.Root manager={modelMenu.manager}>
                <Button
                  size="md"
                  aria-label="Select model"
                  variant="ghost"
                  // eslint-disable-next-line react/jsx-props-no-spreading
                  {...modelMenu.getTriggerProps()}
                >
                  <span className="flex items-center gap-4px">
                    <span>{MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label ?? 'Default'}</span>
                    <span className="flex-shrink w-12px"><Icon16ChevronDown /></span>
                  </span>
                </Button>
                <Menu.Container>
                  <Menu.RadioGroup
                    title={<Menu.Title>Select model</Menu.Title>}
                    value={selectedModel}
                    onChange={(v) => onModelChange(v as string)}
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
              <IconButton size="md" aria-label="Library" variant="ghost">
                <Icon24Library />
              </IconButton>
              <IconButton size="md" aria-label="Microphone" variant="ghost">
                <Icon24Microphone />
              </IconButton>
            </div>
            <IconButton size="md" aria-label="Submit" variant="primaryCircle" disabled={!value.trim()} onClick={handleInternalSubmit}>
              <Icon24Send />
            </IconButton>
          </div>
        </div>
        {/* eslint-disable-next-line react/forbid-elements -- no FPL file input equivalent */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </InputPrimitive.Root>
    );
  }

  // Compact 'chat' variant
  return (
    <div className="flex flex-col gap-8px w-full border border-bordertranslucent hover:border-bordertranslucentstrong focus-within:border-bordertranslucentstrong focus-within:shadow-100 rounded-lg overflow-hidden">
      {/* Attachments container */}
      {(attachments.length > 0 || (inspectedElements && inspectedElements.length > 0)) && (
        <div className="flex flex-col px-3 pt-3 gap-2">
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {attachments.map((att) => (
                <AttachmentThumbnail
                  key={att.id}
                  attachment={att}
                  onRemove={() => handleRemoveAttachment(att.id)}
                />
              ))}
            </div>
          )}
          {inspectedElements && inspectedElements.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {inspectedElements.map((el) => (
                <Chip
                  key={el.id}
                  leading={getElementIcon(el.type)}
                  onClose={() => onRemoveElement?.(el.id)}
                  hasCloseButton
                >
                  {el.label}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}
      <TextareaPrimitive.Root className="flex w-full">
        <TextareaPrimitive
          ref={textareaRef}
          aria-label="Prompt"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? defaultPlaceholder}
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
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...attachMenu.getTriggerProps()}
            >
              <Icon24Plus />
            </IconButton>
            <Menu.Container>
              <Menu.Group>
                <Menu.Item onClick={() => fileInputRef.current?.click()}>
                  <Menu.ItemLead><Icon24Paperclip /></Menu.ItemLead>
                  Add images & files
                </Menu.Item>
                <Menu.Item onClick={() => console.log('attach-design')}>
                  <Menu.ItemLead><Icon24Component /></Menu.ItemLead>
                  Attach a design
                </Menu.Item>
              </Menu.Group>
              <Menu.Group>
                <Menu.Item onClick={() => console.log('connectors')}>
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
                // eslint-disable-next-line react/jsx-props-no-spreading
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
                  onChange={(v) => onModelChange(v as string)}
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
          {isWorking ? (
            <IconButton aria-label="Submit" variant="secondary">
              <Icon24Stop />
            </IconButton>
          ) : (
            <IconButton aria-label="Submit" variant="primaryCircle" disabled={!value.trim()} onClick={handleInternalSubmit}>
              <Icon24Send />
            </IconButton>
          )}
        </div>
      </div>
      {/* eslint-disable-next-line react/forbid-elements -- no FPL file input equivalent */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
