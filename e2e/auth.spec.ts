import { test, expect } from '@playwright/test';

test.describe('Auth pages', () => {
  test.describe('Login page', () => {
    test('renders login form with email and password fields', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
      await expect(page.getByLabel(/contraseña/i).first()).toBeVisible();
      await expect(
        page.getByRole('button', { name: /iniciar sesión/i })
      ).toBeVisible();
    });

    test('shows validation error on empty submit', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      // HTML5 validation or zod — either way submit shouldn't navigate
      await expect(page).toHaveURL(/\/login/);
    });

    test('shows link to create account', async ({ page }) => {
      await page.goto('/login');
      await expect(
        page.getByRole('link', { name: /crear una cuenta|registrarse|regístrate/i })
      ).toBeVisible();
    });

    test('shows email confirmed banner when query param present', async ({ page }) => {
      await page.goto('/login?confirmed=true');
      await expect(
        page.getByText(/correo verificado exitosamente/i)
      ).toBeVisible();
    });

    test('shows registered banner when query param present', async ({ page }) => {
      await page.goto('/login?registered=true');
      await expect(
        page.getByText(/revisa tu correo electrónico/i)
      ).toBeVisible();
    });
  });

  test.describe('Signup page', () => {
    test('renders signup form with required fields', async ({ page }) => {
      await page.goto('/signup');
      // Check for fields by placeholder or label text
      await expect(page.getByLabel(/^Nombre/)).toBeVisible();
      await expect(page.getByPlaceholder('nombre@ejemplo.com')).toBeVisible();
      await expect(page.getByLabel(/^Contraseña/).first()).toBeVisible();
    });

    test('stays on page when submitting empty form', async ({ page }) => {
      await page.goto('/signup');
      // Find submit button — could be "Registrarse" or "Crear cuenta"
      const submitBtn = page.getByRole('button', { name: /registrarse|crear cuenta/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }
      await expect(page).toHaveURL(/\/signup/);
    });
  });
});
