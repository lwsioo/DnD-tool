import { autocompletion } from '@codemirror/autocomplete';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { useMemo, useRef } from 'react';
import { wikilinkCompletionSource, type LinkOption } from './wikilink/completion';

/** Tema dell'editor agganciato ai token di colore dell'app (chiaro e scuro). */
const codexTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--c-bg)',
    color: 'var(--c-ink)',
    border: '1px solid var(--c-line)',
    borderRadius: '0.5rem',
    fontSize: '0.9rem',
  },
  '&.cm-focused': { outline: 'none', borderColor: 'var(--c-accent)' },
  '.cm-content': { fontFamily: 'var(--font-sans)', padding: '0.75rem', caretColor: 'var(--c-accent)' },
  '.cm-scroller': { lineHeight: '1.6' },
  '.cm-cursor': { borderLeftColor: 'var(--c-accent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--c-accent-soft)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--c-panel)',
    border: '1px solid var(--c-line)',
    borderRadius: '0.5rem',
    color: 'var(--c-ink)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--c-accent-soft)',
    color: 'var(--c-ink)',
  },
  '.cm-completionDetail': { color: 'var(--c-muted)', marginLeft: '0.75rem', fontStyle: 'normal' },
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Nomi proposti dopo `[[` (letti al momento della richiesta, quindi sempre aggiornati). */
  linkOptions: LinkOption[];
  label: string;
  minHeight?: string;
}

/** Editor Markdown (CodeMirror 6) con autocompletamento dei [[wikilink]]. */
export function MarkdownEditor({
  value,
  onChange,
  linkOptions,
  label,
  minHeight = '14rem',
}: MarkdownEditorProps) {
  const optionsRef = useRef(linkOptions);
  optionsRef.current = linkOptions;

  const extensions = useMemo(
    () => [
      markdown(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': label }),
      autocompletion({ override: [wikilinkCompletionSource(() => optionsRef.current)], icons: false }),
    ],
    [label],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={codexTheme}
      minHeight={minHeight}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        autocompletion: false,
      }}
    />
  );
}
