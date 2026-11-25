import { useLiveQuery } from 'dexie-react-hooks';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';
import { db } from '@/db/db';
import type { ID } from '@/domain/primitives';
import { CATEGORY_INFO, entryPath } from '@/features/wiki/categories';
import { MetaSummary } from '@/features/wiki/MetaSummary';
import { Button } from '@/ui/Button';
import { MarkdownView } from '@/ui/MarkdownView';
import { Article, NotFound } from './Article';
import { m } from '@/i18n';

/** Anteprima di una voce wiki nell'Inspector, con scorciatoia per aprirla. */
export function WikiRenderer({ id }: { id: ID }) {
  const entry = useLiveQuery(async () => (await db.wikiEntries.get(id)) ?? null, [id]);
  const navigate = useNavigate();
  if (entry === undefined) return null;
  if (entry === null) return <NotFound what={m.inspector.entry} />;
  const info = CATEGORY_INFO[entry.category];
  return (
    <Article
      title={entry.title}
      subtitle={[info.singular, entry.aliases.length ? m.inspector.alsoKnownAs(entry.aliases.join(', ')) : '']
        .filter(Boolean)
        .join(' · ')}
    >
      <MetaSummary entry={entry} />
      {entry.body ? (
        <MarkdownView compact>{entry.body}</MarkdownView>
      ) : (
        <p className="text-sm text-muted">{m.inspector.noText}</p>
      )}
      <Button size="sm" icon={ExternalLink} onClick={() => navigate(entryPath(entry))}>
        {m.inspector.openInWiki}
      </Button>
    </Article>
  );
}
