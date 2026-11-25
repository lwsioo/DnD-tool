import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { produce } from 'immer';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { loadExample } from '@/db/example';
import { charactersRepo } from '@/db/repos/characters';
import { createBlankCharacter } from '@/domain/factories';
import { useToastStore } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { defaultSalePriceCp, parseGp, sellItem } from '../itemActions';
import { emptyItem } from '../srdItems';

const initialUi = useUiStore.getState();
beforeEach(() => {
  useUiStore.setState(initialUi, true);
  useToastStore.setState({ toasts: [] });
});

describe('vendita: logica', () => {
  const base = produce(createBlankCharacter('T', 0), (d) => {
    d.inventory.currency.gp = 10;
    d.inventory.items = [
      { ...emptyItem(), id: 'frecce', name: 'Frecce', quantity: 20, valueCp: 5 },
      {
        ...emptyItem(),
        id: 'zaino',
        name: 'Zaino',
        kind: 'container',
        valueCp: 200,
        container: { weightless: false, collapsed: false },
      },
      { ...emptyItem(), id: 'corda', name: 'Corda', parentId: 'zaino' },
    ];
  });

  it('prezzo proposto: metà per l’equipaggiamento, pieno per i tesori', () => {
    expect(defaultSalePriceCp({ kind: 'gear', valueCp: 1500 }, 1)).toBe(750);
    expect(defaultSalePriceCp({ kind: 'treasure', valueCp: 10000 }, 2)).toBe(20000);
    expect(defaultSalePriceCp({ kind: 'gear' }, 3)).toBe(0);
  });

  it('legge il prezzo con la virgola o col punto', () => {
    expect(parseGp('7,5')).toBe(750);
    expect(parseGp('7.5')).toBe(750);
    expect(parseGp('1.250,5')).toBe(125050);
    expect(parseGp('abc')).toBeNull();
    expect(parseGp('')).toBeNull();
  });

  it('vendita parziale riduce la quantità e aggiunge le monete scomposte', () => {
    const after = produce(base, (d) => sellItem(d, 'frecce', 5, 1234));
    expect(after.inventory.items.find((i) => i.id === 'frecce')?.quantity).toBe(15);
    expect(after.inventory.currency).toMatchObject({ gp: 22, sp: 3, cp: 4 });
  });

  it('vendendo un contenitore il contenuto resta', () => {
    const after = produce(base, (d) => sellItem(d, 'zaino', 1, 100));
    expect(after.inventory.items.map((i) => i.id)).toEqual(['frecce', 'corda']);
    expect(after.inventory.items.find((i) => i.id === 'corda')?.parentId).toBeNull();
  });
});

describe('vendita: finestra', () => {
  it('propone il prezzo, si può cambiare, aggiunge le monete e si può annullare', async () => {
    const user = userEvent.setup();
    const id = await loadExample();
    render(
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [`/pg/${id}/inventario`] })} />,
    );

    await user.click(await screen.findByRole('button', { name: 'Vendi Pozione di Guarigione' }));
    const dialog = await screen.findByRole('dialog', { name: 'Vendi: Pozione di Guarigione' });
    const price = within(dialog).getByRole('textbox', { name: /Prezzo di vendita/ });
    expect(price).toHaveValue('50'); // 2 pozioni da 50 mo, a metà prezzo
    await user.tripleClick(within(dialog).getByRole('textbox', { name: 'Quantità da vendere' }));
    await user.keyboard('1');
    expect(price).toHaveValue('25');
    await user.tripleClick(price);
    await user.keyboard('30');
    await user.click(within(dialog).getByRole('button', { name: 'Vendi per 30 mo' }));

    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.inventory.currency.gp).toBe(45);
      expect(c?.inventory.items.find((i) => i.name === 'Pozione di Guarigione')?.quantity).toBe(1);
    });

    await user.click(await screen.findByRole('button', { name: 'Annulla' }));
    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.inventory.currency.gp).toBe(15);
      expect(c?.inventory.items.find((i) => i.name === 'Pozione di Guarigione')?.quantity).toBe(2);
    });
  });
});
