import { useState } from 'react';
import { useNavigate } from 'react-router';
import { db } from '@/db/db';
import { wikiRepo } from '@/db/repos/wiki';
import { createWikiEntry } from '@/domain/factories';
import type { ID } from '@/domain/primitives';
import type { WikiCategory } from '@/domain/wiki';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { FieldLabel, inputClass, Select } from '@/ui/fields';
import { CATEGORY_INFO, CATEGORY_ORDER, entryPath } from './categories';

interface CreateEntryDialogProps {
  campaignId: ID;
  initialTitle?: string;
  initialCategory?: WikiCategory;
  onClose: () => void;
}

/** Nuova voce: titolo e categoria; poi si apre direttamente in modifica. */
export function CreateEntryDialog({
  campaignId,
  initialTitle = '',
  initialCategory = 'npc',
  onClose,
}: CreateEntryDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState<WikiCategory>(initialCategory);
  const navigate = useNavigate();

  const create = async () => {
    const meta =
      category === 'session'
        ? {
            number:
              Math.max(
                0,
                ...(
                  await db.wikiEntries
                    .where('[campaignId+category]')
                    .equals([campaignId, 'session'])
                    .toArray()
                ).map((e) => (e.category === 'session' ? e.meta.number : 0)),
              ) + 1,
          }
        : undefined;
    const entry = createWikiEntry(campaignId, category, title.trim(), meta as never);
    await wikiRepo.add(entry);
    onClose();
    navigate(`${entryPath(entry)}?modifica=1`);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Nuova voce"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" disabled={!title.trim()} onClick={() => void create()}>
            Crea
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) void create();
        }}
      >
        <FieldLabel label="Titolo">
          <input
            aria-label="Titolo"
            data-autofocus
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FieldLabel>
        <FieldLabel label="Categoria">
          <Select
            label="Categoria"
            value={category}
            onValue={setCategory}
            options={CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_INFO[c].singular }))}
          />
        </FieldLabel>
      </form>
    </Dialog>
  );
}
