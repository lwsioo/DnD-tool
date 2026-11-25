import { expect, test } from '@playwright/test';

// Un browser in inglese apre Codex in inglese; la lingua si cambia dall'app e resta scelta.
test.use({ locale: 'en-US' });

test('interfaccia in inglese e cambio lingua', async ({ page }) => {
  await page.goto('/#/benvenuto');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, adventurer' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // Esempio e regole SRD in inglese.
  await page.getByRole('button', { name: /Load example/ }).click();
  await expect(page.getByRole('heading', { name: 'Lyra Solmonte' })).toBeVisible();
  await page.getByRole('link', { name: 'Compendium' }).click();
  await expect(page.getByRole('heading', { name: 'Conditions' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Blinded' })).toBeVisible();

  // Passaggio all'italiano dalle Impostazioni: l'app si ricarica e ricorda la scelta.
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: 'Italiano' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Lingua' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Impostazioni' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Compendio' })).toBeVisible();
});
