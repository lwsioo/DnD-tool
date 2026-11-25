import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { charactersRepo } from '@/db/repos/characters';
import { useToastStore } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

const initialUi = useUiStore.getState();
beforeEach(() => {
  useUiStore.setState(initialUi, true);
  useToastStore.setState({ toasts: [] });
});

describe('wizard di creazione', () => {
  it('Guerriero 1 con cotta di maglia e scudo: CA 18 e PF 10 + COS nel riepilogo e nella scheda', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/benvenuto'] });
    render(<RouterProvider router={router} />);

    await user.click(screen.getByRole('button', { name: /Crea nuovo personaggio/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/nuovo'));
    const next = () => user.click(screen.getByRole('button', { name: 'Avanti' }));

    // 1. Concetto
    await user.type(await screen.findByRole('textbox', { name: 'Nome' }), 'Brann');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Specie' }), 'srd-dwarf');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Background' }), 'srd-bg-soldier');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Allineamento' }), 'Legale Buono');
    await user.click(screen.getByRole('radio', { name: /^B: 50 mo/ }));
    await next();
    // 2. Classe
    await user.click(screen.getByRole('button', { name: /Guerriero/ }));
    await next();
    // 3. Caratteristiche (serie standard) + background +2 FOR / +1 COS
    const step = within(screen.getByRole('region', { name: 'Caratteristiche' }));
    const assign = {
      Forza: '15',
      Destrezza: '12',
      Costituzione: '14',
      Intelligenza: '8',
      Saggezza: '13',
      Carisma: '10',
    };
    for (const [ability, value] of Object.entries(assign)) {
      await user.selectOptions(step.getByRole('combobox', { name: `${ability}: valore` }), value);
    }
    // Il Soldato consente solo FOR, DES e COS.
    const plus2 = step.getByRole('combobox', { name: 'Aumento 1 (+2)' });
    expect(within(plus2).queryByRole('option', { name: /INT/ })).not.toBeInTheDocument();
    await user.selectOptions(plus2, 'str');
    await user.selectOptions(step.getByRole('combobox', { name: 'Aumento 2 (+1)' }), 'con');
    expect(step.queryByText(/Assegna un valore/)).not.toBeInTheDocument();
    await next();
    // 4. Competenze: Atletica e Intimidire arrivano dal background
    expect(screen.getByRole('checkbox', { name: /Atletica/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Atletica/ })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Percezione' }));
    await user.click(screen.getByRole('checkbox', { name: 'Spada Lunga' }));
    await next();
    // 5. Equipaggiamento: la classe propone l'opzione A; qui si sceglie a mano.
    expect(screen.getByRole('radio', { name: /^A: Cotta di Maglia/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Scelgo io armatura e armi' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Armatura' }), 'chain-mail');
    await user.click(screen.getByRole('checkbox', { name: 'Scudo' }));
    await user.click(screen.getByRole('checkbox', { name: 'Spada Lunga' }));
    await next();
    // 6. Magia
    expect(screen.getByText(/non lancia incantesimi/)).toBeInTheDocument();
    await next();

    // Riepilogo
    const summary = within(screen.getByRole('region', { name: 'Riepilogo' }));
    expect(summary.getByText('CA').nextSibling).toHaveTextContent('18');
    // 10 (d10) + 2 (COS 14+1) + 1 (Robustezza Nanica)
    expect(summary.getByText('PF').nextSibling).toHaveTextContent('13');
    expect(summary.getByText(/Spada Lunga \+5 \(1d8 \+ 3\)/)).toBeInTheDocument();
    expect(summary.getByText(/Attaccante Selvaggio/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Crea personaggio' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/pg\/.+\/scheda$/));
    expect(await screen.findByRole('heading', { name: 'Brann' })).toBeInTheDocument();
    const [c] = await charactersRepo.list();
    expect(c).toMatchObject({
      classes: [{ name: 'Guerriero', level: 1 }],
      combat: { hp: { current: 13 } },
      identity: { species: 'Nano', background: 'Soldato', alignment: 'Legale Buono' },
      origin: { speciesId: 'srd-dwarf', backgroundId: 'srd-bg-soldier' },
    });
    expect(c?.weaponMasteries).toEqual(['longsword']);
    expect(c?.abilities.str).toEqual({ base: 15, bonus: 2 });
    expect(c?.skills.intimidation.prof).toBe(1);
    expect(c?.skills.perception.prof).toBe(1);
    expect(c?.inventory.currency.gp).toBe(50);
  });
});
