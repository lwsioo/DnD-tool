import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { db } from '@/db/db';
import type { Character } from '@/domain/character';
import { useActiveCharacter } from '@/hooks/useActiveCharacter';
import { useCharacterMutation } from '@/hooks/useCharacterMutation';
import { useDerived } from '@/hooks/useDerived';
import { useUiStore } from '@/stores/uiStore';
import { HpWidget } from './HpWidget';
import { LongRestDialog, ShortRestDialog } from './RestDialogs';
import { VitalsContext, type VitalsContextValue } from './VitalsContext';
import { AcWidget, ConcentrationRow, ResourcesWidget, SlotsWidget } from './Widgets';

/** Widget fissi della barra laterale per il personaggio attivo: PF, CA, slot, risorse, riposi. */
export function VitalsPanel() {
  const active = useActiveCharacter();
  if (active.status !== 'ready') {
    return (
      <p className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">
        {active.status === 'loading' ? '…' : 'Nessun personaggio attivo.'}
      </p>
    );
  }
  return <Vitals character={active.character} />;
}

function Vitals({ character }: { character: Character }) {
  const derived = useDerived(character);
  const { mutate } = useCharacterMutation(character.id);
  const rest = useUiStore((s) => s.restDialog);
  const setRest = useUiStore((s) => s.setRestDialog);

  const spellIds = useMemo(() => character.spellcasting.spells.map((s) => s.spellId), [character]);
  const spellNames = useLiveQuery(
    async () => new Map((await db.spells.bulkGet(spellIds)).filter((s) => !!s).map((s) => [s!.id, s!.name])),
    [spellIds],
    new Map<string, string>(),
  );

  const ctx = useMemo<VitalsContextValue>(
    () => ({ character, derived, spellNames, mutate: (r) => void mutate(r) }),
    [character, derived, spellNames, mutate],
  );

  return (
    <VitalsContext.Provider value={ctx}>
      <div aria-label="Vitali" role="region" className="space-y-2.5">
        <HpWidget />
        <AcWidget />
        <ConcentrationRow />
        <SlotsWidget />
        <ResourcesWidget />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRest('short')}
            className="flex items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-ink"
          >
            <Moon className="size-3.5" aria-hidden /> Riposo Breve
          </button>
          <button
            type="button"
            onClick={() => setRest('long')}
            className="flex items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-ink"
          >
            <Sun className="size-3.5" aria-hidden /> Riposo Lungo
          </button>
        </div>
      </div>
      {rest === 'short' && <ShortRestDialog onClose={() => setRest(null)} />}
      {rest === 'long' && <LongRestDialog onClose={() => setRest(null)} />}
    </VitalsContext.Provider>
  );
}
