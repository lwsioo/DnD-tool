import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { CharacterSpell } from '@/domain/character';
import type { Spell } from '@/domain/spells';
import type { DerivedCharacter } from '@/engine/derive';
import { cantripDiceAt, upcastExtra } from '@/engine/spellcasting';
import { cn } from '@/lib/cn';
import { formatBonus } from '@/lib/dice';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { castOptions, type CastMode } from './castActions';
import { spellLevelLine } from './spellText';

interface CastDialogProps {
  spell: Spell;
  cs: CharacterSpell;
  derived: DerivedCharacter;
  /** Nome dell'incantesimo su cui si è già concentrati, se diverso. */
  currentConcentration: string | null;
  onCast: (mode: CastMode, castLevel: number) => void;
  onClose: () => void;
}

/** Lancio: scelta dello slot (o lancio gratuito / rituale) con anteprima dei dadi scalati. */
export function CastDialog({ spell, cs, derived, currentConcentration, onCast, onClose }: CastDialogProps) {
  const resource = derived.resources.find((r) => r.id === cs.id);
  const options = castOptions(spell, cs, derived.slots, resource?.max ?? 0);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.available),
    ),
  );
  const chosen = options[index];
  const source = derived.spellcasting.find((s) => s.sourceId === cs.sourceId);

  const dice =
    spell.level === 0
      ? cantripDiceAt(spell, derived.level)
      : chosen
        ? upcastExtra(spell, chosen.castLevel)
        : undefined;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Lancia: ${spell.name}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button
            variant="primary"
            icon={Sparkles}
            data-autofocus
            disabled={!chosen?.available || derived.cannotCastSpells}
            onClick={() => chosen && onCast(chosen.mode, chosen.castLevel)}
          >
            Lancia
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          {spellLevelLine(spell)}
          {source && (
            <>
              {' '}
              · {source.label}: CD {source.dc.total}, attacco {formatBonus(source.attack.total)}
            </>
          )}
        </p>

        {options.length === 0 ? (
          <p className="text-danger">Nessuno slot di livello sufficiente per questo incantesimo.</p>
        ) : (
          <fieldset className="space-y-1.5">
            <legend className="sr-only">Come lanciarlo</legend>
            {options.map((o, i) => (
              <label
                key={i}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2',
                  i === index ? 'border-accent bg-accent-soft/50' : 'border-line',
                  !o.available && 'cursor-not-allowed opacity-50',
                )}
              >
                <input
                  type="radio"
                  checked={i === index}
                  disabled={!o.available}
                  onChange={() => setIndex(i)}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
        )}

        {dice && (
          <p className="rounded-md border border-line bg-bg/40 px-3 py-2">
            {spell.level === 0 ? (
              <>
                Al tuo livello: <strong>{dice}</strong>
              </>
            ) : (
              <>
                Slot superiore: <strong>+{dice}</strong>
              </>
            )}
          </p>
        )}

        {spell.duration.concentration && (
          <p className="text-xs text-muted">
            Richiede concentrazione
            {currentConcentration && (
              <span className="text-danger"> · interrompe quella su {currentConcentration}</span>
            )}
            .
          </p>
        )}
        {derived.cannotCastSpells && (
          <p className="text-xs text-danger">
            Indossi un’armatura senza addestramento: non puoi lanciare incantesimi.
          </p>
        )}
      </div>
    </Dialog>
  );
}
