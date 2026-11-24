import { beforeEach, describe, expect, it } from 'vitest';
import { applyLibraryPack, buildLibraryPack } from '@/db/backup';
import { db } from '@/db/db';
import { applyContentImport, planContentImport } from '../importContent';

const races = {
  race: [
    { name: 'Testfolk', source: 'TST', size: ['M'], speed: 30, entries: [] },
    { name: 'Elf', source: 'XPHB', size: ['M'], speed: 30, entries: [] }, // già nell'SRD come Elfo
  ],
};
const feats = { feat: [{ name: 'Lucky Test', source: 'TST', category: 'O', entries: ['Luck.'] }] };
const items = { item: [{ name: 'Test Ring', source: 'TST', type: 'RG', bonusAc: '+1' }] };

const file = (name: string, data: unknown) => ({ name, text: JSON.stringify(data) });

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('import di contenuti da più file', () => {
  it('unisce i file, segnala i doppioni SRD e i file non riconosciuti', async () => {
    const plan = await planContentImport([
      file('races.json', races),
      file('feats.json', feats),
      file('items.json', items),
      file('altro.json', { monster: [] }),
      { name: 'rotto.json', text: '{' },
    ]);
    expect(plan.candidates.map((c) => `${c.kind}:${c.name}:${c.duplicate}`)).toEqual([
      'species:Testfolk:false',
      'species:Elf:true',
      'feat:Lucky Test:false',
      'item:Test Ring:false',
    ]);
    expect(plan.warnings).toHaveLength(2);
  });

  it('importa, e reimportando gli stessi file non crea doppioni', async () => {
    const files = [file('races.json', races), file('items.json', items)];
    const first = await planContentImport(files);
    await applyContentImport(first.candidates.filter((c) => !c.duplicate));
    expect(await db.libraryItems.count()).toBe(2);

    const again = await planContentImport(files);
    expect(again.candidates.every((c) => c.duplicate)).toBe(true);
  });

  it('un pacchetto esportato si reimporta su un archivio vuoto', async () => {
    const plan = await planContentImport([file('feats.json', feats), file('items.json', items)]);
    await applyContentImport(plan.candidates);
    const pack = await buildLibraryPack();
    expect(pack.kind).toBe('library');

    await db.delete();
    await db.open();
    const viaDialog = await planContentImport([file('pacchetto.json', pack)]);
    expect(viaDialog.candidates.filter((c) => !c.duplicate)).toHaveLength(2);

    await applyLibraryPack(pack.data);
    expect(await db.libraryItems.count()).toBe(2);
  });
  it('il file delle classi importato dopo aggiorna gli incantesimi già in libreria', async () => {
    const spell = {
      name: 'Test Bolt',
      source: 'TST',
      level: 0,
      school: 'V',
      time: [{ number: 1, unit: 'action' }],
      range: { type: 'point', distance: { type: 'feet', amount: 120 } },
      components: { v: true },
      duration: [{ type: 'instant' }],
      entries: ['Zap.'],
    };
    const first = await planContentImport([file('spells.json', { spell: [spell] })]);
    await applyContentImport(first.candidates);
    expect((await db.spells.toArray())[0]!.classes).toEqual([]);

    const lookup = await planContentImport([
      file('sources.json', { TST: { 'Test Bolt': { class: [{ name: 'Sorcerer' }] } } }),
    ]);
    expect(lookup.warnings).toEqual([]);
    expect(lookup.classUpdates).toHaveLength(1);
    await applyContentImport([], lookup.classUpdates);
    expect((await db.spells.toArray())[0]!.classes).toEqual(['Stregone']);
  });
});
