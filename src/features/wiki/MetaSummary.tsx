import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { db } from '@/db/db';
import type { ID } from '@/domain/primitives';
import type { WikiEntry } from '@/domain/wiki';
import { InspectorChip } from '@/ui/InspectorChip';
import { NPC_ATTITUDE_LABELS, NPC_STATUS_LABELS } from './categories';
import { m } from '@/i18n';
import { LANG_TAG } from '@/i18n/locale';

const dateFormat = new Intl.DateTimeFormat(LANG_TAG, { dateStyle: 'long' });

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
      rows.push([m.wiki.fields.status, NPC_STATUS_LABELS[entry.meta.status]]);
      rows.push([m.wiki.fields.attitude, NPC_ATTITUDE_LABELS[entry.meta.attitude]]);
      text(m.wiki.fields.role, entry.meta.role);
      text(m.wiki.fields.species, entry.meta.species);
      refs(m.wiki.fields.factions, entry.meta.factionIds);
      refs(m.wiki.fields.location, entry.meta.locationId ? [entry.meta.locationId] : []);
      break;
    case 'location':
      text(m.wiki.fields.region, entry.meta.region);
      text(m.wiki.fields.type, entry.meta.locationType);
      refs(m.wiki.fields.partOf, entry.meta.parentLocationId ? [entry.meta.parentLocationId] : []);
      refs(m.wiki.fields.factionsPresent, entry.meta.factionIds);
      break;
    case 'faction':
      refs(m.wiki.fields.leaders, entry.meta.leaderIds);
      refs(m.wiki.fields.headquarters, entry.meta.headquartersId ? [entry.meta.headquartersId] : []);
      refs(m.wiki.fields.religion, entry.meta.religionId ? [entry.meta.religionId] : []);
      text(m.wiki.fields.goals, entry.meta.goals);
      text(m.wiki.fields.attitudeShort, entry.meta.attitude);
      break;
    case 'religion':
      text(m.wiki.fields.deity, entry.meta.deity);
      text(m.wiki.fields.domains, entry.meta.domains.join(', ') || undefined);
      text(m.wiki.fields.symbol, entry.meta.symbol);
      text(m.wiki.fields.alignment, entry.meta.alignment);
      break;
    case 'session': {
      rows.push([m.wiki.fields.session, m.wiki.fields.sessionNo(entry.meta.number)]);
      const d = new Date(entry.meta.date);
      text(m.wiki.fields.date, Number.isNaN(d.getTime()) ? entry.meta.date : dateFormat.format(d));
      text(m.wiki.fields.inGameDate, entry.meta.inGameDate);
      text(m.wiki.fields.participants, participants.join(', ') || undefined);
      break;
    }
  }
  if (entry.tags.length) rows.push([m.wiki.fields.tags, entry.tags.map((t) => `#${t}`).join(' ')]);
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
