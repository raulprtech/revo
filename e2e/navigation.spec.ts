import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('navigating to Torneos page', async ({ page }) => {
    await page.goto('/');
    // Use header-scoped locator to avoid matching hero text
    await page.locator('header').getByRole('link', { name: 'Torneos', exact: true }).click();
    await expect(page).toHaveURL(/\/tournaments/);
    await expect(
      page.getByRole('heading', { name: /explorar torneos/i })
    ).toBeVisible();
  });

  test('navigating to Eventos page', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByRole('link', { name: 'Eventos' }).click();
    await expect(page).toHaveURL(/\/events/);
    await expect(
      page.getByRole('heading', { name: 'Eventos', exact: true })
    ).toBeVisible();
  });

  test('clicking logo returns to home', async ({ page }) => {
    await page.goto('/tournaments');
    await page.locator('header').getByText('Duels Esports').click();
    await expect(page).toHaveURL('/');
  });

  test('login link navigates to login page', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByRole('link', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('signup link navigates to signup page', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByRole('link', { name: /registrarse/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
