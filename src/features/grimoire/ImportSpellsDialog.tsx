import { FileUp } from 'lucide-react';
import { useId, useState } from 'react';
import { db } from '@/db/db';
import { spellsRepo } from '@/db/repos/spells';
import type { Spell } from '@/domain/spells';
import { readFileText } from '@/lib/download';
import { normalizeKey } from '@/lib/normalizeKey';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { convertFiveEtoolsFile, isFiveEtoolsFile } from './import/fiveEtools';
import { spellLevelLine } from './spellText';
import { m } from '@/i18n';

interface Candidate {
  spell: Spell;
  duplicate: boolean;
  selected: boolean;
}

interface ImportSpellsDialogProps {
  canAddToCharacter: boolean;
  /** Chiamata con gli incantesimi importati (già nella libreria) se l'utente vuole aggiungerli al personaggio. */
  onImported: (spells: Spell[], addToCharacter: boolean) => void;
  onClose: () => void;
}

/** Import in blocco di incantesimi da un file JSON in formato 5etools, con anteprima e deduplica. */
export function ImportSpellsDialog({ canAddToCharacter, onImported, onClose }: ImportSpellsDialogProps) {
  const inputId = useId();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addToCharacter, setAddToCharacter] = useState(canAddToCharacter);
  const [busy, setBusy] = useState(false);

  const read = async (file: File) => {
    setError(null);
    let data: unknown;
    try {
      data = JSON.parse(await readFileText(file));
    } catch {
      return setError(m.grimoire.invalidJson);
    }
    if (!isFiveEtoolsFile(data)) {
      return setError(m.grimoire.noSpellsFound);
    }
    const { spells, warnings: w } = convertFiveEtoolsFile(data);
    const existing = await db.spells.toArray();
    const keys = new Set(existing.flatMap((s) => [s.nameKey, normalizeKey(s.nameEn ?? '')]).filter(Boolean));
    setWarnings(w);
    setCandidates(
      spells.map((spell) => {
        const duplicate = keys.has(spell.nameKey);
        return { spell, duplicate, selected: !duplicate };
      }),
    );
  };

  const selected = candidates?.filter((c) => c.selected) ?? [];

  const confirm = async () => {
    setBusy(true);
    const spells = selected.map((c) => c.spell);
    await spellsRepo.bulkSave(spells);
    onImported(spells, addToCharacter);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={m.grimoire.importTitle}
      size="lg"
      footer={
        candidates && (
          <>
            <Button variant="ghost" onClick={() => setCandidates(null)}>
              {m.grimoire.otherFile}
            </Button>
            <Button variant="primary" disabled={selected.length === 0 || busy} onClick={() => void confirm()}>
              {m.grimoire.importN(selected.length)}
            </Button>
          </>
        )
      }
    >
      {!candidates ? (
        <div className="space-y-3">
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line p-8 text-center hover:border-accent/50"
          >
            <FileUp className="size-8 text-accent" aria-hidden />
            <span className="font-medium">{m.grimoire.chooseSpellFile}</span>
            <span className="text-xs text-muted">
              {m.grimoire.formatHint}
            </span>
          </label>
          <input
            id={inputId}
            type="file"
            accept="application/json,.json"
            aria-label={m.grimoire.spellFile}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void read(f);
              e.target.value = '';
            }}
          />
          {error && (
            <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-danger">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            {m.grimoire.foundSummary(candidates.length, candidates.filter((c) => c.duplicate).length)}
          </p>
          {warnings.length > 0 && <p className="text-xs text-danger">{warnings.join(' ')}</p>}
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => setCandidates(candidates.map((c) => ({ ...c, selected: true })))}
            >
              {m.grimoire.selectAll}
            </button>
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => setCandidates(candidates.map((c) => ({ ...c, selected: false })))}
            >
              {m.grimoire.selectNone}
            </button>
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {candidates.map((c, i) => (
              <li key={c.spell.id}>
                <label className="flex items-center gap-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={c.selected}
                    onChange={(e) =>
                      setCandidates(
                        candidates.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.spell.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {spellLevelLine(c.spell)}
                      {c.spell.sourceBook && ` · ${c.spell.sourceBook}`}
                    </span>
                  </span>
                  {c.duplicate && <span className="text-xs text-muted">{m.grimoire.alreadyPresent}</span>}
                </label>
              </li>
            ))}
          </ul>
          {canAddToCharacter && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addToCharacter}
                onChange={(e) => setAddToCharacter(e.target.checked)}
              />
              {m.grimoire.addToCharacter}
            </label>
          )}
        </div>
      )}
    </Dialog>
  );
}
