import { useState } from 'react';
import type { Character } from '@/domain/character';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { applyBackground, applySpecies, type OriginLibrary } from './applyOrigin';
import { bonusFromPicks } from './bonus';
import { currentBackground, currentSpecies } from './current';
import {
  BackgroundFields,
  BonusFields,
  EquipmentChoice,
  SpeciesFields,
  type BackgroundValue,
} from './OriginFields';

type Mutate = (recipe: (d: Character) => void) => void;

export function SpeciesDialog({
  character,
  lib,
  mutate,
  onClose,
}: {
  character: Character;
  lib: OriginLibrary;
  mutate: Mutate;
  onClose: () => void;
}) {
  const [value, setValue] = useState(() => currentSpecies(character));
  const def = lib.species.find((s) => s.id === value.speciesId);
  const missingOption = Boolean(def?.choice && !value.choices.optionKey);

  const apply = () => {
    mutate((d) => {
      applySpecies(d, def ?? null, value.choices, lib);
      if (!def) d.identity.species = value.customName.trim();
    });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Specie"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" onClick={apply} disabled={missingOption} data-autofocus>
            Applica
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SpeciesFields lib={lib} value={value} onChange={(p) => setValue((v) => ({ ...v, ...p }))} />
        <p className="text-xs text-muted">
          Applicando, i tratti, le competenze e le fonti di incantesimi aggiunti dalla specie precedente
          vengono sostituiti. Ciò che hai inserito a mano resta.
        </p>
        {missingOption && <p className="text-xs text-danger">Scegli {def!.choice!.label.toLowerCase()}.</p>}
      </div>
    </Dialog>
  );
}

export function BackgroundDialog({
  character,
  lib,
  mutate,
  onClose,
}: {
  character: Character;
  lib: OriginLibrary;
  mutate: Mutate;
  onClose: () => void;
}) {
  const initial = currentBackground(character);
  const [value, setValue] = useState<BackgroundValue>(initial);
  const [mode, setMode] = useState(initial.mode);
  const [picks, setPicks] = useState(initial.picks);
  const [equipment, setEquipment] = useState<'A' | 'B' | 'none'>('none');
  const def = lib.backgrounds.find((b) => b.id === value.backgroundId);
  const complete = picks.length === (mode === 'twoOne' ? 2 : 3);

  const apply = () => {
    mutate((d) => {
      applyBackground(
        d,
        def ?? null,
        { abilityBonus: bonusFromPicks(mode, picks), feat: value.feat, equipment },
        lib,
      );
      if (!def) d.identity.background = value.customName.trim();
    });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Background"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" onClick={apply} data-autofocus>
            Applica
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <BackgroundFields
          lib={lib}
          value={value}
          onChange={(p) => {
            if (p.backgroundId !== undefined && p.backgroundId !== value.backgroundId) setPicks([]);
            setValue((v) => ({ ...v, ...p }));
          }}
        >
          {def && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted">Aumenti di caratteristica</p>
                <BonusFields
                  allowed={def.abilities}
                  mode={mode}
                  picks={picks}
                  onChange={(m, p) => {
                    setMode(m);
                    setPicks(p);
                  }}
                />
                {!complete && (
                  <p className="text-xs text-muted">
                    Finché gli aumenti non sono completi non ne viene applicato nessuno.
                  </p>
                )}
              </div>
              <EquipmentChoice def={def} value={equipment} onChange={setEquipment} />
            </>
          )}
        </BackgroundFields>
        <p className="text-xs text-muted">
          Applicando, bonus, competenze e talento del background precedente vengono sostituiti.
          L’equipaggiamento già nell’inventario non viene toccato.
        </p>
      </div>
    </Dialog>
  );
}
