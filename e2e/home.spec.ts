import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads and shows hero section', async ({ page }) => {
    await page.goto('/');
    // Hero headline
    await expect(
      page.getByRole('heading', { name: /gestión de torneos/i })
    ).toBeVisible();
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');

    // Header brand (first match since it also appears in footer)
    await expect(page.getByText('Duels Esports').first()).toBeVisible();

    // Nav links in header — use exact to avoid matching hero CTA text
    await expect(page.getByRole('link', { name: 'Eventos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Torneos', exact: true })).toBeVisible();
  });

  test('shows "Crear un Torneo" CTA button', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /crear un torneo/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/tournaments/create');
  });

  test('has login and signup buttons when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: /iniciar sesión/i })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /registrarse/i })
    ).toBeVisible();
  });
});
