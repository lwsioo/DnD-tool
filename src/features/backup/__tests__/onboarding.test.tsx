import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { buildCharacterExport } from '@/db/backup';
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

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const jsonFile = (content: unknown, name = 'pg.json') =>
  new File([typeof content === 'string' ? content : JSON.stringify(content)], name, {
    type: 'application/json',
  });

describe('onboarding', () => {
  it('"Carica esempio" crea la Paladina e ne apre la scheda', async () => {
    const user = userEvent.setup();
    const router = renderAt('/benvenuto');
    await user.click(screen.getByRole('button', { name: /Carica esempio/ }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/scheda$/));
    expect(await screen.findByRole('heading', { name: 'Lyra Solmonte' })).toBeInTheDocument();
  });

  it('import da file: anteprima, conferma, apertura del personaggio', async () => {
    const user = userEvent.setup();
    const id = await loadExample();
    const file = await buildCharacterExport(id);
    await db.characters.clear();
    await db.spells.clear();

    const router = renderAt('/benvenuto');
    await user.click(screen.getByRole('button', { name: /Importa da JSON/ }));
    const dialog = screen.getByRole('dialog', { name: 'Importa da file JSON' });
    await user.upload(within(dialog).getByLabelText('File da importare'), jsonFile(file));

    expect(await within(dialog).findByText('Lyra Solmonte')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('5 incantesimi: 5 nuovi, 0 già nella libreria');
    await user.click(within(dialog).getByRole('button', { name: 'Importa' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/pg/${id}/scheda`));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Personaggio importato: Lyra Solmonte')).toBeInTheDocument();
  });

  it('import di un file non valido: messaggio leggibile, nessuna modifica', async () => {
    const user = userEvent.setup();
    renderAt('/benvenuto');
    await user.click(screen.getByRole('button', { name: /Importa da JSON/ }));
    const dialog = screen.getByRole('dialog');
    await user.upload(within(dialog).getByLabelText('File da importare'), jsonFile('{ rotto'));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Il file non è un JSON valido.');
    expect(await db.characters.count()).toBe(0);
  });
});

describe('eliminazione con annulla', () => {
  it('conferma, elimina e ripristina dalla notifica', async () => {
    const user = userEvent.setup();
    const c = await charactersRepo.create('Effimero');
    const router = renderAt(`/pg/${c.id}/scheda`);

    await user.click(await screen.findByRole('button', { name: 'Elimina' }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminare Effimero?' });
    await user.click(within(dialog).getByRole('button', { name: 'Elimina' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/benvenuto'));
    expect(await charactersRepo.get(c.id)).toBeUndefined();

    await user.click(await screen.findByRole('button', { name: 'Annulla' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/pg/${c.id}/scheda`));
    expect((await charactersRepo.get(c.id))?.identity.name).toBe('Effimero');
  });

  it('Esc chiude la conferma senza eliminare', async () => {
    const user = userEvent.setup();
    const c = await charactersRepo.create('Prudente');
    renderAt(`/pg/${c.id}/scheda`);
    await user.click(await screen.findByRole('button', { name: 'Elimina' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await charactersRepo.get(c.id)).toBeDefined();
  });
});
