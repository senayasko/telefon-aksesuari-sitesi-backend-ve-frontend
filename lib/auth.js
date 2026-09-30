const crypto = require('node:crypto');

const COOKIE = 'vitrin_session';
const TTL = 8 * 60 * 60 * 1000;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function createAuth(storage) {
  function issue(req, res, user, mfa = false) {
    const token = crypto.randomBytes(32).toString('hex');
    user.sessions = (user.sessions || []).filter(s => s.expires > Date.now()).slice(-4);
    user.sessions.push({ hash: digest(token), expires: Date.now() + TTL, mfa, ...(mfa ? { credentialHash: digest(process.env.ADMIN_PASSWORD || '') } : {}) });
    storage.write('users.json', storage.read('users.json').map(u => u.id === user.id ? user : u));
    res.header('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL / 1000}${process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  }

  function authenticate(req) {
    const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return storage.read('users.json').find(u => (u.sessions || []).some(s => s.expires > Date.now() && s.hash === digest(token) && (u.role !== 'admin' || (s.mfa && u.email === process.env.ADMIN_EMAIL && s.credentialHash === digest(process.env.ADMIN_PASSWORD || ''))))) || null;
  }

  function authorize(req, res) {
    const route = req.path;
    const admin = route === '/api/users/count' || route === '/api/stats' ||
      route === '/api/stock-notifications' || (route === '/api/stock-notify' && req.method === 'GET') ||
      (route === '/api/orders' && req.method === 'GET') ||
      route === '/api/admin/sessions/revoke' || req.method === 'PUT';
    const reviewSubmission = req.method === 'POST' && /^\/api\/products\/[^/]+\/reviews$/.test(route);
    const personal = route === '/api/session' || reviewSubmission || /^\/api\/users\/(?!login$|register$|admin-login$|admin-verify$)/.test(route) || route.startsWith('/api/orders');
    if (!admin && !personal) return true;
    req.user = authenticate(req);
    if (!req.user) { res.status(401).json({ success: false, message: 'Bu işlem için giriş yapmalısınız.' }); return false; }
    if (admin && req.user.role !== 'admin') { res.status(403).json({ success: false, message: 'Yönetici yetkisi gerekli.' }); return false; }
    const email = req.params.email;
    if (email && req.user.role !== 'admin' && email.toLowerCase() !== req.user.email.toLowerCase()) {
      res.status(403).json({ success: false, message: 'Bu kayda erişim yetkiniz yok.' }); return false;
    }
    return true;
  }
  return { issue, authenticate, authorize };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { passwordHash: crypto.scryptSync(password, salt, 64).toString('hex'), salt, passwordVersion: 2 };
}

function verifyPassword(user, password) {
  // Previously published hashes and demo passwords must never grant access.
  if (user.passwordVersion !== 2) return false;
  const actual = crypto.scryptSync(password, user.salt, 64);
  const expected = Buffer.from(user.passwordHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { createAuth, hashPassword, verifyPassword };
