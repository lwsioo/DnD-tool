import { ArrowLeft, Check, Pencil, Sparkles, Swords } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { masteryLimit } from '@/features/sheet/masteries';
import { MasteryPicker } from '@/features/sheet/MasteryPicker';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { useVitals } from './VitalsContext';
import { m } from '@/i18n';

function Choice({
  icon: Icon,
  title,
  children,
  onClick,
}: {
  icon: typeof Sparkles;
  title: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-line p-3 text-left transition-colors hover:border-accent/60 hover:bg-accent-soft/40"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted">{children}</span>
      </span>
    </button>
  );
}

/**
 * Dopo un riposo: «vuoi cambiare qualcosa?». Porta agli incantesimi preparati, cambia le Maestrie
 * nelle armi qui stesso, o apre la scheda in modalità Modifica per il resto.
 */
export function AfterRestDialog({ kind, onClose }: { kind: 'short' | 'long'; onClose: () => void }) {
  const { character: c, mutate } = useVitals();
  const navigate = useNavigate();
  const [step, setStep] = useState<'choose' | 'masteries'>('choose');
  const [masteries, setMasteries] = useState(c.weaponMasteries);
  const limit = masteryLimit(c);
  const casts = c.spellcasting.sources.length > 0;
  const restName = kind === 'long' ? m.vitals.longRest : m.vitals.shortRest;

  const go = (path: string, edit = false) => {
    if (edit) useUiStore.getState().setSheetEditMode(true);
    onClose();
    navigate(`/pg/${c.id}/${path}`);
  };

  if (step === 'masteries') {
    return (
      <Dialog
        open
        onClose={onClose}
        title={m.vitals.after.masteries}
        size="lg"
        footer={
          <>
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep('choose')}>
              {m.common.back}
            </Button>
            <Button
              variant="primary"
              icon={Check}
              onClick={() => {
                mutate((d) => void (d.weaponMasteries = masteries));
                onClose();
              }}
              data-autofocus
            >
              {m.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-muted">
            {m.vitals.after.masteryRule}
          </p>
          <MasteryPicker value={masteries} onChange={setMasteries} limit={limit} />
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={m.vitals.after.completed(restName)}
      size="md"
      footer={
        <Button variant="primary" onClick={onClose} data-autofocus>
          {m.vitals.after.noChanges}
        </Button>
      }
    >
      <div className="space-y-2">
        <p className="text-sm">
          {m.vitals.after.question}
          {kind === 'long' && (
            <span className="block text-xs text-muted">
              {m.vitals.after.longRestHint}
            </span>
          )}
        </p>
        {casts && (
          <Choice icon={Sparkles} title={m.vitals.after.preparedSpells} onClick={() => go('grimorio')}>
            {m.vitals.after.preparedSpellsHint}
          </Choice>
        )}
        {(limit > 0 || c.weaponMasteries.length > 0) && (
          <Choice icon={Swords} title={m.vitals.after.masteries} onClick={() => setStep('masteries')}>
            {m.vitals.after.masteriesHint(c.weaponMasteries.length, limit || c.weaponMasteries.length)}
          </Choice>
        )}
        <Choice icon={Pencil} title={m.vitals.after.other} onClick={() => go('scheda', true)}>
          {m.vitals.after.otherHint}
        </Choice>
      </div>
    </Dialog>
  );
}
