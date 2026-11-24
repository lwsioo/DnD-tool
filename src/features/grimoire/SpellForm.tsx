import { cn } from '@/lib/cn';
import { useState, type ReactNode } from 'react';
import { ABILITY_LABELS } from '@/data/i18n/it';
import { CLASSES } from '@/data/srd/classes';
import { ABILITIES, type Ability } from '@/domain/abilities';
import type { Spell, SpellLevel, SpellSchool } from '@/domain/spells';
import { normalizeKey } from '@/lib/normalizeKey';
import type { Units } from '@/lib/units';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { FieldLabel, inputClass, Select } from '@/ui/fields';
import { TagInput } from '@/ui/TagInput';
import { SCHOOL_LABELS } from './spellText';
import { blankSpell } from './spellFactory';

const toDisplay = (ft: number | undefined, units: Units) =>
  ft === undefined ? '' : String(units === 'metric' ? (ft / 5) * 1.5 : ft).replace('.', ',');
const fromDisplay = (raw: string, units: Units): number | undefined => {
  const n = Number(raw.replace(',', '.'));
  if (!raw.trim() || !Number.isFinite(n) || n < 0) return undefined;
  return Math.round(units === 'metric' ? (n / 1.5) * 5 : n);
};

function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-4">{children}</div>;
}

interface SpellFormProps {
  spell: Spell | null;
  units: Units;
  onSave: (spell: Spell) => void;
  onClose: () => void;
}

