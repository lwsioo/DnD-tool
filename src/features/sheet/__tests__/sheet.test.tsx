import { act, render, screen, waitFor, within } from '@testing-library/react';
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
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [`/pg/${id}/scheda`] })} />);
  await screen.findByRole('heading', { name: 'Lyra Solmonte' });
  return id;
}

const skillRow = (name: string) =>
  within(screen.getByRole('region', { name: 'Abilità' }))
    .getByText(name)
    .closest('li')!;
const combat = () => screen.getByRole('region', { name: 'Combattimento' });
const attackRow = (name: string) =>
  within(screen.getByRole('region', { name: 'Attacchi' }))
    .getByRole('button', { name })
    .closest('tr')!;

describe('scheda personaggio', () => {
  it('mostra i valori derivati: CA, PF, iniziativa, svantaggio a Furtività con la fonte', async () => {
    await openExample();
    expect(within(combat()).getByText('19')).toBeInTheDocument();
    expect(within(combat()).getByText('34')).toBeInTheDocument();
    expect(within(skillRow('Furtività')).getByLabelText(/Svantaggio: Cotta di Maglia/)).toBeInTheDocument();
    expect(within(skillRow('Atletica')).getByText('+5')).toBeInTheDocument();
    expect(within(skillRow('Acrobazia')).queryByText(/SVANT/)).not.toBeInTheDocument();
  });

  it('togliere l’armatura aggiorna CA e badge in tempo reale', async () => {
    const id = await openExample();
    await charactersRepo.mutate(id, (d) => {
      const armor = d.inventory.items.find((i) => i.kind === 'armor')!;
      armor.equipped = false;
    });
    await waitFor(() => expect(within(skillRow('Furtività')).queryByText('SVANT')).not.toBeInTheDocument());
    // 10 + DES 0 + scudo 2; lo Stile Difesa richiede armatura.
    expect(within(combat()).getByText('12')).toBeInTheDocument();
  });

  it('attivare Arma Sacra aggiunge il Carisma ai tiri per colpire in mischia', async () => {
    const user = userEvent.setup();
    await openExample();
    expect(within(attackRow('Spada Lunga')).getByText('+5')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Privilegi di Classe/ }));
    await user.click(screen.getByRole('switch', { name: 'Arma Sacra attivo' }));
    await waitFor(() => expect(within(attackRow('Spada Lunga')).getByText('+7')).toBeInTheDocument());
  });

  it('Versatile: il pulsante 1M/2M cambia il dado di danno', async () => {
    const user = userEvent.setup();
    await openExample();
    expect(within(attackRow('Spada Lunga')).getByText('1d8 + 3')).toBeInTheDocument();
    await user.click(within(attackRow('Spada Lunga')).getByRole('button', { name: /1M/ }));
    await waitFor(() => expect(within(attackRow('Spada Lunga')).getByText('1d10 + 3')).toBeInTheDocument());
  });

  it('i contatori d’uso si spendono e si salvano', async () => {
    const user = userEvent.setup();
    const id = await openExample();
    // La stessa risorsa compare anche nella barra laterale: si cerca solo nel pannello dei privilegi.
    const features = within(screen.getByRole('region', { name: 'Privilegi e competenze' }));
    const group = features.getByRole('group', { name: 'Incanalare Divinità: 2 su 2' });
    await user.click(within(group).getByRole('button', { name: 'Spendi fino a 1 rimasti' }));
    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.features.find((f) => f.name === 'Incanalare Divinità')?.uses?.used).toBe(1);
    });
    expect(await features.findByRole('group', { name: 'Incanalare Divinità: 1 su 2' })).toBeInTheDocument();
  });

  it('aggiungere una condizione applica i suoi effetti', async () => {
    const user = userEvent.setup();
    await openExample();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Aggiungi condizione' }), 'poisoned');
    await waitFor(() =>
      expect(within(skillRow('Acrobazia')).getByLabelText(/Svantaggio: Avvelenato/)).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Rimuovi Avvelenato' }));
    await waitFor(() => expect(within(skillRow('Acrobazia')).queryByText('SVANT')).not.toBeInTheDocument());
  });

  it('modalità Modifica: cambiare il Carisma aggiorna le abilità collegate', async () => {
    const user = userEvent.setup();
    await openExample();
    expect(within(skillRow('Persuasione')).getByText('+4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifica' }));
    const cha = screen.getByRole('textbox', { name: 'Carisma base' });
    await user.clear(cha);
    await user.type(cha, '18');
    await waitFor(() => expect(within(skillRow('Persuasione')).getByText('+6')).toBeInTheDocument(), {
      timeout: 2000,
    });
  });

  it('scheda vuota: la prima classe SRD imposta TS, addestramenti, PF automatici e fonte da incantatore', async () => {
    const user = userEvent.setup();
    const c = await charactersRepo.create('Nuova');
    useUiStore.setState({ sheetEditMode: true });
    render(
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [`/pg/${c.id}/scheda`] })} />,
    );
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Aggiungi classe' }), 'cleric');
    await waitFor(async () => {
      const saved = await charactersRepo.get(c.id);
      expect(saved?.classes.map((x) => x.name)).toEqual(['Chierico']);
      expect(saved?.saves).toMatchObject({ wis: 1, cha: 1, str: 0 });
      expect(saved?.proficiencies.armor).toEqual(['light', 'medium', 'shield']);
      expect(saved?.combat.hp.maxMode).toBe('auto');
      expect(saved?.spellcasting.sources).toMatchObject([{ label: 'Chierico', ability: 'wis' }]);
    });
  });

  it('editor dei privilegi: un nuovo talento con effetto +1 CA cambia la CA', async () => {
    const user = userEvent.setup();
    await openExample();
    await user.click(screen.getByRole('button', { name: 'Modifica' }));
    await user.click(screen.getByRole('tab', { name: /Talenti e Background/ }));
    await user.click(screen.getByRole('button', { name: 'Aggiungi' }));
    const dialog = screen.getByRole('dialog', { name: 'Nuovo privilegio' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Nome' }), 'Anello di Protezione');
    await user.click(within(dialog).getByRole('button', { name: 'Aggiungi effetto' }));
    expect(within(dialog).getByText('+1 a CA')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }));
    await user.click(screen.getByRole('button', { name: 'Fine modifiche' }));
    await waitFor(() => expect(within(combat()).getByText('20')).toBeInTheDocument());
  });
  it('specie e background dalla libreria: applica tratti e bonus, cambiando li sostituisce', async () => {
    const user = userEvent.setup();
    const id = await openExample();
    act(() => useUiStore.getState().setSheetEditMode(true));

    await user.click(await screen.findByRole('button', { name: /^Specie: .* cambia$/ }));
    let dialog = await screen.findByRole('dialog', { name: 'Specie' });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Specie' }), 'srd-orc');
    await user.click(within(dialog).getByRole('button', { name: 'Applica' }));
    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.features.some((f) => f.name === 'Tenacia Implacabile')).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: /^Background: .* cambia$/ }));
    dialog = await screen.findByRole('dialog', { name: 'Background' });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Background' }), 'srd-bg-sage');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Aumento 1 (+2)' }), 'int');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Aumento 2 (+1)' }), 'wis');
    await user.click(within(dialog).getByRole('button', { name: 'Applica' }));
    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.identity.background).toBe('Saggio');
      expect(c?.origin?.background.abilityBonus).toEqual({ int: 2, wis: 1 });
      expect(c?.spellcasting.sources.some((s) => s.label === 'Iniziato alla Magia (Mago)')).toBe(true);
    });

    // Tornare a una specie personalizzata toglie i tratti dell'Orco.
    await user.click(screen.getByRole('button', { name: /^Specie: .* cambia$/ }));
    dialog = await screen.findByRole('dialog', { name: 'Specie' });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Specie' }), '');
    await user.clear(within(dialog).getByRole('textbox', { name: 'Nome della specie' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Nome della specie' }), 'Mezzorco');
    await user.click(within(dialog).getByRole('button', { name: 'Applica' }));
    await waitFor(async () => {
      const c = await charactersRepo.get(id);
      expect(c?.identity.species).toBe('Mezzorco');
      expect(c?.features.some((f) => f.name === 'Tenacia Implacabile')).toBe(false);
    });
  });

  it('l’allineamento si sceglie da una lista', async () => {
    const user = userEvent.setup();
    const id = await openExample();
    act(() => useUiStore.getState().setSheetEditMode(true));
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Allineamento' }), 'Caotico Buono');
    await waitFor(async () =>
      expect((await charactersRepo.get(id))?.identity.alignment).toBe('Caotico Buono'),
    );
  });
});
