import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
  /** Azione opzionale, tipicamente "Annulla". */
  action?: { label: string; onClick: () => void | Promise<void> };
  /** ms prima della chiusura automatica; 0 = resta finché non si chiude. */
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  show: (
    toast: Omit<Toast, 'id' | 'tone' | 'duration'> & Partial<Pick<Toast, 'tone' | 'duration'>>,
  ) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (toast) => {
    const id = nextId++;
    const entry: Toast = { tone: 'info', duration: 6000, ...toast, id };
    // Al massimo 4 notifiche visibili: le più vecchie escono.
    set((s) => ({ toasts: [...s.toasts, entry].slice(-4) }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Scorciatoia utilizzabile anche fuori dai componenti. */
export const toast = (t: Parameters<ToastState['show']>[0]) => useToastStore.getState().show(t);
