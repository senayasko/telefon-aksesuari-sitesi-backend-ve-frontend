const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { hashPassword } = require('../lib/auth');

test('reviews require a signed-in purchaser and are paginated', async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'vitrin-reviews-test-'));
  const user = {
    id: 1,
    name: 'Satın Alan Kullanıcı',
    email: 'buyer@example.test',
    ...hashPassword('buyer-password'),
    createdAt: new Date().toISOString(),
  };
  const seedReviews = Array.from({ length: 6 }, (_, index) => ({
    id: `R${index + 1}`,
    productId: 1,
    name: `Müşteri ${index + 1}`,
    email: `customer${index + 1}@example.test`,
    rating: 5,
    text: `Bu ürün için yeterince uzun test yorumu ${index + 1}.`,
    verifiedPurchase: true,
    createdAt: new Date(Date.now() - index * 1000).toISOString(),
  }));
  const collections = {
    'products.json': [{ id: 1, name: 'Ürün 1' }, { id: 2, name: 'Ürün 2' }],
    'users.json': [user],
    'orders.json': [{
      id: 'ORDER-1',
      userEmail: user.email,
      status: 'Teslim Edildi',
      customer: { email: user.email },
      items: [{ id: 1, quantity: 1 }],
    }],
    'coupons.json': [],
    'reviews.json': seedReviews,
    'stock-notifications.json': [],
    'auth.json': [],
  };
  for (const [name, value] of Object.entries(collections)) {
    fs.writeFileSync(path.join(fixture, name), JSON.stringify(value));
  }

  process.env.DATA_DIR = fixture;
  const app = require('../server');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (route, method = 'GET', body, cookie) => fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    assert.equal((await request('/api/products/1/reviews', 'POST', { rating: 5, text: 'Harika bir ürün, çok memnun kaldım.' })).status, 401);

    const login = await request('/api/users/login', 'POST', { email: user.email, password: 'buyer-password' });
    const cookie = login.headers.get('set-cookie').split(';')[0];

    const firstPage = await (await request('/api/products/1/reviews?page=1', 'GET', undefined, cookie)).json();
    assert.equal(firstPage.reviews.length, 5);
    assert.deepEqual(firstPage.pagination, { page: 1, pageSize: 5, totalPages: 2, totalItems: 6 });
    assert.equal(firstPage.viewer.canReview, true);

    const notPurchased = await request('/api/products/2/reviews', 'POST', { rating: 5, text: 'Satın alınmamış ürün yorumu.' }, cookie);
    assert.equal(notPurchased.status, 403);

    const created = await request('/api/products/1/reviews', 'POST', { rating: 5, text: 'Satın aldım ve üründen çok memnun kaldım.' }, cookie);
    assert.equal(created.status, 201);
    assert.equal((await request('/api/products/1/reviews', 'POST', { rating: 4, text: 'İkinci yorum gönderilememeli.' }, cookie)).status, 409);

    const secondPage = await (await request('/api/products/1/reviews?page=2', 'GET', undefined, cookie)).json();
    assert.equal(secondPage.reviews.length, 2);
    assert.equal(secondPage.viewer.hasReviewed, true);
    assert.equal(secondPage.viewer.canReview, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
