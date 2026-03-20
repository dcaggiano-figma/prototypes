import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { NodeId } from '../canvas';

interface SpeakerNotesAPI {
  getNotes: (slideId: NodeId) => string;
  setNotes: (slideId: NodeId, text: string) => void;
}

const SpeakerNotesContext = createContext<SpeakerNotesAPI | null>(null);

export function SpeakerNotesProvider({ children }: { children: React.ReactNode }) {
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const getNotes = useCallback(
    (slideId: NodeId) => notesMap[slideId] ?? '',
    [notesMap],
  );

  const setNotes = useCallback(
    (slideId: NodeId, text: string) => {
      setNotesMap((prev) => ({ ...prev, [slideId]: text }));
    },
    [],
  );

  const api = useMemo(() => ({ getNotes, setNotes }), [getNotes, setNotes]);

  return (
    <SpeakerNotesContext.Provider value={api}>
      {children}
    </SpeakerNotesContext.Provider>
  );
}

export function useSpeakerNotes() {
  const ctx = useContext(SpeakerNotesContext);
  if (!ctx) throw new Error('useSpeakerNotes must be used within SpeakerNotesProvider');
  return ctx;
}
