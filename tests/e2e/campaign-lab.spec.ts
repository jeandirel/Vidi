import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('campaign brief, proof, isolated tests, CSV preview, export and local persistence', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('textbox', { name: 'Nom du produit' }).fill('Lumé');
  await page
    .getByRole('textbox', { name: 'Description du produit' })
    .fill('Un flacon rechargeable pour votre quotidien.');
  await page.getByRole('button', { name: 'Composer mon premier brouillon' }).click();
  await page.getByRole('button', { name: 'Laboratoire', exact: true }).click();
  await page.getByRole('textbox', { name: 'Marque', exact: true }).fill('Lumé Paris');
  await page.getByRole('textbox', { name: 'Ton de la marque' }).fill('Direct et chaleureux');
  await page.getByRole('textbox', { name: 'Argument à sourcer' }).fill('flacon rechargeable');
  await page
    .getByRole('textbox', { name: 'URL de la preuve' })
    .fill('https://shop.example.com/flacon');
  await page.getByRole('button', { name: 'Ajouter la source' }).click();
  await expect(
    page.getByText('1 argument(s) sourcé(s) retrouvé(s)', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: '02 Tests créatifs' }).click();
  await page
    .getByRole('textbox', { name: 'Alternative 1' })
    .fill('Découvrez le flacon rechargeable.');
  await page.getByRole('textbox', { name: 'Alternative 2' }).fill('Un autre regard sur Lumé.');
  await page.getByRole('button', { name: 'Préparer le test' }).click();
  await expect(page.locator('.lab-variant')).toHaveCount(3);
  const ids = await page.locator('.lab-variant code').allTextContents();
  await page.screenshot({ path: testInfo.outputPath('campaign-lab-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '03 Résultats' }).click();
  await page
    .getByRole('textbox', { name: 'Période et attribution' })
    .fill('1–7 octobre · clic 7 j');
  const csv = `variant_id,impressions,clicks,spend,conversions,revenue\n${ids[0]},1000,50,25,5,100\n${ids[1]},0,0,0,0,0`;
  await page
    .getByLabel('Importer les résultats CSV')
    .setInputFiles({ name: 'resultats.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByRole('region', { name: 'Aperçu des résultats' })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirmer l’import' }).click();
  await expect(page.getByRole('table')).toContainText('5 %');
  await expect(page.getByRole('table')).toContainText('4×');
  await expect(page.getByRole('table')).toContainText('—');
  await page
    .getByLabel('Importer les résultats CSV')
    .setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'variant_id,impressions,clicks,spend,conversions,revenue\nunknown,10,1,1,0,0',
      ),
    });
  await expect(page.getByRole('status')).toContainText('variante inconnue');
  await expect(page.getByRole('table')).toContainText('4×');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter le dossier' }).click();
  const download = await downloadPromise;
  const pack = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(pack.campaign.brief.name).toBe('Lumé Paris');
  expect(pack.campaign.variants).toHaveLength(3);
  expect(pack.campaign.results).toHaveLength(2);
  expect(pack.estimatedVidiCredits).toBe(3);
  expect(pack.product.image).toBeUndefined();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.reload();
  await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Mes projets', exact: true }).first().click();
  await page.getByRole('button', { name: 'Lumé 15s' }).click();
  await page.getByRole('button', { name: 'Laboratoire', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Marque', exact: true })).toHaveValue(
    'Lumé Paris',
  );
  await page.getByRole('button', { name: '02 Tests créatifs' }).click();
  await expect(page.locator('.lab-variant')).toHaveCount(3);
  await page.getByRole('button', { name: 'Utiliser dans le studio' }).nth(1).click();
  await expect(page.getByRole('textbox', { name: 'L’accroche', exact: true })).toHaveValue(
    'Découvrez le flacon rechargeable.',
  );
  expect(errors).toEqual([]);
});
test('lab stays usable without a provider and fits a mobile viewport', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
  await page.getByRole('button', { name: 'Laboratoire', exact: true }).click();
  for (const tab of ['01 Brief & preuves', '02 Tests créatifs', '03 Résultats']) {
    await page.getByRole('button', { name: tab }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await expect(page.getByRole('heading', { name: 'Pas de résultats inventés.' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('campaign-lab-mobile.png'), fullPage: true });
});
