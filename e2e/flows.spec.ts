import { expect, test, type Page } from '@playwright/test';

/** Carica la Paladina di esempio dalla schermata di benvenuto e attende la scheda. */
async function loadExample(page: Page) {
  await page.goto('/#/benvenuto');
  // Primo avvio: compare la visita guidata, la si salta.
  await page.getByRole('button', { name: 'Salta', exact: true }).click();
  await page.getByRole('button', { name: /Carica esempio/ }).click();
  await expect(page.getByRole('heading', { name: 'Lyra Solmonte' })).toBeVisible();
}

const vitals = (page: Page) => page.getByRole('region', { name: 'Vitali' });

test('esempio → danno e cura → riposo lungo', async ({ page }) => {
  await loadExample(page);
  const hp = vitals(page).getByRole('region', { name: 'Punti ferita' });
  await expect(hp.getByLabel('34 su 34 punti ferita, 0 temporanei')).toBeVisible();

  await hp.getByRole('button', { name: 'Danno' }).click();
  await hp.getByRole('textbox', { name: 'Danni subiti' }).fill('20');
  await page.keyboard.press('Enter');
  await expect(hp.getByLabel('14 su 34 punti ferita, 0 temporanei')).toBeVisible();

  await hp.getByRole('button', { name: 'Cura' }).click();
  await hp.getByRole('textbox', { name: 'PF recuperati' }).fill('5');
  await page.keyboard.press('Enter');
  await expect(hp.getByLabel('19 su 34 punti ferita, 0 temporanei')).toBeVisible();

  await vitals(page)
    .getByRole('button', { name: /Riposo Lungo/ })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Riposo Lungo' });
  await expect(dialog).toContainText('Recuperi 15 PF');
  await dialog.getByRole('button', { name: 'Completa il riposo' }).click();
  await expect(hp.getByLabel('34 su 34 punti ferita, 0 temporanei')).toBeVisible();

  // Tutto è salvato: dopo un ricaricamento i valori restano.
  await page.reload();
  await expect(vitals(page).getByLabel('34 su 34 punti ferita, 0 temporanei')).toBeVisible();
});

test('togliere lo scudo abbassa la CA e cambia il badge di Furtività con l’armatura', async ({ page }) => {
  await loadExample(page);
  await expect(vitals(page).getByLabel('Classe Armatura 19')).toBeVisible();
  await vitals(page).getByRole('switch', { name: 'Scudo' }).click();
  await expect(vitals(page).getByLabel('Classe Armatura 17')).toBeVisible();

  const stealth = page
    .getByRole('region', { name: 'Abilità' })
    .getByRole('listitem')
    .filter({ hasText: 'Furtività' });
  await expect(stealth.getByText('SVANT')).toBeVisible();
  await vitals(page).getByRole('switch', { name: 'Cotta di Maglia' }).click();
  await expect(stealth.getByText('SVANT')).toHaveCount(0);
});

test('wiki: nuovo collegamento con autocompletamento e backlink', async ({ page }) => {
  await loadExample(page);
  await page.getByRole('link', { name: 'Campagna Wiki' }).click();
  await page.getByRole('link', { name: /Religioni/ }).click();
  await page.getByRole('list', { name: 'Voci: Religioni' }).getByRole('link', { name: 'Aurelia' }).click();
  await page.getByRole('button', { name: 'Modifica' }).click();

  const editor = page.getByRole('textbox', { name: 'Testo della voce' });
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n\nProtettrice di [[Mir');
  // CodeMirror ignora l'Invio nei primi istanti dopo l'apertura dei suggerimenti: si sceglie col clic.
  await page.getByRole('option', { name: /Mirella Corvonero/ }).click();
  await expect(editor).toContainText('[[Mirella Corvonero]]');
  await page.getByRole('button', { name: 'Fine' }).click();

  await page.getByRole('article').getByRole('button', { name: 'Mirella Corvonero' }).click();
  const drawer = page.getByRole('complementary', { name: 'Pannello dettagli' });
  await drawer.getByRole('button', { name: 'Apri nella wiki' }).click();
  await expect(
    page.getByRole('region', { name: 'Menzionato in' }).getByRole('button', { name: /Aurelia/ }),
  ).toBeVisible();
});

test('grimorio: import di incantesimi da file 5etools', async ({ page }) => {
  await loadExample(page);
  await page.getByRole('link', { name: 'Grimorio' }).click();
  await page.getByRole('region', { name: 'Incantatore' }).getByRole('button', { name: 'Importa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Importa incantesimi (5etools)' });
  await dialog.getByLabel('File di incantesimi').setInputFiles({
    name: 'spells.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        spell: [
          {
            name: 'Radiant Spark',
            level: 0,
            school: 'V',
            time: [{ number: 1, unit: 'action' }],
            range: { type: 'point', distance: { type: 'feet', amount: 60 } },
            components: { v: true, s: true },
            duration: [{ type: 'instant' }],
            entries: ['A mote of light deals {@damage 1d8} radiant damage.'],
            scalingLevelDice: { label: 'radiant', scaling: { 1: '1d8', 5: '2d8', 11: '3d8', 17: '4d8' } },
          },
        ],
      }),
    ),
  });
  await dialog.getByRole('button', { name: 'Importa 1' }).click();
  const cantrips = page.getByRole('region', { name: 'Trucchetti' });
  await cantrips.getByRole('button', { name: 'Radiant Spark', exact: true }).click();
  const drawer = page.getByRole('complementary', { name: 'Pannello dettagli' });
  await expect(drawer).toContainText('A mote of light deals 1d8 radiant damage.');
});

test('export e import di un personaggio tra due browser', async ({ page, browser }) => {
  await loadExample(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^codex-lyra-solmonte-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();

  // Un secondo contesto ha un archivio vuoto, come un altro dispositivo.
  const other = await browser.newContext({ serviceWorkers: 'block' });
  const page2 = await other.newPage();
  await page2.goto('/#/benvenuto');
  await page2.getByRole('button', { name: 'Salta', exact: true }).click();
  await page2.getByRole('button', { name: /Importa da JSON/ }).click();
  const dialog = page2.getByRole('dialog', { name: 'Importa da file JSON' });
  await dialog.getByLabel('File da importare').setInputFiles(path);
  await expect(dialog).toContainText('5 incantesimi: 5 nuovi');
  await dialog.getByRole('button', { name: 'Importa' }).click();
  await expect(page2.getByRole('heading', { name: 'Lyra Solmonte' })).toBeVisible();
  await expect(page2.getByRole('region', { name: 'Vitali' }).getByLabel('Classe Armatura 19')).toBeVisible();
  await other.close();
});

test('ricerca globale: Ctrl+K e anteprima nel pannello', async ({ page }) => {
  await loadExample(page);
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Cerca' });
  await palette.getByRole('combobox').fill('avvel');
  await expect(palette.getByRole('option').first()).toContainText('Avvelenato');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary', { name: 'Pannello dettagli' })).toContainText(
    'Condizione · Poisoned',
  );
});
