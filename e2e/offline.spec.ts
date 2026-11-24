import { expect, test } from '@playwright/test';

// Qui il service worker serve: è lui a rendere l'app disponibile senza rete.
test.use({ serviceWorkers: 'allow' });

test('dopo il primo avvio l’app si apre e salva anche offline', async ({ page, context }) => {
  await page.goto('/#/benvenuto');
  await expect(page.getByRole('heading', { name: 'Benvenuto, avventuriero' })).toBeVisible();
  await page.getByRole('button', { name: 'Salta', exact: true }).click();
  // Attende che il service worker abbia messo in cache l'app e controlli la pagina.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Benvenuto, avventuriero' })).toBeVisible();
  // La visita, già saltata, non si ripresenta.
  await expect(page.getByRole('dialog', { name: 'Visita guidata' })).toHaveCount(0);

  // Senza rete si crea un personaggio dal wizard (pagina caricata su richiesta, quindi dalla cache) e si salva.
  await page.getByRole('button', { name: /Crea nuovo personaggio/ }).click();
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Offlina');
  await page.getByRole('button', { name: '7. Riepilogo' }).click();
  await page.getByRole('button', { name: 'Crea personaggio' }).click();
  await expect(page.getByRole('heading', { name: 'Offlina' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Offlina' })).toBeVisible();
});
