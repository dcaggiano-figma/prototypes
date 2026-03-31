import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Core data types (from make template)                               */
/* ------------------------------------------------------------------ */

export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  loading: boolean;
}

export interface InspectedElement {
  id: string;
  type: 'div' | 'a' | 'ul' | 'ol' | 'h1' | 'img' | string;
  label: string;
}

export interface PromptSubmission {
  text: string;
  attachments: Attachment[];
  inspectedElements: InspectedElement[];
}

/* ------------------------------------------------------------------ */
/*  Chat items & tasks                                                 */
/* ------------------------------------------------------------------ */

export type TaskStatus = 'pending' | 'in_progress' | 'complete';

export interface Task {
  label: string;
  status: TaskStatus;
  children?: ReactNode;
}

export type ChatItem =
  | { id: string; type: 'user-message'; content: string; attachments: Attachment[]; inspectedElements: InspectedElement[] }
  | { id: string; type: 'reasoning'; content: string; status: 'active' | 'complete' }
  | { id: string; type: 'ai-message'; content: string; streaming: boolean }
  | { id: string; type: 'todo-list' }
  | { id: string; type: 'work-log'; files: string[] }
  | { id: string; type: 'version'; label: string }
  | { id: string; type: 'rating' };

export type TransientItem =
  | { type: 'progress'; label: string }
  | { type: 'working' }
  | { type: 'view-file'; fileName: string }
  | { type: 'write-file'; fileName: string; code: string };

/* ------------------------------------------------------------------ */
/*  Script types                                                       */
/* ------------------------------------------------------------------ */

export type ScriptStep =
  | { type: 'progress'; label: string; duration: number }
  | { type: 'reasoning'; content: string }
  | { type: 'ai-message'; content: string }
  | { type: 'view-file'; fileName: string; duration: number }
  | { type: 'todo-list'; tasks: string[] }
  | { type: 'start-task'; taskIndex: number }
  | { type: 'write-file'; fileName: string; code: string }
  | { type: 'complete-task'; taskIndex: number; files: string[] }
  | { type: 'version'; label: string }
  | { type: 'rating' }
  | { type: 'done' };

/* ------------------------------------------------------------------ */
/*  Store abstraction                                                  */
/* ------------------------------------------------------------------ */

export interface AiChatSnapshot {
  items: ChatItem[];
  transient: TransientItem | null;
  tasks: Task[];
  isWorking: boolean;
  awaitingUserAction: boolean;
}

export interface AiChatStoreAPI {
  getSnapshot(): AiChatSnapshot;
  subscribe(listener: () => void): () => void;
  onStreamComplete(): void;
  onStartTasks(): void;
  reset(): void;
}

/* ------------------------------------------------------------------ */
/*  Model selector                                                     */
/* ------------------------------------------------------------------ */

export interface ModelOption {
  value: string;
  label: string;
  description: string;
  disabled?: boolean;
}
