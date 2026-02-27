// Types
export type {
  Attachment,
  InspectedElement,
  PromptSubmission,
  TaskStatus,
  Task,
  ChatItem,
  TransientItem,
  ScriptStep,
  AiChatSnapshot,
  AiChatStoreAPI,
  ModelOption,
} from './types';

// Store
export {
  createScriptedChatStore,
  createLiveChatStore,
} from './store';
export type { ScriptedChatStore, LiveChatStore } from './store';

// Provider & hooks
export {
  AiChatProvider,
  useAiChat,
  useAiChatSnapshot,
  DEFAULT_MODEL_OPTIONS,
} from './provider';

// React hook wrapper
export { useChatScript } from './useChatScript';

// UI Components
export { StreamingContent } from './StreamingContent';
export type { StreamingContentProps } from './StreamingContent';

export { ChatMessage, CollapsibleSection, ProgressIndicator } from './ChatMessage';
export type { ChatMessageProps, CollapsibleSectionProps, ProgressIndicatorProps } from './ChatMessage';

export { AttachmentThumbnail } from './AttachmentThumbnail';

export { SystemMessage } from './SystemMessage';
export type { SystemMessageProps } from './SystemMessage';

export { TodoList } from './TodoListCard';
export type { TodoListProps } from './TodoListCard';

export { VersionCard } from './VersionCard';
export type { VersionCardProps } from './VersionCard';

export { FileCard } from './FileCard';
export type { FileCardProps } from './FileCard';

export { getElementIcon } from './elementIcons';

// Prompt components
export { ModelSelector } from './ModelSelector';
export type { ModelSelectorProps } from './ModelSelector';

export { AttachMenu } from './AttachMenu';
export type { AttachMenuProps } from './AttachMenu';

export { PromptLanding } from './PromptLanding';
export type { PromptLandingProps } from './PromptLanding';

export { PromptPanel } from './PromptPanel';
export type { PromptPanelProps } from './PromptPanel';
