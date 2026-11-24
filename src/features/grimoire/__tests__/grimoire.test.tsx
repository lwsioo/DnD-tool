import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { db } from '@/db/db';
import { loadExample } from '@/db/example';
import { charactersRepo } from '@/db/repos/characters';
import { useToastStore } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

const initialUi = useUiStore.getState();
beforeEach(() => {
  useUiStore.setState(initialUi, true);
  useToastStore.setState({ toasts: [] });
});

async function openGrimoire() {
  const id = await loadExample();
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [`/pg/${id}/grimorio`] })} />);
  await screen.findByRole('region', { name: '1° livello' });
  return id;
}
const level1 = () => within(screen.getByRole('region', { name: '1° livello' }));
const header = () => within(screen.getByRole('region', { name: 'Incantatore' }));
const filters = () => within(screen.getByRole('region', { name: 'Filtri' }));

describe('grimorio', () => {
  it('intestazione: CD, attacco e preparati della fonte', async () => {
    await openGrimoire();
    expect(header().getByText('Paladino')).toBeInTheDocument();
    expect(header().getByText('12')).toBeInTheDocument();
    expect(header().getByText('Preparati 3/4')).toBeInTheDocument();
  });

  it('preparare un incantesimo aggiorna il contatore', async () => {
    const user = userEvent.setup();
    const id = await openGrimoire();
    await user.click(level1().getByRole('checkbox', { name: 'Benedizione preparato' }));
    expect(await header().findByText('Preparati 2/4')).toBeInTheDocument();
    const c = await charactersRepo.get(id);
    expect(c?.spellcasting.spells.filter((s) => s.status === 'prepared')).toHaveLength(2);
  });

  it('filtri combinabili: concentrazione + sempre pronti', async () => {
    const user = userEvent.setup();
    await openGrimoire();
    await user.click(filters().getByRole('button', { name: 'C' }));
    expect(level1().getAllByRole('listitem')).toHaveLength(3);
    await user.click(filters().getByRole('button', { name: 'Sempre pronto' }));
    expect(level1().getAllByRole('listitem')).toHaveLength(2);
    await user.click(filters().getByRole('button', { name: 'Azzera filtri' }));
    expect(level1().getAllByRole('listitem')).toHaveLength(5);
  });

  it('lanciare con uno slot consuma lo slot e imposta la concentrazione', async () => {
    const user = userEvent.setup();
    const id = await openGrimoire();
    const row = level1().getByRole('button', { name: 'Benedizione' }).closest('li')!;
    await user.click(within(row).getByRole('button', { name: 'Lancia' }));
    const dialog = screen.getByRole('dialog', { name: 'Lancia: Benedizione' });
    expect(dialog).toHaveTextContent('Slot di 1° livello (2/3)');
    expect(dialog).toHaveTextContent('Richiede concentrazione');
    await user.click(within(dialog).getByRole('button', { name: 'Lancia' }));
    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.spellcasting.slots.used[0]).toBe(2);
      expect(c?.combat.concentration).toBeDefined();
    });
    expect(await screen.findByText('Lanciato Benedizione con uno slot di 1°.')).toBeInTheDocument();
  });

  it('nuovo incantesimo: finisce in libreria e nel grimorio', async () => {
    const user = userEvent.setup();
    const id = await openGrimoire();
    await user.click(header().getByRole('button', { name: 'Nuovo' }));
    const dialog = screen.getByRole('dialog', { name: 'Nuovo incantesimo' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Nome' }), 'Lama di Luce');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Livello' }), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }));
    expect(await screen.findByRole('region', { name: 'Trucchetti' })).toBeInTheDocument();
    expect(await db.spells.where('nameKey').equals('lama di luce').count()).toBe(1);
    const c = await charactersRepo.get(id);
    expect(c?.spellcasting.spells).toHaveLength(6);
  });

  it('import 5etools: anteprima, deduplica e aggiunta al grimorio', async () => {
    const user = userEvent.setup();
    const id = await openGrimoire();
    const file = new File(
      [
        JSON.stringify({
          spell: [
            {
              name: 'Bless',
              level: 1,
              school: 'E',
              time: [{ number: 1, unit: 'action' }],
              range: { type: 'point', distance: { type: 'feet', amount: 30 } },
              components: { v: true },
              duration: [{ type: 'instant' }],
              entries: ['x'],
            },
            {
              name: 'Spark',
              level: 0,
              school: 'V',
              time: [{ number: 1, unit: 'action' }],
              range: { type: 'point', distance: { type: 'feet', amount: 60 } },
              components: { v: true },
              duration: [{ type: 'instant' }],
              entries: ['A {@damage 1d8} spark.'],
            },
          ],
        }),
      ],
      'spells.json',
      { type: 'application/json' },
    );
    await user.click(header().getByRole('button', { name: 'Importa' }));
    const dialog = screen.getByRole('dialog', { name: 'Importa incantesimi (5etools)' });
    await user.upload(within(dialog).getByLabelText('File di incantesimi'), file);
    // "Bless" esiste già nella libreria come nome inglese di Benedizione.
    expect(await within(dialog).findByText('già presente')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Importa 1' }));

    expect(await screen.findByText('1 incantesimi importati nella libreria.')).toBeInTheDocument();
    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.spellcasting.spells).toHaveLength(6);
    });
    const spark = await db.spells.where('nameKey').equals('spark').first();
    expect(spark).toMatchObject({ origin: 'import', level: 0, description: 'A 1d8 spark.' });
  });
});
