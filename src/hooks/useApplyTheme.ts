import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';

/** Sincronizza la classe `.dark` su <html> con la preferenza salvata. */
export function useApplyTheme() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
}
