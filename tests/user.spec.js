import { test, expect } from 'playwright-test-coverage';


import basicInit from './utils/mockApi.js';



test.beforeEach(async ({ page }) => {
  await basicInit(page);     // registers all routes first
  await page.goto('/');      // THEN load the app (baseURL should point to your dev server)
});

test('updateUser lets a diner update name and email', async ({ page }) => {
  const email = `user${Date.now()}@jwt.com`;
  const newEmail = `updated${Date.now()}@jwt.com`;

  // Register (mock auto-logs in)
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  // Open profile via initials (case-insensitive “pd”)
  await page.getByRole('link', { name: /pd/i }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(/Edit user/i);

  // Change name
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  // Logout & login again with the same email/password
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  // Name persisted
  await page.getByRole('link', { name: /pd/i }).click();
  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  // Update email (stay logged in; token unchanged in mock)
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(/Edit user/i);
  // Usually the 2nd textbox in the modal is email; adjust if your form differs
  await page.getByRole('textbox').nth(1).fill(newEmail);
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
  await expect(page.getByRole('main')).toContainText(newEmail);

  // Optional: prove login works with the NEW email now
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(newEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: /pd/i })).toBeVisible();
});

test('updateUser lets an admin update their name', async ({ page }) => {
  // Login as seeded admin (mock knows this user)
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  // Open profile via the initial “常” (first char of name)
  await page.getByRole('link', { name: 'cj' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  // Update name
  await page.getByRole('textbox').first().fill('dan johnston');
  await page.getByRole('button', { name: 'Update' }).click();

  // Logout and login again to confirm persistence
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  // Header initials should now be “cj”
  await page.getByRole('link', { name: /dj/i }).click();
  await expect(page.getByText('dan johnston')).toBeVisible();
});