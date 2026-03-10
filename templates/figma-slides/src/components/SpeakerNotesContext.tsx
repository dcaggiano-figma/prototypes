import { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface SpeakerNotesAPI {
  getNotes: (slideId: string) => string;
  setNotes: (slideId: string, text: string) => void;
}

const SpeakerNotesContext = createContext<SpeakerNotesAPI | null>(null);

export function SpeakerNotesProvider({ children }: { children: React.ReactNode }) {
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const getNotes = useCallback(
    (slideId: string) => notesMap[slideId] ?? '',
    [notesMap],
  );

  const setNotes = useCallback(
    (slideId: string, text: string) => {
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
