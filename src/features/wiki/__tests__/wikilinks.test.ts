import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { applyFullBackup, buildFullBackup } from '@/db/backup';
import { db } from '@/db/db';
import { loadExample } from '@/db/example';
import { backlinksFor, countTextReferences, ensureLinkIndex, propagateRename } from '@/db/linkIndexer';
import { charactersRepo } from '@/db/repos/characters';
import { wikiRepo } from '@/db/repos/wiki';
import { parseWikilinks, renameWikilinks, snippetAround } from '@/lib/wikilinks';
import { linkOptions, wikilinkCompletionSource } from '../wikilink/completion';
import { resolveTarget, type LinkIndex } from '../wikilink/resolve';

describe('parser dei wikilink', () => {
  it('riconosce destinazione e testo visibile', () => {
    const links = parseWikilinks('Vai a [[Porto Salmastro|Salmastro]] e da [[ Mirella ]]. [[]] no.');
    expect(links.map((l) => [l.target, l.alias, l.key])).toEqual([
      ['Porto Salmastro', 'Salmastro', 'porto salmastro'],
      ['Mirella', undefined, 'mirella'],
    ]);
  });

  it('estratto attorno al collegamento', () => {
    const text = `${'a '.repeat(50)}[[X]]${' b'.repeat(50)}`;
    const [l] = parseWikilinks(text);
    const s = snippetAround(text, l!.index, l!.length, 10);
    expect(s.startsWith('…')).toBe(true);
    expect(s).toContain('[[X]]');
  });

  it('rinomina conservando il testo visibile, ignorando maiuscole e accenti', () => {
    const r = renameWikilinks('[[Città Alta]], [[citta alta|la città]] e [[Altrove]]', 'Città Alta', 'Rocca');
    expect(r).toEqual({ text: '[[Rocca]], [[Rocca|la città]] e [[Altrove]]', count: 2 });
  });
});

describe('indice dei collegamenti e backlink', () => {
  async function example() {
    const id = await loadExample();
    const c = (await charactersRepo.get(id))!;
    const find = async (title: string) => (await wikiRepo.findByTitle(c.campaignId!, title))!;
    return { id, campaignId: c.campaignId!, find };
  }

  it('backlink da testo (anche via alias), da metadati e dalle note del personaggio', async () => {
    const { find } = await example();
    const port = await find('Porto Salmastro');
    const back = await backlinksFor(port);
    expect(back.map((b) => b.title).sort()).toEqual([
      'Arrivo a Porto Salmastro',
      'Gilda dei Cartografi',
      'Mirella Corvonero',
    ]);
    expect(back.find((b) => b.title === 'Gilda dei Cartografi')?.viaMeta).toBe(true);
    expect(back.find((b) => b.title === 'Mirella Corvonero')?.snippets[0]).toContain(
      '[[Porto Salmastro|Salmastro]]',
    );

    const mirella = await find('Mirella Corvonero');
    const mBack = await backlinksFor(mirella);
    expect(mBack.map((b) => b.title)).toContain('Lyra Solmonte');
    expect(mBack.find((b) => b.title === 'Lyra Solmonte')?.sourceKind).toBe('characterNotes');
  });

  it('modificare le note del personaggio aggiorna l’indice', async () => {
    const { id, find } = await example();
    const aurelia = await find('Aurelia');
    expect((await backlinksFor(aurelia)).map((b) => b.title)).toContain('Lyra Solmonte');
    await charactersRepo.mutate(id, (d) => void (d.notes = 'Nessun collegamento.'));
    expect((await backlinksFor(aurelia)).map((b) => b.title)).not.toContain('Lyra Solmonte');
  });

  it('rinomina con propagazione: testi e note riscritti, backlink conservati', async () => {
    const { id, campaignId, find } = await example();
    const mirella = await find('Mirella Corvonero');
    expect(await countTextReferences(campaignId, 'Mirella Corvonero', mirella.id)).toEqual({
      links: 2,
      sources: 2,
    });

    const renamed = await wikiRepo.save({ ...mirella, title: 'Mirella la Cartografa' });
    expect(await propagateRename(campaignId, 'Mirella Corvonero', 'Mirella la Cartografa')).toBe(2);
    expect((await charactersRepo.get(id))?.notes).toContain('[[Mirella la Cartografa]]');
    expect((await backlinksFor(renamed)).map((b) => b.title).sort()).toEqual([
      'Arrivo a Porto Salmastro',
      'Gilda dei Cartografi',
      'Lyra Solmonte',
    ]);
  });

  it('all’avvio ricostruisce l’indice se manca (archivi di versioni precedenti)', async () => {
    const { find } = await example();
    await db.wikiLinks.clear();
    expect(await ensureLinkIndex()).toBe(true);
    expect(await ensureLinkIndex()).toBe(false);
    expect((await backlinksFor(await find('Porto Salmastro'))).length).toBe(3);
  });

  it('dopo un backup completo l’indice viene ricostruito', async () => {
    const { find } = await example();
    const file = await buildFullBackup();
    await Promise.all(db.tables.map((t) => t.clear()));
    await applyFullBackup(file.data, 'replace');
    expect((await backlinksFor(await find('Porto Salmastro'))).length).toBe(3);
  });
});

describe('risoluzione e autocompletamento', () => {
  const index: LinkIndex = {
    wiki: new Map([['mirella', { id: 'w1', campaignId: 'c', title: 'Mirella', category: 'npc' }]]),
    spells: new Map([
      ['palla di fuoco', { id: 's1', name: 'Palla di Fuoco' }],
      ['fireball', { id: 's1', name: 'Palla di Fuoco' }],
    ]),
  };

  it.each([
    ['Mirella', { kind: 'wiki' }],
    ['fireball', { kind: 'ref', ref: { kind: 'spell', id: 's1' } }],
    ['Prono', { kind: 'ref', ref: { kind: 'condition', key: 'prone' } }],
    ['Poisoned', { kind: 'ref', ref: { kind: 'condition', key: 'poisoned' } }],
    ['Accurata', { kind: 'ref', ref: { kind: 'property', key: 'finesse' } }],
    ['spada lunga', { kind: 'ref', ref: { kind: 'weapon', id: 'longsword' } }],
  ])('%s', (target, expected) => {
    expect(resolveTarget(target, index)).toMatchObject(expected);
  });

  it('destinazione sconosciuta → null', () => expect(resolveTarget('Torre di Vel', index)).toBeNull());

  it('autocompletamento dopo [[ con le voci della campagna per prime', () => {
    const doc = 'Parla con [[Mir';
    const state = EditorState.create({ doc });
    const source = wikilinkCompletionSource(() => linkOptions(index));
    const result = source(new CompletionContext(state, doc.length, true));
    expect(result?.from).toBe(doc.length - 3);
    const mirella = result?.options.find((o) => o.label === 'Mirella');
    expect(mirella).toMatchObject({ detail: 'NPC', boost: 2 });
    expect(result?.options.some((o) => o.label === 'Palla di Fuoco')).toBe(true);
    expect(source(new CompletionContext(EditorState.create({ doc: 'testo' }), 5, true))).toBeNull();
  });
});
