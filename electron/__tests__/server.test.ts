// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { startServer, resolveFile, lanAddresses } = require('../server.cjs') as {
  startServer: (o: {
    root: string;
    host?: string;
    port?: number;
  }) => Promise<{ port: number; stop: () => Promise<void> }>;
  resolveFile: (root: string, url: string) => { file: string; pathname: string } | null;
  lanAddresses: () => Array<{ name: string; address: string }>;
};

let root: string;
let server: { port: number; stop: () => Promise<void> };
const url = (p: string) => `http://127.0.0.1:${server.port}${p}`;

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'codex-dist-'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>Codex</title>');
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'assets', 'app.js'), 'console.log(1)');
  writeFileSync(join(root, 'sw.js'), '// sw');
  server = await startServer({ root, port: 0 });
});

afterAll(async () => {
  await server.stop();
  rmSync(root, { recursive: true, force: true });
});

describe('server statico dell’app desktop', () => {
  it('serve index.html per la radice e i file con il tipo giusto', async () => {
    const home = await fetch(url('/'));
    expect(home.status).toBe(200);
    expect(home.headers.get('content-type')).toContain('text/html');
    expect(await home.text()).toContain('Codex');

    const js = await fetch(url('/assets/app.js'));
    expect(js.headers.get('content-type')).toContain('text/javascript');
    expect(js.headers.get('cache-control')).toContain('immutable');
    expect((await fetch(url('/sw.js'))).headers.get('cache-control')).toBe('no-cache');
  });

  it('percorsi sconosciuti senza estensione mostrano l’app, file mancanti danno 404', async () => {
    expect(await (await fetch(url('/pg/abc/scheda'))).text()).toContain('Codex');
    expect((await fetch(url('/assets/manca.js'))).status).toBe(404);
  });

  it('non esce dalla cartella dell’app', () => {
    // "/../x" viene già normalizzato in "/x" (resta dentro la cartella); lo slash codificato no.
    expect(resolveFile(root, '/../segreto.txt')?.pathname).toBe('/segreto.txt');
    expect(resolveFile(root, '/..%2f..%2fsegreto.txt')).toBeNull();
    expect(resolveFile(root, '/%2e%2e%5csegreto.txt')).toBeNull();
    expect(resolveFile(root, '/assets/app.js')?.pathname).toBe('/assets/app.js');
  });

  it('porta già occupata: errore leggibile', async () => {
    await expect(startServer({ root, port: server.port })).rejects.toThrow(/già usata/);
  });

  it('elenca solo indirizzi IPv4 di rete', () => {
    for (const a of lanAddresses()) expect(a.address).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  });
});
