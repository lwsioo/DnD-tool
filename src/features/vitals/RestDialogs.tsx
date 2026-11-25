import { Dices, Moon, Sun, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { snapshotsRepo } from '@/db/repos/snapshots';
import type { Die } from '@/domain/primitives';
import { longRest, shortRest, type RestSummary } from '@/engine/rests';
import { rollDie } from '@/lib/dice';
import { toast } from '@/stores/toastStore';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { IconButton } from '@/ui/IconButton';
import { AfterRestDialog } from './AfterRestDialog';
import { performRest, summaryText } from './restActions';
import { useVitals } from './VitalsContext';
import { m } from '@/i18n';

function SummaryList({ summary, kind }: { summary: RestSummary; kind: 'short' | 'long' }) {
  const items = [
    summary.hpRecovered > 0 && m.vitals.recoverHp(summary.hpRecovered),
    kind === 'long' && summary.hitDiceRecovered > 0 && m.vitals.recoverHitDice(summary.hitDiceRecovered),
    summary.slotsRecovered > 0 && m.vitals.recoverSlots(summary.slotsRecovered),
    summary.pactSlotsRecovered > 0 && m.vitals.recoverPact(summary.pactSlotsRecovered),
    ...summary.recharged.map((r) => m.vitals.recharges(r)),
    summary.exhaustionReduced && m.vitals.exhaustionReduced,
  ].filter((x): x is string => typeof x === 'string');
  if (items.length === 0) return <p className="text-muted">{m.vitals.nothingToRecover}</p>;
  return (
    <ul className="list-inside list-disc space-y-0.5">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

function useUndoToast() {
  return (kind: 'short' | 'long', summary: RestSummary, snapshotId: number | undefined) =>
    toast({
      tone: 'success',
      message: summaryText(kind, summary),
      duration: 10_000,
      action:
        snapshotId !== undefined
          ? {
              label: m.common.undo,
              onClick: async () => {
                await snapshotsRepo.restore(snapshotId);
                toast({ message: m.vitals.restUndone });
              },
            }
          : undefined,
    });
}

/** Riposo Breve: spesa dei dadi vita (tirati dall'app o inseriti a mano) e anteprima di ciò che si ricarica. */
export function ShortRestDialog({ onClose }: { onClose: () => void }) {
  const { character: c, derived, spellNames } = useVitals();
  const [rolls, setRolls] = useState<Array<{ key: number; die: Die; roll: number }>>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const showUndo = useUndoToast();
  const conMod = derived.abilities.con.mod;
  const maxHp = derived.hp.max.total;

  const preview = useMemo(
    () => shortRest(c, { maxHp, conMod }, { hitDice: rolls }, spellNames).summary,
    [c, maxHp, conMod, rolls, spellNames],
  );

  const addRoll = (die: Die) =>
    setRolls((r) => [...r, { key: Date.now() + Math.random(), die, roll: rollDie(die) }]);

  const confirm = async () => {
    setBusy(true);
    const { summary, snapshotId } = await performRest(c.id, 'short', { maxHp, conMod }, spellNames, {
      hitDice: rolls,
    });
    setDone(true);
    showUndo('short', summary, snapshotId);
  };

  if (done) return <AfterRestDialog kind="short" onClose={onClose} />;
  return (
    <Dialog
      open
      onClose={onClose}
      title={m.vitals.shortRest}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {m.common.cancel}
          </Button>
          <Button variant="primary" icon={Moon} disabled={busy} onClick={() => void confirm()} data-autofocus>
            {m.vitals.completeRest}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">{m.vitals.hitDice}</h3>
          <p className="text-xs text-muted">
            {m.vitals.hitDiceHint(Math.min(c.combat.hp.current, maxHp), maxHp, `${conMod >= 0 ? '+' : ''}${conMod}`)}
          </p>
          {derived.hitDice.length === 0 && (
            <p className="text-muted">{m.vitals.noHitDice}</p>
          )}
          {derived.hitDice.map((pool) => {
            const used = rolls.filter((r) => r.die === pool.die).length;
            return (
              <div key={pool.die} className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  icon={Dices}
                  disabled={used >= pool.remaining}
                  onClick={() => addRoll(pool.die)}
                >
                  {m.vitals.roll(pool.die)}
                </Button>
                <span className="text-xs text-muted">
                  {m.vitals.available(pool.remaining - used, pool.total)}
                </span>
              </div>
            );
          })}
          {rolls.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {rolls.map((r) => (
                <li key={r.key} className="flex items-center gap-1 rounded-md border border-line px-1.5 py-1">
                  <span className="text-xs text-muted">d{r.die}</span>
                  <input
                    aria-label={m.vitals.rollResult(r.die)}
                    inputMode="numeric"
                    value={r.roll}
                    onChange={(e) => {
                      const v = Math.min(r.die, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1));
                      setRolls((all) => all.map((x) => (x.key === r.key ? { ...x, roll: v } : x)));
                    }}
                    className="w-9 rounded border border-line bg-bg text-center text-sm"
                  />
                  <IconButton
                    icon={X}
                    label={m.vitals.removeDie}
                    className="size-6"
                    onClick={() => setRolls((all) => all.filter((x) => x.key !== r.key))}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {m.vitals.afterRest}
          </h3>
          <SummaryList summary={preview} kind="short" />
        </section>
      </div>
    </Dialog>
  );
}

/** Riposo Lungo: solo anteprima e conferma. */
export function LongRestDialog({ onClose }: { onClose: () => void }) {
  const { character: c, derived, spellNames } = useVitals();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const showUndo = useUndoToast();
  const maxHp = derived.hp.max.total;
  const preview = useMemo(() => longRest(c, { maxHp }, spellNames).summary, [c, maxHp, spellNames]);

  const confirm = async () => {
    setBusy(true);
    const { summary, snapshotId } = await performRest(
      c.id,
      'long',
      { maxHp, conMod: derived.abilities.con.mod },
      spellNames,
    );
    setDone(true);
    showUndo('long', summary, snapshotId);
  };

  if (done) return <AfterRestDialog kind="long" onClose={onClose} />;
  return (
    <Dialog
      open
      onClose={onClose}
      title={m.vitals.longRest}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {m.common.cancel}
          </Button>
          <Button variant="primary" icon={Sun} disabled={busy} onClick={() => void confirm()} data-autofocus>
            {m.vitals.completeRest}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SummaryList summary={preview} kind="long" />
        <ul className="space-y-0.5 text-xs text-muted">
          <li>{m.vitals.longRestNotes.reset}</li>
          {c.settings.clearTempHpOnLongRest && c.combat.hp.temp > 0 && <li>{m.vitals.longRestNotes.temp}</li>}
          {c.settings.heroicInspirationOnLongRest && <li>{m.vitals.longRestNotes.inspiration}</li>}
        </ul>
        {c.combat.hp.current <= 0 && (
          <p className="text-xs text-danger">
            {m.vitals.longRestNotes.needHp}
          </p>
        )}
      </div>
    </Dialog>
  );
}
