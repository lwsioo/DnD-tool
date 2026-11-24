import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Character } from '@/domain/character';
import type { ID } from '@/domain/primitives';
import { useUiStore } from '@/stores/uiStore';

export type CharacterQuery =
  | { status: 'loading'; character: undefined }
  | { status: 'missing'; character: undefined }
  | { status: 'ready'; character: Character };

/** Personaggio letto in tempo reale da IndexedDB: si aggiorna da solo a ogni scrittura. */
export function useCharacter(id: ID | null | undefined): CharacterQuery {
  // null = nessun personaggio/non trovato, undefined = query in corso.
  const result = useLiveQuery(async () => (id ? ((await db.characters.get(id)) ?? null) : null), [id]);
  if (result === undefined) return { status: 'loading', character: undefined };
  if (result === null) return { status: 'missing', character: undefined };
  return { status: 'ready', character: result };
}

/** Il personaggio attivo (ultimo aperto), condiviso da barra laterale e sezioni. */
export function useActiveCharacter(): CharacterQuery {
  const id = useUiStore((s) => s.activeCharacterId);
  return useCharacter(id);
}

/** Elenco di tutti i personaggi, dal più recente; undefined mentre carica. */
export function useCharacterList(): Character[] | undefined {
  return useLiveQuery(() => db.characters.orderBy('updatedAt').reverse().toArray(), []);
}
