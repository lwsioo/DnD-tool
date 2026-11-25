import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { db } from '@/db/db';
import type { ID } from '@/domain/primitives';
import type { WikiCategory, WikiEntry } from '@/domain/wiki';
import { FieldLabel, inputClass, Select } from '@/ui/fields';
import { TagInput } from '@/ui/TagInput';
import { NPC_ATTITUDE_LABELS, NPC_STATUS_LABELS } from './categories';
import { m } from '@/i18n';

function useEntries(campaignId: ID, category: WikiCategory, excludeId: ID) {
  return useLiveQuery(
    () =>
      db.wikiEntries
        .where('[campaignId+category]')
        .equals([campaignId, category])
        .filter((e) => e.id !== excludeId)
        .sortBy('title'),
    [campaignId, category, excludeId],
    [],
  );
}

function SinglePicker(props: {
  label: string;
  value: ID | undefined;
  onValue: (v: ID | undefined) => void;
  campaignId: ID;
  category: WikiCategory;
  excludeId: ID;
}) {
  const entries = useEntries(props.campaignId, props.category, props.excludeId);
  return (
    <FieldLabel label={props.label}>
      <Select
        label={props.label}
        value={props.value ?? ''}
        onValue={(v) => props.onValue(v || undefined)}
        options={[{ value: '', label: '—' }, ...entries.map((e) => ({ value: e.id, label: e.title }))]}
      />
    </FieldLabel>
  );
}

