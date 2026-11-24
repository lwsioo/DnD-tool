import { X } from 'lucide-react';
import { useId, useState } from 'react';
import { inputClass } from './fields';

interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
  suggestions?: readonly string[];
  placeholder?: string;
}

/** Elenco di etichette libere (lingue, strumenti…), con suggerimenti. Invio o virgola per aggiungere. */
export function TagInput({ values, onChange, label, suggestions = [], placeholder }: TagInputProps) {
  const [text, setText] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setText('');
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-panel-2 py-0.5 pr-1 pl-2.5 text-xs"
          >
            {v}
            <button
              type="button"
              aria-label={`Rimuovi ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="rounded-full p-0.5 text-muted hover:text-ink"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <input
        aria-label={label}
        list={suggestions.length ? listId : undefined}
        value={text}
        placeholder={placeholder ?? 'Aggiungi e premi Invio'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(text);
          }
        }}
        onBlur={() => text && add(text)}
        className={inputClass}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
      )}
    </div>
  );
}
