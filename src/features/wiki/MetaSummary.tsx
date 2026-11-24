import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { db } from '@/db/db';
import type { ID } from '@/domain/primitives';
import type { WikiEntry } from '@/domain/wiki';
import { InspectorChip } from '@/ui/InspectorChip';
import { NPC_ATTITUDE_LABELS, NPC_STATUS_LABELS } from './categories';

const dateFormat = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' });

function EntryChips({ ids, names }: { ids: ID[]; names: Map<ID, string> }) {
  const known = ids.filter((id) => names.has(id));
  if (known.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {known.map((id) => (
        <InspectorChip key={id} to={{ kind: 'wiki', id }} muted>
          {names.get(id)}
        </InspectorChip>
      ))}
    </span>
  );
}

/** Metadati strutturati della voce (stato NPC, fazioni, luogo, sessione…) in forma leggibile. */
export function MetaSummary({ entry }: { entry: WikiEntry }) {
  const names = useLiveQuery(
    async () =>
      new Map(
        (await db.wikiEntries.where('campaignId').equals(entry.campaignId).toArray()).map((e) => [
          e.id,
          e.title,
        ]),
      ),
    [entry.campaignId],
    new Map<ID, string>(),
  );
  const participants = useLiveQuery(
    async () =>
      entry.category === 'session'
        ? (await db.characters.bulkGet(entry.meta.participantIds))
            .filter((c) => !!c)
            .map((c) => c!.identity.name)
        : [],
    [entry],
    [],
  );

  const rows: Array<[string, ReactNode]> = [];
  const text = (label: string, v: string | undefined) => v && rows.push([label, v]);
  const refs = (label: string, ids: ID[]) =>
    ids.some((id) => names.has(id)) && rows.push([label, <EntryChips ids={ids} names={names} />]);

  switch (entry.category) {
    case 'npc':
      rows.push(['Stato', NPC_STATUS_LABELS[entry.meta.status]]);
      rows.push(['Attitudine', NPC_ATTITUDE_LABELS[entry.meta.attitude]]);
      text('Ruolo', entry.meta.role);
      text('Specie', entry.meta.species);
      refs('Fazioni', entry.meta.factionIds);
      refs('Luogo', entry.meta.locationId ? [entry.meta.locationId] : []);
      break;
    case 'location':
      text('Regione', entry.meta.region);
      text('Tipo', entry.meta.locationType);
      refs('Parte di', entry.meta.parentLocationId ? [entry.meta.parentLocationId] : []);
      refs('Fazioni presenti', entry.meta.factionIds);
      break;
    case 'faction':
      refs('Capi', entry.meta.leaderIds);
      refs('Sede', entry.meta.headquartersId ? [entry.meta.headquartersId] : []);
      refs('Religione', entry.meta.religionId ? [entry.meta.religionId] : []);
      text('Obiettivi', entry.meta.goals);
      text('Atteggiamento', entry.meta.attitude);
      break;
    case 'religion':
      text('Divinità', entry.meta.deity);
      text('Domini', entry.meta.domains.join(', ') || undefined);
      text('Simbolo', entry.meta.symbol);
      text('Allineamento', entry.meta.alignment);
      break;
    case 'session': {
      rows.push(['Sessione', `n. ${entry.meta.number}`]);
      const d = new Date(entry.meta.date);
      text('Data', Number.isNaN(d.getTime()) ? entry.meta.date : dateFormat.format(d));
      text('Data nel mondo', entry.meta.inGameDate);
      text('Partecipanti', participants.join(', ') || undefined);
      break;
    }
  }
  if (entry.tags.length) rows.push(['Tag', entry.tags.map((t) => `#${t}`).join(' ')]);
  if (rows.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-line bg-bg/40 p-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-medium text-muted">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
