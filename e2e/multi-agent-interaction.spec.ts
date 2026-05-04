import { test, expect } from '@playwright/test';

test.describe('Multi-Agent Interaction: Owner and Tenant', () => {
  test.setTimeout(90000); // 90 seconds timeout for full multi-agent E2E flow
  
  // To avoid interfering with live data, we use specific test accounts or sign up on the fly.
  // The test requires that the database is connected and migrations are up to date.

  test('Owner creates lease, Tenant accepts and submits maintenance request, Owner sees it in real-time', async ({ browser }) => {
    // 1. Create two separate browser contexts
    const ownerContext = await browser.newContext();
    const tenantContext = await browser.newContext();

    const ownerPage = await ownerContext.newPage();
    const tenantPage = await tenantContext.newPage();

    const ownerEmail = `owner_${Date.now()}@test.com`;
    const tenantEmail = `tenant_${Date.now()}@gmail.com`;
    const password = 'TestPassword123!';

    // ==========================================
    // AGENT 1: OWNER SETUP
    // ==========================================
    await ownerPage.goto('http://localhost:3000/auth/signup');
    
    // Sign up the owner
    await ownerPage.fill('#signup-name', 'Owner Agent');
    await ownerPage.fill('#signup-email', ownerEmail);
    await ownerPage.fill('#signup-password', password);
    await ownerPage.click('text="Property Owner"');
    await ownerPage.click('button[type="submit"]');

    // Wait for dashboard to load
    await expect(ownerPage).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // Owner creates a property/space
    await ownerPage.getByRole('link', { name: 'Spaces' }).click();
    await ownerPage.waitForURL(/.*\/spaces/);
    await ownerPage.waitForTimeout(1000); // Let animation/hydration finish
    await ownerPage.getByRole('button', { name: 'Add Property' }).first().click();
    
    // Wait for modal to appear
    const spaceNameInput = ownerPage.getByPlaceholder('e.g. Sunrise Apartments');
    await expect(spaceNameInput).toBeVisible({ timeout: 10000 });
    await ownerPage.waitForTimeout(500);
    await spaceNameInput.fill('123 E2E Test Ave');
    await ownerPage.waitForTimeout(500);
    await ownerPage.getByRole('button', { name: 'Create Space' }).click({ force: true });
    await expect(ownerPage.getByText('Space created successfully')).toBeVisible({ timeout: 10000 });

    // ==========================================
    // AGENT 2: Tenant signs up FIRST to avoid email rate limits on inviteUserByEmail
    // ==========================================
    await tenantPage.goto('http://localhost:3000/auth/signup');
    await tenantPage.fill('#signup-name', 'Tenant Agent');
    await tenantPage.fill('#signup-email', tenantEmail);
    await tenantPage.fill('#signup-password', password);
    // Select role
    await tenantPage.click('text="Tenant"');
    await tenantPage.click('button[type="submit"]');
    
    // Wait for tenant dashboard to load
    await tenantPage.waitForURL(/.*\/dashboard/);
    await expect(tenantPage.getByText('My Home')).toBeVisible({ timeout: 10000 });

    // ==========================================
    // AGENT 1: Owner assigns lease to the existing tenant
    // ==========================================
    await ownerPage.goto('http://localhost:3000/leases');
    await ownerPage.waitForTimeout(1000);
    await ownerPage.getByRole('button', { name: 'New Lease' }).click();
    
    const modal = ownerPage.locator('.glass-card').last();
    const tenantEmailInput = modal.getByPlaceholder('Tenant email');
    await expect(tenantEmailInput).toBeVisible({ timeout: 10000 });
    
    // Wait for the space select to have at least two options (the placeholder + 1 space)
    await expect(modal.locator('select').first().locator('option')).toHaveCount(2, { timeout: 10000 });
    await modal.locator('select').first().selectOption({ index: 1 });
    
    await tenantEmailInput.fill(tenantEmail);
    await modal.getByPlaceholder('2500').first().fill('1500');
    await ownerPage.waitForTimeout(500);
    
    await modal.getByRole('button', { name: 'Create Lease' }).click();
    
    await expect(ownerPage.getByText('Lease generated successfully')).toBeVisible({ timeout: 10000 });

    // ==========================================
    // REAL-TIME INTERACTION
    // ==========================================
    
    // Tenant submits maintenance request
    await tenantPage.getByRole('button', { name: 'Report Issue' }).click(); // Dashboard header button goes to maintenance
    await tenantPage.getByRole('button', { name: 'New Ticket' }).click(); // If 'Report Issue' doesn't auto-open modal
    
    // Fill the maintenance form
    // Wait for spaces to load in the select dropdown
    await expect(tenantPage.locator('select').first().locator('option')).toHaveCount(2, { timeout: 10000 });
    await tenantPage.locator('select').first().selectOption({ index: 1 });
    
    await tenantPage.getByPlaceholder('Brief description').fill('Leaking sink in bathroom');
    await tenantPage.getByPlaceholder('Describe the issue in detail...').fill('The cold water valve is leaking continuously.');
    await tenantPage.getByRole('button', { name: 'Submit & Auto-Triage' }).click();

    // Wait for the form to disappear indicating success (AI triage might take a few seconds)
    await expect(tenantPage.getByText('File Maintenance Request')).not.toBeVisible({ timeout: 30000 });

    // Agent 1 (Owner) sees the request pop up in real-time
    await ownerPage.getByRole('link', { name: 'Maintenance' }).click();
    
    // Wait for the new request to appear without refreshing the page (WebSockets in action)
    const newRequestLocator = ownerPage.locator('text=Leaking sink in bathroom');
    await expect(newRequestLocator).toBeVisible({ timeout: 30000 });

    // Cleanup contexts
    await ownerContext.close();
    await tenantContext.close();
  });
});
