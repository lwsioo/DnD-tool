import { Heart, Skull, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/toastStore';
import { IconButton } from '@/ui/IconButton';
import { dealDamage, grantTempHp, heal } from './hpActions';
import { useVitals } from './VitalsContext';
import { m as msg } from '@/i18n';

type Mode = 'damage' | 'heal' | 'temp';
const MODE_LABELS: Record<Mode, { button: string; field: string; apply: string }> = msg.vitals.modes;

export function HpWidget() {
  const { character: c, derived, mutate } = useVitals();
  const [mode, setMode] = useState<Mode | null>(null);
  const [value, setValue] = useState('');
  const [critical, setCritical] = useState(false);

  const max = derived.hp.max.total;
  const current = Math.min(c.combat.hp.current, max);
  const temp = c.combat.hp.temp;
  const pct = max > 0 ? (current / max) * 100 : 0;
  const atZero = max > 0 && current <= 0;

  const close = () => {
    setMode(null);
    setValue('');
    setCritical(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    if (!mode || !Number.isInteger(n) || n < 0) return;
    close();
    if (mode === 'damage') {
      const o = await dealDamage(c.id, n, max, critical);
      if (!o) return;
      if (o.instantDeath)
        toast({
          tone: 'error',
          message: msg.vitals.instantDeath,
          duration: 0,
        });
      else if (o.droppedToZero)
        toast({
          tone: 'error',
          message: msg.vitals.droppedToZero,
        });
      else if (o.deathSaveFailuresAdded)
        toast({
          tone: 'error',
          message: msg.vitals.failuresAdded(o.deathSaveFailuresAdded),
        });
      if (o.concentrationDC && !o.droppedToZero) {
        toast({
          message: msg.vitals.concentrationSave(o.concentrationDC),
          duration: 12_000,
        });
      }
    } else if (mode === 'heal') {
      await heal(c.id, n, max);
    } else {
      await grantTempHp(c.id, n);
    }
  };

  const setDeathSaves = (kind: 'successes' | 'failures', n: number) =>
    mutate((d) => void (d.combat.deathSaves[kind] = n as 0 | 1 | 2 | 3));

  return (
    <section aria-label={msg.vitals.hp} className="rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
          <Heart className="size-3.5 text-hp" aria-hidden /> {msg.vitals.hpTitle}
        </span>
        <span
          className="text-sm tabular-nums"
          aria-label={msg.vitals.hpAria(current, max, temp)}
        >
          <span className="font-display text-lg">{current}</span>
          <span className="text-muted"> / {max}</span>
          {temp > 0 && <span className="ml-1 text-xs text-accent">{msg.vitals.temp(temp)}</span>}
        </span>
      </div>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden>
        <div
          className={cn('h-full transition-all', pct > 50 ? 'bg-ok' : pct > 25 ? 'bg-accent' : 'bg-hp')}
          style={{ width: `${pct}%` }}
        />
      </div>

      {mode ? (
        <form onSubmit={(e) => void submit(e)} className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1">
            <input
              autoFocus
              inputMode="numeric"
              aria-label={MODE_LABELS[mode].field}
              placeholder={MODE_LABELS[mode].field}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), close())}
              className="w-full min-w-0 rounded border border-line bg-bg px-2 py-1 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded border border-accent bg-accent px-2 py-1 text-xs font-medium text-accent-ink"
            >
              {MODE_LABELS[mode].apply}
            </button>
            <IconButton icon={X} label={msg.common.cancel} onClick={close} className="size-7" />
          </div>
          {mode === 'damage' && atZero && (
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />{' '}
              {msg.vitals.critical}
            </label>
          )}
        </form>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-1">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={max === 0 && m !== 'temp'}
              title={max === 0 ? msg.vitals.setMaxFirst : undefined}
              className="rounded border border-line py-1 text-xs text-muted transition-colors hover:border-accent/50 hover:text-ink disabled:opacity-40"
            >
              {MODE_LABELS[m].button}
            </button>
          ))}
        </div>
      )}

      {atZero && (
        <div className="mt-2 space-y-1 rounded border border-danger/40 bg-danger/10 p-2 text-xs">
          <p className="flex items-center gap-1 font-semibold text-danger">
            <Skull className="size-3.5" aria-hidden /> {msg.vitals.deathSaves}
          </p>
          {(['successes', 'failures'] as const).map((kind) => {
            const n = c.combat.deathSaves[kind];
            return (
              <div key={kind} className="flex items-center gap-2">
                <span className="w-16 text-muted">{kind === 'successes' ? msg.vitals.successes : msg.vitals.failures}</span>
                {[1, 2, 3].map((i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${kind === 'successes' ? msg.vitals.successes : msg.vitals.failures}: ${i}`}
                    aria-pressed={n >= i}
                    onClick={() => setDeathSaves(kind, n >= i ? i - 1 : i)}
                    className={cn(
                      'size-3.5 rounded-full border',
                      n >= i
                        ? kind === 'successes'
                          ? 'border-ok bg-ok'
                          : 'border-danger bg-danger'
                        : 'border-line',
                    )}
                  />
                ))}
              </div>
            );
          })}
          {c.combat.deathSaves.successes >= 3 && <p className="text-ok">{msg.vitals.stable}</p>}
          {c.combat.deathSaves.failures >= 3 && <p className="font-semibold text-danger">{msg.vitals.dead}</p>}
        </div>
      )}
    </section>
  );
}
