import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { refKey, type InspectorRef } from '@/features/inspector/refs';
import type { SpellFilters } from '@/features/grimoire/filters';

export type { InspectorRef };
export type Theme = 'dark' | 'light';

export const INSPECTOR_MIN_WIDTH = 320;
export const INSPECTOR_MAX_WIDTH = 720;
const clampWidth = (w: number) => Math.round(Math.min(INSPECTOR_MAX_WIDTH, Math.max(INSPECTOR_MIN_WIDTH, w)));

interface UiState {
  theme: Theme;
  /** Ultimo personaggio aperto: la navigazione della barra laterale punta a lui. */
  activeCharacterId: string | null;
  /** Scheda in modalità Modifica (altrimenti Gioco: solo contatori e interruttori). */
  sheetEditMode: boolean;
  setSheetEditMode: (edit: boolean) => void;
  /** Promemoria backup rimandato fino a questa data (ms). */
  backupSnoozeUntil: number;
  snoozeBackupReminder: (days: number) => void;
  /** Visita guidata già vista o saltata: non si riapre più da sola. */
  tourDone: boolean;
  tourOpen: boolean;
  setTourOpen: (open: boolean) => void;
  /** Chiude la visita (fine o «Salta») e la segna come vista. */
  finishTour: () => void;
  /** Barra laterale aperta sugli schermi stretti (sotto 1024 px è a scomparsa). */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  /** Palette di ricerca (Ctrl+K). */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  /** Dialog di riposo aperto (anche dalla palette, non solo dalla barra laterale). */
  restDialog: 'short' | 'long' | null;
  setRestDialog: (rest: 'short' | 'long' | null) => void;
  /** Filtri del Grimorio, per personaggio. */
  grimoireFilters: Record<string, SpellFilters>;
  setGrimoireFilters: (characterId: string, filters: SpellFilters) => void;
  inspectorOpen: boolean;
  inspectorPinned: boolean;
  /** Larghezza del pannello agganciato (≥1280px), in px. */
  inspectorWidth: number;
  /** Cronologia dell'inspector e posizione corrente (◀ ▶). */
  inspectorHistory: InspectorRef[];
  inspectorIndex: number;

  setActiveCharacter: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  openInspector: (ref?: InspectorRef) => void;
  closeInspector: () => void;
  toggleInspector: () => void;
  toggleInspectorPin: () => void;
  setInspectorWidth: (width: number) => void;
  inspectorBack: () => void;
  inspectorForward: () => void;
}

const prefersDark = () =>
  typeof window === 'undefined' || !window.matchMedia
    ? true
    : window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: prefersDark() ? 'dark' : 'light',
      activeCharacterId: null,
      sheetEditMode: false,
      setSheetEditMode: (sheetEditMode) => set({ sheetEditMode }),
      backupSnoozeUntil: 0,
      snoozeBackupReminder: (days) => set({ backupSnoozeUntil: Date.now() + days * 86_400_000 }),
      tourDone: false,
      tourOpen: false,
      setTourOpen: (tourOpen) => set({ tourOpen }),
      finishTour: () => set({ tourOpen: false, tourDone: true }),
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      paletteOpen: false,
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      restDialog: null,
      setRestDialog: (restDialog) => set({ restDialog }),
      grimoireFilters: {},
      setGrimoireFilters: (characterId, filters) =>
        set({ grimoireFilters: { ...get().grimoireFilters, [characterId]: filters } }),
      inspectorOpen: false,
      inspectorPinned: false,
      inspectorWidth: 420,
      inspectorHistory: [],
      inspectorIndex: -1,

      setActiveCharacter: (activeCharacterId) => set({ activeCharacterId }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),

      openInspector: (ref) => {
        if (!ref) return set({ inspectorOpen: true });
        const { inspectorHistory, inspectorIndex } = get();
        const current = inspectorHistory[inspectorIndex];
        if (current && refKey(current) === refKey(ref)) return set({ inspectorOpen: true });
        // Aprire una nuova voce tronca la cronologia "avanti", come un browser.
        const history = [...inspectorHistory.slice(0, inspectorIndex + 1), ref].slice(-50);
        set({ inspectorOpen: true, inspectorHistory: history, inspectorIndex: history.length - 1 });
      },
      closeInspector: () => set({ inspectorOpen: false }),
      toggleInspector: () => set({ inspectorOpen: !get().inspectorOpen }),
      toggleInspectorPin: () => set({ inspectorPinned: !get().inspectorPinned }),
      setInspectorWidth: (width) => set({ inspectorWidth: clampWidth(width) }),
      inspectorBack: () => set({ inspectorIndex: Math.max(0, get().inspectorIndex - 1) }),
      inspectorForward: () =>
        set({ inspectorIndex: Math.min(get().inspectorHistory.length - 1, get().inspectorIndex + 1) }),
    }),
    {
      name: 'codex-ui',
      storage: createJSONStorage(() => localStorage),
      // Solo le preferenze sopravvivono al ricaricamento; la cronologia dell'inspector no.
      partialize: (s) => ({
        theme: s.theme,
        activeCharacterId: s.activeCharacterId,
        inspectorPinned: s.inspectorPinned,
        inspectorWidth: s.inspectorWidth,
        grimoireFilters: s.grimoireFilters,
        backupSnoozeUntil: s.backupSnoozeUntil,
        tourDone: s.tourDone,
      }),
    },
  ),
);

export const selectCurrentInspectorRef = (s: UiState): InspectorRef | null =>
  s.inspectorHistory[s.inspectorIndex] ?? null;
