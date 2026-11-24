import { Download, Sparkles, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CLASSES, CLASSES_BY_KEY } from '@/data/srd/classes';
import { xpForNextLevel } from '@/data/srd/progression';
import type { CasterProgression } from '@/domain/character';
import type { Die } from '@/domain/primitives';
import {
  deleteCharacterWithUndo,
  exportCharacterToFile,
  restoreDeletedCharacter,
} from '@/features/backup/actions';
import { classSummary } from '@/features/character/useCurrentCharacter';
import { BackgroundDialog, SpeciesDialog } from '@/features/origins/OriginDialogs';
import { AlignmentSelect } from '@/features/origins/OriginFields';
import { useOriginLibrary } from '@/features/origins/useOriginLibrary';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { FieldLabel, inputClass, NumberField, Select, TextField } from '@/ui/fields';
import { IconButton } from '@/ui/IconButton';
import { addClass, removeClass } from './classActions';
import { useSheet } from './SheetContext';

const nf = new Intl.NumberFormat('it-IT');

export function IdentityHeader() {
  const { character: c, derived, edit, mutate, mutateLater } = useSheet();
  const inspired = c.combat.heroicInspiration;
  const next = xpForNextLevel(derived.level);
  const subtitle = [c.identity.species, c.identity.background, c.identity.alignment]
    .filter(Boolean)
    .join(' · ');

  return (
    <section aria-label="Identità" className="space-y-4 rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-60 flex-1 space-y-1">
          {edit ? (
            <TextField
              label="Nome del personaggio"
              value={c.identity.name}
              placeholder="Nome del personaggio"
              onValue={(v) => mutateLater('identity.name', (d) => void (d.identity.name = v))}
              className="font-display text-xl tracking-wide"
            />
          ) : (
            <h2 className="font-display text-2xl tracking-wide">{c.identity.name || 'Senza nome'}</h2>
          )}
          {!edit && (
            <p className="text-sm text-muted">
              {[classSummary(c), subtitle].filter(Boolean).join(' — ')}
              {c.identity.deity && <> · devoto di {c.identity.deity}</>}
            </p>
          )}
          {!edit && (
            <p className="text-xs text-muted">
              Livello {derived.level || '—'} · {nf.format(c.identity.xp)} PE
              {next !== null && derived.level > 0 && <> · prossimo livello a {nf.format(next)}</>}
            </p>
          )}
        </div>

        <button
          type="button"
          aria-pressed={inspired}
          onClick={() => mutate((d) => void (d.combat.heroicInspiration = !d.combat.heroicInspiration))}
          className={cn(
            'flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors',
            inspired ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-ink',
          )}
        >
          <Star className={cn('size-4', inspired && 'fill-current')} aria-hidden />
          Ispirazione Eroica
        </button>
        <CharacterActions />
      </div>

      {edit && <IdentityEditor />}
      {edit && <ClassesEditor />}
    </section>
  );
}

