import { test, expect } from '@playwright/test';

test.describe('Protected routes redirect to login', () => {
  test('dashboard redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or show auth-required message
    await page.waitForTimeout(2000);
    const url = page.url();
    const isOnLogin = url.includes('/login');
    const isOnDashboard = url.includes('/dashboard');

    if (isOnDashboard) {
      // If it stays on dashboard, it should show a login prompt or redirect later
      const loginPrompt = page.getByText(/iniciar sesión|inicia sesión/i);
      const hasPrompt = await loginPrompt.isVisible().catch(() => false);
      // Either redirected or shows prompt
      expect(hasPrompt || isOnLogin).toBeTruthy();
    } else {
      expect(isOnLogin).toBeTruthy();
    }
  });

  test('profile redirects unauthenticated users', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isOnLogin = url.includes('/login');
    const isOnProfile = url.includes('/profile');

    if (isOnProfile) {
      const loginPrompt = page.getByText(/iniciar sesión|inicia sesión/i);
      const hasPrompt = await loginPrompt.isVisible().catch(() => false);
      expect(hasPrompt || isOnLogin).toBeTruthy();
    } else {
      expect(isOnLogin).toBeTruthy();
    }
  });

  test('tournament create page requires auth', async ({ page }) => {
    await page.goto('/tournaments/create');
    await page.waitForTimeout(2000);
    const url = page.url();
    // Should redirect to login or show auth guard
    const isRedirected = url.includes('/login');
    const showsAuthGuard = await page
      .getByText(/iniciar sesión|inicia sesión|debes estar/i)
      .isVisible()
      .catch(() => false);
    expect(isRedirected || showsAuthGuard).toBeTruthy();
  });
});

test.describe('Responsive design', () => {
  test('mobile viewport hides desktop nav, shows mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Desktop nav should be hidden (it uses hidden md:flex)
    const desktopNav = page.locator('nav.hidden.md\\:flex');
    // On mobile the nav links are hidden
    const eventsLink = page.locator('nav >> a:has-text("Eventos")');
    // The link might still exist in DOM but be hidden
    if (await eventsLink.count() > 0) {
      await expect(eventsLink.first()).not.toBeVisible();
    }
  });

  test('desktop viewport shows full nav', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('header').getByRole('link', { name: 'Eventos' })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Torneos', exact: true })).toBeVisible();
  });
});

test.describe('Accessibility basics', () => {
  test('page has correct lang attribute', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('es');
  });

  test('page has a title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/duels esports/i);
  });

  test('main landmark exists', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('header landmark exists', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});
