import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Link2, Pencil, Plus, Unlink } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import { db } from '@/db/db';
import { campaignsRepo } from '@/db/repos/campaigns';
import { charactersRepo } from '@/db/repos/characters';
import type { ID } from '@/domain/primitives';
import type { Campaign, WikiCategory, WikiEntry } from '@/domain/wiki';
import { useActiveCharacter } from '@/hooks/useActiveCharacter';
import { cn } from '@/lib/cn';
import { normalizeKey } from '@/lib/normalizeKey';
import { toast } from '@/stores/toastStore';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { inputClass } from '@/ui/fields';
import {
  CATEGORY_INFO,
  CATEGORY_ORDER,
  categoryFromSlug,
  displayTitle,
  entryPath,
  NPC_STATUS_LABELS,
} from './categories';
import { CreateEntryDialog } from './CreateEntryDialog';
import { EntryPage } from './EntryPage';

/** Campagna Wiki: /campagna/:campaignId/:categoria?/:voce? */
export function WikiPage() {
  const { campaignId, category: slug, entryId } = useParams();
  const campaign = useLiveQuery(
    async () => (campaignId ? ((await db.campaigns.get(campaignId)) ?? null) : null),
    [campaignId],
  );

  if (!campaignId) return <CampaignsHome />;
  if (campaign === undefined) return null;
  if (campaign === null) return <CampaignsHome notFound />;
  return <CampaignLayout campaign={campaign} category={categoryFromSlug(slug)} entryId={entryId} />;
}

