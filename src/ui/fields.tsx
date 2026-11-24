import { Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const inputClass =
  'w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent';

/**
 * Stato locale di un campo sincronizzato col valore esterno quando il campo non ha il focus
 * (così le modifiche arrivate dal DB non sovrascrivono ciò che l'utente sta scrivendo).
 */
function useFieldState<T>(value: T) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);
  return {
    local,
    setLocal,
    focusProps: {
      onFocus: () => {
        focused.current = true;
      },
      onBlur: () => {
        focused.current = false;
      },
    },
  };
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onValue: (value: string) => void;
  label?: string;
  multiline?: boolean;
  rows?: number;
}

/** Campo di testo: chiama onValue a ogni modifica (il salvataggio differito lo gestisce il chiamante). */
export function TextField({
  value,
  onValue,
  label,
  multiline,
  rows = 4,
  className,
  ...rest
}: TextFieldProps) {
  const { local, setLocal, focusProps } = useFieldState(value);
  const common = {
    value: local,
    ...focusProps,
    className: cn(inputClass, className),
  };
  const field = multiline ? (
    <textarea
      {...common}
      rows={rows}
      aria-label={label}
      placeholder={rest.placeholder}
      onChange={(e) => {
        setLocal(e.target.value);
        onValue(e.target.value);
      }}
    />
  ) : (
    <input
      {...rest}
      {...common}
      aria-label={label}
      onChange={(e) => {
        setLocal(e.target.value);
        onValue(e.target.value);
      }}
    />
  );
  return field;
}

interface NumberFieldProps {
  value: number;
  onValue: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  className?: string;
  /** Pulsanti −/+ ai lati. */
  stepper?: boolean;
}

/** Campo numerico intero: accetta solo valori validi entro i limiti. */
export function NumberField({
  value,
  onValue,
  label,
  min = -999,
  max = 9999,
  className,
  stepper,
}: NumberFieldProps) {
  const { local, setLocal, focusProps } = useFieldState(String(value));
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (raw: string) => {
    setLocal(raw);
    if (/^-?\d+$/.test(raw.trim())) onValue(clamp(Number(raw)));
  };
  const input = (
    <input
      inputMode="numeric"
      aria-label={label}
      value={local}
      {...focusProps}
      onBlur={() => {
        focusProps.onBlur();
        setLocal(String(value));
      }}
      onChange={(e) => commit(e.target.value)}
      className={cn(inputClass, 'text-center tabular-nums', className)}
    />
  );
  if (!stepper) return input;
  return (
    <span className="inline-flex items-center gap-1">
      <StepButton
        label={`Diminuisci ${label}`}
        onClick={() => onValue(clamp(value - 1))}
        disabled={value <= min}
      >
        <Minus className="size-3" aria-hidden />
      </StepButton>
      {input}
      <StepButton
        label={`Aumenta ${label}`}
        onClick={() => onValue(clamp(value + 1))}
        disabled={value >= max}
      >
        <Plus className="size-3" aria-hidden />
      </StepButton>
    </span>
  );
}

export function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-6 shrink-0 place-items-center rounded border border-line text-muted hover:border-accent/50 hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function FieldLabel({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

interface SelectProps<V extends string> {
  value: V;
  onValue: (v: V) => void;
  options: Array<{ value: V; label: string }>;
  label: string;
  className?: string;
}

export function Select<V extends string>({ value, onValue, options, label, className }: SelectProps<V>) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onValue(e.target.value as V)}
      className={cn(inputClass, 'pr-7', className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
