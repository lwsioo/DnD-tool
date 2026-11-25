import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useUiStore } from '@/stores/uiStore';
import { entryPath } from '../categories';
import { useWikiLinks } from './WikiLinkContext';
import { m } from '@/i18n';

/**
 * Un [[collegamento]] reso nel testo. Clic: anteprima nell'Inspector; Ctrl/⌘+clic: apre la voce.
 * Se la destinazione non esiste è tratteggiato in rosso e il clic propone di crearla.
 */
export function WikiLinkView({ target, children }: { target: string; children: ReactNode }) {
  const ctx = useWikiLinks();
  const openInspector = useUiStore((s) => s.openInspector);
  const navigate = useNavigate();
  const resolved = ctx?.resolve(target) ?? null;

  if (!resolved) {
    const canCreate = !!ctx?.campaignId;
    return (
      <button
        type="button"
        disabled={!canCreate}
        title={
          canCreate ? m.wiki.linkMissingCreate(target) : m.wiki.linkMissing(target)
        }
        onClick={() => ctx?.requestCreate(target)}
        className="cursor-pointer text-danger underline decoration-danger/60 decoration-dashed underline-offset-2 disabled:cursor-default"
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      title={resolved.kind === 'wiki' ? 'Clic: anteprima · Ctrl+clic: apri la voce' : undefined}
      onClick={(e) => {
        if (resolved.kind === 'wiki') {
          if (e.ctrlKey || e.metaKey) navigate(entryPath(resolved.entry));
          else openInspector({ kind: 'wiki', id: resolved.entry.id });
        } else {
          openInspector(resolved.ref);
        }
      }}
      className="cursor-pointer font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
    >
      {children}
    </button>
  );
}
