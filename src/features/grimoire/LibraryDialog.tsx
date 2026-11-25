import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db } from '@/db/db';
import { cn } from '@/lib/cn';
import type { Spell } from '@/domain/spells';
import { normalizeKey } from '@/lib/normalizeKey';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { IconButton } from '@/ui/IconButton';
import { inputClass, Select } from '@/ui/fields';
import { spellLevelLine } from './spellText';
import { LANG_TAG, m } from '@/i18n';
import { canonicalClass } from '@/data/srd/classes';

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
    () => [...new Set(spells.flatMap((s) => s.classes.map(canonicalClass)))].sort((a, b) => a.localeCompare(b, LANG_TAG)),
    [spells],
  );
  const preferred = characterClasses.map(canonicalClass).find((c) => classOptions.includes(c));
  const [klass, setKlass] = useState<string | null>(null);
  const activeClass = klass ?? preferred ?? 'all';
  const missingClasses = spells.length > 0 && classOptions.length === 0;

  const shown = useMemo(() => {
    const q = normalizeKey(text);
    return spells.filter(
      (s) =>
        (level === 'all' || String(s.level) === level) &&
        (activeClass === 'all' || s.classes.some((c) => canonicalClass(c) === activeClass)) &&
        (!q || s.nameKey.includes(q) || normalizeKey(s.nameEn ?? '').includes(q)),
    );
  }, [spells, text, level, activeClass]);

  return (
    <Dialog
      open
      onClose={onClose}
      title={m.grimoire.libraryTitle}
      size="lg"
      footer={
        <>
          <Button icon={Plus} onClick={onNew}>
            {m.grimoire.newSpell}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {m.common.done}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            aria-label={m.grimoire.searchLibrary}
            placeholder={m.grimoire.searchLibraryPlaceholder}
            className={inputClass}
            value={text}
            data-autofocus
            onChange={(e) => setText(e.target.value)}
          />
          <Select
            label={m.grimoire.level}
            value={level}
            onValue={setLevel}
            className="w-40"
            options={[
              { value: 'all', label: m.grimoire.allLevels },
              ...Array.from({ length: 10 }, (_, i) => ({
                value: String(i),
                label: m.grimoire.levelTitle(i),
              })),
            ]}
          />
          {classOptions.length > 0 ? (
            <Select
              label={m.grimoire.class}
              value={activeClass}
              onValue={setKlass}
              className="w-40"
              options={[
                { value: 'all', label: m.grimoire.allClasses },
                ...classOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
          ) : (
            <select
              aria-label={m.grimoire.class}
              disabled
              title={m.grimoire.missingClassesTitle}
              className={cn(inputClass, 'w-40 opacity-60')}
            >
              <option>{m.grimoire.noClassData}</option>
            </select>
          )}
        </div>
        {missingClasses && (
          <p className="rounded-md border border-line bg-bg/40 p-2 text-xs text-muted">
            {m.grimoire.missingClassesHint}
          </p>
        )}
        {spells.length === 0 ? (
          <p className="text-muted">
            {m.grimoire.emptyLibrary}
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
                    <Check className="size-3.5" aria-hidden /> {m.grimoire.inGrimoire}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled={!canAdd}
                    onClick={() => onAdd(s)}
                    aria-label={m.grimoire.addX(s.name)}
                  >
                    {m.common.add}
                  </Button>
                )}
                <IconButton icon={Pencil} label={m.grimoire.editX(s.name)} onClick={() => onEdit(s)} />
                <IconButton
                  icon={Trash2}
                  label={m.grimoire.deleteFromLibrary(s.name)}
                  disabled={usedIds.has(s.id)}
                  title={
                    usedIds.has(s.id) ? m.grimoire.usedByCharacter : m.grimoire.deleteFromLibrary(s.name)
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
