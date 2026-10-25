import { test, expect } from '@playwright/test';
import { emptyProject } from '../../apps/web/lib/drafts';
const project = (id: string, title: string) => ({
  id,
  revision: 2,
  updatedAt: '2026-10-25T10:00:00Z',
  data: {
    ...emptyProject,
    title,
    product: { ...emptyProject.product, name: 'Lumé', description: 'Un flacon rechargeable.' },
    script: { hook: 'Découvrez Lumé.', body: 'Un flacon rechargeable.', cta: 'Voir le produit.' },
  },
});
for (const role of ['OWNER', 'VIEWER']) {
  test(`cloud project browsing and permissions for ${role} (mocked API)`, async ({ page }) => {
    const first = project('p1', 'Lumé première');
    const second = project('p2', 'Lumé seconde');
    let archiveAttempts = 0;
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        json: {
          user: { id: 'test-user', name: 'Cloud Tester', email: 'test@example.test' },
          workspaces: [
            { id: 'workspace-cloud', name: 'Test Cloud', role, plan: 'starter', credits: 0 },
          ],
        },
      }),
    );
    await page.route('**/api/projects?*', async (route) => {
      const params = new URL(route.request().url()).searchParams;
      expect(params.get('workspaceId')).toBe('workspace-cloud');
      if (params.has('cursor')) {
        expect(params.get('cursor')).toBe('p1');
        expect(params.get('q')).toBe(''); // unsubmitted input cannot alter pagination
        await route.fulfill({ json: { projects: [second], nextCursor: null } });
      } else if (params.get('q')) {
        expect(params.get('q')).toBe('Lumé');
        await route.fulfill({ json: { projects: [first], nextCursor: null } });
      } else await route.fulfill({ json: { projects: [first], nextCursor: 'p1' } });
    });
    await page.route('**/api/projects/p1', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      archiveAttempts++;
      await route.fulfill(
        archiveAttempts === 1
          ? { status: 409, json: { error: 'Attendez la fin des rendus.' } }
          : { json: { ok: true } },
      );
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Cloud Tester Compte personnel/ })).toBeVisible();
    await page.getByRole('button', { name: 'Mes projets', exact: true }).first().click();
    const cloud = page.getByRole('region', { name: 'Projets cloud' });
    await expect(cloud.getByRole('button', { name: 'Ouvrir Lumé première' })).toBeVisible();
    await cloud.getByRole('textbox', { name: 'Rechercher dans le cloud' }).fill('Never submitted');
    await cloud.getByRole('button', { name: 'Charger plus de projets' }).click();
    await expect(cloud.getByRole('button', { name: 'Ouvrir Lumé seconde' })).toBeVisible();
    await cloud.getByRole('textbox', { name: 'Rechercher dans le cloud' }).fill('Lumé');
    await cloud.getByRole('button', { name: 'Rechercher', exact: true }).click();
    await expect(cloud.getByRole('button', { name: 'Ouvrir Lumé seconde' })).toHaveCount(0);
    if (role === 'VIEWER') {
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expect(cloud.getByRole('button', { name: /Archiver/ })).toHaveCount(0);
      await cloud.getByRole('button', { name: 'Ouvrir Lumé première' }).click();
      await expect(page.getByRole('textbox', { name: 'Titre du projet' })).toHaveValue(
        'Lumé première',
      );
    } else {
      await cloud.getByRole('button', { name: 'Archiver Lumé première' }).click();
      await cloud.getByRole('button', { name: 'Annuler', exact: true }).click();
      expect(archiveAttempts).toBe(0);
      await cloud.getByRole('button', { name: 'Archiver Lumé première' }).click();
      await cloud.getByRole('button', { name: 'Confirmer l’archivage', exact: true }).click();
      await expect(page.getByText('Attendez la fin des rendus.', { exact: true })).toBeVisible();
      await expect(cloud.getByRole('button', { name: 'Ouvrir Lumé première' })).toBeVisible();
      await cloud.getByRole('button', { name: 'Confirmer l’archivage', exact: true }).click();
      await expect(cloud.getByText('Aucun projet cloud trouvé.')).toBeVisible();
      expect(archiveAttempts).toBe(2);
    }
  });
}
