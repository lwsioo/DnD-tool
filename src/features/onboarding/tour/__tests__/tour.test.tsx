import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { db } from '@/db/db';
import { loadExample } from '@/db/example';
import { useUiStore } from '@/stores/uiStore';
import { placeCard } from '../placement';
import { TOUR_STEPS } from '../steps';

const initialUi = useUiStore.getState();
beforeEach(async () => {
  await db.delete();
  await db.open();
  useUiStore.setState({ ...initialUi, tourDone: false, tourOpen: false }, true);
});

const renderAt = (path: string) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('visita guidata', () => {
  it('al primo avvio (nessun personaggio) si apre, si scorre e si chiude per sempre', async () => {
    const user = userEvent.setup();
    renderAt('/benvenuto');
    const tour = await screen.findByRole('dialog', { name: 'Visita guidata' });
    expect(within(tour).getByText(`Passo 1 di ${TOUR_STEPS.length}`)).toBeInTheDocument();

    await user.click(within(tour).getByRole('button', { name: 'Iniziamo' }));
    expect(within(tour).getByText('I tuoi personaggi')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(within(tour).getByText('Le sezioni')).toBeInTheDocument();
    await user.click(within(tour).getByRole('button', { name: 'Indietro' }));
    expect(within(tour).getByText('I tuoi personaggi')).toBeInTheDocument();

    await user.click(within(tour).getByRole('button', { name: 'Salta' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Visita guidata' })).not.toBeInTheDocument(),
    );
    expect(useUiStore.getState().tourDone).toBe(true);
  });

  it('arrivati in fondo, «Inizia» la chiude', async () => {
    const user = userEvent.setup();
    renderAt('/benvenuto');
    await screen.findByRole('dialog', { name: 'Visita guidata' });
    for (let i = 1; i < TOUR_STEPS.length; i++) await user.keyboard('{ArrowRight}');
    await user.click(screen.getByRole('button', { name: 'Inizia' }));
    await waitFor(() => expect(useUiStore.getState().tourDone).toBe(true));
  });

  it('non si apre se esiste già un personaggio', async () => {
    const id = await loadExample();
    renderAt(`/pg/${id}/scheda`);
    await screen.findByRole('heading', { name: 'Lyra Solmonte' });
    expect(screen.queryByRole('dialog', { name: 'Visita guidata' })).not.toBeInTheDocument();
  });

  it('si può riaprire dalle Impostazioni', async () => {
    const user = userEvent.setup();
    useUiStore.setState({ tourDone: true });
    renderAt('/impostazioni');
    await user.click(await screen.findByRole('button', { name: /Rivedi la visita guidata/ }));
    expect(await screen.findByRole('dialog', { name: 'Visita guidata' })).toBeInTheDocument();
  });
});

describe('posizione della scheda', () => {
  const vp = { width: 1440, height: 900 };
  it('senza elemento sta al centro, altrimenti accanto e sempre dentro lo schermo', () => {
    expect(placeCard(null, vp, 200)).toEqual({ top: 350, left: 550 });
    expect(placeCard({ top: 100, left: 10, width: 260, height: 40 }, vp)).toEqual({ top: 100, left: 284 });
    const nearRight = placeCard({ top: 10, left: 1300, width: 120, height: 30 }, vp);
    expect(nearRight.left + 340).toBeLessThanOrEqual(vp.width);
    expect(nearRight.top).toBeGreaterThan(40);
  });
});
