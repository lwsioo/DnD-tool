import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { SRD_BACKGROUNDS, SRD_FEATS, SRD_SPECIES } from '@/data/srd/origins';
import { db } from '@/db/db';
import type { LibraryItem } from '@/domain/library';
import type { OriginLibrary } from './applyOrigin';

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'it');

/** Unisce la libreria SRD integrata con specie, background e talenti presenti nel DB. */
export function mergeOriginLibrary(items: readonly LibraryItem[]): OriginLibrary {
  const species = [...SRD_SPECIES];
  const backgrounds = [...SRD_BACKGROUNDS];
  const feats = [...SRD_FEATS];
  for (const it of items) {
    if (it.kind === 'species' && !species.some((s) => s.id === it.data.id)) species.push(it.data);
    if (it.kind === 'background' && !backgrounds.some((s) => s.id === it.data.id)) backgrounds.push(it.data);
    if (it.kind === 'feat' && !feats.some((s) => s.id === it.data.id)) feats.push(it.data);
  }
  return { species: species.sort(byName), backgrounds: backgrounds.sort(byName), feats: feats.sort(byName) };
}

const ORIGIN_KINDS = ['species', 'background', 'feat'];

export function useOriginLibrary(): OriginLibrary {
  const items = useLiveQuery(() => db.libraryItems.where('kind').anyOf(ORIGIN_KINDS).toArray(), []);
  return useMemo(() => mergeOriginLibrary(items ?? []), [items]);
}
