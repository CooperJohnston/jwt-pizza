import { test, expect } from 'playwright-test-coverage';

async function basicInit(page) {
    let loggedInUser = null;
    const TOKEN = 'abcdef';
  
    // --- In-memory data (stateful for each test run) ---
    let franchises = new Map([
      [2, { id: 2, name: 'LotaPizza', stores: [
        { id: 4, name: 'Lehi' },
        { id: 5, name: 'Springville' },
        { id: 6, name: 'American Fork' },
      ]}],
      [3, { id: 3, name: 'PizzaCorp', stores: [
        { id: 7, name: 'Spanish Fork' },
      ]}],
      [4, { id: 4, name: 'topSpot', stores: [] }],
    ]);
    let nextFranchiseId = 5;
  
    const validUsers = {
      'a@jwt.com': { id: '1', name: '常用名字', email: 'a@jwt.com', password: 'admin', roles: [{ role: 'admin' }] },
      't@jwt.com': {id: '2', name: 'test', email: 't@jwt.com', password: 'test', roles: [{ role: 'diner' }] }
    };
  
    // Small helper for safely reading JSON bodies
    function readJSON(req) {
      try {
        return req.postDataJSON();
      } catch {
        // if not JSON or empty body, return empty object
        return {};
      }
    }
  
    // --- Auth (PUT /api/auth) ---
    await page.route('**/api/auth', async (route) => {
      const req = route.request();
      if (req.method() !== 'PUT') {
        
        return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      }
      const { email, password } = readJSON(req);
      const user = validUsers[email];
      if (!user || user.password !== password) {
        return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      }
      loggedInUser = user;
      return route.fulfill({ status: 200, json: { user, token: TOKEN } });
    });
  
  
    await page.route('**/api/user/me', async (route) => {
      const req = route.request();
      if (req.method() !== 'GET') {
        return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      }
      if (!loggedInUser) {
        return route.fulfill({ status: 401, json: { error: 'Not logged in' } });
      }
      return route.fulfill({ status: 200, json: loggedInUser });
    });
  
    await page.route('**/api/order/menu', async (route) => {
      const req = route.request();
      if (req.method() !== 'GET') {
        return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      }
      return route.fulfill({
        status: 200,
        json: [
          { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
          { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
        ],
      });
    });
  
    await page.route('**/api/franchise', async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') return route.fallback();
  
      const auth = (req.headers()['authorization'] || '');
      if (auth !== `Bearer ${TOKEN}`) {
        return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      }
  
      const { name, adminEmail } = readJSON(req);
      if (!name || !adminEmail) {
        return route.fulfill({ status: 400, json: { error: 'Missing name/adminEmail' } });
      }
  
      const newFranchise = { id: nextFranchiseId++, name, stores: [] };
      franchises.set(newFranchise.id, newFranchise);
      return route.fulfill({ status: 201, json: newFranchise });
    });
  

    await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
      const req = route.request();
      if (req.method() !== 'GET') return route.fallback();
  
      const body = { franchises: Array.from(franchises.values()) };
      return route.fulfill({ status: 200, json: body });
    });
  

    await page.route(/\/api\/franchise\/\d+\/store\/\d+$/, async (route) => {
      const req = route.request();
      if (req.method() !== 'DELETE') {
        return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      }
  
      const auth = (req.headers()['authorization'] || '');
      if (auth !== `Bearer ${TOKEN}`) {
        return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      }
  
      const url = new URL(req.url());
      const match = url.pathname.match(/\/api\/franchise\/(\d+)\/store\/(\d+)$/);
      const fid = match ? Number(match[1]) : NaN;
      const sid = match ? Number(match[2]) : NaN;
  
      const f = franchises.get(fid);
      if (!f) return route.fulfill({ status: 404, json: { error: 'Franchise not found' } });
  
      const before = f.stores.length;
      f.stores = f.stores.filter(s => s.id !== sid);
      if (f.stores.length === before) {
        return route.fulfill({ status: 404, json: { error: 'Store not found' } });
      }
  
      const body = { franchises: Array.from(franchises.values()) };
      return route.fulfill({ status: 200, json: body });
    });
    let nextStoreId = 8; // put near your other counters

    // Create store (POST /api/franchise/:fid/store)
    await page.route(/\/api\/franchise\/(\d+)\/store$/, async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') {
        return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      }
    
      const auth = (req.headers()['authorization'] || '');
      if (auth !== `Bearer ${TOKEN}`) {
        return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      }
    
      const url = new URL(req.url());
      const m = url.pathname.match(/\/api\/franchise\/(\d+)\/store$/);
      const fid = m ? Number(m[1]) : NaN;
    
      const { name } = readJSON(req);
      if (!name) {
        return route.fulfill({ status: 400, json: { error: 'Missing store name' } });
      }
    
      const f = franchises.get(fid);
      if (!f) {
        return route.fulfill({ status: 404, json: { error: 'Franchise not found' } });
      }
    
      const newStore = { id: nextStoreId++, name };
      f.stores = [...f.stores, newStore];
    
      // return updated franchise list (or just the new store, depending on your UI)
      return route.fulfill({ status: 201, json: { store: newStore, franchise: f } });
    });
    
    // --- Create order (POST /api/order) ---
    await page.route('**/api/order', async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') {
        return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      }
      const orderReq = readJSON(req);
      return route.fulfill({
        status: 200,
        json: { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' },
      });
    });
  
    await page.goto('/');
  }
  
  

test('login', async ({ page }) => {
    await basicInit(page);
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
  
  });
  
  test('purchase with login', async ({ page }) => {
    await basicInit(page);
  
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

    await basicInit(page);

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

test('diner can browse website', async ({ page }) => {
await basicInit(page);
await page.goto('http://localhost:5173/login');
await page.getByRole('textbox', { name: 'Email address' }).click();
await page.getByRole('textbox', { name: 'Email address' }).fill('t@jwt.com');
await page.getByRole('textbox', { name: 'Password' }).click();
await page.getByRole('textbox', { name: 'Password' }).fill('test');
await page.getByRole('button', { name: 'Login' }).click();
await page.getByRole('link', { name: 'About' }).click();
await page.getByRole('link', { name: 'History' }).click();
await page.getByRole('link', { name: 'Franchise' }).click();
await page.getByRole('button', { name: 'Create store' }).click();
await page.getByRole('textbox', { name: 'store name' }).click();
await page.getByRole('textbox', { name: 'store name' }).fill('Centerville Pizza');
await page.getByRole('button', { name: 'Create' }).click();
await page.getByRole('link', { name: 'Logout' }).click();

 })
