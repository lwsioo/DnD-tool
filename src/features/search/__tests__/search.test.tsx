import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { buildExampleData } from '@/data/templates/example';
import { loadExample } from '@/db/example';
import { useToastStore } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { buildCommands, filterCommands } from '../commands';
import { buildDocs, createIndex, parseQuery, searchGrouped } from '../searchIndex';

describe('indice di ricerca', () => {
  const data = buildExampleData(0);
  const entries = data.wikiEntries.map((e) => (e.title === 'Aurelia' ? { ...e, tags: ['divinità'] } : e));
  const index = createIndex(
    buildDocs({
      entries,
      campaigns: [data.campaign],
      spells: data.spells,
      characters: [data.character],
      active: data.character,
    }),
  );
  it('voci duplicate o incomplete non bloccano l’indice', () => {
    const spell = { ...data.spells[0]!, description: undefined as unknown as string };
    const docs = buildDocs({ entries: [], campaigns: [], spells: [spell, spell], characters: [] });
    const idx = createIndex(docs);
    expect(searchGrouped(idx, parseQuery(spell.name))[0]?.hits[0]?.title).toBe(spell.name);
    expect(searchGrouped(idx, parseQuery('elfo'))[0]?.hits[0]?.title).toBe('Elfo');
  });
  const first = (q: string) => searchGrouped(index, parseQuery(q))[0]?.hits[0]?.title;
  const kinds = (q: string) => searchGrouped(index, parseQuery(q)).map((g) => g.kind);

  it.each([
    ['mirella', 'Mirella Corvonero'],
    ['salmastro', 'Porto Salmastro'],
    ['bless', 'Benedizione'],
    ['benedizone', 'Benedizione'],
    ['avvel', 'Avvelenato'],
    ['poisoned', 'Avvelenato'],
    ['arma sacra', 'Arma Sacra'],
    ['lyra', 'Lyra Solmonte'],
    ['cotta', 'Cotta di Maglia'],
  ])('“%s” → %s', (q, title) => expect(first(q)).toBe(title));

  it('le sessioni mostrano il numero', () =>
    expect(first('arrivo')).toBe('Sessione 1 — Arrivo a Porto Salmastro'));

  it('i gruppi sono ordinati per pertinenza', () => {
    expect(kinds('scudo della fede')[0]).toBe('spell');
    expect(kinds('avvelenato')[0]).toBe('rule');
  });

  it('@ cerca solo nella wiki, # solo nei tag', () => {
    expect(kinds('@benedizione')).toEqual([]);
    expect(kinds('@porto')).toEqual(['wiki']);
    expect(searchGrouped(index, parseQuery('#divinita'))[0]?.hits.map((h) => h.title)).toEqual(['Aurelia']);
  });

  it('comandi filtrati per testo e contesto', () => {
    const ctx = {
      navigate: () => {},
      active: data.character,
      campaignId: null,
      theme: 'dark' as const,
      toggleTheme: () => {},
      openRest: () => {},
      createWikiEntry: () => {},
      exportBackup: () => {},
    };
    expect(filterCommands(buildCommands(ctx), 'riposo').map((c) => c.id)).toEqual([
      'rest-short',
      'rest-long',
    ]);
    expect(buildCommands(ctx).some((c) => c.id === 'new-entry')).toBe(false);
    expect(buildCommands({ ...ctx, active: undefined }).some((c) => c.id === 'rest-long')).toBe(false);
  });
});

const initialUi = useUiStore.getState();
beforeEach(() => {
  useUiStore.setState(initialUi, true);
  useToastStore.setState({ toasts: [] });
});

async function setup() {
  const id = await loadExample();
  useUiStore.setState({ activeCharacterId: id });
  const router = createMemoryRouter(routes, { initialEntries: [`/pg/${id}/scheda`] });
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: 'Lyra Solmonte' });
  return { id, router };
}
const palette = () => within(screen.getByRole('dialog', { name: 'Cerca' }));

describe('palette Ctrl+K', () => {
  it('Ctrl+K apre; Invio mostra la voce nell’Inspector', async () => {
    const user = userEvent.setup();
    await setup();
    await user.keyboard('{Control>}k{/Control}');
    await screen.findByRole('dialog', { name: 'Cerca' });
    await user.type(palette().getByRole('combobox'), 'gilda');
    expect(await palette().findByRole('option', { name: /Gilda dei Cartografi/ })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog', { name: 'Cerca' })).not.toBeInTheDocument();
    const drawer = within(screen.getByRole('complementary', { name: 'Pannello dettagli' }));
    expect(
      await drawer.findByRole('heading', { level: 2, name: 'Gilda dei Cartografi' }),
    ).toBeInTheDocument();
  });

  it('Ctrl+Invio apre la pagina della voce', async () => {
    const user = userEvent.setup();
    const { router } = await setup();
    await user.click(screen.getByRole('button', { name: /Cerca/ }));
    await screen.findByRole('dialog', { name: 'Cerca' });
    await user.type(palette().getByRole('combobox'), 'porto salmastro');
    expect((await palette().findAllByRole('option', { name: /Porto Salmastro/ }))[0]).toHaveAttribute(
      'data-selected',
      'true',
    );
    await user.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/campagna\/.+\/luoghi\/.+/));
  });

  it('comandi con ">": apre il Riposo Lungo', async () => {
    const user = userEvent.setup();
    await setup();
    await user.keyboard('{Control>}k{/Control}');
    await screen.findByRole('dialog', { name: 'Cerca' });
    await user.type(palette().getByRole('combobox'), '>lungo');
    await user.click(await palette().findByRole('option', { name: 'Riposo Lungo' }));
    expect(await screen.findByRole('dialog', { name: 'Riposo Lungo' })).toBeInTheDocument();
  });

  it('Esc chiude la palette', async () => {
    const user = userEvent.setup();
    await setup();
    await user.keyboard('{Control>}k{/Control}');
    await screen.findByRole('dialog', { name: 'Cerca' });
    expect(screen.getByRole('dialog', { name: 'Cerca' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Cerca' })).not.toBeInTheDocument();
  });
});
