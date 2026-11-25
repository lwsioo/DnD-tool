import { describe, expect, it } from 'vitest';
import { SRD_DERIVE_CONTEXT } from '@/data/srd';
import { CLASS_EQUIPMENT } from '@/data/srd/classEquipment';
import { CLASSES } from '@/data/srd/classes';
import { deriveCharacter } from '@/engine/derive';
import { itemsFromEquipmentOption } from '@/features/inventory/classEquipment';
import { buildCharacterFromWizard, initialDraft, type WizardDraft } from '../logic';

const draft = (patch: Partial<WizardDraft>): WizardDraft => ({
  ...initialDraft(),
  scores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  ...patch,
});

describe('equipaggiamento iniziale di classe', () => {
  it('ogni classe SRD ha un’opzione con oggetti e una di sole monete, tutte convertibili', () => {
    for (const cl of CLASSES) {
      const options = CLASS_EQUIPMENT[cl.key]!;
      expect(options[0]!.items.length, cl.name).toBeGreaterThan(0);
      expect(options.at(-1)!.items, cl.name).toEqual([]);
      for (const o of options) {
        for (const item of itemsFromEquipmentOption(o)) expect(item.name, cl.name).toBeTruthy();
      }
    }
  });

  it('Guerriero A: cotta di maglia indossata, armi impugnate, giavellotti come un solo oggetto, 4 mo', () => {
    const c = buildCharacterFromWizard(draft({ classKey: 'fighter', classEquipment: 'A' }), 0);
    const x = deriveCharacter(c, SRD_DERIVE_CONTEXT);
    expect(x.ac.total).toBe(16);
    expect(c.inventory.items.find((i) => i.name === 'Giavellotto')).toMatchObject({
      quantity: 8,
      equipped: true,
    });
    expect(x.attacks.map((a) => a.name)).toContain('Spadone');
    expect(c.inventory.currency.gp).toBe(4);
  });

  it('Chierico A: giaco di maglia e scudo; opzione B: solo monete; «scelgo io» usa i campi manuali', () => {
    const a = buildCharacterFromWizard(draft({ classKey: 'cleric', classEquipment: 'A' }), 0);
    // 13 + DES (max 2) + scudo 2
    expect(deriveCharacter(a, SRD_DERIVE_CONTEXT).ac.total).toBe(17);

    const b = buildCharacterFromWizard(draft({ classKey: 'cleric', classEquipment: 'B', gold: 3 }), 0);
    expect(b.inventory.items).toEqual([]);
    expect(b.inventory.currency.gp).toBe(113);

    const manual = buildCharacterFromWizard(
      draft({ classKey: 'cleric', classEquipment: 'none', armorId: 'leather', weaponIds: ['mace'] }),
      0,
    );
    expect(manual.inventory.items.map((i) => i.name)).toEqual(['Cuoio', 'Mazza']);
  });
});
