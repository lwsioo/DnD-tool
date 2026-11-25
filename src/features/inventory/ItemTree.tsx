import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Coins, GripVertical, Link2, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Character } from '@/domain/character';
import type { InventoryItem } from '@/domain/items';
import type { CharacterRecipe } from '@/db/repos/characters';
import { ITEM_KIND_LABELS } from '@/features/inspector/format';
import { cn } from '@/lib/cn';
import { formatCost, formatWeight, type Units } from '@/lib/units';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { IconButton } from '@/ui/IconButton';
import { NumberField } from '@/ui/fields';
import {
  descendantIds,
  moveItem,
  removeItem,
  sellItem,
  setEquipped,
  treeOrder,
  validTargets,
} from './itemActions';
import { SellDialog } from './SellDialog';
import { m } from '@/i18n';

const EQUIPPABLE = new Set(['weapon', 'armor', 'shield', 'focus', 'gear', 'tool']);
const ROOT_ID = '__root__';

interface ItemTreeProps {
  character: Character;
  units: Units;
  mutate: (recipe: CharacterRecipe) => void;
  onEdit: (item: InventoryItem) => void;
}

/** Inventario ad albero: si trascina un oggetto su un contenitore (o "Addosso") per spostarlo. */
export function ItemTree({ character, units, mutate, onEdit }: ItemTreeProps) {
  const items = character.inventory.items;
  const rows = treeOrder(items);
  const collapsed = new Set(items.filter((i) => i.container?.collapsed).map((i) => i.id));
  const hiddenBy = (item: InventoryItem): boolean => {
    for (let p = item.parentId; p; p = items.find((i) => i.id === p)?.parentId ?? null) {
      if (collapsed.has(p)) return true;
    }
    return false;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const target = e.over.id === ROOT_ID ? null : String(e.over.id);
    mutate((d) => void moveItem(d, String(e.active.id), target));
  };

  if (items.length === 0) {
    return <p className="text-sm text-muted">{m.inventory.empty}</p>;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <RootDrop />
      <ul className="divide-y divide-line">
        {rows
          .filter(({ item }) => !hiddenBy(item))
          .map(({ item, depth }) => (
            <ItemRow
              key={item.id}
              item={item}
              depth={depth}
              character={character}
              units={units}
              mutate={mutate}
              onEdit={() => onEdit(item)}
            />
          ))}
      </ul>
    </DndContext>
  );
}

function RootDrop() {
  const { setNodeRef, isOver, active } = useDroppable({ id: ROOT_ID });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-md border border-dashed text-center text-xs text-muted',
        active ? 'mb-2 px-3 py-1' : 'h-0 overflow-hidden border-0',
        isOver && 'border-accent bg-accent-soft text-accent',
      )}
    >
      {m.inventory.dropHere}
    </div>
  );
}

