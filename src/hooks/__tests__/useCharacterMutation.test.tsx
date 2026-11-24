import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { charactersRepo } from '@/db/repos/characters';
import { useSaveStatus } from '@/stores/saveStatus';
import { useCharacterMutation } from '../useCharacterMutation';

describe('useCharacterMutation', () => {
  it('mutate scrive subito', async () => {
    const c = await charactersRepo.create();
    const { result } = renderHook(() => useCharacterMutation(c.id));
    await act(() =>
      result.current.mutate((d) => {
        d.combat.heroicInspiration = true;
      }),
    );
    expect((await charactersRepo.get(c.id))?.combat.heroicInspiration).toBe(true);
    expect(useSaveStatus.getState().pending).toBe(0);
    expect(useSaveStatus.getState().lastSavedAt).not.toBeNull();
  });

  it('mutateDebounced scrive solo l’ultimo valore dopo la pausa', async () => {
    const c = await charactersRepo.create('Iniziale');
    const { result } = renderHook(() => useCharacterMutation(c.id, 30));
    act(() => {
      for (const name of ['T', 'Th', 'Tha', 'Thalia']) {
        result.current.mutateDebounced('name', (d) => {
          d.identity.name = name;
        });
      }
    });
    expect(useSaveStatus.getState().pending).toBe(1);
    expect((await charactersRepo.get(c.id))?.identity.name).toBe('Iniziale');
    await waitFor(async () => expect((await charactersRepo.get(c.id))?.identity.name).toBe('Thalia'));
    await waitFor(() => expect(useSaveStatus.getState().pending).toBe(0));
  });

  it('completa le scritture in sospeso quando il componente viene smontato', async () => {
    const c = await charactersRepo.create('Iniziale');
    const { result, unmount } = renderHook(() => useCharacterMutation(c.id, 10_000));
    act(() =>
      result.current.mutateDebounced('notes', (d) => {
        d.notes = 'salvato allo smontaggio';
      }),
    );
    unmount();
    await waitFor(async () =>
      expect((await charactersRepo.get(c.id))?.notes).toBe('salvato allo smontaggio'),
    );
  });
});
