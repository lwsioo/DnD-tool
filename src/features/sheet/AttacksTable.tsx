import { Link } from 'react-router';
import { ABILITY_LABELS } from '@/data/i18n/it';
import { DAMAGE_TYPE_LABELS } from '@/data/srd/languages';
import { MasteryChip, PropertyChips } from '@/features/inspector/renderers/EquipmentRenderers';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatDistance } from '@/lib/units';
import { useUiStore } from '@/stores/uiStore';
import { HoverCard } from '@/ui/HoverCard';
import { Explained, Panel, RollBadge, BreakdownContent } from './parts';
import { useSheet } from './SheetContext';

/** Attacchi con le armi equipaggiate. L'equipaggiamento si gestisce dall'Inventario. */
export function AttacksTable() {
  const { character: c, derived: d, mutate } = useSheet();
  const { units } = useAppSettings();
  const openInspector = useUiStore((s) => s.openInspector);
  const attacks = d.attacks.filter((a) => a.equipped);

  return (
    <Panel title="Attacchi">
      {attacks.length === 0 ? (
        <p className="text-sm text-muted">
          Nessuna arma equipaggiata. Aggiungile ed equipaggiale dall’
          <Link to={`/pg/${c.id}/inventario`} className="text-accent hover:underline">
            Inventario
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-muted">
                <th className="pb-1 font-medium">Arma</th>
                <th className="pb-1 font-medium">Colpire</th>
                <th className="pb-1 font-medium">Danni</th>
                <th className="pb-1 font-medium">Proprietà</th>
                <th className="pb-1 font-medium">Maestria</th>
              </tr>
            </thead>
            <tbody>
              {attacks.map((a) => {
                const item = c.inventory.items.find((i) => i.id === a.itemId);
                const versatile =
                  !!item?.weapon?.versatileDice && item.weapon.properties.some((p) => p.key === 'versatile');
                return (
                  <tr key={a.itemId} className="border-t border-line align-top">
                    <td className="py-1.5 pr-3">
                      <button
                        type="button"
                        onClick={() => openInspector({ kind: 'item', characterId: c.id, itemId: a.itemId })}
                        className="text-left font-medium hover:text-accent hover:underline"
                      >
                        {a.name}
                      </button>
                      <div className="text-[11px] text-muted">
                        {ABILITY_LABELS[a.ability].short}
                        {a.reach !== undefined && ` · portata ${formatDistance(a.reach, units)}`}
                        {!a.proficient && ' · senza competenza'}
                      </div>
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <Explained breakdown={a.toHit} className="font-semibold" /> <RollBadge info={a.toHit} />
                    </td>
                    <td className="py-1.5 pr-3">
                      <HoverCard
                        content={
                          a.damage.modifierParts.length ? (
                            <BreakdownContent
                              breakdown={{ total: a.damage.modifier, parts: a.damage.modifierParts }}
                            />
                          ) : null
                        }
                      >
                        <span tabIndex={0} className="cursor-help whitespace-nowrap">
                          {a.damage.text}
                        </span>
                      </HoverCard>{' '}
                      <span className="text-xs text-muted">{DAMAGE_TYPE_LABELS[a.damage.type]}</span>
                      {versatile && (
                        <button
                          type="button"
                          aria-pressed={a.usingVersatile}
                          title="Impugnatura a una o due mani"
                          onClick={() =>
                            mutate((x) => {
                              const w = x.inventory.items.find((i) => i.id === a.itemId)?.weapon;
                              if (w) w.hand = w.hand === 'two' ? 'main' : 'two';
                            })
                          }
                          className="ml-1.5 rounded border border-line px-1.5 text-[11px] text-muted hover:border-accent/50 hover:text-ink"
                        >
                          {a.usingVersatile ? '2M' : '1M'} ⇄
                        </button>
                      )}
                      {a.notes.length > 0 && (
                        <div className="text-[11px] text-muted">{a.notes.join(' · ')}</div>
                      )}
                    </td>
                    <td className="py-1.5 pr-3">
                      <PropertyChips properties={a.properties} units={units} />
                    </td>
                    <td className="py-1.5">
                      {a.mastery ? <MasteryChip mastery={a.mastery} unlocked={a.masteryUnlocked} /> : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