function MultiPicker(props: {
  label: string;
  value: ID[];
  onValue: (v: ID[]) => void;
  options: Array<{ id: ID; label: string }>;
}) {
  return (
    <FieldLabel label={props.label}>
      {props.options.length === 0 ? (
        <span className="block py-1.5 text-xs text-muted">{m.wiki.noEntriesAvailable}</span>
      ) : (
        <div className="max-h-28 space-y-0.5 overflow-y-auto rounded-md border border-line bg-bg p-1.5 text-sm">
          {props.options.map((o) => (
            <label key={o.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={props.value.includes(o.id)}
                onChange={(e) =>
                  props.onValue(
                    e.target.checked ? [...props.value, o.id] : props.value.filter((x) => x !== o.id),
                  )
                }
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </FieldLabel>
  );
}

function EntryMultiPicker(props: {
  label: string;
  value: ID[];
  onValue: (v: ID[]) => void;
  campaignId: ID;
  category: WikiCategory;
  excludeId: ID;
}) {
  const entries = useEntries(props.campaignId, props.category, props.excludeId);
  return <MultiPicker {...props} options={entries.map((e) => ({ id: e.id, label: e.title }))} />;
}

function Text({
  label,
  value,
  onValue,
}: {
  label: string;
  value: string | undefined;
  onValue: (v: string | undefined) => void;
}) {
  return (
    <FieldLabel label={label}>
      <input
        aria-label={label}
        className={inputClass}
        value={value ?? ''}
        onChange={(e) => onValue(e.target.value || undefined)}
      />
    </FieldLabel>
  );
}

const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);

/** Metadati strutturati per categoria, con selettori delle voci collegate. */
export function MetaEditor({ entry, onChange }: { entry: WikiEntry; onChange: (e: WikiEntry) => void }) {
  const ctx = { campaignId: entry.campaignId, excludeId: entry.id };
  const characters = useLiveQuery(
    () => db.characters.where('campaignId').equals(entry.campaignId).toArray(),
    [entry.campaignId],
    [],
  );

  switch (entry.category) {
    case 'npc': {
      const set = (patch: Partial<typeof entry.meta>) =>
        onChange({ ...entry, meta: { ...entry.meta, ...patch } });
      return (
        <Grid>
          <FieldLabel label={m.wiki.fields.status}>
            <Select
              label={m.wiki.fields.status}
              value={entry.meta.status}
              onValue={(status) => set({ status })}
              options={(Object.keys(NPC_STATUS_LABELS) as Array<keyof typeof NPC_STATUS_LABELS>).map((k) => ({
                value: k,
                label: NPC_STATUS_LABELS[k],
              }))}
            />
          </FieldLabel>
          <FieldLabel label={m.wiki.fields.attitude}>
            <Select
              label={m.wiki.fields.attitude}
              value={entry.meta.attitude}
              onValue={(attitude) => set({ attitude })}
              options={(Object.keys(NPC_ATTITUDE_LABELS) as Array<keyof typeof NPC_ATTITUDE_LABELS>).map(
                (k) => ({ value: k, label: NPC_ATTITUDE_LABELS[k] }),
              )}
            />
          </FieldLabel>
          <Text label={m.wiki.fields.role} value={entry.meta.role} onValue={(role) => set({ role })} />
          <Text label={m.wiki.fields.species} value={entry.meta.species} onValue={(species) => set({ species })} />
          <SinglePicker
            {...ctx}
            label={m.wiki.fields.currentLocation}
            category="location"
            value={entry.meta.locationId}
            onValue={(locationId) => set({ locationId })}
          />
          <EntryMultiPicker
            {...ctx}
            label={m.wiki.fields.factions}
            category="faction"
            value={entry.meta.factionIds}
            onValue={(factionIds) => set({ factionIds })}
          />
        </Grid>
      );
    }
    case 'location': {
      const set = (patch: Partial<typeof entry.meta>) =>
        onChange({ ...entry, meta: { ...entry.meta, ...patch } });
      return (
        <Grid>
          <Text label={m.wiki.fields.region} value={entry.meta.region} onValue={(region) => set({ region })} />
          <Text
            label={m.wiki.fields.locationType}
            value={entry.meta.locationType}
            onValue={(locationType) => set({ locationType })}
          />
          <SinglePicker
            {...ctx}
            label={m.wiki.fields.partOf}
            category="location"
            value={entry.meta.parentLocationId}
            onValue={(parentLocationId) => set({ parentLocationId })}
          />
          <EntryMultiPicker
            {...ctx}
            label={m.wiki.fields.factionsPresent}
            category="faction"
            value={entry.meta.factionIds}
            onValue={(factionIds) => set({ factionIds })}
          />
        </Grid>
      );
    }
    case 'faction': {
      const set = (patch: Partial<typeof entry.meta>) =>
        onChange({ ...entry, meta: { ...entry.meta, ...patch } });
      return (
        <Grid>
          <EntryMultiPicker
            {...ctx}
            label={m.wiki.fields.leaders}
            category="npc"
            value={entry.meta.leaderIds}
            onValue={(leaderIds) => set({ leaderIds })}
          />
          <SinglePicker
            {...ctx}
            label={m.wiki.fields.headquarters}
            category="location"
            value={entry.meta.headquartersId}
            onValue={(headquartersId) => set({ headquartersId })}
          />
          <SinglePicker
            {...ctx}
            label={m.wiki.fields.religion}
            category="religion"
            value={entry.meta.religionId}
            onValue={(religionId) => set({ religionId })}
          />
          <Text label={m.wiki.fields.goals} value={entry.meta.goals} onValue={(goals) => set({ goals })} />
          <Text
            label={m.wiki.fields.attitudeToParty}
            value={entry.meta.attitude}
            onValue={(attitude) => set({ attitude })}
          />
        </Grid>
      );
    }
    case 'religion': {
      const set = (patch: Partial<typeof entry.meta>) =>
        onChange({ ...entry, meta: { ...entry.meta, ...patch } });
      return (
        <Grid>
          <Text label={m.wiki.fields.deity} value={entry.meta.deity} onValue={(deity) => set({ deity })} />
          <Text label={m.wiki.fields.symbol} value={entry.meta.symbol} onValue={(symbol) => set({ symbol })} />
          <Text
            label={m.wiki.fields.alignment}
            value={entry.meta.alignment}
            onValue={(alignment) => set({ alignment })}
          />
          <FieldLabel label={m.wiki.fields.domains}>
            <TagInput label={m.wiki.fields.domains} values={entry.meta.domains} onChange={(domains) => set({ domains })} />
          </FieldLabel>
        </Grid>
      );
    }
    case 'session': {
      const set = (patch: Partial<typeof entry.meta>) =>
        onChange({ ...entry, meta: { ...entry.meta, ...patch } });
      return (
        <Grid>
          <FieldLabel label={m.wiki.fields.number}>
            <input
              aria-label={m.wiki.fields.sessionNumber}
              inputMode="numeric"
              className={inputClass}
              value={entry.meta.number}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 0) set({ number: n });
              }}
            />
          </FieldLabel>
          <FieldLabel label={m.wiki.fields.date}>
            <input
              aria-label={m.wiki.fields.sessionDate}
              type="date"
              className={inputClass}
              value={entry.meta.date}
              onChange={(e) => set({ date: e.target.value })}
            />
          </FieldLabel>
          <Text
            label={m.wiki.fields.inGameDate}
            value={entry.meta.inGameDate}
            onValue={(inGameDate) => set({ inGameDate })}
          />
          <MultiPicker
            label={m.wiki.fields.participants}
            value={entry.meta.participantIds}
            onValue={(participantIds) => set({ participantIds })}
            options={characters.map((c) => ({ id: c.id, label: c.identity.name }))}
          />
        </Grid>
      );
    }
  }
}
