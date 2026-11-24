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
import { performRest, summaryText } from './restActions';
import { useVitals } from './VitalsContext';

function SummaryList({ summary, kind }: { summary: RestSummary; kind: 'short' | 'long' }) {
  const items = [
    summary.hpRecovered > 0 && `Recuperi ${summary.hpRecovered} PF`,
    kind === 'long' && summary.hitDiceRecovered > 0 && `Recuperi ${summary.hitDiceRecovered} dadi vita`,
    summary.slotsRecovered > 0 && `Recuperi ${summary.slotsRecovered} slot incantesimo`,
    summary.pactSlotsRecovered > 0 && `Recuperi ${summary.pactSlotsRecovered} slot del Patto`,
    ...summary.recharged.map((r) => `Si ricarica: ${r}`),
    summary.exhaustionReduced && 'Indebolimento ridotto di 1',
  ].filter((x): x is string => typeof x === 'string');
  if (items.length === 0) return <p className="text-muted">Nulla da recuperare.</p>;
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
              label: 'Annulla',
              onClick: async () => {
                await snapshotsRepo.restore(snapshotId);
                toast({ message: 'Riposo annullato.' });
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
    onClose();
    showUndo('short', summary, snapshotId);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Riposo Breve"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" icon={Moon} disabled={busy} onClick={() => void confirm()} data-autofocus>
            Completa il riposo
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">Dadi vita</h3>
          <p className="text-xs text-muted">
            PF {Math.min(c.combat.hp.current, maxHp)}/{maxHp}. Ogni dado cura il risultato + mod. COS (
            {conMod >= 0 ? '+' : ''}
            {conMod}).
          </p>
          {derived.hitDice.length === 0 && (
            <p className="text-muted">Nessun dado vita: aggiungi una classe alla scheda.</p>
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
                  Tira d{pool.die}
                </Button>
                <span className="text-xs text-muted">
                  {pool.remaining - used} di {pool.total} disponibili
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
                    aria-label={`Risultato d${r.die}`}
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
                    label="Rimuovi dado"
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
            Al termine del riposo
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
    onClose();
    showUndo('long', summary, snapshotId);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Riposo Lungo"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" icon={Sun} disabled={busy} onClick={() => void confirm()} data-autofocus>
            Completa il riposo
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SummaryList summary={preview} kind="long" />
        <ul className="space-y-0.5 text-xs text-muted">
          <li>TS contro morte azzerati e concentrazione terminata.</li>
          {c.settings.clearTempHpOnLongRest && c.combat.hp.temp > 0 && <li>I PF temporanei tornano a 0.</li>}
          {c.settings.heroicInspirationOnLongRest && <li>Ottieni Ispirazione Eroica.</li>}
        </ul>
        {c.combat.hp.current <= 0 && (
          <p className="text-xs text-danger">
            Regola: serve almeno 1 PF all’inizio del riposo per ottenerne i benefici.
          </p>
        )}
      </div>
    </Dialog>
  );
}
