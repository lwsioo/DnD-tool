import { Plus, Scale } from 'lucide-react';
import { useState } from 'react';
import type { InventoryItem } from '@/domain/items';
import { AttacksTable } from '@/features/sheet/AttacksTable';
import { SheetContext } from '@/features/sheet/SheetContext';
import { useCurrentCharacter } from '@/features/character/useCurrentCharacter';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCharacterMutation } from '@/hooks/useCharacterMutation';
import { useDerived } from '@/hooks/useDerived';
import { cn } from '@/lib/cn';
import { formatWeight } from '@/lib/units';
import { Button } from '@/ui/Button';
import { CurrencyPanel } from './CurrencyPanel';
import { MAX_ATTUNED } from './itemActions';
import { ItemForm } from './ItemForm';
import { ItemTree } from './ItemTree';
import { m } from '@/i18n';

const STATUS_LABELS = {
  ok: null,
  ...m.inventory.encumbrance,
};

/** Inventario: monete, oggetti ad albero con contenitori, equipaggiamento collegato a CA e attacchi. */
export function InventoryPage() {
  const character = useCurrentCharacter();
  const derived = useDerived(character);
  const { units } = useAppSettings();
  const { mutate, mutateDebounced } = useCharacterMutation(character.id);
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const mutateNow = (r: Parameters<typeof mutate>[0]) => void mutate(r);

  const enc = derived.encumbrance;
  const attuned = character.inventory.items.filter((i) => i.attunement === 'attuned').length;
  const showStatus = character.settings.encumbranceRule !== 'off' || enc.status === 'over';

  const save = (item: InventoryItem) => {
    mutateNow((d) => {
      const i = d.inventory.items.findIndex((x) => x.id === item.id);
      if (i >= 0) d.inventory.items[i] = item;
      else d.inventory.items.push(item);
    });
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      <CurrencyPanel character={character} mutate={mutateNow} mutateLater={mutateDebounced} />

      {/* La tabella attacchi della scheda, qui per vedere subito l'effetto di ciò che si equipaggia. */}
      <SheetContext.Provider
        value={{ character, derived, edit: false, mutate: mutateNow, mutateLater: mutateDebounced }}
      >
        <AttacksTable />
      </SheetContext.Provider>

      <section aria-label={m.inventory.items} className="space-y-3 rounded-xl border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{m.inventory.items}</h2>
          <span
            className={cn(
              'flex items-center gap-1.5 text-xs',
              enc.status === 'ok' ? 'text-muted' : 'text-danger',
            )}
            title={m.inventory.capacity(formatWeight(enc.capacityLb, units))}
          >
            <Scale className="size-3.5" aria-hidden />
            {formatWeight(enc.weightLb, units)} / {formatWeight(enc.capacityLb, units)}
          </span>
          <span className={cn('text-xs', attuned > MAX_ATTUNED ? 'text-danger' : 'text-muted')}>
            {m.inventory.attunement(attuned, MAX_ATTUNED)}
          </span>
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setEditing('new')}>
            {m.inventory.addItem}
          </Button>
        </div>
        {showStatus && STATUS_LABELS[enc.status] && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs text-danger">
            {STATUS_LABELS[enc.status]}
          </p>
        )}
        <ItemTree character={character} units={units} mutate={mutateNow} onEdit={setEditing} />
        <p className="text-[11px] text-muted">
          Trascina un oggetto (maniglia ⋮⋮) su un contenitore per metterlo dentro, oppure usa il menu
          “Sposta”. Il peso include le monete (50 = 0,5 kg).
        </p>
      </section>

      {editing && (
        <ItemForm
          item={editing === 'new' ? null : editing}
          units={units}
          vars={derived.vars}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
