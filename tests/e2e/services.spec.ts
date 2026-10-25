import { test, expect } from '@playwright/test';
test('connect a public catalog, inspect real-shaped data, confirm product replacement and save provenance (mocked APIs)', async ({
  page,
}, testInfo) => {
  let connected = false;
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      json: {
        user: { id: 'u', name: 'Service tester', email: 'services@example.test' },
        workspaces: [{ id: 'ws', name: 'Shop', plan: 'pro', credits: 0, role: 'OWNER' }],
      },
    }),
  );
  await page.route('**/api/capabilities*', (route) =>
    route.fulfill({
      json: {
        database: true,
        storage: false,
        scripts: false,
        video: false,
        billing: false,
        trends: false,
        ecommerce: connected,
        voiceCloning: false,
        guestScripts: false,
      },
    }),
  );
  await page.route('**/api/connections*', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toMatchObject({
        workspaceId: 'ws',
        provider: 'woocommerce',
        url: 'https://shop.example.com',
      });
      connected = true;
      await route.fulfill({ json: { ok: true } });
    } else
      await route.fulfill({
        json: {
          connections: connected
            ? [
                {
                  id: 'conn',
                  provider: 'woocommerce',
                  config: { url: 'https://shop.example.com' },
                  checkedAt: new Date().toISOString(),
                },
              ]
            : [],
        },
      });
  });
  await page.route('**/api/voices*', (route) =>
    route.fulfill({ json: { profiles: [], generations: [] } }),
  );
  await page.route('**/api/assets?*', (route) => route.fulfill({ json: { assets: [] } }));
  await page.route('**/api/workspaces/*/members', (route) =>
    route.fulfill({ json: { members: [] } }),
  );
  await page.route('**/api/commerce?*', (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: '42',
            name: 'Flacon boutique',
            description: 'Un flacon rechargeable fourni par le catalogue.',
            url: 'https://shop.example.com/flacon',
            image: '',
            price: '12.50',
            currency: 'EUR',
          },
        ],
        cursor: null,
      },
    }),
  );
  await page.goto('/');
  await expect(page.locator('.app')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Mon espace', exact: true }).first().click();
  const panel = page.getByRole('region', { name: 'Connexions boutiques et tendances' });
  await panel.getByRole('combobox', { name: 'Service', exact: true }).selectOption('woocommerce');
  await panel.getByLabel('Adresse de la boutique').fill('https://shop.example.com');
  await panel.getByRole('button', { name: 'Vérifier et connecter' }).click();
  await expect(panel.getByText('woocommerce', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Catalogue', exact: true }).click();
  await panel.getByRole('combobox', { name: 'Boutique', exact: true }).selectOption('woocommerce');
  await panel.getByRole('button', { name: 'Charger les produits' }).click();
  await panel.getByRole('button', { name: /Flacon boutique/ }).click();
  const apply = panel.getByRole('button', { name: 'Utiliser ce produit dans le studio' });
  await expect(apply).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('services-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await panel.getByRole('checkbox', { name: /J’ai vérifié cette fiche/ }).check();
  await apply.click();
  await expect(page.getByRole('textbox', { name: 'Nom du produit' })).toHaveValue(
    'Flacon boutique',
  );
  await page.getByRole('button', { name: 'Composer mon premier brouillon' }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  const drafts = await page.evaluate(() => JSON.parse(localStorage.getItem('vidi:drafts:v1')!));
  expect(drafts[0].data.product.commerce).toMatchObject({
    provider: 'woocommerce',
    externalId: '42',
    price: '12.50',
    currency: 'EUR',
  });
});
