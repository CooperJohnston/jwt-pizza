import { test, expect } from 'playwright-test-coverage';

async function basicInit(page) {
    let loggedInUser = null;
    const TOKEN = 'abcdef';
  
    // valid users
    let validUsers = {
      'a@jwt.com': { id: 1, name: '常用名字', email: 'a@jwt.com', password: 'admin', roles: [{ role: 'admin' }] },
      't@jwt.com': { id: 2, name: 'test',     email: 't@jwt.com', password: 'test',  roles: [{ role: 'franchisee' }] },
      
    };

    function publicUser(u) {
        const { password, ...pub } = u || {};
        return pub;
      }
    const isAdmin = (u) => !!u && u.roles?.some(r => r.role === 'admin');
  
    // mocked stores
    let franchises = new Map([
      [2, { id: 2, name: 'LotaPizza',
        admins: [{ id: 1, name: '常用名字', email: 'a@jwt.com' }],
        stores: [{ id: 4, name: 'Lehi', totalRevenue: 0 },
                 { id: 5, name: 'Springville', totalRevenue: 0 },
                 { id: 6, name: 'American Fork', totalRevenue: 0 }],
      }],
      [3, { id: 3, name: 'PizzaCorp',
        admins: [{ id: 2, name: 'test', email: 't@jwt.com' }], 
        stores: [{ id: 7, name: 'Spanish Fork', totalRevenue: 0 }],
      }],
      [4, { id: 4, name: 'topSpot',
        admins: [], stores: [] }],
    ]);
    let nextFranchiseId = 5;
    let nextStoreId = 8;
  
    function readJSON(req) { try { return req.postDataJSON(); } catch { return {}; } }
  
    await page.route('**/api/auth', async (route) => {
        const req = route.request();
        const method = req.method();
        const authHeader = req.headers()['authorization'] || '';
     
        function readJSONSafe(r) { try { return r.postDataJSON(); } catch { return {}; } }
      
        if (method === 'POST') {
          // REGISTER
          const { name, email, password } = readJSONSafe(req);
          if (!name || !email || !password) {
            return route.fulfill({ status: 400, json: { message: 'name, email, and password are required' } });
          }
          if (validUsers[email]) {
            return route.fulfill({ status: 409, json: { message: 'user already exists' } });
          }
          const newUser = {
            id: 3,
            name,
            email,
            password,
            roles: [{ role: 'diner' }], // matches your server’s Role.Diner on register
          };
          validUsers[email] = newUser;
      
          // Auto-login on register (server returns token)
          loggedInUser = newUser;
          return route.fulfill({ status: 200, json: { user: publicUser(newUser), token: TOKEN } });
        }
      
        if (method === 'PUT') {
          // LOGIN
          const { email, password } = readJSONSafe(req);
          const user = validUsers[email];
          if (!user || user.password !== password) {
            return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
          }
          loggedInUser = user;
          return route.fulfill({ status: 200, json: { user: publicUser(user), token: TOKEN } });
        }
      
        if (method === 'DELETE') {
          // LOGOUT (requires token)
          if (authHeader !== `Bearer ${TOKEN}` || !loggedInUser) {
            return route.fulfill({ status: 401, json: { message: 'unauthorized' } });
          }
          loggedInUser = null;
          return route.fulfill({ status: 200, json: { message: 'logout successful' } });
        }
      
        return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      });
      
  
    // --- Me (GET /api/user/me) ---
    await page.route('**/api/user/me', async (route) => {
      if (route.request().method() !== 'GET') return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      if (!loggedInUser) return route.fulfill({ status: 401, json: { error: 'Not logged in' } });
      return route.fulfill({ status: 200, json: loggedInUser });
    });
  
    // --- LIST franchises (GET /api/franchise?page=&limit=&name=) ---
    await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
      const req = route.request();
      if (req.method() !== 'GET') return route.fallback(); 

      const url = new URL(req.url());
      const nameQ = (url.searchParams.get('name') || '').toLowerCase();
      const page = Number(url.searchParams.get('page') || 0);
      const limit = Number(url.searchParams.get('limit') || 10);
  
      let list = Array.from(franchises.values());
      if (nameQ && nameQ !== '*') list = list.filter(f => f.name.toLowerCase().includes(nameQ));
      const start = page * limit;
      const slice = list.slice(start, start + limit);
      const more = start + limit < list.length;
  
      return route.fulfill({ status: 200, json: { franchises: slice, more } });
    });
  
    // --- GET user franchises OR DELETE franchise ( /api/franchise/:id ) ---
    await page.route(/\/api\/franchise\/\d+$/, async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const id = Number(url.pathname.split('/').pop());
  
      if (req.method() === 'GET') {
        // matches real route: getUserFranchises (auth required; returns [] if not self nor admin)
        const auth = (req.headers()['authorization'] || '');
        if (auth !== `Bearer ${TOKEN}`) return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  
        const isSelf = loggedInUser && loggedInUser.id === id;
        const canView = isSelf || isAdmin(loggedInUser);
        const mine = canView
          ? Array.from(franchises.values()).filter(f => f.admins.some(a => a.id === id))
          : [];
        return route.fulfill({ status: 200, json: mine }); // array, per your real API
      }
  
      if (req.method() === 'DELETE') {
        // matches deleteFranchise; your server code currently lacks auth, but docs say requiresAuth.
        const auth = (req.headers()['authorization'] || '');
        if (auth !== `Bearer ${TOKEN}` || !isAdmin(loggedInUser)) {
          return route.fulfill({ status: 403, json: { error: 'unable to delete a franchise' } });
        }
        if (!franchises.has(id)) return route.fulfill({ status: 404, json: { error: 'franchise not found' } });
        franchises.delete(id);
        return route.fulfill({ status: 200, json: { message: 'franchise deleted' } });
      }
  
      return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
    });
  
    // --- CREATE franchise (POST /api/franchise) ---
    await page.route('**/api/franchise', async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') return route.fallback();
  
      const auth = (req.headers()['authorization'] || '');
      if (auth !== `Bearer ${TOKEN}` || !isAdmin(loggedInUser)) {
        return route.fulfill({ status: 403, json: { error: 'unable to create a franchise' } });
      }
  
      const { name, admins } = readJSON(req);
      if (!name || !Array.isArray(admins)) {
        return route.fulfill({ status: 400, json: { error: 'Missing name/admins' } });
      }
  
      // Resolve admin emails to {id,name,email} where possible
      const resolvedAdmins = admins.map(a => {
        const byEmail = validUsers[a.email];
        if (byEmail) return { id: byEmail.id, name: byEmail.name, email: byEmail.email };
        // fallback stub id for unknown emails
        return { id: 1000 + Math.floor(Math.random() * 1000), name: a.email, email: a.email };
      });
  
      const newFranchise = { id: nextFranchiseId++, name, admins: resolvedAdmins, stores: [] };
      franchises.set(newFranchise.id, newFranchise);
      return route.fulfill({ status: 200, json: newFranchise });
    });
  
    // --- CREATE store (POST /api/franchise/:franchiseId/store) ---
    await page.route(/\/api\/franchise\/(\d+)\/store$/, async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
  
      const auth = (req.headers()['authorization'] || '');
      if (auth !== `Bearer ${TOKEN}`) return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  
      const url = new URL(req.url());
      const fid = Number(url.pathname.match(/\/api\/franchise\/(\d+)\/store$/)[1]);
      const f = franchises.get(fid);
      if (!f) return route.fulfill({ status: 404, json: { error: 'Franchise not found' } });
  
      const canCreate = isAdmin(loggedInUser) || f.admins.some(a => a.id === loggedInUser.id);
      if (!canCreate) return route.fulfill({ status: 403, json: { error: 'unable to create a store' } });
  
      const { name } = readJSON(req);
      if (!name) return route.fulfill({ status: 400, json: { error: 'Missing store name' } });
  
      const newStore = { id: nextStoreId++, name, totalRevenue: 0 };
      f.stores = [...f.stores, newStore];
      return route.fulfill({ status: 200, json: newStore }); 
    });
  
    // --- DELETE store (DELETE /api/franchise/:franchiseId/store/:storeId) ---
    await page.route(/\/api\/franchise\/(\d+)\/store\/(\d+)$/, async (route) => {
      const req = route.request();
      if (req.method() !== 'DELETE') return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
  
      const auth = (req.headers()['authorization'] || '');
      if (auth !== `Bearer ${TOKEN}`) return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  
      const [ , fidStr, sidStr ] = new URL(req.url()).pathname.match(/\/api\/franchise\/(\d+)\/store\/(\d+)$/);
      const fid = Number(fidStr), sid = Number(sidStr);
      const f = franchises.get(fid);
      if (!f) return route.fulfill({ status: 404, json: { error: 'Franchise not found' } });
  
      const canDelete = isAdmin(loggedInUser) || f.admins.some(a => a.id === loggedInUser.id);
      if (!canDelete) return route.fulfill({ status: 403, json: { error: 'unable to delete a store' } });
  
      const before = f.stores.length;
      f.stores = f.stores.filter(s => s.id !== sid);
      if (f.stores.length === before) return route.fulfill({ status: 404, json: { error: 'Store not found' } });
  
      return route.fulfill({ status: 200, json: { message: 'store deleted' } });
    });
  
 // --- Menu (GET /api/order/menu) & Create order (POST /api/order) ---
    await page.route('**/api/order/menu', async (route) => {
      if (route.request().method() !== 'GET') return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      return route.fulfill({ status: 200, json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ]});
    });
  
    await page.route('**/api/order', async (route) => {
      if (route.request().method() !== 'POST') return route.fulfill({ status: 405, json: { error: 'Method Not Allowed' } });
      const orderReq = readJSON(route.request());
      return route.fulfill({ status: 200, json: { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' } });
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
 await basicInit(page);
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
