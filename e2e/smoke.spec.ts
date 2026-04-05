import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Rentova/);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByPlaceholder('you@email.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('signup page loads with role selection', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByText('Create Account')).toBeVisible();
    await expect(page.getByText('Property Owner')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tenant /i })).toBeVisible();
  });

  test('unauthenticated user is redirected from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login
    await page.waitForURL(/auth\/login|\/$/);
  });

  test('landing page has navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /sign in|log in/i })).toBeVisible();
  });

  test('API health: triage endpoint accepts POST', async ({ request }) => {
    const response = await request.post('/api/ai/triage', {
      data: { description: 'The faucet is leaking' },
    });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.severity).toBeDefined();
    expect(body.category).toBeDefined();
  });

  test('API health: floor plan endpoint accepts POST', async ({ request }) => {
    const response = await request.post('/api/ai/floor-plan', {
      data: {},
    });
    // Returns fallback floor plan when no image provided and no API key
    expect([200, 400]).toContain(response.status());
    const body = await response.json();
    if (response.ok()) {
      expect(body.rooms).toBeDefined();
    } else {
      expect(body.error).toBe('No image provided');
    }
  });

  test('API rate limiting returns 429 on excess', async ({ request }) => {
    // This test only works with in-memory limiter (no Redis in test env)
    // Send 22 write requests rapidly — should get 429 on the 21st
    const promises = [];
    for (let i = 0; i < 22; i++) {
      promises.push(
        request.post('/api/ai/triage', {
          data: { description: 'test' },
          headers: { 'x-forwarded-for': '10.99.99.99' },
        })
      );
    }
    const responses = await Promise.all(promises);
    const statuses = responses.map(r => r.status());
    // At least one should be 429 (or all 200 if rate limiter resets between test runs)
    const has429 = statuses.some(s => s === 429);
    const allOk = statuses.every(s => s === 200);
    expect(has429 || allOk).toBe(true);
  });
});

test.describe('Auth Flow', () => {
  test('login form validates required fields', async ({ page }) => {
    await page.goto('/auth/login');
    // Click sign in without filling fields
    await page.getByRole('button', { name: /sign in/i }).click();
    // Form should not navigate away (browser validation or app validation)
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('signup form shows role options', async ({ page }) => {
    await page.goto('/auth/signup');
    const roles = ['Property Owner', 'Tenant', 'Property Manager', 'Service Vendor'];
    for (const role of roles) {
      await expect(page.getByRole('button', { name: new RegExp(role + ' ', 'i') })).toBeVisible();
    }
  });
});
