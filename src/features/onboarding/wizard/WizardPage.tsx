import { ArrowLeft, ArrowRight, Check, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ABILITY_LABELS } from '@/data/i18n/it';
import { SRD_DERIVE_CONTEXT } from '@/data/srd';
import { charactersRepo } from '@/db/repos/characters';
import { requestPersistence } from '@/db/persist';
import { ABILITIES } from '@/domain/abilities';
import { deriveCharacter } from '@/engine/derive';
import { classSummary } from '@/features/character/useCurrentCharacter';
import type { OriginLibrary } from '@/features/origins/applyOrigin';
import { useOriginLibrary } from '@/features/origins/useOriginLibrary';
import { useAppSettings } from '@/hooks/useAppSettings';
import { cn } from '@/lib/cn';
import { formatBonus } from '@/lib/dice';
import { formatDistance } from '@/lib/units';
import { trackSave } from '@/stores/saveStatus';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import {
  buildCharacterFromWizard,
  checkAbilities,
  initialDraft,
  withFullHp,
  type WizardDraft,
} from './logic';
import { AbilitiesStep, ClassStep, ConceptStep, EquipmentStep, MagicStep, ProficienciesStep } from './steps';

const STEPS = [
  'Concetto',
  'Classe',
  'Caratteristiche',
  'Competenze',
  'Equipaggiamento',
  'Magia',
  'Riepilogo',
] as const;

/** Creazione guidata del personaggio: sei passi saltabili e un riepilogo con i valori già calcolati. */
export function WizardPage() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<WizardDraft>(initialDraft);
  const set = (patch: Partial<WizardDraft>) => setD((x) => ({ ...x, ...patch }));
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const lib = useOriginLibrary();

  const create = async () => {
    setBusy(true);
    try {
      const built = buildCharacterFromWizard(d, Date.now(), lib);
      const character = withFullHp(built, deriveCharacter(built, SRD_DERIVE_CONTEXT).hp.max.total);
      await trackSave(() => charactersRepo.put(character));
      void requestPersistence();
      useUiStore.getState().setActiveCharacter(character.id);
      useUiStore.getState().setSheetEditMode(false);
      toast({ tone: 'success', message: `${character.identity.name} è pronto all’avventura.` });
      navigate(`/pg/${character.id}/scheda`);
    } finally {
      setBusy(false);
    }
  };

  const props = { d, set };
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <Wand2 className="size-5 text-accent" aria-hidden />
        <h2 className="font-display text-2xl tracking-wide">Nuovo personaggio</h2>
      </div>

      <nav aria-label="Passi" className="flex flex-wrap gap-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-current={i === step ? 'step' : undefined}
            onClick={() => setStep(i)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              i === step
                ? 'border-accent bg-accent text-accent-ink'
                : i < step
                  ? 'border-accent/50 text-accent'
                  : 'border-line text-muted hover:text-ink',
            )}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      <section aria-label={STEPS[step]} className="rounded-xl border border-line bg-panel p-4">
        <h3 className="mb-4 font-display text-lg tracking-wide">{STEPS[step]}</h3>
        {step === 0 && <ConceptStep {...props} />}
        {step === 1 && <ClassStep {...props} />}
        {step === 2 && <AbilitiesStep {...props} />}
        {step === 3 && <ProficienciesStep {...props} />}
        {step === 4 && <EquipmentStep {...props} />}
        {step === 5 && <MagicStep {...props} />}
        {step === 6 && <Summary d={d} lib={lib} />}
      </section>

      <div className="flex items-center gap-2">
        <Button variant="ghost" icon={ArrowLeft} disabled={step === 0} onClick={() => setStep(step - 1)}>
          Indietro
        </Button>
        <span className="flex-1" />
        {step < STEPS.length - 1 ? (
          <Button variant="primary" icon={ArrowRight} onClick={() => setStep(step + 1)}>
            Avanti
          </Button>
        ) : (
          <Button variant="primary" icon={Check} disabled={busy} onClick={() => void create()}>
            Crea personaggio
          </Button>
        )}
      </div>
    </div>
  );
}

function Summary({ d, lib }: { d: WizardDraft; lib: OriginLibrary }) {
  const { units } = useAppSettings();
  const c = useMemo(() => buildCharacterFromWizard(d, 0, lib), [d, lib]);
  const x = useMemo(() => deriveCharacter(c, SRD_DERIVE_CONTEXT), [c]);
  const abilities = checkAbilities(d);

  const stat = (label: string, value: string) => (
    <div className="rounded-lg border border-line bg-bg/40 px-3 py-2 text-center">
      <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">{label}</div>
      <div className="font-display text-xl">{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-xl">{c.identity.name}</p>
        <p className="text-sm text-muted">
          {[c.identity.species, classSummary(c), c.identity.background].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stat('CA', String(x.ac.total))}
        {stat('PF', String(x.hp.max.total))}
        {stat('Iniziativa', formatBonus(x.initiative.total))}
        {stat('Velocità', formatDistance(x.speed.walk.total, units))}
        {stat('Competenza', formatBonus(x.pb))}
        {stat('Perc. passiva', String(x.passive.perception.total))}
      </div>
      <div className="grid grid-cols-6 gap-2">
        {ABILITIES.map((a) => (
          <div key={a} className="rounded-lg border border-line px-2 py-1.5 text-center">
            <div className="text-[10px] font-bold text-muted">{ABILITY_LABELS[a].short}</div>
            <div className="font-display">{formatBonus(x.abilities[a].mod)}</div>
            <div className="text-xs text-muted">{x.abilities[a].score}</div>
          </div>
        ))}
      </div>
      {x.attacks.length > 0 && (
        <p className="text-sm">
          <span className="text-muted">Attacchi: </span>
          {x.attacks.map((a) => `${a.name} ${formatBonus(a.toHit.total)} (${a.damage.text})`).join(' · ')}
        </p>
      )}
      {c.features.length > 0 && (
        <p className="text-sm">
          <span className="text-muted">Tratti e talenti: </span>
          {c.features.map((f) => f.name).join(' · ')}
        </p>
      )}
      {x.spellcasting.map((s) => (
        <p key={s.sourceId} className="text-sm">
          <span className="text-muted">{s.label}: </span>CD {s.dc.total}, attacco{' '}
          {formatBonus(s.attack.total)}
        </p>
      ))}
      {!abilities.ok && (
        <p className="text-xs text-danger">Caratteristiche: {abilities.message} Le mancanti valgono 10.</p>
      )}
      {x.warnings.map((w) => (
        <p key={w} className="text-xs text-danger">
          {w}
        </p>
      ))}
    </div>
  );
}
