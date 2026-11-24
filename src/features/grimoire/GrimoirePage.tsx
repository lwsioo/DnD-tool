import { useLiveQuery } from 'dexie-react-hooks';
import { BookPlus, FileUp, Library, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ABILITY_LABELS } from '@/data/i18n/it';
import { db } from '@/db/db';
import { spellsRepo } from '@/db/repos/spells';
import type { CharacterSpell, CharacterSpellStatus } from '@/domain/character';
import type { Spell } from '@/domain/spells';
import { useCurrentCharacter } from '@/features/character/useCurrentCharacter';
import { Explained, RollBadge } from '@/features/sheet/parts';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCharacterMutation } from '@/hooks/useCharacterMutation';
import { useDerived } from '@/hooks/useDerived';
import { cn } from '@/lib/cn';
import { newId } from '@/lib/id';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { inputClass } from '@/ui/fields';
import { UsesCounter } from '@/ui/Pips';
import { CastDialog } from './CastDialog';
import { castSpell, togglePrepared } from './castActions';
import {
  bySpellLevelThenName,
  EMPTY_FILTERS,
  filterSpells,
  type SpellEntry,
  type SpellFilters,
} from './filters';
import { ImportSpellsDialog } from './ImportSpellsDialog';
import { LibraryDialog } from './LibraryDialog';
import { SourcesDialog } from './SourcesDialog';
import { SpellForm } from './SpellForm';
import { castingTimeText, componentsText, rangeText, SCHOOL_LABELS } from './spellText';

const STATUS_LABELS: Record<CharacterSpellStatus, string> = {
  known: 'Conosciuto',
  prepared: 'Preparato',
  alwaysPrepared: 'Sempre pronto',
  free: 'Gratis',
};
const ORDINAL = (l: number) => (l === 0 ? 'Trucchetti' : `${l}° livello`);

type Modal =
  | { kind: 'cast'; entry: SpellEntry }
  | { kind: 'form'; spell: Spell | null; addAfterSave: boolean }
  | { kind: 'library' }
  | { kind: 'import' }
  | { kind: 'sources' }
  | null;

