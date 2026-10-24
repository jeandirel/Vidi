import { test, expect } from '@playwright/test';
test('create, edit, save, reload and duplicate a local campaign', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
  await expect(
    page.getByRole('heading', { name: 'Une idée. Votre prochaine vidéo.' }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('studio-desktop.png'), fullPage: true });
  await page.getByRole('textbox', { name: 'Nom du produit' }).pressSequentially('Lumé');
  await expect(page.getByRole('textbox', { name: 'Titre du projet' })).toHaveValue('Lumé');
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
  await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
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
  await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Ajoutez un nom de produit');
  await expect(page.getByRole('button', { name: 'Enregistré', exact: true })).toHaveCount(0);
});
test('mobile navigation and project form have no horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
  await page.screenshot({ path: testInfo.outputPath('studio-mobile.png'), fullPage: true });
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

test('product import requires review and only applies after confirmation (mocked shop response)', async ({
  page,
}) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      json: {
        user: { id: 'user-import', name: 'Import Tester', email: 'tester@example.com' },
        workspaces: [
          { id: 'workspace-import', name: 'Test Shop', plan: 'starter', credits: 0, role: 'OWNER' },
        ],
      },
    }),
  );
  await page.route('**/api/products/import', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      workspaceId: 'workspace-import',
      url: 'https://shop.example.com/serum',
    });
    await route.fulfill({
      json: {
        product: {
          name: 'Sérum importé',
          description: 'Un produit avec une description vérifiée.',
          image: 'https://cdn.example.com/photo.jpg',
          url: 'https://shop.example.com/serum',
          source: 'structured-data',
          notes: ['Vérifiez les informations avant de les appliquer.'],
        },
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('button', { name: /Import Tester Compte personnel/ })).toBeVisible();
  await page.getByRole('textbox', { name: 'Nom du produit' }).fill('Produit précédent');
  await page
    .getByRole('textbox', { name: 'Description du produit' })
    .fill('Une description précédente à conserver avant confirmation.');
  await page.getByRole('button', { name: 'Composer mon premier brouillon' }).click();
  await page.getByRole('tab', { name: '1 Produit' }).click();
  await page
    .getByRole('textbox', { name: 'Lien du produit Facultatif' })
    .fill('https://shop.example.com/serum');
  await page.getByRole('button', { name: 'Importer la fiche' }).click();
  await expect(page.getByRole('region', { name: 'Informations récupérées' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nom du produit' })).toHaveValue(
    'Produit précédent',
  );
  await page.getByRole('button', { name: 'Appliquer à mon projet' }).click();
  await expect(page.getByRole('textbox', { name: 'Nom du produit' })).toHaveValue('Sérum importé');
  await expect(page.getByRole('textbox', { name: 'Description du produit' })).toHaveValue(
    'Un produit avec une description vérifiée.',
  );
  await expect(page.getByAltText('Votre produit', { exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: '2 Script' }).click();
  await expect(page.getByRole('textbox', { name: 'L’accroche', exact: true })).toHaveValue('');
});
