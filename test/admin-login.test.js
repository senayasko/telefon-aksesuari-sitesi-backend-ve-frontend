const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAdminLogin } = require('../lib/admin-login');

function fixture(failMail = false) {
  const collections = { 'auth.json': [], 'users.json': [{ id: 1, name: 'Admin', email: 'old@example.test', role: 'admin', sessions: [] }] };
  const storage = { read: name => collections[name], write: (name, value) => { collections[name] = value; } };
  let time = 1000000;
  let message;
  let issued = 0;
  const settings = { ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'test-secret', GMAIL_APP_PASSWORD: 'smtp-test-secret' };
  const auth = { issue(req, res, user, mfa) { assert.equal(mfa, true); assert.equal(user.email, settings.ADMIN_EMAIL); issued++; } };
  const login = createAdminLogin(storage, auth, { config: () => settings, now: () => time, sendMail: async mail => { if (failMail) throw new Error('mail failed'); message = mail; } });
  const response = () => ({ statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; }, header(key, value) { this.headers[key] = value; return this; }, json(data) { this.body = data; return this; } });
  const start = async password => { const res = response(); await login.login({ body: { email: settings.ADMIN_EMAIL, password: password || settings.ADMIN_PASSWORD } }, res); return res; };
  const verify = (cookie, code) => { const res = response(); login.verify({ headers: { cookie }, body: { code } }, res); return res; };
  return { start, verify, collections, settings, advance: ms => { time += ms; }, get issued() { return issued; }, get code() { return message.text.match(/\d{6}/)[0]; } };
}

test('admin requires email code and rejects wrong or replayed codes', async () => {
  const f = fixture();
  const start = await f.start();
  assert.equal(start.body.requiresVerification, true);
  assert.equal(f.issued, 0);
  const cookie = start.headers['Set-Cookie'].split(';')[0];
  assert.equal(f.verify(cookie, '000000').body.success, false);
  assert.equal(f.collections['auth.json'].find(r => r.kind === 'admin-challenge').attempts, 1);
  assert.equal(f.verify(cookie, f.code).body.success, true);
  assert.equal(f.issued, 1);
  assert.equal(f.verify(cookie, f.code).body.success, false);
});

test('expired codes and attempt limits never grant admin access', async () => {
  const f = fixture();
  const start = await f.start();
  const cookie = start.headers['Set-Cookie'].split(';')[0];
  for (let i = 0; i < 5; i++) assert.equal(f.verify(cookie, '000000').body.success, false);
  assert.equal(f.verify(cookie, f.code).body.success, false);
  f.advance(60000);
  const next = await f.start();
  const nextCookie = next.headers['Set-Cookie'].split(';')[0];
  f.advance(5 * 60 * 1000);
  assert.equal(f.verify(nextCookie, f.code).body.success, false);
  assert.equal(f.issued, 0);
});

test('mail failures, missing configuration and password guessing fail closed', async () => {
  const failed = fixture(true);
  assert.equal((await failed.start()).body.success, false);
  assert.equal(failed.collections['auth.json'].some(r => r.kind === 'admin-challenge'), false);
  assert.equal(failed.issued, 0);
  const f = fixture();
  for (let i = 0; i < 10; i++) assert.equal((await f.start('wrong')).body.success, false);
  assert.equal((await f.start()).body.success, false);
  delete f.settings.GMAIL_APP_PASSWORD;
  assert.equal((await f.start()).statusCode, 503);
});
