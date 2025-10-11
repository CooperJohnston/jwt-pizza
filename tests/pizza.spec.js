import { test, expect } from 'playwright-test-coverage';
import basicInit from './utils/mockApi.js';


test.beforeEach(async ({ page }) => {
  await basicInit(page);     // registers all routes first
  await page.goto('/');      // THEN load the app (baseURL should point to your dev server)
});

test('login', async ({ page }) => {

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
  
  });
  
  test('purchase with login', async ({ page }) => {

  
    // Go to order page
    await page.getByRole('button', { name: 'Order now' }).click();
  
    // Create order
    await expect(page.locator('h2')).toContainText('Awesome is a click away');
    await page.getByRole('combobox').selectOption('4');
    await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
    await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
    await expect(page.locator('form')).toContainText('Selected pizzas: 2');
    await page.getByRole('button', { name: 'Checkout' }).click();
  
    // Login
    await page.getByPlaceholder('Email address').click();
    await page.getByPlaceholder('Email address').fill('a@jwt.com');
    await page.getByPlaceholder('Email address').press('Tab');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
  
    // Pay
    await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
    await expect(page.locator('tbody')).toContainText('Veggie');
    await expect(page.locator('tbody')).toContainText('Pepperoni');
    await expect(page.locator('tfoot')).toContainText('0.008 ₿');
    await page.getByRole('button', { name: 'Pay now' }).click();
  
    // Check balance
    await expect(page.getByText('0.008')).toBeVisible();
  });

test('admin can login and manage franchises', async ({ page }) => { 


await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
await page.getByRole('link', { name: 'login', exact: true }).click();
await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
await page.getByRole('textbox', { name: 'Password' }).fill('admin');
await page.getByRole('button', { name: 'Login' }).click();
await page.getByRole('link', { name: 'Admin' }).click();
await page.getByRole('row', { name: 'Spanish Fork' }).getByRole('button').click();
await page.getByRole('button', { name: 'Close' }).click();
await page.getByRole('button', { name: 'Add Franchise' }).click();
await page.getByRole('textbox', { name: 'franchise name' }).click();
await page.getByRole('textbox', { name: 'franchise name' }).fill('Centerville Pizza');
await page.getByRole('textbox', { name: 'franchisee admin email' }).click();
await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('t@jwt.com');
await page.getByRole('button', { name: 'Create' }).click();
await page.getByRole('link', { name: 'Admin', exact: true }).click();
await page.getByRole('link', { name: 'Logout' }).click();

})

test('franchisee can browse website', async ({ page }) => {
await basicInit(page);
await page.goto('http://localhost:5173/login');
await page.getByRole('textbox', { name: 'Email address' }).click();
await page.getByRole('textbox', { name: 'Email address' }).fill('t@jwt.com');
await page.getByRole('textbox', { name: 'Password' }).click();
await page.getByRole('textbox', { name: 'Password' }).fill('test');
await page.getByRole('button', { name: 'Login' }).click();
await page.getByRole('link', { name: 'About' }).click();
await page.getByRole('link', { name: 'History' }).click();
await page.getByRole('link', { name: 'Franchise', exact: true }).first().click();
await page.getByRole('button', { name: 'Create store' }).click();
await page.getByRole('textbox', { name: 'store name' }).click();
await page.getByRole('textbox', { name: 'store name' }).fill('Centerville Pizza');
await page.getByRole('button', { name: 'Create' }).click();
await page.getByRole('link', { name: 'Logout' }).click();

 })

 test('new user can register, login, and logout', async ({ page }) => {

 await page.getByRole('link', { name: 'Register' }).click();
 await page.getByRole('textbox', { name: 'Full name' }).fill('Anakin Skywalker');
 await page.getByRole('textbox', { name: 'Email address' }).click();
 await page.getByRole('textbox', { name: 'Email address' }).fill('j@jwt.com');
 await page.getByRole('textbox', { name: 'Password' }).click();
 await page.getByRole('textbox', { name: 'Password' }).fill('peace');
 await page.getByRole('button', { name: 'Register' }).click();
 await page.getByRole('link', { name: 'About' }).click();
 await page.getByRole('link', { name: 'History' }).click();
 await page.getByRole('link', { name: 'AS', exact: true }).click();
 await page.getByRole('link', { name: 'Logout' }).click();
 })
