import { useCallback, useEffect, useRef } from 'react';
import { charactersRepo, type CharacterRecipe } from '@/db/repos/characters';
import type { ID } from '@/domain/primitives';
import { trackSave, useSaveStatus } from '@/stores/saveStatus';

export const TEXT_DEBOUNCE_MS = 400;

interface PendingWrite {
  recipe: CharacterRecipe;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Scritture sul personaggio con salvataggio automatico.
 *  - `mutate(recipe)`: immediata, per contatori e toggle.
 *  - `mutateDebounced(key, recipe)`: per i campi di testo; per ogni `key` vale solo l'ultima ricetta,
 *    scritta dopo `debounceMs` di inattività. Le scritture in sospeso vengono completate
 *    allo smontaggio del componente e alla chiusura della pagina.
 */
export function useCharacterMutation(characterId: ID | null | undefined, debounceMs = TEXT_DEBOUNCE_MS) {
  const pending = useRef(new Map<string, PendingWrite>());
  const idRef = useRef(characterId);

  const mutate = useCallback((recipe: CharacterRecipe) => {
    const id = idRef.current;
    if (!id) return Promise.resolve(undefined);
    return trackSave(() => charactersRepo.mutate(id, recipe));
  }, []);

  const flush = useCallback(
    (key?: string) => {
      const keys = key ? [key] : [...pending.current.keys()];
      const writes = keys.map((k) => {
        const write = pending.current.get(k);
        if (!write) return Promise.resolve(undefined);
        clearTimeout(write.timer);
        pending.current.delete(k);
        useSaveStatus.getState().end(); // chiude il "begin" registrato in coda
        return mutate(write.recipe);
      });
      return Promise.all(writes);
    },
    [mutate],
  );

  const mutateDebounced = useCallback(
    (key: string, recipe: CharacterRecipe) => {
      const existing = pending.current.get(key);
      if (existing) clearTimeout(existing.timer);
      else useSaveStatus.getState().begin(); // mostra "Salvataggio…" già durante l'attesa
      const timer = setTimeout(() => void flush(key), debounceMs);
      pending.current.set(key, { recipe, timer });
    },
    [debounceMs, flush],
  );

  // Cambiando personaggio, prima si completano le scritture verso quello precedente.
  useEffect(() => {
    if (idRef.current !== characterId) {
      void flush();
      idRef.current = characterId;
    }
  }, [characterId, flush]);

  useEffect(() => {
    const onPageHide = () => void flush();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  return { mutate, mutateDebounced, flush };
}
