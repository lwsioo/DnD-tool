import { Plus, X } from 'lucide-react';
import { ABILITY_LABELS } from '@/data/i18n/it';
import type { Ability } from '@/domain/abilities';
import type { CharacterRecipe } from '@/db/repos/characters';
import type { Character } from '@/domain/character';
import type { FormulaVars } from '@/engine/formula';
import { FormulaPreview } from '@/features/sheet/EffectsEditor';
import { newId } from '@/lib/id';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { FieldLabel, Select, TextField } from '@/ui/fields';
import { IconButton } from '@/ui/IconButton';
import { m } from '@/i18n';

const ABILITY_OPTIONS = (['int', 'wis', 'cha', 'str', 'dex', 'con'] as Ability[]).map((a) => ({
  value: a,
  label: `${ABILITY_LABELS[a].short} · ${ABILITY_LABELS[a].long}`,
}));

interface SourcesDialogProps {
  character: Character;
  vars: FormulaVars;
  mutate: (recipe: CharacterRecipe) => void;
  mutateLater: (key: string, recipe: CharacterRecipe) => void;
  onClose: () => void;
}

/** Fonti da incantatore: classe o talento, caratteristica scelta liberamente, massimo dei preparati. */
export function SourcesDialog({ character, vars, mutate, mutateLater, onClose }: SourcesDialogProps) {
  const sources = character.spellcasting.sources;
  const used = (id: string) => character.spellcasting.spells.filter((s) => s.sourceId === id).length;

  return (
    <Dialog
      open
      onClose={onClose}
      title={m.grimoire.sourcesTitle}
      footer={<Button onClick={onClose}>{m.common.close}</Button>}
    >
      <div className="space-y-3">
        {sources.length === 0 && <p className="text-muted">{m.grimoire.noSourcesYet}</p>}
        {sources.map((s) => (
          <div
            key={s.id}
            className="grid items-end gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1.5fr_1.2fr_1fr_auto]"
          >
            <FieldLabel label={m.grimoire.name}>
              <TextField
                label={m.grimoire.sourceName}
                value={s.label}
                onValue={(v) =>
                  mutateLater(
                    `source.${s.id}.label`,
                    (d) => void (d.spellcasting.sources.find((x) => x.id === s.id)!.label = v),
                  )
                }
              />
            </FieldLabel>
            <FieldLabel label={m.grimoire.ability}>
              <Select
                label={m.grimoire.abilityOf(s.label)}
                value={s.ability}
                options={ABILITY_OPTIONS}
                onValue={(v) =>
                  mutate((d) => void (d.spellcasting.sources.find((x) => x.id === s.id)!.ability = v))
                }
              />
            </FieldLabel>
            <FieldLabel label={m.grimoire.preparedMax}>
              <TextField
                label={m.grimoire.preparedMaxOf(s.label)}
                placeholder={m.grimoire.preparedPlaceholder}
                value={s.preparedMax ?? ''}
                onValue={(v) =>
                  mutateLater(
                    `source.${s.id}.prepared`,
                    (d) =>
                      void (d.spellcasting.sources.find((x) => x.id === s.id)!.preparedMax = v || undefined),
                  )
                }
              />
              {s.preparedMax && <FormulaPreview formula={s.preparedMax} vars={vars} />}
            </FieldLabel>
            <IconButton
              icon={X}
              label={m.common.remove(s.label)}
              disabled={used(s.id) > 0}
              title={used(s.id) > 0 ? m.grimoire.hasSpells : undefined}
              onClick={() =>
                mutate(
                  (d) => void (d.spellcasting.sources = d.spellcasting.sources.filter((x) => x.id !== s.id)),
                )
              }
            />
          </div>
        ))}
        <Button
          size="sm"
          icon={Plus}
          onClick={() =>
            mutate(
              (d) => void d.spellcasting.sources.push({ id: newId(), label: m.grimoire.newSource, ability: 'int' }),
            )
          }
        >
          {m.grimoire.addSource}
        </Button>
        <p className="text-xs text-muted">
          {m.grimoire.sourcesHint}
        </p>
      </div>
    </Dialog>
  );
}
