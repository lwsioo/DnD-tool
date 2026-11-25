import { MarkdownView } from '@/ui/MarkdownView';
import { TextField } from '@/ui/fields';
import { Panel } from './parts';
import { useSheet } from './SheetContext';
import { m } from '@/i18n';

/** Note libere del personaggio in Markdown. I [[wikilink]] diventano cliccabili con lo step 9. */
export function NotesPanel() {
  const { character: c, edit, mutateLater } = useSheet();
  return (
    <Panel title={m.sheet.notes}>
      {edit ? (
        <TextField
          multiline
          rows={6}
          label={m.sheet.characterNotes}
          value={c.notes}
          placeholder={m.sheet.notesPlaceholder}
          onValue={(v) => mutateLater('notes', (d) => void (d.notes = v))}
        />
      ) : c.notes ? (
        <MarkdownView compact>{c.notes}</MarkdownView>
      ) : (
        <p className="text-sm text-muted">{m.sheet.noNotes}</p>
      )}
    </Panel>
  );
}
