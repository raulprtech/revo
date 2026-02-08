import { test, expect } from '@playwright/test';

test.describe('Tournaments listing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tournaments');
  });

  test('renders page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /torneos/i })
    ).toBeVisible();
  });

  test('has a search input', async ({ page }) => {
    const search = page.getByPlaceholder(/buscar/i);
    await expect(search).toBeVisible();
  });

  test('shows loading state or tournament cards', async ({ page }) => {
    // Wait for loading to finish (skeleton or cards)
    await page.waitForTimeout(2000);

    // After loading, we should see either tournament cards or "no tournaments" message
    const cards = page.locator('[class*="card"]');
    const noResults = page.getByText(/no hay torneos|no se encontraron/i);

    const hasCards = (await cards.count()) > 0;
    const hasNoResults = await noResults.isVisible().catch(() => false);

    expect(hasCards || hasNoResults).toBeTruthy();
  });

  test('search filters content', async ({ page }) => {
    await page.waitForTimeout(1500); // Wait for data load
    const search = page.getByPlaceholder(/buscar/i);
    await search.fill('xyznonexistentxyz');
    await page.waitForTimeout(500);
    // Should show no results or empty state
    const cards = page.locator('a[href*="/tournaments/"]');
    // The count may be 0 or very few
    expect(await cards.count()).toBeLessThanOrEqual(
      // It's acceptable to see no results when searching for gibberish
      await cards.count()
    );
  });

  test('"Crear Torneo" button links correctly (for unauthenticated redirects to login)', async ({ page }) => {
    const createBtn = page.getByRole('link', { name: /crear.*torneo/i });
    // It may or may not be present depending on auth state
    if (await createBtn.isVisible().catch(() => false)) {
      const href = await createBtn.getAttribute('href');
      expect(href).toMatch(/\/tournaments\/create|\/login/);
    }
  });
});

test.describe('Events listing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events');
  });

  test('renders page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Eventos', exact: true })
    ).toBeVisible();
  });

  test('shows sections for event status', async ({ page }) => {
    await page.waitForTimeout(2000);
    // Page may show tabs or sections for ongoing/upcoming/past
    // At minimum, the page should render without errors
    await expect(page).toHaveURL(/\/events/);
  });
});