/** Crea o modifica un incantesimo della libreria. */
export function SpellForm({ spell, units, onSave, onClose }: SpellFormProps) {
  const [d, setD] = useState<Spell>(() => spell ?? blankSpell());
  const set = (patch: Partial<Spell>) => setD((x) => ({ ...x, ...patch }));
  const unit = units === 'metric' ? 'm' : 'ft';
  const cantripDice = d.scaling?.cantrip ?? ['', '', '', ''];

  return (
    <Dialog
      open
      onClose={onClose}
      title={spell ? `Modifica: ${spell.name}` : 'Nuovo incantesimo'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button
            variant="primary"
            disabled={!d.name.trim()}
            onClick={() =>
              onSave({ ...d, name: d.name.trim(), nameKey: normalizeKey(d.name), updatedAt: Date.now() })
            }
          >
            Salva
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
          <FieldLabel label="Nome">
            <input
              aria-label="Nome"
              data-autofocus
              className={inputClass}
              value={d.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </FieldLabel>
          <FieldLabel label="Nome inglese">
            <input
              aria-label="Nome inglese"
              className={inputClass}
              value={d.nameEn ?? ''}
              onChange={(e) => set({ nameEn: e.target.value || undefined })}
            />
          </FieldLabel>
          <FieldLabel label="Fonte">
            <input
              aria-label="Manuale"
              className={inputClass}
              placeholder="PHB’24"
              value={d.sourceBook ?? ''}
              onChange={(e) => set({ sourceBook: e.target.value || undefined })}
            />
          </FieldLabel>
        </div>

        <Row>
          <FieldLabel label="Livello">
            <Select
              label="Livello"
              value={String(d.level)}
              onValue={(v) => set({ level: Number(v) as SpellLevel })}
              options={Array.from({ length: 10 }, (_, i) => ({
                value: String(i),
                label: i === 0 ? 'Trucchetto' : `${i}°`,
              }))}
            />
          </FieldLabel>
          <FieldLabel label="Scuola">
            <Select
              label="Scuola"
              value={d.school}
              onValue={(school: SpellSchool) => set({ school })}
              options={(Object.keys(SCHOOL_LABELS) as SpellSchool[]).map((s) => ({
                value: s,
                label: SCHOOL_LABELS[s],
              }))}
            />
          </FieldLabel>
          <FieldLabel label="Tempo di lancio">
            <div className="flex gap-1">
              <input
                aria-label="Quantità tempo di lancio"
                className={cn(inputClass, 'w-12')}
                value={d.castingTime.amount}
                onChange={(e) =>
                  set({ castingTime: { ...d.castingTime, amount: Math.max(1, Number(e.target.value) || 1) } })
                }
              />
              <Select
                label="Unità tempo di lancio"
                value={d.castingTime.unit}
                onValue={(unit) => set({ castingTime: { ...d.castingTime, unit } })}
                options={[
                  { value: 'action', label: 'Azione' },
                  { value: 'bonus', label: 'Azione bonus' },
                  { value: 'reaction', label: 'Reazione' },
                  { value: 'minute', label: 'Minuti' },
                  { value: 'hour', label: 'Ore' },
                ]}
              />
            </div>
          </FieldLabel>
          <label className="flex items-center gap-2 pt-5 text-sm">
            <input type="checkbox" checked={d.ritual} onChange={(e) => set({ ritual: e.target.checked })} />{' '}
            Rituale
          </label>
        </Row>
        {d.castingTime.unit === 'reaction' && (
          <FieldLabel label="Innesco della reazione">
            <input
              aria-label="Innesco della reazione"
              className={inputClass}
              value={d.castingTime.condition ?? ''}
              onChange={(e) =>
                set({ castingTime: { ...d.castingTime, condition: e.target.value || undefined } })
              }
            />
          </FieldLabel>
        )}

        <Row>
          <FieldLabel label="Gittata">
            <Select
              label="Tipo di gittata"
              value={d.range.kind}
              onValue={(kind) => set({ range: { ...d.range, kind } })}
              options={[
                { value: 'self', label: 'Incantatore' },
                { value: 'touch', label: 'Contatto' },
                { value: 'distance', label: 'Distanza' },
                { value: 'sight', label: 'Vista' },
                { value: 'unlimited', label: 'Illimitata' },
                { value: 'special', label: 'Speciale' },
              ]}
            />
          </FieldLabel>
          {d.range.kind === 'distance' && (
            <FieldLabel label={`Distanza (${unit})`}>
              <input
                aria-label="Distanza"
                className={inputClass}
                defaultValue={toDisplay(d.range.distance, units)}
                onChange={(e) => set({ range: { ...d.range, distance: fromDisplay(e.target.value, units) } })}
              />
            </FieldLabel>
          )}
          <FieldLabel label="Area">
            <Select
              label="Forma dell'area"
              value={d.range.area?.shape ?? ''}
              onValue={(shape) =>
                set({
                  range: { ...d.range, area: shape ? { shape, size: d.range.area?.size ?? 20 } : undefined },
                })
              }
              options={[
                { value: '', label: 'Nessuna' },
                { value: 'sphere', label: 'Sfera' },
                { value: 'cone', label: 'Cono' },
                { value: 'cube', label: 'Cubo' },
                { value: 'cylinder', label: 'Cilindro' },
                { value: 'line', label: 'Linea' },
                { value: 'emanation', label: 'Emanazione' },
              ]}
            />
          </FieldLabel>
          {d.range.area && (
            <FieldLabel label={`Dimensione (${unit})`}>
              <input
                aria-label="Dimensione area"
                className={inputClass}
                defaultValue={toDisplay(d.range.area.size, units)}
                onChange={(e) => {
                  const size = fromDisplay(e.target.value, units);
                  if (size !== undefined) set({ range: { ...d.range, area: { ...d.range.area!, size } } });
                }}
              />
            </FieldLabel>
          )}
        </Row>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {(['v', 's', 'm'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={d.components[k]}
                onChange={(e) => set({ components: { ...d.components, [k]: e.target.checked } })}
              />
              {{ v: 'Verbale', s: 'Somatica', m: 'Materiale' }[k]}
            </label>
          ))}
          {d.components.m && (
            <input
              aria-label="Componente materiale"
              placeholder="es. un pizzico di zolfo"
              className={cn(inputClass, 'min-w-60 flex-1')}
              value={d.components.material ?? ''}
              onChange={(e) =>
                set({ components: { ...d.components, material: e.target.value || undefined } })
              }
            />
          )}
        </div>

        <Row>
          <FieldLabel label="Durata">
            <Select
              label="Tipo di durata"
              value={d.duration.kind}
              onValue={(kind) => set({ duration: { ...d.duration, kind } })}
              options={[
                { value: 'instant', label: 'Istantanea' },
                { value: 'timed', label: 'A tempo' },
                { value: 'untilDispelled', label: 'Finché dissolto' },
                { value: 'special', label: 'Speciale' },
              ]}
            />
          </FieldLabel>
          {d.duration.kind === 'timed' && (
            <FieldLabel label="Quanto">
              <div className="flex gap-1">
                <input
                  aria-label="Quantità durata"
                  className={cn(inputClass, 'w-14')}
                  value={d.duration.amount ?? 1}
                  onChange={(e) =>
                    set({ duration: { ...d.duration, amount: Math.max(1, Number(e.target.value) || 1) } })
                  }
                />
                <Select
                  label="Unità durata"
                  value={d.duration.unit ?? 'minute'}
                  onValue={(u) => set({ duration: { ...d.duration, unit: u } })}
                  options={[
                    { value: 'round', label: 'Round' },
                    { value: 'minute', label: 'Minuti' },
                    { value: 'hour', label: 'Ore' },
                    { value: 'day', label: 'Giorni' },
                  ]}
                />
              </div>
            </FieldLabel>
          )}
          <label className="flex items-center gap-2 pt-5 text-sm">
            <input
              type="checkbox"
              checked={d.duration.concentration}
              onChange={(e) => set({ duration: { ...d.duration, concentration: e.target.checked } })}
            />
            Concentrazione
          </label>
        </Row>

        <FieldLabel label="Descrizione (Markdown)">
          <textarea
            aria-label="Descrizione"
            rows={6}
            className={inputClass}
            value={d.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label={d.level === 0 ? 'Potenziamento del trucchetto' : 'A livelli superiori'}>
          <textarea
            aria-label="A livelli superiori"
            rows={2}
            className={inputClass}
            value={d.higherLevels ?? ''}
            onChange={(e) => set({ higherLevels: e.target.value || undefined })}
          />
        </FieldLabel>

        <Row>
          {d.level === 0 ? (
            <FieldLabel label="Dadi a liv. 1 / 5 / 11 / 17" className="sm:col-span-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    aria-label={`Dadi del trucchetto, fascia ${i + 1}`}
                    placeholder={['1d10', '2d10', '3d10', '4d10'][i]}
                    className={cn(inputClass, 'w-16')}
                    value={cantripDice[i]}
                    onChange={(e) => {
                      const next = [...cantripDice] as [string, string, string, string];
                      next[i] = e.target.value;
                      set({ scaling: { ...d.scaling, cantrip: next } });
                    }}
                  />
                ))}
              </div>
            </FieldLabel>
          ) : (
            <FieldLabel label="Dadi extra per slot superiore">
              <input
                aria-label="Dadi extra per slot"
                placeholder="1d6"
                className={inputClass}
                value={d.scaling?.perSlot ?? ''}
                onChange={(e) => set({ scaling: { ...d.scaling, perSlot: e.target.value || undefined } })}
              />
            </FieldLabel>
          )}
          <FieldLabel label="Tiro salvezza">
            <Select
              label="Tiro salvezza"
              value={d.save ?? ''}
              onValue={(v) => set({ save: (v || undefined) as Ability | undefined })}
              options={[
                { value: '', label: 'Nessuno' },
                ...ABILITIES.map((a) => ({ value: a, label: ABILITY_LABELS[a].long })),
              ]}
            />
          </FieldLabel>
          <FieldLabel label="Attacco">
            <Select
              label="Attacco con incantesimo"
              value={d.attack ?? ''}
              onValue={(v) => set({ attack: (v || undefined) as Spell['attack'] })}
              options={[
                { value: '', label: 'Nessuno' },
                { value: 'melee', label: 'In mischia' },
                { value: 'ranged', label: 'A distanza' },
              ]}
            />
          </FieldLabel>
        </Row>

        <FieldLabel label="Classi">
          <TagInput
            label="Classi"
            values={d.classes}
            suggestions={CLASSES.map((c) => c.name)}
            onChange={(classes) => set({ classes })}
          />
        </FieldLabel>
      </div>
    </Dialog>
  );
}
