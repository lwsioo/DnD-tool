import { AlertTriangle, Check, Pencil } from 'lucide-react';
import { useMemo } from 'react';
import { useCurrentCharacter } from '@/features/character/useCurrentCharacter';
import { useCharacterMutation } from '@/hooks/useCharacterMutation';
import { useDerived } from '@/hooks/useDerived';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { AbilityGrid, SavesList, SkillsList } from './AbilitiesPanel';
import { AttacksTable } from './AttacksTable';
import { CombatStrip } from './CombatStrip';
import { ConditionsBar } from './ConditionsBar';
import { FeaturesPanel } from './FeaturesPanel';
import { IdentityHeader } from './IdentityHeader';
import { NotesPanel } from './NotesPanel';
import { SheetContext, type SheetContextValue } from './SheetContext';

/** Scheda personaggio (regole 2024): tutti i valori derivati vengono dal motore di calcolo. */
export function SheetPage() {
  const character = useCurrentCharacter();
  const derived = useDerived(character);
  const edit = useUiStore((s) => s.sheetEditMode);
  const setEdit = useUiStore((s) => s.setSheetEditMode);
  const { mutate, mutateDebounced } = useCharacterMutation(character.id);

  const ctx = useMemo<SheetContextValue>(
    () => ({
      character,
      derived,
      edit,
      mutate: (recipe) => void mutate(recipe),
      mutateLater: mutateDebounced,
    }),
    [character, derived, edit, mutate, mutateDebounced],
  );

  return (
    <SheetContext.Provider value={ctx}>
      {/* @container: il layout segue la larghezza dell'area centrale (cambia aprendo l'Inspector). */}
      <div className="@container mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted">{edit ? 'Modalità Modifica' : 'Modalità Gioco'}</span>
          <Button
            size="sm"
            variant={edit ? 'primary' : 'secondary'}
            icon={edit ? Check : Pencil}
            aria-pressed={edit}
            onClick={() => setEdit(!edit)}
          >
            {edit ? 'Fine modifiche' : 'Modifica'}
          </Button>
        </div>

        <IdentityHeader />

        {derived.warnings.length > 0 && (
          <ul
            role="status"
            className="space-y-1 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
          >
            {derived.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {w}
              </li>
            ))}
          </ul>
        )}

        <CombatStrip />
        <ConditionsBar />

        <div className="grid items-start gap-4 @2xl:grid-cols-[16rem_1fr] @5xl:grid-cols-[8.5rem_15rem_1fr]">
          <AbilityGrid />
          <div className="space-y-4">
            <SavesList />
            <SkillsList />
          </div>
          <div className="min-w-0 space-y-4 @2xl:col-span-2 @5xl:col-span-1">
            <AttacksTable />
            <FeaturesPanel />
            <NotesPanel />
          </div>
        </div>
      </div>
    </SheetContext.Provider>
  );
}