function ItemRow({
  item,
  depth,
  character,
  units,
  mutate,
  onEdit,
}: {
  item: InventoryItem;
  depth: number;
  character: Character;
  units: Units;
  mutate: (recipe: CharacterRecipe) => void;
  onEdit: () => void;
}) {
  const openInspector = useUiStore((s) => s.openInspector);
  const drag = useDraggable({ id: item.id });
  const drop = useDroppable({ id: item.id, disabled: item.kind !== 'container' });
  const isContainer = item.kind === 'container';
  const targets = validTargets(character.inventory.items, item.id);
  const update = (recipe: (x: InventoryItem) => void) =>
    mutate((d) => {
      const t = d.inventory.items.find((i) => i.id === item.id);
      if (t) recipe(t);
    });

  const [selling, setSelling] = useState(false);
  const sell = (quantity: number, priceCp: number) => {
    const before = { items: character.inventory.items, currency: character.inventory.currency };
    setSelling(false);
    mutate((d) => sellItem(d, item.id, quantity, priceCp));
    toast({
      tone: 'success',
      message: m.inventory.sold(quantity, item.name, formatCost(priceCp)),
      action: {
        label: m.common.undo,
        onClick: () =>
          mutate((d) => {
            d.inventory.items = before.items;
            d.inventory.currency = before.currency;
          }),
      },
    });
  };

  const remove = () => {
    // La scrittura è asincrona: `removed` si riempie quando la ricetta viene applicata, prima di un eventuale Annulla.
    let removed: InventoryItem[] = [];
    const count = descendantIds(character.inventory.items, item.id).size;
    mutate((d) => void (removed = removeItem(d, item.id)));
    toast({
      message: count > 1 ? m.inventory.deletedWithContents(item.name) : m.inventory.deleted(item.name),
      action: { label: m.common.undo, onClick: () => mutate((d) => void d.inventory.items.push(...removed)) },
    });
  };

  return (
    <li
      ref={(el) => {
        drag.setNodeRef(el);
        drop.setNodeRef(el);
      }}
      style={
        drag.transform ? { transform: `translate(${drag.transform.x}px, ${drag.transform.y}px)` } : undefined
      }
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 bg-panel py-1.5',
        drag.isDragging && 'relative z-10 rounded-md opacity-80 shadow-xl',
        drop.isOver && 'rounded-md bg-accent-soft',
      )}
    >
      <span style={{ width: depth * 20 }} className="shrink-0" aria-hidden />
      <button
        type="button"
        {...drag.listeners}
        {...drag.attributes}
        aria-label={m.inventory.drag(item.name)}
        className="cursor-grab text-muted hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      {isContainer ? (
        <IconButton
          icon={item.container?.collapsed ? ChevronRight : ChevronDown}
          label={item.container?.collapsed ? m.inventory.expand(item.name) : m.inventory.collapse(item.name)}
          className="size-6"
          onClick={() => update((x) => x.container && (x.container.collapsed = !x.container.collapsed))}
        />
      ) : (
        <span className="w-6" />
      )}

      <div className="min-w-32 flex-1">
        <button
          type="button"
          onClick={() => openInspector({ kind: 'item', characterId: character.id, itemId: item.id })}
          className="text-left text-sm font-medium hover:text-accent hover:underline"
        >
          {item.name}
        </button>
        <span className="ml-2 text-[11px] text-muted">{ITEM_KIND_LABELS[item.kind]}</span>
        {item.attunement === 'attuned' && (
          <span className="ml-1 text-[11px] text-accent">{m.inventory.attuned}</span>
        )}
      </div>

      <NumberField
        label={m.inventory.quantityOf(item.name)}
        value={item.quantity}
        min={0}
        max={9999}
        className="w-14 py-1"
        onValue={(v) => update((x) => void (x.quantity = v))}
      />
      <span className="w-16 text-right text-xs text-muted tabular-nums">
        {item.weightLb ? formatWeight(item.weightLb * item.quantity, units) : '—'}
      </span>

      {item.attunement && item.attunement !== 'none' && (
        <button
          type="button"
          role="switch"
          aria-checked={item.attunement === 'attuned'}
          aria-label={m.inventory.attuneWith(item.name)}
          title={m.inventory.attunementField}
          onClick={() =>
            update((x) => void (x.attunement = x.attunement === 'attuned' ? 'required' : 'attuned'))
          }
          className={cn(
            'grid size-7 place-items-center rounded border',
            item.attunement === 'attuned' ? 'border-accent text-accent' : 'border-line text-muted',
          )}
        >
          <Link2 className="size-3.5" aria-hidden />
        </button>
      )}

      {EQUIPPABLE.has(item.kind) && (
        <button
          type="button"
          role="switch"
          aria-checked={item.equipped}
          aria-label={m.inventory.equippedAria(item.name)}
          onClick={() => mutate((d) => setEquipped(d, item.id, !item.equipped))}
          disabled={item.parentId !== null}
          title={item.parentId !== null ? m.inventory.removeFromContainer : undefined}
          className={cn(
            'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-40',
            item.equipped
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-line text-muted hover:text-ink',
          )}
        >
          {item.equipped ? m.inventory.equipped : m.inventory.equip}
        </button>
      )}

      <select
        aria-label={m.inventory.move(item.name)}
        value={item.parentId ?? ''}
        onChange={(e) => {
          // Il valore va letto subito: la scrittura è asincrona e React riporta la select al valore controllato.
          const target = e.target.value || null;
          mutate((d) => void moveItem(d, item.id, target));
        }}
        className="max-w-32 rounded border border-line bg-bg px-1 py-0.5 text-xs text-muted"
      >
        <option value="">{m.inventory.onPerson}</option>
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {m.inventory.inContainer(t.name)}
          </option>
        ))}
      </select>

      <IconButton icon={Pencil} label={m.inventory.edit(item.name)} onClick={onEdit} />
      <IconButton icon={Coins} label={m.inventory.sell(item.name)} onClick={() => setSelling(true)} />
      <IconButton icon={Trash2} label={m.inventory.delete(item.name)} onClick={remove} />
      {selling && (
        <SellDialog
          item={item}
          contents={descendantIds(character.inventory.items, item.id).size - 1}
          onSell={sell}
          onClose={() => setSelling(false)}
        />
      )}
    </li>
  );
}
