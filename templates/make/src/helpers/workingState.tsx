import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  useChatScript,
  type ChatItem,
  type Task,
  type Attachment,
  type InspectedElement,
  type PromptSubmission,
} from '@prototype/shared';
import { DEFAULT_SCRIPT } from '../data/chatScript';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CompletedConversation {
  prompt: string;
  attachments: Attachment[];
  inspectedElements: InspectedElement[];
  items: ChatItem[];
  tasks: Task[];
  versionNumber: number;
}

interface WorkingState {
  /** Chat script state – persists across route changes */
  script: ReturnType<typeof useChatScript>;

  /** The original user prompt that triggered the working session */
  submittedPrompt: string;
  setSubmittedPrompt: (prompt: string) => void;

  /** Attachments and inspected elements from the submitted prompt */
  submittedAttachments: Attachment[];
  submittedInspectedElements: InspectedElement[];
  setSubmittedPromptData: (submission: PromptSubmission) => void;

  /** Chat input value */
  chatPromptValue: string;
  setChatPromptValue: (value: string) => void;

  /** Whether the AI work has completed */
  workComplete: boolean;
  setWorkComplete: (value: boolean) => void;

  /** Selected AI model */
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  /** Current file name */
  fileName: string;
  setFileName: (name: string) => void;

  /** Preview vs code view */
  viewMode: string;
  setViewMode: (mode: string) => void;

  /** List of completed conversations */
  completedConversations: CompletedConversation[];
  startNewConversation: (submission: PromptSubmission) => void;

  /** Reset all working state back to initial values */
  reset: () => void;
}

const WorkingStateContext = createContext<WorkingState | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function WorkingStateProvider({ children }: { children: ReactNode }) {
  const [submittedPrompt, setSubmittedPromptRaw] = useState('');
  const [submittedAttachments, setSubmittedAttachments] = useState<Attachment[]>([]);
  const [submittedInspectedElements, setSubmittedInspectedElements] = useState<InspectedElement[]>([]);
  const [chatPromptValue, setChatPromptValue] = useState('');
  const [workComplete, setWorkComplete] = useState(false);
  const [selectedModel, setSelectedModel] = useState('default');
  const [fileName, setFileName] = useState('Untitled');
  const [viewMode, setViewMode] = useState('preview');
  const [completedConversations, setCompletedConversations] = useState<CompletedConversation[]>([]);

  // Only enable the chat script once a prompt has been submitted
  const enabled = submittedPrompt !== '';
  const script = useChatScript(DEFAULT_SCRIPT, enabled);

  const setSubmittedPrompt = (prompt: string) => {
    setSubmittedPromptRaw(prompt);
    setSubmittedAttachments([]);
    setSubmittedInspectedElements([]);
    // Auto-derive file name from the prompt
    if (prompt) {
      const words = prompt.split(/\s+/).slice(0, 5).join(' ');
      setFileName(words.charAt(0).toUpperCase() + words.slice(1));
    }
  };

  const setSubmittedPromptData = (submission: PromptSubmission) => {
    setSubmittedPromptRaw(submission.text);
    setSubmittedAttachments(submission.attachments);
    setSubmittedInspectedElements(submission.inspectedElements);
    if (submission.text) {
      const words = submission.text.split(/\s+/).slice(0, 5).join(' ');
      setFileName(words.charAt(0).toUpperCase() + words.slice(1));
    }
  };

  const startNewConversation = useCallback((submission: PromptSubmission) => {
    setCompletedConversations((prev) => [
      ...prev,
      {
        prompt: submittedPrompt,
        attachments: submittedAttachments,
        inspectedElements: submittedInspectedElements,
        items: [...script.items],
        tasks: [...script.tasks],
        versionNumber: prev.length + 1,
      },
    ]);
    script.restart();
    setSubmittedPromptRaw(submission.text);
    setSubmittedAttachments(submission.attachments);
    setSubmittedInspectedElements(submission.inspectedElements);
    if (submission.text) {
      const words = submission.text.split(/\s+/).slice(0, 5).join(' ');
      setFileName(words.charAt(0).toUpperCase() + words.slice(1));
    }
  }, [submittedPrompt, submittedAttachments, submittedInspectedElements, script]);

  const reset = useCallback(() => {
    setCompletedConversations([]);
    setSubmittedPromptRaw('');
    setSubmittedAttachments([]);
    setSubmittedInspectedElements([]);
    setChatPromptValue('');
    setWorkComplete(false);
    setFileName('Untitled');
    setViewMode('preview');
    script.reset();
  }, [script]);

  return (
    <WorkingStateContext.Provider
      value={{
        script,
        submittedPrompt,
        setSubmittedPrompt,
        submittedAttachments,
        submittedInspectedElements,
        setSubmittedPromptData,
        chatPromptValue,
        setChatPromptValue,
        workComplete,
        setWorkComplete,
        selectedModel,
        setSelectedModel,
        fileName,
        setFileName,
        viewMode,
        setViewMode,
        completedConversations,
        startNewConversation,
        reset,
      }}
    >
      {children}
    </WorkingStateContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useWorkingState() {
  const ctx = useContext(WorkingStateContext);
  if (!ctx) {
    throw new Error('useWorkingState must be used within WorkingStateProvider');
  }
  return ctx;
}
