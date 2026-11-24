import { describe, expect, it } from 'vitest';
import { db } from '../db';
import {
  applyCharacterImport,
  applyFullBackup,
  buildCharacterExport,
  buildFullBackup,
  exportFileName,
  getPreReplaceBackup,
  ImportError,
  planImport,
  restorePreReplaceBackup,
  type CharacterExportFile,
} from '../backup';
import { loadExample, removeExample } from '../example';
import { parseImportText } from '../importParse';
import { EXPORT_SCHEMA_VERSION } from '../migrations';
import { charactersRepo } from '../repos/characters';
import { settingsRepo } from '../repos/settings';
import { SRD_DERIVE_CONTEXT } from '@/data/srd';
import { deriveCharacter } from '@/engine/derive';

const clearAll = () => Promise.all(db.tables.map((t) => t.clear()));
/** Simula il passaggio da file: serializza e rilegge come farebbe l'utente. */
const viaFile = (file: unknown) => parseImportText(JSON.stringify(file));

describe('export / import di un personaggio', () => {
  it('round-trip: esporta, svuota l’archivio, reimporta → identico', async () => {
    const id = await loadExample();
    const original = await charactersRepo.get(id);
    const exported = await buildCharacterExport(id);
    expect(exported.data.spells).toHaveLength(5);

    await clearAll();
    const parsed = viaFile(exported) as CharacterExportFile;
    const plan = await planImport(parsed);
    expect(plan).toMatchObject({
      kind: 'character',
      existingName: null,
      spells: { toAdd: 5, alreadyPresent: 0 },
    });
    expect(plan.kind === 'character' && plan.campaignMissing).toBe(true);

    const { characterId } = await applyCharacterImport(parsed);
    expect(characterId).toBe(id);
    // La campagna non è nel file del singolo personaggio: viene scollegato.
    expect(await charactersRepo.get(id)).toEqual({ ...original, campaignId: null });
    expect(await db.spells.count()).toBe(5);
  });

  it('reimport dello stesso file: copia con nuovo id, incantesimi non duplicati', async () => {
    const id = await loadExample();
    const file = viaFile(await buildCharacterExport(id)) as CharacterExportFile;
    const plan = await planImport(file);
    expect(plan).toMatchObject({ existingName: 'Lyra Solmonte', spells: { toAdd: 0, alreadyPresent: 5 } });

    const { characterId } = await applyCharacterImport(file, 'copy');
    expect(characterId).not.toBe(id);
    const copy = await charactersRepo.get(characterId);
    expect(copy?.identity.name).toBe('Lyra Solmonte (copia)');
    expect(copy?.campaignId).toBe((await charactersRepo.get(id))?.campaignId);
    expect(await db.characters.count()).toBe(2);
    expect(await db.spells.count()).toBe(5);
  });

  it('modalità "sostituisci": stesso id, con snapshot della versione precedente', async () => {
    const id = await loadExample();
    const file = viaFile(await buildCharacterExport(id)) as CharacterExportFile;
    await charactersRepo.mutate(id, (d) => {
      d.identity.name = 'Modificata dopo l’export';
    });
    await applyCharacterImport(file, 'replace');
    expect((await charactersRepo.get(id))?.identity.name).toBe('Lyra Solmonte');
    const snaps = await db.snapshots.where('characterId').equals(id).toArray();
    expect(snaps.map((s) => s.data.identity.name)).toEqual(['Modificata dopo l’export']);
  });

  it('incantesimi con id diverso ma stesso nome e origine vengono ricollegati a quelli esistenti', async () => {
    const id = await loadExample();
    const exported = await buildCharacterExport(id);
    const renamed = structuredClone(exported);
    renamed.data.spells = renamed.data.spells.map((s) => ({ ...s, id: `altro-${s.id}` }));
    renamed.data.character.spellcasting.spells = renamed.data.character.spellcasting.spells.map((s) => ({
      ...s,
      spellId: `altro-${s.spellId}`,
    }));
    const { characterId } = await applyCharacterImport(viaFile(renamed) as CharacterExportFile);
    const imported = await charactersRepo.get(characterId);
    const localIds = new Set((await db.spells.toArray()).map((s) => s.id));
    expect(await db.spells.count()).toBe(5);
    expect(imported?.spellcasting.spells.every((s) => localIds.has(s.spellId))).toBe(true);
  });

  it('un file scritto a mano con i soli campi essenziali si importa con i valori predefiniti', async () => {
    const minimal = {
      format: 'codex-dnd',
      schemaVersion: 1,
      kind: 'character',
      data: {
        character: {
          id: 'pg-minimo',
          schemaVersion: 1,
          createdAt: 0,
          updatedAt: 0,
          identity: { name: 'Minimo' },
          abilities: Object.fromEntries(
            ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((a) => [a, { base: 10 }]),
          ),
          saves: Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map((a) => [a, 0])),
          skills: Object.fromEntries(
            [
              'acrobatics',
              'animalHandling',
              'arcana',
              'athletics',
              'deception',
              'history',
              'insight',
              'intimidation',
              'investigation',
              'medicine',
              'nature',
              'perception',
              'performance',
              'persuasion',
              'religion',
              'sleightOfHand',
              'stealth',
              'survival',
            ].map((s) => [s, { prof: 0 }]),
          ),
          proficiencies: {},
          combat: { hp: { current: 5, maxMode: 'manual' }, speed: { walk: 30 } },
        },
      },
    };
    const parsed = parseImportText(JSON.stringify(minimal)) as CharacterExportFile;
    await applyCharacterImport(parsed);
    const c = await charactersRepo.get('pg-minimo');
    expect(c?.inventory.items).toEqual([]);
    expect(c?.spellcasting.slots.used).toHaveLength(9);
    expect(() => deriveCharacter(c!, SRD_DERIVE_CONTEXT)).not.toThrow();
  });

  it('nome del file', async () => {
    const id = await loadExample();
    const file = await buildCharacterExport(id);
    expect(exportFileName(file, new Date('2026-11-24T10:00:00Z'))).toBe(
      'codex-lyra-solmonte-2026-11-24.json',
    );
  });
});

