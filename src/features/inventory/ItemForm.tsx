import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState, type ReactNode } from 'react';
import { db } from '@/db/db';
import type { ItemTemplate } from '@/domain/library';
import { newId } from '@/lib/id';
import { ABILITY_LABELS } from '@/data/i18n/it';
import { ARMOR } from '@/data/srd/armor';
import { DAMAGE_TYPE_LABELS } from '@/data/srd/languages';
import { WEAPON_MASTERIES } from '@/data/srd/weaponMasteries';
import { WEAPON_PROPERTIES } from '@/data/srd/weaponProperties';
import { WEAPONS } from '@/data/srd/weapons';
import { ABILITIES, type Ability } from '@/domain/abilities';
import type {
  ArmorData,
  InventoryItem,
  ItemKind,
  MasteryKey,
  WeaponData,
  WeaponPropertyKey,
  WeaponPropertyRef,
} from '@/domain/items';
import type { DamageType } from '@/domain/primitives';
import type { FormulaVars } from '@/engine/formula';
import { ITEM_KIND_LABELS } from '@/features/inspector/format';
import { EffectsEditor } from '@/features/sheet/EffectsEditor';
import { emptyItem, itemFromSrd } from './srdItems';
import type { Units } from '@/lib/units';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { FieldLabel, inputClass, Select } from '@/ui/fields';
import { m as msg } from '@/i18n';

const defaultWeapon = (): WeaponData => ({
  category: 'simple',
  type: 'melee',
  damage: { dice: '1d6', type: 'slashing' },
  properties: [],
  magicBonus: 0,
  hand: 'main',
});
const defaultArmor = (): ArmorData => ({
  category: 'light',
  baseAc: 11,
  dexCap: null,
  stealthDisadvantage: false,
  magicBonus: 0,
});

/** Conversioni per i campi: il dato resta in piedi/libbre/monete di rame. */
const toDisplayDistance = (ft: number, units: Units) => (units === 'metric' ? (ft / 5) * 1.5 : ft);
const fromDisplayDistance = (v: number, units: Units) => Math.round(units === 'metric' ? (v / 1.5) * 5 : v);
const toDisplayWeight = (lb: number, units: Units) => (units === 'metric' ? lb / 2 : lb);
const fromDisplayWeight = (v: number, units: Units) => (units === 'metric' ? v * 2 : v);

function DecimalInput({
  label,
  value,
  onValue,
}: {
  label: string;
  value: number | undefined;
  onValue: (v: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value).replace('.', ','));
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      className={inputClass}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === '') return onValue(undefined);
        const n = Number(raw.replace(',', '.'));
        if (Number.isFinite(n) && n >= 0) onValue(n);
      }}
    />
  );
}

function IntInput({
  label,
  value,
  onValue,
  min = 0,
}: {
  label: string;
  value: number;
  onValue: (v: number) => void;
  min?: number;
}) {
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      className={inputClass}
      value={value}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= min) onValue(n);
      }}
    />
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-line p-3">
      <legend className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

interface ItemFormProps {
  item: InventoryItem | null;
  units: Units;
  vars: FormulaVars;
  onSave: (item: InventoryItem) => void;
  onClose: () => void;
}

const libraryLabel = (t: ItemTemplate) => (t.sourceBook ? `${t.name} (${t.sourceBook})` : t.name);

/** Ricerca per nome tra gli oggetti della libreria (es. importati da 5etools). */
function LibraryItemPicker({ onPick }: { onPick: (t: ItemTemplate, libraryRef: string) => void }) {
  const listId = useId();
  const items = useLiveQuery(() => db.libraryItems.where('kind').equals('item').toArray(), []);
  const templates = (items ?? []).flatMap((i) => (i.kind === 'item' ? [{ id: i.id, data: i.data }] : []));
  if (!templates.length) return null;
  return (
    <FieldLabel label={msg.inventory.fromLibrary(templates.length)}>
      <input
        aria-label={msg.inventory.libraryItem}
        list={listId}
        className={inputClass}
        placeholder={msg.inventory.searchByName}
        onChange={(e) => {
          const hit = templates.find((t) => libraryLabel(t.data) === e.target.value);
          if (hit) onPick(hit.data, hit.id);
        }}
      />
      <datalist id={listId}>
        {templates.map((t) => (
          <option key={t.id} value={libraryLabel(t.data)} />
        ))}
      </datalist>
    </FieldLabel>
  );
}

