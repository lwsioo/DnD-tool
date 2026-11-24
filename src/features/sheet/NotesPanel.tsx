import { MarkdownView } from '@/ui/MarkdownView';
import { TextField } from '@/ui/fields';
import { Panel } from './parts';
import { useSheet } from './SheetContext';

/** Note libere del personaggio in Markdown. I [[wikilink]] diventano cliccabili con lo step 9. */
export function NotesPanel() {
  const { character: c, edit, mutateLater } = useSheet();
  return (
    <Panel title="Note">
      {edit ? (
        <TextField
          multiline
          rows={6}
          label="Note del personaggio"
          value={c.notes}
          placeholder="Appunti, obiettivi, legami… (Markdown)"
          onValue={(v) => mutateLater('notes', (d) => void (d.notes = v))}
        />
      ) : c.notes ? (
        <MarkdownView compact>{c.notes}</MarkdownView>
      ) : (
        <p className="text-sm text-muted">Nessuna nota.</p>
      )}
    </Panel>
  );
}
