import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from '../id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('newId', () => {
  it('usa crypto.randomUUID quando c’è', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('funziona anche senza randomUUID (app aperta da un altro dispositivo via http)', () => {
    const real = globalThis.crypto;
    // Come in un contesto non sicuro: c'è getRandomValues, non randomUUID.
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array<ArrayBuffer>) => real.getRandomValues(a) });
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