/** Crea o modifica un oggetto d'inventario; per i nuovi si può partire da un'arma o armatura SRD. */
export function ItemForm({ item, units, vars, onSave, onClose }: ItemFormProps) {
  const [draft, setDraft] = useState<InventoryItem>(() => item ?? emptyItem());
  // Le voci SRD ricreano il form da zero: la key forza il reset dei campi locali.
  const [formKey, setFormKey] = useState(0);
  const set = (patch: Partial<InventoryItem>) => setDraft((d) => ({ ...d, ...patch }));
  const setWeapon = (patch: Partial<WeaponData>) =>
    setDraft((d) => ({ ...d, weapon: { ...(d.weapon ?? defaultWeapon()), ...patch } }));
  const setArmor = (patch: Partial<ArmorData>) =>
    setDraft((d) => ({ ...d, armor: { ...(d.armor ?? defaultArmor()), ...patch } }));
  const distanceUnit = units === 'metric' ? 'm' : 'ft';
  const weightUnit = units === 'metric' ? 'kg' : 'lb';

  const changeKind = (kind: ItemKind) =>
    setDraft((d) => ({
      ...d,
      kind,
      weapon: kind === 'weapon' ? (d.weapon ?? defaultWeapon()) : undefined,
      armor: kind === 'armor' ? (d.armor ?? defaultArmor()) : undefined,
      shield: kind === 'shield' ? (d.shield ?? { acBonus: 2 }) : undefined,
      container: kind === 'container' ? (d.container ?? { weightless: false, collapsed: false }) : undefined,
    }));

  const toggleProperty = (key: WeaponPropertyKey, on: boolean) => {
    const props = (draft.weapon?.properties ?? []).filter((p) => p.key !== key);
    if (on)
      props.push(
        key === 'range' || key === 'thrown' ? { key, normal: 20, long: 60 } : ({ key } as WeaponPropertyRef),
      );
    setWeapon({ properties: props });
  };

  const w = draft.weapon;
  const a = draft.armor;

  return (
    <Dialog
      open
      onClose={onClose}
      title={item ? msg.inventory.editItem(item.name) : msg.inventory.newItem}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {msg.common.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={!draft.name.trim()}
            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
          >
            {msg.common.save}
          </Button>
        </>
      }
    >
      <div key={formKey} className="space-y-4">
        {!item && (
          <FieldLabel label={msg.inventory.fromSrd}>
            <select
              aria-label={msg.inventory.srdItem}
              className={inputClass}
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setDraft({ ...itemFromSrd(e.target.value), id: draft.id, parentId: draft.parentId });
                setFormKey((k) => k + 1);
              }}
            >
              <option value="">{msg.inventory.chooseSrd}</option>
              <optgroup label={msg.inventory.weapons}>
                {WEAPONS.map((x) => (
                  <option key={x.id} value={`weapon:${x.id}`}>
                    {x.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label={msg.inventory.armorAndShields}>
                {ARMOR.map((x) => (
                  <option key={x.id} value={`armor:${x.id}`}>
                    {x.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </FieldLabel>
        )}
        {!item && (
          <LibraryItemPicker
            onPick={(template, libraryRef) => {
              const { rarity: _rarity, sourceBook: _source, ...rest } = template;
              setDraft({
                ...rest,
                effects: rest.effects.map((e) => ({ ...e, id: newId() })),
                id: draft.id,
                parentId: draft.parentId,
                equipped: false,
                libraryRef,
              });
              setFormKey((k) => k + 1);
            }}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_5rem]">
          <FieldLabel label={msg.inventory.name}>
            <input
              aria-label={msg.inventory.name}
              className={inputClass}
              value={draft.name}
              data-autofocus
              onChange={(e) => set({ name: e.target.value })}
            />
          </FieldLabel>
          <FieldLabel label={msg.inventory.type}>
            <Select
              label={msg.inventory.itemType}
              value={draft.kind}
              onValue={changeKind}
              options={(Object.keys(ITEM_KIND_LABELS) as ItemKind[]).map((k) => ({
                value: k,
                label: ITEM_KIND_LABELS[k],
              }))}
            />
          </FieldLabel>
          <FieldLabel label={msg.inventory.quantity}>
            <IntInput label={msg.inventory.quantity} value={draft.quantity} onValue={(quantity) => set({ quantity })} />
          </FieldLabel>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FieldLabel label={msg.inventory.unitWeight(weightUnit)}>
            <DecimalInput
              label={msg.inventory.unitWeightAria}
              value={draft.weightLb === undefined ? undefined : toDisplayWeight(draft.weightLb, units)}
              onValue={(v) => set({ weightLb: v === undefined ? undefined : fromDisplayWeight(v, units) })}
            />
          </FieldLabel>
          <FieldLabel label={msg.inventory.unitValue}>
            <DecimalInput
              label={msg.inventory.unitValueAria}
              value={draft.valueCp === undefined ? undefined : draft.valueCp / 100}
              onValue={(v) => set({ valueCp: v === undefined ? undefined : Math.round(v * 100) })}
            />
          </FieldLabel>
          <FieldLabel label={msg.inventory.attunementField}>
            <Select
              label={msg.inventory.attunementField}
              value={draft.attunement ?? 'none'}
              onValue={(v) => set({ attunement: v === 'none' ? undefined : v })}
              options={[
                { value: 'none', label: msg.inventory.attunementOptions.none },
                { value: 'required', label: msg.inventory.attunementOptions.required },
                { value: 'attuned', label: msg.inventory.attunementOptions.attuned },
              ]}
            />
          </FieldLabel>
        </div>

        {w && (
          <Group title={msg.inventory.weapon}>
            <div className="grid gap-3 sm:grid-cols-4">
              <FieldLabel label={msg.inventory.category}>
                <Select
                  label={msg.inventory.weaponCategory}
                  value={w.category}
                  onValue={(category) => setWeapon({ category })}
                  options={[
                    { value: 'simple', label: msg.inventory.simple },
                    { value: 'martial', label: msg.inventory.martial },
                  ]}
                />
              </FieldLabel>
              <FieldLabel label={msg.inventory.type}>
                <Select
                  label={msg.inventory.meleeOrRanged}
                  value={w.type}
                  onValue={(type) => setWeapon({ type })}
                  options={[
                    { value: 'melee', label: msg.inventory.melee },
                    { value: 'ranged', label: msg.inventory.ranged },
                  ]}
                />
              </FieldLabel>
              <FieldLabel label={msg.inventory.damage}>
                <input
                  aria-label={msg.inventory.damageDie}
                  className={inputClass}
                  value={w.damage.dice}
                  onChange={(e) => setWeapon({ damage: { ...w.damage, dice: e.target.value } })}
                />
              </FieldLabel>
              <FieldLabel label={msg.inventory.damageType}>
                <Select
                  label={msg.inventory.damageType}
                  value={w.damage.type}
                  onValue={(type: DamageType) => setWeapon({ damage: { ...w.damage, type } })}
                  options={(Object.keys(DAMAGE_TYPE_LABELS) as DamageType[]).map((t) => ({
                    value: t,
                    label: DAMAGE_TYPE_LABELS[t],
                  }))}
                />
              </FieldLabel>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {(Object.keys(WEAPON_PROPERTIES) as WeaponPropertyKey[]).map((k) => {
                const prop = w.properties.find((p) => p.key === k);
                return (
                  <span key={k} className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!prop}
                        onChange={(e) => toggleProperty(k, e.target.checked)}
                      />
                      {WEAPON_PROPERTIES[k].name}
                    </label>
                    {prop && 'normal' in prop && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        {(['normal', 'long'] as const).map((field) => (
                          <input
                            key={field}
                            aria-label={msg.inventory.rangeAria(WEAPON_PROPERTIES[k].name, field === 'long', distanceUnit)}
                            inputMode="decimal"
                            className="w-14 rounded border border-line bg-bg px-1 text-center"
                            defaultValue={toDisplayDistance(prop[field], units)}
                            onChange={(e) => {
                              const n = Number(e.target.value.replace(',', '.'));
                              if (!Number.isFinite(n) || n < 0) return;
                              setWeapon({
                                properties: w.properties.map((p) =>
                                  p.key === k && 'normal' in p
                                    ? { ...p, [field]: fromDisplayDistance(n, units) }
                                    : p,
                                ),
                              });
                            }}
                          />
                        ))}
                        {distanceUnit}
                      </span>
                    )}
                    {prop && k === 'versatile' && (
                      <input
                        aria-label={msg.inventory.versatileDie}
                        placeholder="1d10"
                        className="w-14 rounded border border-line bg-bg px-1 text-center text-xs"
                        value={w.versatileDice ?? ''}
                        onChange={(e) => setWeapon({ versatileDice: e.target.value || undefined })}
                      />
                    )}
                  </span>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FieldLabel label={msg.inventory.mastery}>
                <Select
                  label={msg.inventory.mastery}
                  value={w.mastery ?? ''}
                  onValue={(m) => setWeapon({ mastery: (m || undefined) as MasteryKey | undefined })}
                  options={[
                    { value: '', label: msg.inventory.none },
                    ...(Object.keys(WEAPON_MASTERIES) as MasteryKey[]).map((m) => ({
                      value: m,
                      label: WEAPON_MASTERIES[m].name,
                    })),
                  ]}
                />
              </FieldLabel>
              <FieldLabel label={msg.inventory.magicBonus}>
                <IntInput
                  label={msg.inventory.weaponMagic}
                  value={w.magicBonus}
                  min={-5}
                  onValue={(magicBonus) => setWeapon({ magicBonus })}
                />
              </FieldLabel>
              <FieldLabel label={msg.inventory.ability}>
                <Select
                  label={msg.inventory.attackAbility}
                  value={w.abilityOverride ?? ''}
                  onValue={(v) => setWeapon({ abilityOverride: (v || undefined) as Ability | undefined })}
                  options={[
                    { value: '', label: msg.inventory.automatic },
                    ...ABILITIES.map((ab) => ({ value: ab, label: ABILITY_LABELS[ab].long })),
                  ]}
                />
              </FieldLabel>
            </div>
          </Group>
        )}

        {a && (
          <Group title={msg.inventory.armor}>
            <div className="grid gap-3 sm:grid-cols-4">
              <FieldLabel label={msg.inventory.category}>
                <Select
                  label={msg.inventory.armorCategory}
                  value={a.category}
                  onValue={(category) =>
                    setArmor({
                      category,
                      dexCap: category === 'light' ? null : category === 'medium' ? 2 : 0,
                    })
                  }
                  options={[
                    { value: 'light', label: msg.inventory.light },
                    { value: 'medium', label: msg.inventory.medium },
                    { value: 'heavy', label: msg.inventory.heavy },
                  ]}
                />
              </FieldLabel>
              <FieldLabel label={msg.inventory.baseAc}>
                <IntInput label={msg.inventory.baseAc} value={a.baseAc} onValue={(baseAc) => setArmor({ baseAc })} />
              </FieldLabel>
              <FieldLabel label={msg.inventory.magicBonus}>
                <IntInput
                  label={msg.inventory.armorMagic}
                  value={a.magicBonus}
                  onValue={(magicBonus) => setArmor({ magicBonus })}
                />
              </FieldLabel>
              <FieldLabel label={msg.inventory.strRequired}>
                <IntInput
                  label={msg.inventory.strRequired}
                  value={a.strRequirement ?? 0}
                  onValue={(v) => setArmor({ strRequirement: v || undefined })}
                />
              </FieldLabel>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={a.stealthDisadvantage}
                onChange={(e) => setArmor({ stealthDisadvantage: e.target.checked })}
              />
              {msg.inventory.stealthDisadvantage}
            </label>
          </Group>
        )}

        {draft.shield && (
          <Group title={msg.inventory.shield}>
            <FieldLabel label={msg.inventory.acBonus} className="max-w-40">
              <IntInput
                label={msg.inventory.shieldAcBonus}
                value={draft.shield.acBonus}
                onValue={(acBonus) => set({ shield: { acBonus } })}
              />
            </FieldLabel>
          </Group>
        )}

        {draft.container && (
          <Group title={msg.inventory.container}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.container.weightless}
                onChange={(e) => set({ container: { ...draft.container!, weightless: e.target.checked } })}
              />
              {msg.inventory.weightless}
            </label>
          </Group>
        )}

        <FieldLabel label={msg.inventory.description}>
          <textarea
            aria-label={msg.inventory.descriptionAria}
            className={inputClass}
            rows={3}
            value={draft.description ?? ''}
            onChange={(e) => set({ description: e.target.value || undefined })}
          />
        </FieldLabel>

        <Group title={msg.inventory.effectsWhenEquipped}>
          <EffectsEditor effects={draft.effects} vars={vars} onChange={(effects) => set({ effects })} />
        </Group>
      </div>
    </Dialog>
  );
}
