import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { loadExample } from '@/db/example';
import { charactersRepo } from '@/db/repos/characters';
import { useToastStore } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

const initialUi = useUiStore.getState();
beforeEach(() => {
  useUiStore.setState(initialUi, true);
  useToastStore.setState({ toasts: [] });
});

async function openExample() {
  const id = await loadExample();
  useUiStore.setState({ activeCharacterId: id });
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [`/pg/${id}/scheda`] })} />);
  await screen.findByRole('heading', { name: 'Lyra Solmonte' });
  return id;
}

const vitals = () => screen.getByRole('region', { name: 'Vitali' });
const hp = () => within(vitals()).getByRole('region', { name: 'Punti ferita' });

async function hpAction(
  user: ReturnType<typeof userEvent.setup>,
  button: string,
  field: string,
  value: number,
) {
  await user.click(within(hp()).getByRole('button', { name: button }));
  await user.type(within(hp()).getByRole('textbox', { name: field }), `${value}{Enter}`);
}

describe('barra laterale: punti ferita', () => {
  it('danni, PF temporanei e cure', async () => {
    const user = userEvent.setup();
    await openExample();
    expect(within(hp()).getByLabelText('34 su 34 punti ferita, 0 temporanei')).toBeInTheDocument();

    await hpAction(user, 'Danno', 'Danni subiti', 10);
    expect(await within(hp()).findByLabelText('24 su 34 punti ferita, 0 temporanei')).toBeInTheDocument();

    await hpAction(user, 'Temp', 'PF temporanei', 5);
    await hpAction(user, 'Danno', 'Danni subiti', 3);
    expect(await within(hp()).findByLabelText('24 su 34 punti ferita, 2 temporanei')).toBeInTheDocument();

    await hpAction(user, 'Cura', 'PF recuperati', 50);
    expect(await within(hp()).findByLabelText('34 su 34 punti ferita, 2 temporanei')).toBeInTheDocument();
  });

  it('a 0 PF: Privo di Sensi e tiri contro la morte; curandosi la condizione sparisce', async () => {
    const user = userEvent.setup();
    const id = await openExample();
    await hpAction(user, 'Danno', 'Danni subiti', 34);
    expect(await within(hp()).findByText('Tiri salvezza contro la morte')).toBeInTheDocument();
    expect((await charactersRepo.get(id))?.combat.conditions).toContain('unconscious');
    expect(await screen.findByText(/A 0 PF: sei Privo di Sensi/)).toBeInTheDocument();

    await hpAction(user, 'Cura', 'PF recuperati', 5);
    await waitFor(async () =>
      expect((await charactersRepo.get(id))?.combat.conditions).not.toContain('unconscious'),
    );
  });

  it('concentrazione: il danno mostra la CD del tiro salvezza', async () => {
    const user = userEvent.setup();
    const id = await openExample();
    const c = await charactersRepo.get(id);
    await charactersRepo.mutate(id, (d) => {
      d.combat.concentration = { characterSpellId: c!.spellcasting.spells[0]!.id, since: 0 };
    });
    expect(await within(vitals()).findByText('Benedizione')).toBeInTheDocument();
    await hpAction(user, 'Danno', 'Danni subiti', 24);
    expect(
      await screen.findByText('Concentrazione: tiro salvezza su Costituzione CD 12.'),
    ).toBeInTheDocument();
  });
});

describe('barra laterale: CA, slot, risorse', () => {
  it('togliere l’armatura dall’interruttore ricalcola la CA', async () => {
    const user = userEvent.setup();
    await openExample();
    expect(within(vitals()).getByLabelText('Classe Armatura 19')).toBeInTheDocument();
    await user.click(within(vitals()).getByRole('switch', { name: 'Cotta di Maglia' }));
    expect(await within(vitals()).findByLabelText('Classe Armatura 12')).toBeInTheDocument();
    await user.click(within(vitals()).getByRole('switch', { name: 'Scudo' }));
    expect(await within(vitals()).findByLabelText('Classe Armatura 10')).toBeInTheDocument();
  });

  it('slot e risorse fissate si spendono dalla barra', async () => {
    const user = userEvent.setup();
    const id = await openExample();
    // L'esempio ha già speso 1 slot di 1° livello su 3.
    const slots = within(vitals()).getByRole('group', { name: 'Slot di 1° livello: 2 su 3' });
    await user.click(within(slots).getByRole('button', { name: 'Spendi fino a 1 rimasti' }));
    await waitFor(async () => expect((await charactersRepo.get(id))?.spellcasting.slots.used[0]).toBe(2));

    const channel = within(vitals()).getByRole('group', { name: 'Incanalare Divinità: 2 su 2' });
    await user.click(within(channel).getByRole('button', { name: 'Spendi fino a 0 rimasti' }));
    await waitFor(async () =>
      expect(
        (await charactersRepo.get(id))?.features.find((f) => f.name === 'Incanalare Divinità')?.uses?.used,
      ).toBe(2),
    );
  });
});

describe('riposi', () => {
  it('riposo lungo: anteprima, ricarica tutto, Annulla ripristina', async () => {
    const user = userEvent.setup();
    const id = await openExample();
    await charactersRepo.mutate(id, (d) => {
      d.combat.hp.current = 10;
      d.combat.heroicInspiration = false;
      d.features.find((f) => f.name === 'Incanalare Divinità')!.uses!.used = 2;
    });

    await user.click(within(vitals()).getByRole('button', { name: /Riposo Lungo/ }));
    const dialog = screen.getByRole('dialog', { name: 'Riposo Lungo' });
    expect(dialog).toHaveTextContent('Recuperi 24 PF');
    expect(dialog).toHaveTextContent('Si ricarica: Incanalare Divinità');
    expect(dialog).toHaveTextContent('Ottieni Ispirazione Eroica');
    await user.click(within(dialog).getByRole('button', { name: 'Completa il riposo' }));

    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.combat.hp.current).toBe(34);
      expect(c?.spellcasting.slots.used[0]).toBe(0);
      expect(c?.combat.heroicInspiration).toBe(true);
    });
    expect(await screen.findByText(/Riposo lungo completato/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Annulla' }));
    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.combat.hp.current).toBe(10);
      expect(c?.spellcasting.slots.used[0]).toBe(1);
    });
  });

  it('riposo breve: i dadi vita curano risultato + COS', async () => {
    const user = userEvent.setup();
    const id = await openExample();
    await charactersRepo.mutate(id, (d) => {
      d.combat.hp.current = 10;
      d.features.find((f) => f.name === 'Incanalare Divinità')!.uses!.used = 2;
    });

    await user.click(within(vitals()).getByRole('button', { name: /Riposo Breve/ }));
    const dialog = screen.getByRole('dialog', { name: 'Riposo Breve' });
    await user.click(within(dialog).getByRole('button', { name: 'Tira d10' }));
    const roll = within(dialog).getByRole('textbox', { name: 'Risultato d10' });
    await user.tripleClick(roll);
    await user.keyboard('6');
    expect(dialog).toHaveTextContent('Recuperi 8 PF');
    expect(dialog).toHaveTextContent('Si ricarica: Incanalare Divinità');
    await user.click(within(dialog).getByRole('button', { name: 'Completa il riposo' }));

    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.combat.hp.current).toBe(18);
      expect(c?.combat.hitDice[10]?.spent).toBe(1);
    });
  });
});
