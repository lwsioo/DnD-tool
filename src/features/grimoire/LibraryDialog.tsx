import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db } from '@/db/db';
import type { Spell } from '@/domain/spells';
import { normalizeKey } from '@/lib/normalizeKey';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { IconButton } from '@/ui/IconButton';
import { inputClass, Select } from '@/ui/fields';
import { spellLevelLine } from './spellText';

interface LibraryDialogProps {
  /** Id degli incantesimi già nel personaggio. */
  owned: Set<string>;
  /** Classi del personaggio (e liste dei talenti), per preimpostare il filtro. */
  characterClasses?: string[];
  canAdd: boolean;
  onAdd: (spell: Spell) => void;
  onEdit: (spell: Spell) => void;
  onNew: () => void;
  onClose: () => void;
}

/** Libreria condivisa: tutti gli incantesimi dell'archivio, da aggiungere al personaggio. */
export function LibraryDialog({
  owned,
  characterClasses = [],
  canAdd,
  onAdd,
  onEdit,
  onNew,
  onClose,
}: LibraryDialogProps) {
  const spells = useLiveQuery(() => db.spells.orderBy('nameKey').toArray(), [], []);
  const usedIds = useLiveQuery(
    async () =>
      new Set((await db.characters.toArray()).flatMap((c) => c.spellcasting.spells.map((s) => s.spellId))),
    [],
    new Set<string>(),
  );
  const openInspector = useUiStore((s) => s.openInspector);
  const [text, setText] = useState('');
  const [level, setLevel] = useState('all');
  const classOptions = useMemo(
    () => [...new Set(spells.flatMap((s) => s.classes))].sort((a, b) => a.localeCompare(b, 'it')),
    [spells],
  );
  const preferred = characterClasses.find((c) => classOptions.includes(c));
  const [klass, setKlass] = useState<string | null>(null);
  const activeClass = klass ?? preferred ?? 'all';
  const missingClasses = spells.length > 0 && classOptions.length === 0;

  const shown = useMemo(() => {
    const q = normalizeKey(text);
    return spells.filter(
      (s) =>
        (level === 'all' || String(s.level) === level) &&
        (activeClass === 'all' || s.classes.includes(activeClass)) &&
        (!q || s.nameKey.includes(q) || normalizeKey(s.nameEn ?? '').includes(q)),
    );
  }, [spells, text, level, activeClass]);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Libreria incantesimi"
      size="lg"
      footer={
        <>
          <Button icon={Plus} onClick={onNew}>
            Nuovo incantesimo
          </Button>
          <Button variant="primary" onClick={onClose}>
            Fatto
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            aria-label="Cerca nella libreria"
            placeholder="Cerca per nome (anche inglese)…"
            className={inputClass}
            value={text}
            data-autofocus
            onChange={(e) => setText(e.target.value)}
          />
          <Select
            label="Livello"
            value={level}
            onValue={setLevel}
            className="w-40"
            options={[
              { value: 'all', label: 'Tutti i livelli' },
              ...Array.from({ length: 10 }, (_, i) => ({
                value: String(i),
                label: i === 0 ? 'Trucchetti' : `${i}° livello`,
              })),
            ]}
          />
          {classOptions.length > 0 && (
            <Select
              label="Classe"
              value={activeClass}
              onValue={setKlass}
              className="w-40"
              options={[
                { value: 'all', label: 'Tutte le classi' },
                ...classOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
          )}
        </div>
        {missingClasses && (
          <p className="text-xs text-muted">
            Questi incantesimi non hanno l’elenco delle classi: per filtrarli per classe importa anche il file
            delle classi di 5etools (Impostazioni → Contenuti).
          </p>
        )}
        {spells.length === 0 ? (
          <p className="text-muted">
            La libreria è vuota. Importa gli incantesimi da Impostazioni → Contenuti (file di 5etools o
            pacchetto di Codex), oppure creane uno.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-1.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openInspector({ kind: 'spell', id: s.id })}
                >
                  <span className="block truncate font-medium hover:text-accent">{s.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {spellLevelLine(s)}
                    {s.sourceBook && ` · ${s.sourceBook}`}
                  </span>
                </button>
                {owned.has(s.id) ? (
                  <span className="flex items-center gap-1 text-xs text-ok">
                    <Check className="size-3.5" aria-hidden /> nel grimorio
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled={!canAdd}
                    onClick={() => onAdd(s)}
                    aria-label={`Aggiungi ${s.name}`}
                  >
                    Aggiungi
                  </Button>
                )}
                <IconButton icon={Pencil} label={`Modifica ${s.name}`} onClick={() => onEdit(s)} />
                <IconButton
                  icon={Trash2}
                  label={`Elimina ${s.name} dalla libreria`}
                  disabled={usedIds.has(s.id)}
                  title={
                    usedIds.has(s.id) ? 'Usato da almeno un personaggio' : `Elimina ${s.name} dalla libreria`
                  }
                  onClick={() => void db.spells.delete(s.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
