import { test, expect } from 'playwright-test-coverage';


import basicInit from './utils/mockApi.js';



test.beforeEach(async ({ page }) => {
  await basicInit(page);     // registers all routes first
  await page.goto('/');      // THEN load the app (baseURL should point to your dev server)
});

test('admin can see and use the admin dashboard', async ({ page }) => { 

await page.goto('http://localhost:5173/');
await page.getByRole('link', { name: 'Login' }).click();
await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
await page.getByRole('textbox', { name: 'Password' }).click();
await page.getByRole('textbox', { name: 'Password' }).fill('admin');
await page.locator('div').filter({ hasText: /^Login$/ }).click();
await page.getByRole('link', { name: 'Admin' }).click();
//await page.getByRole('button', { name: '»' }).first().click();
});