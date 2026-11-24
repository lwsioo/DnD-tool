import { useMemo, useState, type ReactNode } from 'react';
import { useMatch } from 'react-router';
import { useActiveCharacter } from '@/hooks/useActiveCharacter';
import { CreateEntryDialog } from '../CreateEntryDialog';
import { resolveTarget } from './resolve';
import { useLinkIndex } from './useLinkIndex';
import { WikiLinkContext, type WikiLinkContextValue } from './WikiLinkContext';

/**
 * Rende risolvibili i [[collegamenti]] in tutta l'app. La campagna di riferimento è quella
 * della pagina wiki aperta, altrimenti quella del personaggio attivo.
 */
export function WikiLinkProvider({ children }: { children: ReactNode }) {
  const match = useMatch('/campagna/:campaignId/*');
  const active = useActiveCharacter();
  const campaignId = match?.params.campaignId || active.character?.campaignId || null;
  const index = useLinkIndex(campaignId);
  const [creating, setCreating] = useState<string | null>(null);

  const value = useMemo<WikiLinkContextValue>(
    () => ({
      campaignId,
      index,
      resolve: (target) => resolveTarget(target, index),
      requestCreate: (title) => setCreating(title),
    }),
    [campaignId, index],
  );

  return (
    <WikiLinkContext.Provider value={value}>
      {children}
      {creating !== null && campaignId && (
        <CreateEntryDialog
          campaignId={campaignId}
          initialTitle={creating}
          onClose={() => setCreating(null)}
        />
      )}
    </WikiLinkContext.Provider>
  );
}
