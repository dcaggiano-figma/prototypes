import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react';
import {
  IconButton,
  InputPrimitive,
} from '@figma/fpl-components';
import {
  Icon24Library,
  Icon24Microphone,
  Icon24Send,
} from '@figma/fpl-icons';

import type { Attachment, ModelOption, PromptSubmission } from '@prototype/shared';
import { AttachmentThumbnail, ModelSelector, AttachMenu, DEFAULT_MODEL_OPTIONS } from '@prototype/shared';

/* ------------------------------------------------------------------ */
/*  PromptLanding - the home-page single-line prompt                   */
/* ------------------------------------------------------------------ */

export interface PromptLandingProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (submission: PromptSubmission) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  modelOptions?: ModelOption[];
  placeholder?: string;
  autoFocus?: boolean;
}

export function PromptLanding({
  value,
  onChange,
  onSubmit,
  selectedModel,
  onModelChange,
  modelOptions = DEFAULT_MODEL_OPTIONS,
  placeholder = 'Describe your idea. Attach a design to guide the result.',
  autoFocus = false,
}: PromptLandingProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
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
      inspectedElements: [],
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
          <AttachMenu
            onFileSelect={handleFileSelect}
            variant="secondary"
          />
        </div>
        <InputPrimitive
          ref={inputRef}
          aria-label="Prompt"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 border-none outline-none text-bodyLg text-text py-4px bg-bg"
        />
        <div className="flex items-center gap-2 p-3">
          <div className="flex gap-1">
            <ModelSelector
              options={modelOptions}
              value={selectedModel}
              onChange={onModelChange}
            />
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
    </InputPrimitive.Root>
  );
}
