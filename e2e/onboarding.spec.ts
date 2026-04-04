import { test, expect } from '@playwright/test';

test.describe('Tenant Onboarding Flow', () => {
  test('onboarding page loads with step indicators', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByText('Personal Info')).toBeVisible();
    await expect(page.getByText('Step 1 of 5')).toBeVisible();
  });

  test('personal info step has required fields', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByPlaceholder('Legal first name')).toBeVisible();
    await expect(page.getByPlaceholder('Legal last name')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  });

  test('cannot proceed without first and last name', async ({ page }) => {
    await page.goto('/onboarding');
    const continueBtn = page.getByRole('button', { name: /continue/i });
    await expect(continueBtn).toBeDisabled();

    // Fill only first name
    await page.getByPlaceholder('Legal first name').fill('John');
    await expect(continueBtn).toBeDisabled();

    // Fill last name too
    await page.getByPlaceholder('Legal last name').fill('Doe');
    await expect(continueBtn).toBeEnabled();
  });

  test('step 2 shows background check consent', async ({ page }) => {
    await page.goto('/onboarding');

    // Fill step 1
    await page.getByPlaceholder('Legal first name').fill('Jane');
    await page.getByPlaceholder('Legal last name').fill('Smith');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2
    await expect(page.getByText('Background Check')).toBeVisible();
    await expect(page.getByText(/Why do we run a background check/)).toBeVisible();
    await expect(page.getByPlaceholder('XXX-XX-XXXX')).toBeVisible();
  });
});
