import { WEAPON_MASTERIES } from '@/data/srd/weaponMasteries';
import { WEAPONS } from '@/data/srd/weapons';
import { cn } from '@/lib/cn';
import { m } from '@/i18n';

interface MasteryPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Numero massimo di armi (0 = nessun limite). */
  limit: number;
}

/** Scelta delle armi di cui si usa la Maestria, con il nome della Maestria accanto a ogni arma. */
export function MasteryPicker({ value, onChange, limit }: MasteryPickerProps) {
  const full = limit > 0 && value.length >= limit;
  const groups = [
    [m.sheet.simpleWeapons, WEAPONS.filter((w) => w.category === 'simple')],
    [m.sheet.martialWeapons, WEAPONS.filter((w) => w.category === 'martial')],
  ] as const;
  return (
    <div className="space-y-2">
      <p className={cn('text-xs', limit > 0 && value.length > limit ? 'text-danger' : 'text-muted')}>
        {limit > 0
          ? m.sheet.masteryCount(value.length, limit)
          : m.sheet.masteryNoFeature(value.length)}
      </p>
      {groups.map(([label, list]) => (
        <fieldset key={label} className="space-y-1">
          <legend className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</legend>
          <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((w) => {
              const checked = value.includes(w.id);
              return (
                <label
                  key={w.id}
                  className={cn('flex items-center gap-2 text-sm', !checked && full && 'opacity-50')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && full}
                    onChange={() => onChange(checked ? value.filter((x) => x !== w.id) : [...value, w.id])}
                  />
                  <span>
                    {w.name} <span className="text-xs text-muted">· {WEAPON_MASTERIES[w.mastery].name}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
