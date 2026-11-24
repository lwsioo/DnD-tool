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

async function setup(path: (campaignId: string, id: string) => string) {
  const id = await loadExample();
  const campaignId = (await charactersRepo.get(id))!.campaignId!;
  useUiStore.setState({ activeCharacterId: id });
  const router = createMemoryRouter(routes, { initialEntries: [path(campaignId, id)] });
  render(<RouterProvider router={router} />);
  return { id, campaignId, router };
}
const drawer = () => within(screen.getByRole('complementary', { name: 'Pannello dettagli' }));

describe('campagna wiki', () => {
  it('categorie, voce con metadati e backlink', async () => {
    const user = userEvent.setup();
    await setup((c) => `/campagna/${c}/luoghi`);
    const nav = within(await screen.findByRole('navigation', { name: 'Categorie' }));
    await waitFor(() => expect(nav.getByRole('link', { name: /NPC/ })).toHaveTextContent('1'));

    await user.click(
      within(screen.getByRole('list', { name: 'Voci: Luoghi' })).getByRole('link', {
        name: 'Porto Salmastro',
      }),
    );
    expect(await screen.findByRole('heading', { level: 2, name: 'Porto Salmastro' })).toBeInTheDocument();
    expect(screen.getByText('Costa Spezzata')).toBeInTheDocument();
    const backlinks = within(screen.getByRole('region', { name: 'Menzionato in' }));
    expect(await backlinks.findByRole('button', { name: /Mirella Corvonero/ })).toBeInTheDocument();
    expect(backlinks.getByRole('button', { name: /Arrivo a Porto Salmastro/ })).toBeInTheDocument();
  });

  it('un [[collegamento]] apre l’anteprima nell’Inspector', async () => {
    const user = userEvent.setup();
    await setup((c) => `/campagna/${c}/luoghi`);
    await user.click(await screen.findByRole('link', { name: 'Porto Salmastro' }));
    const article = await screen.findByRole('article');
    // Compare sia nei metadati (Fazioni presenti) sia nel testo: entrambi aprono la stessa anteprima.
    await user.click(within(article).getAllByRole('button', { name: 'Gilda dei Cartografi' })[0]!);
    expect(
      await drawer().findByRole('heading', { level: 2, name: 'Gilda dei Cartografi' }),
    ).toBeInTheDocument();
    expect(drawer().getByRole('button', { name: 'Apri nella wiki' })).toBeInTheDocument();
  });

  it('un collegamento mancante propone di creare la voce', async () => {
    const user = userEvent.setup();
    const { campaignId, router } = await setup((c) => `/campagna/${c}/fazioni`);
    await user.click(await screen.findByRole('link', { name: 'Gilda dei Cartografi' }));
    const article = await screen.findByRole('article');
    const missing = within(article).getByRole('button', { name: 'Torre di Vel' });
    expect(missing).toHaveAttribute('title', expect.stringContaining('non esiste ancora'));
    await user.click(missing);

    const dialog = screen.getByRole('dialog', { name: 'Nuova voce' });
    expect(within(dialog).getByRole('textbox', { name: 'Titolo' })).toHaveValue('Torre di Vel');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Categoria' }), 'location');
    await user.click(within(dialog).getByRole('button', { name: 'Crea' }));

    await waitFor(() => expect(router.state.location.search).toBe('?modifica=1'));
    const created = await db.wikiEntries
      .where('[campaignId+titleKey]')
      .equals([campaignId, 'torre di vel'])
      .first();
    expect(created?.category).toBe('location');
    expect(router.state.location.pathname).toBe(`/campagna/${campaignId}/luoghi/${created!.id}`);
  });

  it('modifica: i metadati si salvano da soli', async () => {
    const user = userEvent.setup();
    const { campaignId } = await setup((c) => `/campagna/${c}/npc`);
    await user.click(await screen.findByRole('link', { name: 'Mirella Corvonero' }));
    await user.click(await screen.findByRole('button', { name: 'Modifica' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Stato' }), 'dead');
    await waitFor(async () => {
      const m = await db.wikiEntries
        .where('[campaignId+titleKey]')
        .equals([campaignId, 'mirella corvonero'])
        .first();
      expect(m?.category === 'npc' && m.meta.status).toBe('dead');
    });
    await user.click(screen.getByRole('button', { name: 'Fine' }));
    expect(await within(await screen.findByRole('article')).findByText('Morto')).toBeInTheDocument();
  });

  it('le note del personaggio nella scheda risolvono i collegamenti della sua campagna', async () => {
    const user = userEvent.setup();
    await setup((_c, id) => `/pg/${id}/scheda`);
    const notes = within(await screen.findByRole('region', { name: 'Note' }));
    await user.click(await notes.findByRole('button', { name: 'Aurelia' }));
    expect(await drawer().findByText('Aurelia, la Fiamma dell’Alba')).toBeInTheDocument();
  });

  it('senza campagna: elenco e creazione collegata al personaggio attivo', async () => {
    const user = userEvent.setup();
    const c = await charactersRepo.create('Solo');
    useUiStore.setState({ activeCharacterId: c.id });
    const router = createMemoryRouter(routes, { initialEntries: ['/campagna/'] });
    render(<RouterProvider router={router} />);
    await user.type(
      await screen.findByRole('textbox', { name: 'Nome della nuova campagna' }),
      'Le Terre Grigie{Enter}',
    );
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/campagna\/[\w-]+$/));
    expect((await charactersRepo.get(c.id))?.campaignId).toBeTruthy();
  });
});