describe('errori leggibili', () => {
  const expectError = (text: string, message: RegExp) => {
    expect(() => parseImportText(text)).toThrow(ImportError);
    expect(() => parseImportText(text)).toThrow(message);
  };

  it('JSON non valido', () => expectError('{ non è json', /non è un JSON valido/));
  it('JSON che non è un oggetto', () => expectError('[1, 2, 3]', /Formato non riconosciuto/));
  it('altro formato', () => expectError('{"hello": "world"}', /Formato non riconosciuto/));
  it('file 5etools', () => expectError('{"spell": []}', /5etools/));
  it('versione futura', () =>
    expectError(
      JSON.stringify({ format: 'codex-dnd', schemaVersion: EXPORT_SCHEMA_VERSION + 1, kind: 'character' }),
      /versione più recente/,
    ));

  it('dati non validi: indica dove', async () => {
    const id = await loadExample();
    const file = structuredClone(await buildCharacterExport(id));
    (file.data.character.abilities.str as { base: unknown }).base = 'diciotto';
    (file.data.character.combat as { exhaustion: unknown }).exhaustion = 9;
    try {
      parseImportText(JSON.stringify(file));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ImportError);
      const msg = (e as Error).message;
      expect(msg).toContain('data.character.abilities.str.base');
      expect(msg).toContain('data.character.combat.exhaustion');
    }
  });
});