export function GrimoirePage() {
  const character = useCurrentCharacter();
  const derived = useDerived(character);
  const { units } = useAppSettings();
  const { mutate, mutateDebounced } = useCharacterMutation(character.id);
  const mutateNow = (r: Parameters<typeof mutate>[0]) => void mutate(r);
  const openInspector = useUiStore((s) => s.openInspector);
  const filters = useUiStore((s) => s.grimoireFilters[character.id]) ?? EMPTY_FILTERS;
  const setFilters = (f: SpellFilters) => useUiStore.getState().setGrimoireFilters(character.id, f);
  const [modal, setModal] = useState<Modal>(null);
  const [sourceTab, setSourceTab] = useState<string>('all');

  const spellIds = useMemo(() => character.spellcasting.spells.map((s) => s.spellId), [character]);
  const library = useLiveQuery(async () => {
    const list = await db.spells.bulkGet(spellIds);
    return new Map(list.filter((s): s is Spell => !!s).map((s) => [s.id, s]));
  }, [spellIds]);

  const sources = character.spellcasting.sources;
  const activeSource = sources.find((s) => s.id === sourceTab);
  const entries: SpellEntry[] = useMemo(
    () =>
      character.spellcasting.spells
        .filter((cs) => sourceTab === 'all' || cs.sourceId === sourceTab)
        .map((cs) => ({ cs, spell: library?.get(cs.spellId) }))
        .filter((e): e is SpellEntry => !!e.spell)
        .sort(bySpellLevelThenName),
    [character, library, sourceTab],
  );
  const missing = library ? character.spellcasting.spells.filter((cs) => !library.has(cs.spellId)).length : 0;
  const shown = filterSpells(entries, filters);
  const levels = [...new Set(entries.map((e) => e.spell.level))].sort((a, b) => a - b);
  const groups = [...new Set(shown.map((e) => e.spell.level))].sort((a, b) => a - b);

  const addToCharacter = (spells: Spell[]) => {
    const sourceId = activeSource?.id ?? sources[0]?.id;
    if (!sourceId) return;
    mutateNow((d) => {
      for (const s of spells) {
        if (d.spellcasting.spells.some((x) => x.spellId === s.id)) continue;
        d.spellcasting.spells.push({ id: newId(), spellId: s.id, sourceId, status: 'known' });
      }
    });
  };

  const updateCs = (id: string, recipe: (cs: CharacterSpell) => void) =>
    mutateNow((d) => {
      const cs = d.spellcasting.spells.find((x) => x.id === id);
      if (cs) recipe(cs);
    });

  const setStatus = (cs: CharacterSpell, status: CharacterSpellStatus) =>
    updateCs(cs.id, (x) => {
      x.status = status;
      if (status === 'free' && !x.freeUses) {
        x.freeUses = { max: '1', used: 0, recharge: { shortRest: 0, longRest: 'all' }, pinned: true };
      }
    });

  const removeCs = (entry: SpellEntry) => {
    mutateNow((d) => {
      d.spellcasting.spells = d.spellcasting.spells.filter((x) => x.id !== entry.cs.id);
      if (d.combat.concentration?.characterSpellId === entry.cs.id) delete d.combat.concentration;
    });
    toast({
      message: `${entry.spell.name} tolto dal grimorio.`,
      action: {
        label: 'Annulla',
        onClick: () => mutateNow((d) => void d.spellcasting.spells.push(entry.cs)),
      },
    });
  };

  const concentrationName = (() => {
    const id = character.combat.concentration?.characterSpellId;
    const cs = character.spellcasting.spells.find((s) => s.id === id);
    return cs ? (library?.get(cs.spellId)?.name ?? null) : null;
  })();

  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
      active ? 'border-accent bg-accent text-accent-ink' : 'border-line text-muted hover:text-ink',
    );

  const stats = derived.spellcasting.filter((s) => sourceTab === 'all' || s.sourceId === sourceTab);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      {/* Intestazione: fonti con caratteristica, CD e attacco */}
      <section aria-label="Incantatore" className="space-y-3 rounded-xl border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          {sources.length > 1 && (
            <div role="tablist" aria-label="Fonti" className="flex flex-wrap gap-1">
              {[{ id: 'all', label: 'Tutte' }, ...sources].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={sourceTab === s.id}
                  onClick={() => setSourceTab(s.id)}
                  className={chip(sourceTab === s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <span className="flex-1" />
          <Button size="sm" variant="ghost" icon={Settings2} onClick={() => setModal({ kind: 'sources' })}>
            Fonti
          </Button>
          <Button size="sm" icon={Library} onClick={() => setModal({ kind: 'library' })}>
            Libreria
          </Button>
          <Button size="sm" icon={FileUp} onClick={() => setModal({ kind: 'import' })}>
            Importa
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={BookPlus}
            disabled={sources.length === 0}
            onClick={() => setModal({ kind: 'form', spell: null, addAfterSave: true })}
          >
            Nuovo
          </Button>
        </div>

        {sources.length === 0 ? (
          <p className="text-sm text-muted">
            Nessuna fonte da incantatore. Aggiungi una classe incantatrice nella scheda oppure crea una fonte
            da “Fonti” (es. un talento che concede incantesimi).
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <div
                key={s.sourceId}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-bg/40 px-3 py-2"
              >
                <span className="w-full text-sm font-medium">
                  {s.label} <span className="text-xs text-muted">· {ABILITY_LABELS[s.ability].short}</span>
                </span>
                <span className="text-xs text-muted">
                  Mod <strong className="text-ink">{s.mod >= 0 ? `+${s.mod}` : s.mod}</strong>
                </span>
                <span className="text-xs text-muted">
                  CD <Explained breakdown={s.dc} signed={false} className="font-bold text-ink" />
                </span>
                <span className="text-xs text-muted">
                  Attacco <Explained breakdown={s.attack} className="font-bold text-ink" />{' '}
                  <RollBadge info={s.attack} />
                </span>
                {s.preparedMax !== undefined && (
                  <span
                    className={cn('text-xs', s.preparedCount > s.preparedMax ? 'text-danger' : 'text-muted')}
                  >
                    Preparati {s.preparedCount}/{s.preparedMax}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {derived.cannotCastSpells && (
          <p className="text-xs text-danger">Armatura senza addestramento: non puoi lanciare incantesimi.</p>
        )}
      </section>

      {/* Filtri */}
      <section aria-label="Filtri" className="flex flex-wrap items-center gap-2">
        {levels.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={filters.levels.includes(l)}
            className={chip(filters.levels.includes(l))}
            onClick={() => setFilters({ ...filters, levels: toggleIn(filters.levels, l) })}
          >
            {l === 0 ? 'Trucchetti' : `${l}°`}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        {(['prepared', 'alwaysPrepared', 'free', 'known'] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filters.statuses.includes(s)}
            className={chip(filters.statuses.includes(s))}
            onClick={() => setFilters({ ...filters, statuses: toggleIn(filters.statuses, s) })}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        {(['C', 'R', 'M'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={filters.tags.includes(t)}
            title={{ C: 'Concentrazione', R: 'Rituale', M: 'Componente materiale' }[t]}
            className={chip(filters.tags.includes(t))}
            onClick={() => setFilters({ ...filters, tags: toggleIn(filters.tags, t) })}
          >
            {t}
          </button>
        ))}
        <input
          aria-label="Cerca nel grimorio"
          placeholder="Cerca…"
          value={filters.text}
          onChange={(e) => setFilters({ ...filters, text: e.target.value })}
          className={cn(inputClass, 'ml-auto w-40 py-1')}
        />
        {(filters.levels.length > 0 ||
          filters.statuses.length > 0 ||
          filters.tags.length > 0 ||
          filters.text) && (
          <button
            type="button"
            className="text-xs text-accent hover:underline"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Azzera filtri
          </button>
        )}
      </section>

      {missing > 0 && (
        <p className="text-xs text-danger">
          {missing} incantesimi del personaggio non sono più nella libreria.
        </p>
      )}

      {/* Elenco per livello */}
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Grimorio vuoto. Aggiungi incantesimi dalla{' '}
          <button
            type="button"
            className="text-accent hover:underline"
            onClick={() => setModal({ kind: 'library' })}
          >
            Libreria
          </button>
          , creane uno nuovo o importali da 5etools.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">Nessun incantesimo con questi filtri.</p>
      ) : (
        groups.map((level) => {
          const slot = derived.slots.standard[level - 1];
          return (
            <section
              key={level}
              aria-label={ORDINAL(level)}
              className="rounded-xl border border-line bg-panel"
            >
              <header className="flex items-center gap-3 border-b border-line px-4 py-2">
                <h2 className="flex-1 font-display tracking-wide">{ORDINAL(level)}</h2>
                {level > 0 && slot && slot.max > 0 && (
                  <UsesCounter
                    label={`Slot di ${level}° livello`}
                    max={slot.max}
                    used={slot.used}
                    onUsed={(used) => mutateNow((d) => void (d.spellcasting.slots.used[level - 1] = used))}
                  />
                )}
              </header>
              <ul className="divide-y divide-line">
                {shown
                  .filter((e) => e.spell.level === level)
                  .map((entry) => {
                    const { cs, spell } = entry;
                    const resource = derived.resources.find((r) => r.id === cs.id);
                    return (
                      <li key={cs.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                        {spell.level > 0 && (cs.status === 'known' || cs.status === 'prepared') ? (
                          <input
                            type="checkbox"
                            aria-label={`${spell.name} preparato`}
                            checked={cs.status === 'prepared'}
                            onChange={() => setStatus(cs, togglePrepared(cs.status))}
                            className="size-4 accent-[var(--c-accent)]"
                          />
                        ) : (
                          <span className="w-4 text-center text-accent" title={STATUS_LABELS[cs.status]}>
                            {cs.status === 'alwaysPrepared' ? '★' : cs.status === 'free' ? '◆' : '·'}
                          </span>
                        )}
                        <div className="min-w-48 flex-1">
                          <button
                            type="button"
                            onClick={() => openInspector({ kind: 'spell', id: spell.id })}
                            className="text-left text-sm font-medium hover:text-accent hover:underline"
                          >
                            {spell.name}
                          </button>
                          {spell.duration.concentration && <Tag title="Concentrazione">C</Tag>}
                          {spell.ritual && <Tag title="Rituale">R</Tag>}
                          {spell.components.m && (
                            <Tag title={spell.components.material ?? 'Materiale'}>M</Tag>
                          )}
                          <div className="text-[11px] text-muted">
                            {castingTimeText(spell.castingTime)} · {rangeText(spell.range, units)} ·{' '}
                            {componentsText({ ...spell.components, material: undefined })} ·{' '}
                            {SCHOOL_LABELS[spell.school]}
                            {cs.notes && ` · ${cs.notes}`}
                          </div>
                        </div>
                        {cs.status === 'free' && resource && (
                          <UsesCounter
                            label={`Lanci gratuiti di ${spell.name}`}
                            max={resource.max}
                            used={Math.min(resource.used, resource.max)}
                            onUsed={(used) => updateCs(cs.id, (x) => x.freeUses && (x.freeUses.used = used))}
                          />
                        )}
                        <select
                          aria-label={`Stato di ${spell.name}`}
                          value={cs.status}
                          onChange={(e) => {
                            const status = e.target.value as CharacterSpellStatus;
                            setStatus(cs, status);
                          }}
                          className="rounded border border-line bg-bg px-1 py-0.5 text-xs text-muted"
                        >
                          {(Object.keys(STATUS_LABELS) as CharacterSpellStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" icon={Sparkles} onClick={() => setModal({ kind: 'cast', entry })}>
                          Lancia
                        </Button>
                        <IconButton
                          icon={Trash2}
                          label={`Togli ${spell.name} dal grimorio`}
                          onClick={() => removeCs(entry)}
                        />
                      </li>
                    );
                  })}
              </ul>
            </section>
          );
        })
      )}

      {modal?.kind === 'cast' && (
        <CastDialog
          spell={modal.entry.spell}
          cs={modal.entry.cs}
          derived={derived}
          currentConcentration={
            concentrationName && character.combat.concentration?.characterSpellId !== modal.entry.cs.id
              ? concentrationName
              : null
          }
          onClose={() => setModal(null)}
          onCast={(mode, castLevel) => {
            const { cs, spell } = modal.entry;
            mutateNow((d) => castSpell(d, cs.id, mode, spell.duration.concentration));
            setModal(null);
            const how = {
              cantrip: '',
              slot: ` con uno slot di ${castLevel}°`,
              pact: ' con uno slot del Patto',
              free: ' gratis',
              ritual: ' come rituale',
            }[mode.kind];
            toast({ tone: 'success', message: `Lanciato ${spell.name}${how}.` });
          }}
        />
      )}
      {modal?.kind === 'form' && (
        <SpellForm
          spell={modal.spell}
          units={units}
          onClose={() => setModal(null)}
          onSave={(spell) => {
            void spellsRepo.save(spell).then((saved) => {
              if (modal.addAfterSave) addToCharacter([saved]);
            });
            setModal(modal.addAfterSave ? null : { kind: 'library' });
          }}
        />
      )}
      {modal?.kind === 'library' && (
        <LibraryDialog
          owned={new Set(spellIds)}
          characterClasses={[
            ...character.classes.map((cl) => cl.name),
            ...sources.flatMap((s) => /\(([^)]+)\)/.exec(s.label)?.[1] ?? []),
          ]}
          canAdd={sources.length > 0}
          onAdd={(s) => addToCharacter([s])}
          onEdit={(s) => setModal({ kind: 'form', spell: s, addAfterSave: false })}
          onNew={() => setModal({ kind: 'form', spell: null, addAfterSave: false })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'import' && (
        <ImportSpellsDialog
          canAddToCharacter={sources.length > 0}
          onClose={() => setModal(null)}
          onImported={(spells, add) => {
            if (add) addToCharacter(spells);
            setModal(null);
            toast({ tone: 'success', message: `${spells.length} incantesimi importati nella libreria.` });
          }}
        />
      )}
      {modal?.kind === 'sources' && (
        <SourcesDialog
          character={character}
          vars={derived.vars}
          mutate={mutateNow}
          mutateLater={mutateDebounced}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function Tag({ children, title }: { children: string; title: string }) {
  return (
    <span title={title} className="ml-1.5 rounded border border-line px-1 text-[10px] font-bold text-muted">
      {children}
    </span>
  );
}