function IdentityEditor() {
  const { character: c, mutate, mutateLater } = useSheet();
  const lib = useOriginLibrary();
  const [dialog, setDialog] = useState<'species' | 'background' | null>(null);
  const text = (key: 'deity' | 'playerName', label: string) => (
    <FieldLabel label={label}>
      <TextField
        value={c.identity[key] ?? ''}
        onValue={(v) => mutateLater(`identity.${key}`, (d) => void (d.identity[key] = v))}
      />
    </FieldLabel>
  );
  const option = lib.species
    .find((s) => s.id === c.origin?.speciesId)
    ?.choice?.options.find((o) => o.key === c.origin?.speciesOption);
  const originButton = (kind: 'species' | 'background', label: string, value: string, linked: boolean) => (
    <FieldLabel label={label}>
      <button
        type="button"
        aria-label={`${label}: ${value || 'non impostata'} — cambia`}
        onClick={() => setDialog(kind)}
        className={cn(inputClass, 'flex items-center gap-2 text-left hover:border-accent/60')}
      >
        <span className="min-w-0 flex-1 truncate">
          {value || <span className="text-muted">Scegli…</span>}
        </span>
        {linked && <Sparkles className="size-3.5 shrink-0 text-accent" aria-label="automatico" />}
      </button>
    </FieldLabel>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {originButton(
        'species',
        'Specie',
        [c.identity.species, option?.name].filter(Boolean).join(' · '),
        Boolean(c.origin?.speciesId),
      )}
      <FieldLabel label="Taglia">
        <Select
          label="Taglia"
          value={c.identity.size}
          onValue={(v) => mutate((d) => void (d.identity.size = v))}
          options={[
            { value: 'S', label: 'Piccola' },
            { value: 'M', label: 'Media' },
            { value: 'L', label: 'Grande' },
          ]}
        />
      </FieldLabel>
      {originButton('background', 'Background', c.identity.background, Boolean(c.origin?.backgroundId))}
      <FieldLabel label="Allineamento">
        <AlignmentSelect
          value={c.identity.alignment ?? ''}
          onValue={(v) => mutate((d) => void (d.identity.alignment = v || undefined))}
        />
      </FieldLabel>
      {text('deity', 'Divinità')}
      {text('playerName', 'Giocatore')}
      <FieldLabel label="Punti esperienza">
        <NumberField
          label="Punti esperienza"
          value={c.identity.xp}
          min={0}
          max={1_000_000}
          onValue={(v) => mutateLater('identity.xp', (d) => void (d.identity.xp = v))}
        />
      </FieldLabel>
      {dialog === 'species' && (
        <SpeciesDialog character={c} lib={lib} mutate={mutate} onClose={() => setDialog(null)} />
      )}
      {dialog === 'background' && (
        <BackgroundDialog character={c} lib={lib} mutate={mutate} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

const CASTER_OPTIONS: Array<{ value: CasterProgression; label: string }> = [
  { value: 'none', label: 'Non incantatore' },
  { value: 'full', label: 'Incantatore completo' },
  { value: 'half', label: 'Semi-incantatore' },
  { value: 'third', label: 'Un terzo (sottoclasse)' },
  { value: 'pact', label: 'Magia del Patto' },
];
const DICE: Die[] = [6, 8, 10, 12];

function ClassesEditor() {
  const { character: c, mutate, mutateLater } = useSheet();
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">Classi</h3>
      {c.classes.length === 0 && (
        <p className="text-sm text-muted">
          Nessuna classe. Aggiungendo la prima classe SRD vengono impostati tiri salvezza, addestramenti e
          fonte da incantatore.
        </p>
      )}
      {c.classes.map((cl, index) => {
        const srd = CLASSES_BY_KEY.get(cl.classKey);
        return (
          <div
            key={cl.id}
            className="grid items-end gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1.2fr_1.2fr_5rem_5.5rem_1.4fr_auto]"
          >
            <FieldLabel label={index === 0 ? 'Classe (iniziale)' : 'Classe'}>
              {srd ? (
                <span className="block py-1.5 text-sm font-medium">{cl.name}</span>
              ) : (
                <TextField
                  value={cl.name}
                  label="Nome della classe"
                  onValue={(v) =>
                    mutateLater(
                      `class.${cl.id}.name`,
                      (d) => void (d.classes.find((x) => x.id === cl.id)!.name = v),
                    )
                  }
                />
              )}
            </FieldLabel>
            <FieldLabel label="Sottoclasse">
              <TextField
                value={cl.subclass ?? ''}
                label="Sottoclasse"
                onValue={(v) =>
                  mutateLater(
                    `class.${cl.id}.subclass`,
                    (d) => void (d.classes.find((x) => x.id === cl.id)!.subclass = v || undefined),
                  )
                }
              />
            </FieldLabel>
            <FieldLabel label="Livello">
              <NumberField
                label={`Livello ${cl.name}`}
                value={cl.level}
                min={1}
                max={20}
                onValue={(v) =>
                  mutateLater(
                    `class.${cl.id}.level`,
                    (d) => void (d.classes.find((x) => x.id === cl.id)!.level = v),
                  )
                }
              />
            </FieldLabel>
            <FieldLabel label="Dado vita">
              <Select
                label={`Dado vita ${cl.name}`}
                value={String(cl.hitDie)}
                onValue={(v) =>
                  mutate((d) => void (d.classes.find((x) => x.id === cl.id)!.hitDie = Number(v) as Die))
                }
                options={DICE.map((x) => ({ value: String(x), label: `d${x}` }))}
              />
            </FieldLabel>
            <FieldLabel label="Magia">
              <Select
                label={`Progressione magica ${cl.name}`}
                value={cl.caster}
                onValue={(v) => mutate((d) => void (d.classes.find((x) => x.id === cl.id)!.caster = v))}
                options={CASTER_OPTIONS}
              />
            </FieldLabel>
            <IconButton
              icon={X}
              label={`Rimuovi ${cl.name}`}
              onClick={() => mutate((d) => removeClass(d, cl.id))}
            />
          </div>
        );
      })}
      <select
        aria-label="Aggiungi classe"
        value=""
        onChange={(e) => {
          const key = e.target.value;
          if (!key) return;
          mutate((d) => void addClass(d, key === 'custom' ? null : CLASSES_BY_KEY.get(key)!));
        }}
        className="rounded-md border border-dashed border-line bg-bg px-2.5 py-1.5 text-sm text-muted"
      >
        <option value="">+ Aggiungi classe…</option>
        {CLASSES.map((cl) => (
          <option key={cl.key} value={cl.key}>
            {cl.name}
          </option>
        ))}
        <option value="custom">Personalizzata…</option>
      </select>
    </div>
  );
}

function CharacterActions() {
  const { character } = useSheet();
  const navigate = useNavigate();
  const setActiveCharacter = useUiStore((s) => s.setActiveCharacter);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const label = character.identity.name || 'Senza nome';

  const remove = async () => {
    setConfirmDelete(false);
    const deleted = await deleteCharacterWithUndo(character.id);
    if (!deleted) return;
    setActiveCharacter(null);
    navigate('/benvenuto');
    toast({
      message: `${label} eliminato.`,
      duration: 10_000,
      action: {
        label: 'Annulla',
        onClick: async () => {
          await restoreDeletedCharacter(deleted);
          setActiveCharacter(deleted.character.id);
          navigate(`/pg/${deleted.character.id}/scheda`);
        },
      },
    });
  };

  const exportJson = async () => {
    try {
      const name = await exportCharacterToFile(character.id);
      toast({ tone: 'success', message: `Scaricato ${name}` });
    } catch (e) {
      toast({ tone: 'error', message: `Export non riuscito: ${e instanceof Error ? e.message : e}` });
    }
  };

  return (
    <div className="flex gap-1">
      <Button variant="ghost" icon={Download} onClick={() => void exportJson()}>
        Esporta JSON
      </Button>
      <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>
        Elimina
      </Button>
      <ConfirmDialog
        open={confirmDelete}
        title={`Eliminare ${label}?`}
        confirmLabel="Elimina"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      >
        Il personaggio viene rimosso dall’archivio. Potrai annullare dalla notifica per qualche secondo; per
        sicurezza puoi prima esportarlo in JSON.
      </ConfirmDialog>
    </div>
  );
}
