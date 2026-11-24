import { create } from 'zustand';

interface SaveStatusState {
  /** Scritture in corso o in attesa (debounce). */
  pending: number;
  lastSavedAt: number | null;
  error: string | null;
  begin: () => void;
  end: (error?: unknown) => void;
}

export const useSaveStatus = create<SaveStatusState>()((set) => ({
  pending: 0,
  lastSavedAt: null,
  error: null,
  begin: () => set((s) => ({ pending: s.pending + 1 })),
  end: (error) =>
    set((s) => ({
      pending: Math.max(0, s.pending - 1),
      ...(error
        ? { error: error instanceof Error ? error.message : String(error) }
        : { error: null, lastSavedAt: Date.now() }),
    })),
}));

/** Avvolge una scrittura su DB aggiornando l'indicatore "Salvato". */
export async function trackSave<T>(write: () => Promise<T>): Promise<T> {
  const { begin, end } = useSaveStatus.getState();
  begin();
  try {
    const result = await write();
    end();
    return result;
  } catch (error) {
    end(error);
    throw error;
  }
}
