import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../routes';
import { charactersRepo } from '@/db/repos/characters';
import { useUiStore } from '@/stores/uiStore';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const initialUi = useUiStore.getState();

beforeEach(() => {
  useUiStore.setState(initialUi, true);
});

describe('AppShell', () => {
  it('senza personaggi la radice porta al benvenuto e le sezioni sono disabilitate', async () => {
    const router = renderAt('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/benvenuto'));
    expect(await screen.findByRole('heading', { name: 'Benvenuto, avventuriero' })).toBeInTheDocument();
    // La barra laterale mostra le sezioni disabilitate solo dopo aver letto (dal DB) che non c'è un personaggio.
    const nav = within(screen.getByRole('navigation', { name: 'Sezioni' }));
    await waitFor(() => expect(nav.getByText('Scheda')).toHaveAttribute('aria-disabled', 'true'));
    expect(nav.queryByRole('link', { name: 'Scheda' })).not.toBeInTheDocument();
  });

  it('crea un personaggio vuoto dal benvenuto e apre la sua scheda', async () => {
    const user = userEvent.setup();
    const router = renderAt('/benvenuto');
    await user.click(screen.getByRole('button', { name: 'Inizia da una scheda vuota' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/pg\/[\w-]+\/scheda$/));
    expect(await screen.findByDisplayValue('Nuovo personaggio')).toBeInTheDocument();
    expect(useUiStore.getState().activeCharacterId).toBe((await charactersRepo.list())[0]?.id);
  });

  it('la radice riapre l’ultimo personaggio attivo', async () => {
    const c = await charactersRepo.create('Thalia');
    useUiStore.setState({ activeCharacterId: c.id });
    const router = renderAt('/');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/pg/${c.id}/scheda`));
    expect(await screen.findByRole('heading', { name: 'Thalia' })).toBeInTheDocument();
  });

  it('un personaggio inesistente mostra un messaggio invece della scheda', async () => {
    renderAt('/pg/sconosciuto/scheda');
    expect(await screen.findByRole('heading', { name: 'Personaggio non trovato' })).toBeInTheDocument();
  });

  it('naviga tra le sezioni del personaggio attivo', async () => {
    const user = userEvent.setup();
    const c = await charactersRepo.create('Thalia');
    renderAt(`/pg/${c.id}/scheda`);
    await user.click(await screen.findByRole('link', { name: 'Grimorio' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Grimorio' })).toBeInTheDocument();
  });

  it('Compendio → Inspector: link tra regole, cronologia, Esc (se non fissato)', async () => {
    const user = userEvent.setup();
    renderAt('/compendio');

    const conditions = await screen.findByRole('region', { name: 'Condizioni' });
    await user.click(within(conditions).getByRole('button', { name: 'Privo di Sensi' }));
    const drawer = screen.getByRole('complementary', { name: 'Pannello dettagli' });
    expect(within(drawer).getByRole('heading', { level: 2, name: 'Privo di Sensi' })).toBeInTheDocument();
    expect(drawer).toHaveTextContent('Condizione · Unconscious');
    expect(drawer).toHaveTextContent('Applicato in automatico alla scheda');

    // Link interno nel testo della condizione → voce collegata nello stesso pannello.
    await user.click(within(drawer).getByRole('button', { name: 'Incapacitato' }));
    expect(within(drawer).getByRole('heading', { level: 2, name: 'Incapacitato' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Indietro (Alt+←)' }));
    expect(within(drawer).getByRole('heading', { level: 2, name: 'Privo di Sensi' })).toBeInTheDocument();

    // Arma dalla tabella → maestria cliccabile.
    await user.click(screen.getByRole('button', { name: 'Spada Lunga' }));
    expect(drawer).toHaveTextContent('1d8 tagliente (1d10 a due mani)');
    await user.click(within(drawer).getByRole('button', { name: 'Fiaccare' }));
    expect(drawer).toHaveTextContent('Maestria nelle armi · Sap');

    await user.click(screen.getByRole('button', { name: 'Fissa pannello' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('complementary', { name: 'Pannello dettagli' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sblocca pannello' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Pannello dettagli' })).not.toBeInTheDocument();
  });
});
