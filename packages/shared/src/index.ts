/// <reference path="./svg.d.ts" />

// Theme
export { type ThemeSetting, useAppTheme } from './theme';

// Layout
export { useResizablePanel } from './layout';
export { ResizeHandle } from './layout';
export { PropertySection, PropertyRow, PlaceholderSection } from './layout';
export type { PropertySectionProps, PropertyRowProps, PlaceholderSectionProps } from './layout';

// Avatar
export { Avatar, type MultiplayerColor } from './avatar';

// Card
export { Card } from './card';

// Typography
export { Text } from './typography';
export type { TextProps, TextSize, TextColor, Truncate } from './typography';
export { Heading } from './typography';
export type { HeadingProps, HeadingSize } from './typography';
export { Code } from './typography';
export type { CodeProps } from './typography';
export { Pre } from './typography';
export type { PreProps, SyntaxLanguage } from './typography';
export { UnorderedList, OrderedList, ListItem } from './typography';
export type { UnorderedListProps, OrderedListProps, ListItemProps } from './typography';

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
  clearCommentsStorage,
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
  useLiveChat,
  SceneGraphActionParser,
  renderMarkdown,
  serializeSelectedNodes,
  createNodeWithDefaults,
  updateNodeWithTextRouting,
} from './ai-chat';
export type { UseLiveChatOptions, LiveChatResult } from './ai-chat';
export type { SceneGraphParserCallbacks } from './ai-chat';
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

// Navigation
export { ModeSwitcher } from './navigation';
export type { ModeSwitcherOption } from './navigation';
export { NavList } from './navigation';
export type { NavListItemDef } from './navigation';

// User Config
export type { UserConfig } from './user-config';
export { UserConfigProvider, useUserConfig, UserAvatar, UserConfigModal } from './user-config';

// Thumbnail
export { NavListThumbnail, ThumbnailPreview } from './thumbnail';

// Cursors
export { CURSORS } from './cursors';

// Table
export { Table } from './table';
export type {
  TableProps,
  TableColumnDef,
  TableSize,
  TableDensity,
  TableGridLines,
  TableSection,
  HeaderAction,
} from './table';

// Skeleton
export { Skeleton } from './progress';
export type { SkeletonProps, BoneProps, SkeletonVariant, SkeletonSize } from './progress';

// Swatch
export { Swatch } from './swatch';
export type { SwatchProps, SwatchType, SwatchSize } from './swatch';

// Pattern Library
export { PatternLibraryWindow } from './pattern-library';

// Save as Default
export { SaveAsDefaultModal, hydrateFromSnapshot } from './save-as-default';
export type { SerializedSceneGraph } from './save-as-default';
