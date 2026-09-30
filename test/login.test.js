const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { hashPassword } = require('../lib/auth');

test('server authorization protects private data and writes', async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'vitrin-auth-test-'));
  process.env.DATA_DIR = fixture;
  fs.writeFileSync(path.join(fixture, 'users.json'), JSON.stringify([
    { id: 1, email: 'admin@example.test', role: 'admin', name: 'Test Admin', ...hashPassword('test-admin-password') },
    { id: 2, email: 'user@example.test', name: 'Test User', ...hashPassword('test-user-password') },
    { id: 3, email: 'legacy@example.test', name: 'Legacy', role: 'admin', passwordHash: 'published', salt: 'published' }
  ]));
  fs.writeFileSync(path.join(fixture, 'orders.json'), JSON.stringify([{ id: 'PRIVATE', userEmail: 'other@example.test', customer: { email: 'other@example.test' } }]));
  const app = require('../server');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (route, method = 'GET', body, cookie) => fetch(base + route, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  try {
    for (const route of ['/api/orders', '/api/orders/PRIVATE', '/api/orders/user/user@example.test', '/api/users/user@example.test', '/api/stats', '/api/users/count', '/api/stock-notify', '/api/stock-notifications']) assert.equal((await request(route)).status, 401, route);
    for (const route of ['/api/products/1/stock', '/api/orders/PRIVATE/status']) assert.equal((await request(route, 'PUT', {})).status, 401);
    assert.equal((await request('/api/orders', 'POST', {})).status, 401);
    assert.equal((await request('/api/products')).status, 200);
    const login = await request('/api/users/login', 'POST', { email: 'user@example.test', password: 'test-user-password' });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/orders', 'GET', undefined, cookie)).status, 403);
    assert.equal((await request('/api/orders/PRIVATE', 'GET', undefined, cookie)).status, 403);
    assert.equal((await request('/api/orders/user/other@example.test', 'GET', undefined, cookie)).status, 403);
    assert.equal((await request('/api/products/1/stock', 'PUT', {}, cookie)).status, 403);
    assert.equal((await request('/api/orders/user/user@example.test', 'GET', undefined, cookie)).status, 200);
    const admin = await request('/api/users/admin-login', 'POST', { email: 'admin@example.test', password: 'test-admin-password' });
    assert.equal(admin.status, 200);
    assert.equal((await request('/api/orders', 'GET', undefined, admin.headers.get('set-cookie').split(';')[0])).status, 200);
    assert.equal((await request('/api/users/admin-login', 'POST', { email: 'legacy@example.test', password: 'published' })).status, 401);
    assert.equal((await request('/api/users/logout', 'POST', {}, cookie)).status, 200);
    assert.equal((await request('/api/orders/user/user@example.test', 'GET', undefined, cookie)).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