function CampaignsHome({ notFound }: { notFound?: boolean }) {
  const campaigns = useLiveQuery(() => campaignsRepo.list(), [], []);
  const active = useActiveCharacter();
  const navigate = useNavigate();
  const [name, setName] = useState('');

  const create = async () => {
    const c = await campaignsRepo.create(name.trim());
    if (active.character && !active.character.campaignId) {
      await charactersRepo.mutate(active.character.id, (d) => void (d.campaignId = c.id));
    }
    setName('');
    navigate(`/campagna/${c.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {notFound && <p className="text-sm text-danger">Campagna non trovata.</p>}
      <div className="space-y-1">
        <h2 className="font-display text-2xl tracking-wide">Campagne</h2>
        <p className="text-sm text-muted">
          Luoghi, fazioni, religioni, NPC e diario delle sessioni, collegati tra loro con{' '}
          <code>[[Nome]]</code>.
        </p>
      </div>
      <ul className="space-y-2">
        {campaigns.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3">
            <BookOpen className="size-5 text-accent" aria-hidden />
            <Link to={`/campagna/${c.id}`} className="flex-1 font-medium hover:text-accent">
              {c.name}
            </Link>
            {active.character?.campaignId === c.id && (
              <span className="text-xs text-muted">campagna di {active.character.identity.name}</span>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void create();
        }}
      >
        <input
          aria-label="Nome della nuova campagna"
          placeholder="Nome della nuova campagna"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="primary" icon={Plus} disabled={!name.trim()}>
          Crea
        </Button>
      </form>
      {active.character && !active.character.campaignId && campaigns.length > 0 && (
        <p className="text-xs text-muted">
          {active.character.identity.name} non è in nessuna campagna: aprine una e usa “Collega”.
        </p>
      )}
    </div>
  );
}

function CampaignLayout({
  campaign,
  category,
  entryId,
}: {
  campaign: Campaign;
  category?: WikiCategory;
  entryId?: ID;
}) {
  const entries = useLiveQuery(
    () => db.wikiEntries.where('campaignId').equals(campaign.id).toArray(),
    [campaign.id],
    [],
  );
  const active = useActiveCharacter();
  const [filter, setFilter] = useState('');
  const [npcStatus, setNpcStatus] = useState<string>('all');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const currentCategory: WikiCategory =
    category ?? (entryId ? (entries.find((e) => e.id === entryId)?.category ?? 'location') : 'location');

  const counts = useMemo(() => {
    const out = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<WikiCategory, number>;
    for (const e of entries) out[e.category]++;
    return out;
  }, [entries]);

  const list = useMemo(() => {
    const q = normalizeKey(filter);
    return entries
      .filter((e) => e.category === currentCategory)
      .filter(
        (e) =>
          !q ||
          e.titleKey.includes(q) ||
          e.aliasKeys.some((a) => a.includes(q)) ||
          e.tags.some((t) => normalizeKey(t).includes(q)),
      )
      .filter(
        (e) =>
          currentCategory !== 'npc' ||
          npcStatus === 'all' ||
          (e.category === 'npc' && e.meta.status === npcStatus),
      )
      .sort((a, b) =>
        a.category === 'session' && b.category === 'session'
          ? b.meta.number - a.meta.number
          : a.title.localeCompare(b.title, 'it'),
      );
  }, [entries, currentCategory, filter, npcStatus]);

  const linked = active.character?.campaignId === campaign.id;
  const toggleLink = () =>
    active.character &&
    void charactersRepo
      .mutate(active.character.id, (d) => void (d.campaignId = linked ? null : campaign.id))
      .then(() =>
        toast({
          tone: 'success',
          message: linked
            ? `${active.character!.identity.name} scollegato dalla campagna.`
            : `${active.character!.identity.name} ora gioca in “${campaign.name}”.`,
        }),
      );

  return (
    <div className="flex h-full min-h-0">
      <aside
        aria-label="Navigazione campagna"
        className="flex w-64 shrink-0 flex-col border-r border-line bg-panel/60"
      >
        <div className="space-y-2 border-b border-line p-3">
          <div className="flex items-center gap-1">
            <Link to="/campagna/" className="text-xs text-muted hover:text-accent">
              Campagne
            </Link>
            <span className="text-xs text-muted">/</span>
          </div>
          <div className="flex items-center gap-1">
            <h2 className="min-w-0 flex-1 truncate font-display text-lg tracking-wide">{campaign.name}</h2>
            <button
              type="button"
              aria-label="Rinomina campagna"
              className="text-muted hover:text-ink"
              onClick={() => setRenaming(true)}
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
          </div>
          {active.character && (
            <button
              type="button"
              onClick={toggleLink}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                linked ? 'text-ok' : 'text-accent hover:underline',
              )}
              title={linked ? 'Clic per scollegare' : undefined}
            >
              {linked ? (
                <Link2 className="size-3.5" aria-hidden />
              ) : (
                <Unlink className="size-3.5" aria-hidden />
              )}
              {linked
                ? `${active.character.identity.name} è in questa campagna`
                : `Collega ${active.character.identity.name}`}
            </button>
          )}
        </div>

        <nav aria-label="Categorie" className="space-y-0.5 p-2">
          {CATEGORY_ORDER.map((c) => (
            <NavLink
              key={c}
              to={`/campagna/${campaign.id}/${CATEGORY_INFO[c].slug}`}
              className={() =>
                cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm',
                  c === currentCategory
                    ? 'bg-accent-soft font-medium text-accent'
                    : 'text-muted hover:bg-panel-2 hover:text-ink',
                )
              }
            >
              <span aria-hidden>{CATEGORY_INFO[c].icon}</span>
              <span className="flex-1">{CATEGORY_INFO[c].label}</span>
              <span className="text-xs">{counts[c]}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-line p-2">
          <input
            aria-label="Filtra le voci"
            placeholder="Filtra…"
            className={cn(inputClass, 'py-1')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {currentCategory === 'npc' && (
            <div className="flex flex-wrap gap-1">
              {(['all', 'alive', 'dead', 'unknown'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={npcStatus === s}
                  onClick={() => setNpcStatus(s)}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px]',
                    npcStatus === s ? 'border-accent text-accent' : 'border-line text-muted',
                  )}
                >
                  {s === 'all' ? 'Tutti' : NPC_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>

        <ul
          aria-label={`Voci: ${CATEGORY_INFO[currentCategory].label}`}
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2"
        >
          {list.length === 0 && <li className="px-2 text-xs text-muted">Nessuna voce.</li>}
          {list.map((e) => (
            <li key={e.id}>
              <Link
                to={entryPath(e)}
                className={cn(
                  'block truncate rounded-md px-2.5 py-1 text-sm',
                  e.id === entryId ? 'bg-panel-2 font-medium' : 'text-muted hover:bg-panel-2 hover:text-ink',
                )}
              >
                {displayTitle(e)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t border-line p-2">
          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            className="w-full"
            onClick={() => setCreating(true)}
          >
            Nuova voce
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {entryId ? (
          <EntryPage entryId={entryId} />
        ) : (
          <CategoryOverview
            campaign={campaign}
            category={currentCategory}
            entries={list}
            onCreate={() => setCreating(true)}
          />
        )}
      </div>

      {creating && (
        <CreateEntryDialog
          campaignId={campaign.id}
          initialCategory={currentCategory}
          onClose={() => setCreating(false)}
        />
      )}
      {renaming && <RenameCampaignDialog campaign={campaign} onClose={() => setRenaming(false)} />}
    </div>
  );
}

function CategoryOverview({
  campaign,
  category,
  entries,
  onCreate,
}: {
  campaign: Campaign;
  category: WikiCategory;
  entries: WikiEntry[];
  onCreate: () => void;
}) {
  const info = CATEGORY_INFO[category];
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
      <h2 className="font-display text-2xl tracking-wide">
        {info.icon} {info.label}
      </h2>
      {campaign.description && <p className="text-sm text-muted">{campaign.description}</p>}
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Nessuna voce.{' '}
          <button type="button" className="text-accent hover:underline" onClick={onCreate}>
            Crea la prima
          </button>
          .
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                to={entryPath(e)}
                className="block rounded-xl border border-line bg-panel p-3 hover:border-accent/50"
              >
                <span className="block font-medium">{displayTitle(e)}</span>
                <span className="line-clamp-2 text-xs text-muted">
                  {e.body.replace(/[#*>[\]|]/g, '').slice(0, 160) || '—'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RenameCampaignDialog({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [name, setName] = useState(campaign.name);
  const save = async () => {
    await campaignsRepo.rename(campaign.id, name.trim());
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Rinomina campagna"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => void save()}>
            Salva
          </Button>
        </>
      }
    >
      <input
        aria-label="Nome della campagna"
        data-autofocus
        className={inputClass}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </Dialog>
  );
}
