const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = require('../server');

test('login works with read-only storage without bypassing credentials', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const originalWrite = fs.writeFileSync;
  fs.writeFileSync = () => {
    const error = new Error('Read-only filesystem');
    error.code = 'EROFS';
    throw error;
  };
  const post = (route, body) => fetch(base + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  try {
    for (const route of ['/api/users/admin-login', '/api/users/login']) {
      const response = await post(route, { email: 'admin@vitrin.com', password: 'vitrin2026' });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.success, true);
      assert.equal(data.user.role, 'admin');
      assert.equal(data.user.passwordHash, undefined);
    }
    const wrongPassword = await post('/api/users/admin-login', {
      email: 'admin@vitrin.com', password: 'wrong-password'
    });
    assert.equal(wrongPassword.status, 401);
    const notAdmin = await post('/api/users/admin-login', {
      email: 'demo@vitrin.com', password: 'wrong-password'
    });
    assert.equal(notAdmin.status, 403);
    const registration = await post('/api/users/register', {
      name: 'Storage Test', email: 'storage-test@example.com', password: 'test-password'
    });
    assert.equal(registration.status, 503);
    assert.equal((await registration.json()).success, false);
  } finally {
    fs.writeFileSync = originalWrite;
    await new Promise(resolve => server.close(resolve));
  }
});
