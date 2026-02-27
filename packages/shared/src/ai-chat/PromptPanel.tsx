import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react';
import {
  IconButton,
  TextareaPrimitive,
  Chip,
} from '@figma/fpl-components';
import {
  Icon24Image,
  Icon24Microphone,
  Icon24Send,
  Icon24Stop,
} from '@figma/fpl-icons';

import type { Attachment, InspectedElement, ModelOption, PromptSubmission } from './types';
import { AttachmentThumbnail } from './AttachmentThumbnail';
import { getElementIcon } from './elementIcons';
import { ModelSelector } from './ModelSelector';
import { AttachMenu } from './AttachMenu';
import { DEFAULT_MODEL_OPTIONS } from './provider';

/* ------------------------------------------------------------------ */
/*  PromptPanel - the chat-panel expandable textarea prompt            */
/* ------------------------------------------------------------------ */

export interface PromptPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (submission: PromptSubmission) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  modelOptions?: ModelOption[];
  /** Whether the AI is currently working */
  isWorking?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  inspectedElements?: InspectedElement[];
  onRemoveElement?: (id: string) => void;
}

export function PromptPanel({
  value,
  onChange,
  onSubmit,
  selectedModel,
  onModelChange,
  modelOptions = DEFAULT_MODEL_OPTIONS,
  isWorking = false,
  placeholder = 'Ask for changes',
  autoFocus = false,
  inspectedElements,
  onRemoveElement,
}: PromptPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  const handleFileSelect = (files: File[]) => {
    const newAttachments: Attachment[] = files.map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      fileName: file.name,
      loading: true,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);

    newAttachments.forEach((att) => {
      setTimeout(() => {
        setAttachments((prev) => prev.map((a) => (a.id === att.id ? { ...a, loading: false } : a)));
      }, 800 + Math.random() * 400);
    });
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
          placeholder={placeholder}
          rows={3}
          expandable
          maxHeight={200}
          className="flex-1 border-none outline-none text-bodyLg text-text px-3 py-12px resize-none bg-bg"
        />
      </TextareaPrimitive.Root>
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-4px">
          <AttachMenu onFileSelect={handleFileSelect} />
          <IconButton aria-label="Layout" variant="ghost">
            <Icon24Image />
          </IconButton>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <ModelSelector
              options={modelOptions}
              value={selectedModel}
              onChange={onModelChange}
              maxWidth={80}
            />
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
    </div>
  );
}
