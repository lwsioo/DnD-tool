import { createContext, useContext } from 'react';
import type { ID } from '@/domain/primitives';
import type { LinkIndex, ResolvedLink } from './resolve';

export interface WikiLinkContextValue {
  /** Campagna in cui risolvere i collegamenti (null: solo incantesimi e regole). */
  campaignId: ID | null;
  index: LinkIndex;
  resolve: (target: string) => ResolvedLink | null;
  /** Apre la finestra per creare una voce mancante. */
  requestCreate: (title: string) => void;
}

export const WikiLinkContext = createContext<WikiLinkContextValue | null>(null);

export const useWikiLinks = () => useContext(WikiLinkContext);
