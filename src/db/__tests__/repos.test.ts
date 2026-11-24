import { describe, expect, it } from 'vitest';
import { db } from '../db';
import { charactersRepo } from '../repos/characters';
import { campaignsRepo } from '../repos/campaigns';
import { MAX_SNAPSHOTS_PER_CHARACTER, snapshotsRepo } from '../repos/snapshots';
import { settingsRepo } from '../repos/settings';
import { wikiRepo } from '../repos/wiki';
import { createWikiEntry } from '@/domain/factories';
import { CHARACTER_SCHEMA_VERSION } from '@/domain/character';

describe('charactersRepo', () => {
  it('crea un personaggio vuoto valido e lo rilegge', async () => {
    const created = await charactersRepo.create('Thalia');
    const read = await charactersRepo.get(created.id);
    expect(read).toEqual(created);
    expect(read?.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
    expect(read?.abilities.dex).toEqual({ base: 10, bonus: 0 });
    expect(Object.keys(read!.skills)).toHaveLength(18);
    expect(read?.spellcasting.slots.used).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('elenca i personaggi dal più recente', async () => {
    const a = await charactersRepo.create('A');
    const b = await charactersRepo.create('B');
    await charactersRepo.mutate(a.id, (d) => {
      d.notes = 'toccato per ultimo';
    });
    expect((await charactersRepo.list()).map((c) => c.id)).toEqual([a.id, b.id]);
  });

  it('mutate aggiorna updatedAt e non tocca l’id', async () => {
    const c = await charactersRepo.create();
    const saved = await charactersRepo.mutate(c.id, (d) => {
      d.identity.name = 'Nuovo nome';
      d.id = 'tentativo-di-cambiare-id';
    });
    expect(saved?.id).toBe(c.id);
    expect(saved?.identity.name).toBe('Nuovo nome');
    expect(saved!.updatedAt).toBeGreaterThanOrEqual(c.updatedAt);
  });

  it('mutate concorrenti non si sovrascrivono (lettura-modifica-scrittura atomica)', async () => {
    const c = await charactersRepo.create();
    await Promise.all(
      Array.from({ length: 10 }, () =>
        charactersRepo.mutate(c.id, (d) => {
          d.combat.hp.current += 1;
        }),
      ),
    );
    expect((await charactersRepo.get(c.id))?.combat.hp.current).toBe(10);
  });

  it('mutate su un personaggio inesistente restituisce undefined', async () => {
    expect(await charactersRepo.mutate('non-esiste', () => {})).toBeUndefined();
  });

  it('remove elimina anche gli snapshot del personaggio', async () => {
    const c = await charactersRepo.create();
    await snapshotsRepo.take(c.id, 'test');
    await charactersRepo.remove(c.id);
    expect(await charactersRepo.get(c.id)).toBeUndefined();
    expect(await db.snapshots.count()).toBe(0);
  });
});

describe('snapshotsRepo', () => {
  it('ripristina lo stato salvato', async () => {
    const c = await charactersRepo.create('Prima');
    const snapId = await snapshotsRepo.take(c.id, 'Riposo lungo');
    await charactersRepo.mutate(c.id, (d) => {
      d.identity.name = 'Dopo';
    });
    expect(await snapshotsRepo.restore(snapId!)).toBe(true);
    expect((await charactersRepo.get(c.id))?.identity.name).toBe('Prima');
  });

  it(`conserva al massimo ${MAX_SNAPSHOTS_PER_CHARACTER} snapshot per personaggio`, async () => {
    const c = await charactersRepo.create();
    for (let i = 0; i < MAX_SNAPSHOTS_PER_CHARACTER + 5; i++) await snapshotsRepo.take(c.id, `#${i}`);
    const list = await snapshotsRepo.list(c.id);
    expect(list).toHaveLength(MAX_SNAPSHOTS_PER_CHARACTER);
    expect(list[0]?.reason).toBe(`#${MAX_SNAPSHOTS_PER_CHARACTER + 4}`);
  });
});

describe('campaignsRepo + wikiRepo', () => {
  it('trova le voci per titolo o alias ignorando maiuscole e accenti', async () => {
    const camp = await campaignsRepo.create('La Costa Spezzata');
    const entry = createWikiEntry(camp.id, 'location', 'Città di Vel');
    await wikiRepo.save({ ...entry, aliases: ['La Bianca'] });
    expect((await wikiRepo.findByTitle(camp.id, 'citta di vel'))?.id).toBe(entry.id);
    expect((await wikiRepo.findByTitle(camp.id, 'la BIANCA'))?.id).toBe(entry.id);
    expect(await wikiRepo.findByTitle(camp.id, 'Altrove')).toBeUndefined();
  });

  it('eliminando una campagna rimuove le voci e scollega i personaggi', async () => {
    const camp = await campaignsRepo.create('Effimera');
    await wikiRepo.add(createWikiEntry(camp.id, 'npc', 'Mirella'));
    const c = await charactersRepo.create();
    await charactersRepo.mutate(c.id, (d) => {
      d.campaignId = camp.id;
    });
    await campaignsRepo.remove(camp.id);
    expect(await db.wikiEntries.count()).toBe(0);
    expect((await charactersRepo.get(c.id))?.campaignId).toBeNull();
  });
});

describe('settingsRepo', () => {
  it('usa i valori predefiniti finché non viene salvato nulla', async () => {
    expect(await settingsRepo.get('units')).toBe('metric');
    await settingsRepo.set('units', 'imperial');
    expect((await settingsRepo.getAll()).units).toBe('imperial');
  });
});