describe('backup completo', () => {
  it('round-trip con "sostituisci tutto": archivio identico', async () => {
    await loadExample();
    await charactersRepo.create('Secondo');
    const before = {
      characters: await db.characters.orderBy('id').toArray(),
      spells: await db.spells.orderBy('id').toArray(),
      campaigns: await db.campaigns.toArray(),
      wiki: await db.wikiEntries.orderBy('id').toArray(),
      example: await settingsRepo.get('example'),
    };
    const file = viaFile(await buildFullBackup());
    await clearAll();
    await charactersRepo.create('Da sostituire');

    expect(file.kind).toBe('fullBackup');
    if (file.kind !== 'fullBackup') return;
    await applyFullBackup(file.data, 'replace');

    expect(await db.characters.orderBy('id').toArray()).toEqual(before.characters);
    expect(await db.spells.orderBy('id').toArray()).toEqual(before.spells);
    expect(await db.campaigns.toArray()).toEqual(before.campaigns);
    expect(await db.wikiEntries.orderBy('id').toArray()).toEqual(before.wiki);
    expect(await settingsRepo.get('example')).toEqual(before.example);
  });

  it('"sostituisci tutto" salva l’archivio precedente, che si può ripristinare', async () => {
    const keep = await charactersRepo.create('Da non perdere');
    const empty = viaFile({ format: 'codex-dnd', schemaVersion: 1, kind: 'fullBackup', data: {} });
    if (empty.kind !== 'fullBackup') throw new Error();
    await applyFullBackup(empty.data, 'replace');
    expect(await db.characters.count()).toBe(0);
    expect((await getPreReplaceBackup())?.data.characters.map((c) => c.id)).toEqual([keep.id]);

    expect(await restorePreReplaceBackup()).toBe(true);
    expect((await charactersRepo.get(keep.id))?.identity.name).toBe('Da non perdere');
  });

  it('"unisci": aggiunge ciò che manca e tiene la versione più recente', async () => {
    const a = await charactersRepo.create('A');
    const file = viaFile(await buildFullBackup());
    if (file.kind !== 'fullBackup') throw new Error();
    // Nel file, A è più vecchio della versione locale modificata dopo; B esiste solo nel file.
    await charactersRepo.mutate(a.id, (d) => {
      d.identity.name = 'A locale, più recente';
    });
    file.data.characters.push({
      ...file.data.characters[0]!,
      id: 'b',
      identity: { ...file.data.characters[0]!.identity, name: 'B' },
    });
    await applyFullBackup(file.data, 'merge');
    expect((await charactersRepo.get(a.id))?.identity.name).toBe('A locale, più recente');
    expect((await charactersRepo.get('b'))?.identity.name).toBe('B');
  });
});

describe('dati di esempio', () => {
  it('si caricano una volta sola e producono una scheda coerente', async () => {
    const id = await loadExample();
    expect(await loadExample()).toBe(id);
    const c = (await charactersRepo.get(id))!;
    const d = deriveCharacter(c, SRD_DERIVE_CONTEXT);
    expect(d).toMatchObject({ level: 3, pb: 2, ac: { total: 19 }, hp: { max: { total: 34 } } });
    expect(d.warnings).toEqual([]);
    expect(d.skills.stealth.mode).toBe('disadvantage');
    expect(d.attacks.find((a) => a.name === 'Spada Lunga')).toMatchObject({
      toHit: { total: 5 },
      masteryUnlocked: true,
    });
    expect(d.resources.find((r) => r.name === 'Imposizione delle Mani')?.max).toBe(15);
    expect(d.spellcasting[0]).toMatchObject({ dc: { total: 12 }, preparedCount: 3, preparedMax: 4 });
    expect(await db.wikiEntries.where('campaignId').equals(c.campaignId!).count()).toBe(5);
  });

  it('la rimozione elimina personaggio, campagna, voci e incantesimi', async () => {
    await loadExample();
    await removeExample();
    expect(await db.characters.count()).toBe(0);
    expect(await db.campaigns.count()).toBe(0);
    expect(await db.wikiEntries.count()).toBe(0);
    expect(await db.spells.count()).toBe(0);
    expect(await settingsRepo.get('example')).toBeNull();
  });
});
