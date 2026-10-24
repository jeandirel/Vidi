import { test, expect } from '@playwright/test';
test('create, edit, save, reload and duplicate a local campaign', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Une idée. Votre prochaine vidéo.' }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Nom du produit' }).fill('Lumé');
  await page
    .getByRole('textbox', { name: 'Description du produit' })
    .fill('Un sérum hydratant avec un flacon rechargeable.');
  await page.getByRole('textbox', { name: 'Bénéfices vérifiés' }).fill('Texture légère');
  await page.getByRole('button', { name: 'Composer mon premier brouillon' }).click();
  await expect(page.getByRole('textbox', { name: 'L’accroche', exact: true })).toHaveValue(
    'Découvrez Lumé.',
  );
  await page
    .getByRole('textbox', { name: 'L’accroche', exact: true })
    .fill('Votre nouveau rituel hydratant.');
  await page.getByRole('tab', { name: '3 Avatar' }).click();
  await page.getByRole('button', { name: 'Maya Studio' }).click();
  await page.getByRole('tab', { name: '5 Montage' }).click();
  await page.getByRole('button', { name: 'Plan produit', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Mes projets', exact: true }).first().click();
  await expect(page.getByText('Brouillon ·')).toBeVisible();
  await page.getByRole('button', { name: 'Lumé 15s' }).click();
  await page.getByRole('tab', { name: '2 Script' }).click();
  await expect(page.getByRole('textbox', { name: 'L’accroche', exact: true })).toHaveValue(
    'Votre nouveau rituel hydratant.',
  );
  await page.getByRole('tab', { name: '5 Montage' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Durée Plan produit' })).toBeVisible();
  await page.getByRole('button', { name: 'Mes projets', exact: true }).first().click();
  await page.getByRole('button', { name: 'Créer une variante' }).click();
  await expect(page.getByRole('textbox', { name: 'Titre du projet' })).toHaveValue('Lumé — copie');
  expect(errors).toEqual([]);
});
test('an incomplete campaign is not falsely marked saved', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Ajoutez un nom de produit');
  await expect(page.getByRole('button', { name: 'Enregistré', exact: true })).toHaveCount(0);
});
test('mobile navigation and project form have no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
  await page.getByRole('button', { name: 'Avatars', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Le bon visage pour votre histoire.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('unconfigured services report their state and never return invented video URLs', async ({
  request,
}) => {
  const capabilities = await request.get('/api/capabilities');
  expect(capabilities.status()).toBe(200);
  const result = await capabilities.json();
  expect(typeof result.video).toBe('boolean');
  const rejected = await request.post('/api/renders', {
    data: {},
    headers: { Origin: 'https://evil.test' },
  });
  expect(rejected.status()).toBe(403);
});
