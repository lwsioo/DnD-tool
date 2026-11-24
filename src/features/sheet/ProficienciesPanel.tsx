import type { ReactNode } from 'react';
import { RARE_LANGUAGES, STANDARD_LANGUAGES } from '@/data/srd/languages';
import { WEAPONS, WEAPONS_BY_ID } from '@/data/srd/weapons';
import type { ArmorTraining } from '@/domain/character';
import { InspectorChip } from '@/ui/InspectorChip';
import { TagInput } from '@/ui/TagInput';
import { useSheet } from './SheetContext';

const ARMOR_LABELS: Record<ArmorTraining, string> = {
  light: 'Leggere',
  medium: 'Medie',
  heavy: 'Pesanti',
  shield: 'Scudi',
};
const WEAPON_GROUP_LABELS: Record<string, string> = { simple: 'Armi semplici', martial: 'Armi da guerra' };
const weaponLabel = (w: string) => WEAPON_GROUP_LABELS[w] ?? WEAPONS_BY_ID.get(w)?.name ?? w;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]">
      <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

const list = (items: string[]) => (items.length ? items.join(', ') : <span className="text-muted">—</span>);

/** Addestramento in armature e armi, strumenti, lingue e Maestrie sbloccate. */
export function ProficienciesPanel() {
  const { character: c, edit, mutate } = useSheet();
  const p = c.proficiencies;

  const toggle = <T extends string>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="divide-y divide-line">
      <Row label="Armature">
        {edit ? (
          <div className="flex flex-wrap gap-3">
            {(Object.keys(ARMOR_LABELS) as ArmorTraining[]).map((a) => (
              <label key={a} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={p.armor.includes(a)}
                  onChange={() =>
                    mutate((d) => void (d.proficiencies.armor = toggle(d.proficiencies.armor, a)))
                  }
                />
                {ARMOR_LABELS[a]}
              </label>
            ))}
          </div>
        ) : (
          list(p.armor.map((a) => ARMOR_LABELS[a]))
        )}
      </Row>

      <Row label="Armi">
        {edit ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              {(['simple', 'martial'] as const).map((w) => (
                <label key={w} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={p.weapons.includes(w)}
                    onChange={() =>
                      mutate((d) => void (d.proficiencies.weapons = toggle(d.proficiencies.weapons, w)))
                    }
                  />
                  {WEAPON_GROUP_LABELS[w]}
                </label>
              ))}
            </div>
            <TagInput
              label="Armi specifiche"
              placeholder="Arma specifica (id SRD o nome) e Invio"
              values={p.weapons.filter((w) => w !== 'simple' && w !== 'martial')}
              suggestions={WEAPONS.map((w) => w.id)}
              onChange={(vals) =>
                mutate(
                  (d) =>
                    void (d.proficiencies.weapons = [
                      ...d.proficiencies.weapons.filter((w) => w === 'simple' || w === 'martial'),
                      ...vals,
                    ]),
                )
              }
            />
          </div>
        ) : (
          list(p.weapons.map(weaponLabel))
        )}
      </Row>

      <Row label="Maestrie nelle armi">
        {edit ? (
          <select
            multiple
            aria-label="Armi con Maestria sbloccata"
            value={c.weaponMasteries}
            onChange={(e) => {
              const values = [...e.target.selectedOptions].map((o) => o.value);
              mutate((d) => void (d.weaponMasteries = values));
            }}
            className="h-32 w-full rounded-md border border-line bg-bg p-1 text-sm"
          >
            {WEAPONS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        ) : c.weaponMasteries.length ? (
          <span className="flex flex-wrap gap-1.5">
            {c.weaponMasteries.map((id) => (
              <InspectorChip key={id} to={{ kind: 'weapon', id }}>
                {weaponLabel(id)}
              </InspectorChip>
            ))}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </Row>

      <Row label="Strumenti">
        {edit ? (
          <TagInput
            label="Strumenti"
            values={p.tools}
            onChange={(v) => mutate((d) => void (d.proficiencies.tools = v))}
          />
        ) : (
          list(p.tools)
        )}
      </Row>

      <Row label="Lingue">
        {edit ? (
          <TagInput
            label="Lingue"
            values={p.languages}
            suggestions={[...STANDARD_LANGUAGES, ...RARE_LANGUAGES]}
            onChange={(v) => mutate((d) => void (d.proficiencies.languages = v))}
          />
        ) : (
          list(p.languages)
        )}
      </Row>
    </div>
  );
}
