export { useResizablePanel } from './useResizablePanel';
export { ResizeHandle } from './ResizeHandle';
export { Avatar, type MultiplayerColor } from './Avatar';
export { Card } from './Card';

// Property Layout
export { PropertySection, PropertyRow, PlaceholderSection } from './PropertyLayout';
export type { PropertySectionProps, PropertyRowProps, PlaceholderSectionProps } from './PropertyLayout';

// Comments
export type {
  Comment,
  CommentAnchor,
  CommentThread,
  CommentInteraction,
  CommentsStoreAPI,
} from './comments';
export {
  createCommentsStore,
  CommentsProvider,
  useComments,
  useThread,
  formatRelativeTime,
  resolveCommentPosition,
} from './comments';
export { CommentPin } from './comments/CommentPin';
export { CommentPopover } from './comments/CommentPopover';
export { CommentMessage } from './comments/CommentMessage';
export { CommentHoverPreview } from './comments/CommentHoverPreview';
export { CommentThreadWindow } from './comments/CommentThreadWindow';
export { CommentPinLayer } from './comments/CommentPinLayer';
export { CommentOverlay } from './comments/CommentOverlay';
export { CommentListItem } from './comments/CommentListItem';

// Context Menu
export type { MenuItemDef, MenuType } from './context-menu';
export { renderMenuItems, useContextMenu, ContextMenuRenderer } from './context-menu';

// Left Sidebar
export { LeftSidebar, useLeftSidebar } from './left-sidebar';

// Toolbar
export { Toolbar } from './toolbar';
export type { ActionItem, ActionSection, TabConfig, SubTool } from './toolbar';

// AI Chat
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
} from './ai-chat';
export type { ScriptedChatStore, LiveChatStore } from './ai-chat';
export {
  createScriptedChatStore,
  createLiveChatStore,
  AiChatProvider,
  useAiChat,
  useAiChatSnapshot,
  DEFAULT_MODEL_OPTIONS,
  useChatScript,
} from './ai-chat';
export { StreamingContent } from './ai-chat/StreamingContent';
export { ChatMessage, CollapsibleSection, ProgressIndicator } from './ai-chat/ChatMessage';
export { AttachmentThumbnail } from './ai-chat/AttachmentThumbnail';
export { SystemMessage } from './ai-chat/SystemMessage';
export { TodoList } from './ai-chat/TodoListCard';
export { VersionCard } from './ai-chat/VersionCard';
export { FileCard } from './ai-chat/FileCard';
export { getElementIcon } from './ai-chat/elementIcons';
export { ModelSelector } from './ai-chat/ModelSelector';
export { AttachMenu } from './ai-chat/AttachMenu';
export { PromptPanel } from './ai-chat/PromptPanel';

// Mode Switcher
export { ModeSwitcher } from './ModeSwitcher';
export type { ModeSwitcherOption } from './ModeSwitcher';

// Nav List
export { NavList } from './NavList';
export type { NavListItemDef } from './NavList';

// User Config
export type { UserConfig } from './user-config';
export { UserConfigProvider, useUserConfig, UserAvatar } from './user-config';
