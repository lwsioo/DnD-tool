import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { produce } from 'immer';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { loadExample } from '@/db/example';
import { charactersRepo } from '@/db/repos/characters';
import { createBlankCharacter } from '@/domain/factories';
import type { InventoryItem } from '@/domain/items';
import { useToastStore } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { descendantIds, moveItem, removeItem, setEquipped, treeOrder, validTargets } from '../itemActions';
import { emptyItem, itemFromSrd } from '../srdItems';

const item = (id: string, patch: Partial<InventoryItem> = {}): InventoryItem => ({
  ...emptyItem(),
  id,
  name: id,
  ...patch,
});
const box = (id: string, parentId: string | null = null) =>
  item(id, { kind: 'container', parentId, container: { weightless: false, collapsed: false } });

describe('azioni sugli oggetti', () => {
  const base = produce(createBlankCharacter('T', 0), (d) => {
    d.inventory.items = [
      box('zaino'),
      box('borsa', 'zaino'),
      item('corda', { parentId: 'borsa' }),
      itemFromSrd('armor:chain-mail'),
      { ...itemFromSrd('armor:leather'), id: 'cuoio' },
    ];
  });

  it('albero: figli subito dopo il padre, con profondità', () => {
    expect(
      treeOrder(base.inventory.items)
        .map((r) => `${r.item.id}:${r.depth}`)
        .slice(0, 3),
    ).toEqual(['zaino:0', 'borsa:1', 'corda:2']);
  });

  it('non si può mettere un contenitore dentro sé stesso o un suo discendente', () => {
    expect(descendantIds(base.inventory.items, 'zaino')).toEqual(new Set(['zaino', 'borsa', 'corda']));
    expect(validTargets(base.inventory.items, 'zaino').map((t) => t.id)).toEqual([]);
    const after = produce(base, (d) => {
      expect(moveItem(d, 'zaino', 'borsa')).toBe(false);
      expect(moveItem(d, 'corda', 'zaino')).toBe(true);
    });
    expect(after.inventory.items.find((i) => i.id === 'corda')?.parentId).toBe('zaino');
  });

  it('una sola armatura indossata alla volta', () => {
    const chain = base.inventory.items[3]!.id;
    const after = produce(base, (d) => {
      setEquipped(d, chain, true);
      setEquipped(d, 'cuoio', true);
    });
    expect(after.inventory.items.filter((i) => i.equipped).map((i) => i.id)).toEqual(['cuoio']);
  });

  it('eliminare un contenitore elimina il contenuto', () => {
    let removed: InventoryItem[] = [];
    const after = produce(base, (d) => void (removed = removeItem(d, 'zaino')));
    expect(removed.map((i) => i.id)).toEqual(['zaino', 'borsa', 'corda']);
    expect(after.inventory.items).toHaveLength(2);
  });
});

const initialUi = useUiStore.getState();
beforeEach(() => {
  useUiStore.setState(initialUi, true);
  useToastStore.setState({ toasts: [] });
});

async function openInventory() {
  const id = await loadExample();
  useUiStore.setState({ activeCharacterId: id });
  render(
    <RouterProvider router={createMemoryRouter(routes, { initialEntries: [`/pg/${id}/inventario`] })} />,
  );
  await screen.findByRole('region', { name: 'Oggetti' });
  return id;
}
const items = () => within(screen.getByRole('region', { name: 'Oggetti' }));
const vitals = () => within(screen.getByRole('region', { name: 'Vitali' }));

describe('pagina inventario', () => {
  it('togliere lo scudo dall’inventario abbassa la CA in barra laterale', async () => {
    const user = userEvent.setup();
    await openInventory();
    expect(await vitals().findByLabelText('Classe Armatura 19')).toBeInTheDocument();
    await user.click(items().getByRole('switch', { name: 'Scudo equipaggiato' }));
    expect(await vitals().findByLabelText('Classe Armatura 17')).toBeInTheDocument();
  });

  it('spostare un oggetto nello zaino con il menu "Sposta"', async () => {
    const user = userEvent.setup();
    const id = await openInventory();
    const c = await charactersRepo.get(id);
    const zaino = c!.inventory.items.find((i) => i.name === 'Zaino')!;
    const sel = items().getByRole('combobox', { name: 'Sposta Pozione di Guarigione' }) as HTMLSelectElement;
    expect([...sel.options].map((o) => `${o.value}=${o.text}`)).toContain(`${zaino.id}=In: Zaino`);
    await user.selectOptions(sel, zaino.id);
    await waitFor(async () => {
      const saved = await charactersRepo.get(id);
      expect(saved?.inventory.items.find((i) => i.name === 'Pozione di Guarigione')?.parentId).toBe(zaino.id);
    });
  });

  it('aggiungere un’arma SRD la mostra negli attacchi', async () => {
    const user = userEvent.setup();
    await openInventory();
    await user.click(screen.getByRole('button', { name: 'Aggiungi oggetto' }));
    const dialog = screen.getByRole('dialog', { name: 'Nuovo oggetto' });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Oggetto SRD' }), 'weapon:rapier');
    expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveValue('Stocco');
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }));

    // Nuovo oggetto: non ancora equipaggiato.
    await user.click(await items().findByRole('switch', { name: 'Stocco equipaggiato' }));
    const attacks = within(screen.getByRole('region', { name: 'Attacchi' }));
    expect(await attacks.findByRole('button', { name: 'Stocco' })).toBeInTheDocument();
  });

  it('monete: cambio e pagamento con resto', async () => {
    const user = userEvent.setup();
    const id = await openInventory();
    // Esempio: 15 MO, 8 MA, 12 MR.
    const money = within(screen.getByRole('region', { name: 'Monete' }));
    await user.type(money.getByRole('textbox', { name: 'Quantità da cambiare' }), '5');
    await user.selectOptions(money.getByRole('combobox', { name: 'Moneta di partenza' }), 'gp');
    await user.selectOptions(money.getByRole('combobox', { name: 'Moneta di arrivo' }), 'sp');
    await user.click(money.getByRole('button', { name: 'Cambia' }));
    await waitFor(async () =>
      expect((await charactersRepo.get(id))?.inventory.currency).toMatchObject({ gp: 10, sp: 58 }),
    );

    await user.type(money.getByRole('textbox', { name: 'Importo da pagare' }), '2,5');
    await user.click(money.getByRole('button', { name: 'Paga' }));
    await waitFor(async () => {
      const cur = (await charactersRepo.get(id))!.inventory.currency;
      expect(cur.cp + cur.sp * 10 + cur.gp * 100).toBe(1000 + 580 + 12 - 250);
    });
  });
});
