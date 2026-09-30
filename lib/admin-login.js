const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const { hashPassword } = require('./auth');

const CHALLENGE_COOKIE = 'vitrin_admin_challenge';
const LIFE = 5 * 60 * 1000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const safeEqual = (a, b) => crypto.timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));

function createAdminLogin(storage, auth, { sendMail, now = Date.now, config = () => process.env } = {}) {
  function settings() {
    const env = config();
    return { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, smtpPassword: env.GMAIL_APP_PASSWORD };
  }
  function cookie(res, token, clear = false) {
    res.header('Set-Cookie', `${CHALLENGE_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : LIFE / 1000}${process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  }
  function codeHash(token, code, secret) {
    return crypto.createHmac('sha256', secret).update(`${token}:${code}`).digest('hex');
  }
  // Authentication failures deliberately use success:false with HTTP 200 so
  // the transaction persists attempt counters rather than rolling them back.
  const reject = (res, message) => res.json({ success: false, message });

  async function login(req, res) {
    const s = settings();
    if (!s.email || !s.password || !s.smtpPassword) return res.status(503).json({ success: false, message: 'Yönetici e-posta doğrulaması henüz yapılandırılmadı.' });
    if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string') return reject(res, 'Geçersiz giriş bilgileri.');
    const records = storage.read('auth.json').filter(r => r.expires > now());
    let throttle = records.find(r => r.kind === 'admin-throttle');
    if (!throttle) { throttle = { kind: 'admin-throttle', attempts: 0, sends: 0, expires: now() + 15 * 60 * 1000 }; records.push(throttle); }
    if (throttle.attempts >= 10 || throttle.sends >= 5) return reject(res, 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.');
    throttle.attempts++;
    storage.write('auth.json', records);
    if (!safeEqual(req.body.email.trim().toLowerCase(), s.email.toLowerCase()) || !safeEqual(req.body.password, s.password)) return reject(res, 'E-posta veya şifre hatalı.');
    if (throttle.lastSent && now() - throttle.lastSent < 60000) return reject(res, 'Yeni kod istemeden önce bir dakika bekleyin.');

    // There may only ever be one usable administrator code.  Do this before
    // delivery so a previously mailed code cannot remain valid while a newer
    // code is being issued (or if delivery fails).
    for (let index = records.length - 1; index >= 0; index--) {
      if (records[index].kind === 'admin-challenge') records.splice(index, 1);
    }
    storage.write('auth.json', records);

    const token = crypto.randomBytes(32).toString('hex');
    const code = crypto.randomInt(100000, 1000000).toString();
    try {
      const deliver = sendMail || (message => nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: s.email, pass: s.smtpPassword },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
      }).sendMail(message));
      await deliver({ from: s.email, to: s.email, subject: 'vitrin yönetici giriş kodu', text: `Giriş kodunuz: ${code}\nKod 5 dakika geçerlidir. Bu girişi siz başlatmadıysanız kodu paylaşmayın.` });
    } catch {
      return reject(res, 'Doğrulama e-postası gönderilemedi. Yönetici girişi açılmadı.');
    }
    throttle.lastSent = now();
    throttle.sends++;
    records.push({ kind: 'admin-challenge', tokenHash: hash(token), codeHash: codeHash(token, code, s.smtpPassword), email: s.email, credentialHash: hash(s.password), attempts: 0, expires: now() + LIFE });
    storage.write('auth.json', records);
    cookie(res, token);
    res.json({ success: true, requiresVerification: true, message: 'E-posta adresinize gönderilen 6 haneli kodu girin.' });
  }

  function verify(req, res) {
    const s = settings();
    if (!s.email || !s.password || !s.smtpPassword) return res.status(503).json({ success: false, message: 'E-posta doğrulaması yapılandırılmadı.' });
    const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(CHALLENGE_COOKIE + '='))?.slice(CHALLENGE_COOKIE.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return reject(res, 'Önce e-posta ve şifrenizle giriş yapın.');
    const records = storage.read('auth.json');
    const challenge = records.find(r => r.kind === 'admin-challenge' && r.tokenHash === hash(token));
    if (!challenge || challenge.expires <= now() || challenge.attempts >= 5 || challenge.email !== s.email || challenge.credentialHash !== hash(s.password)) return reject(res, 'Kod süresi doldu veya deneme sınırı aşıldı. Yeniden giriş yapın.');
    challenge.attempts++;
    storage.write('auth.json', records);
    if (typeof req.body.code !== 'string' || !/^\d{6}$/.test(req.body.code) || !safeEqual(challenge.codeHash, codeHash(token, req.body.code, s.smtpPassword))) return reject(res, 'Kod hatalı.');
    // Invalidate every pending challenge for this admin before granting access.
    storage.write('auth.json', records.filter(r => r.kind !== 'admin-challenge'));
    const users = storage.read('users.json');
    let user = users.find(u => u.role === 'admin');
    if (!user) { user = { id: Math.max(0, ...users.map(u => u.id)) + 1, name: 'Admin', role: 'admin', createdAt: new Date(now()).toISOString() }; users.push(user); }
    for (const other of users) if (other.role === 'admin') other.sessions = [];
    Object.assign(user, { email: s.email, ...hashPassword(s.password), sessions: [], lastLoginAt: new Date(now()).toISOString() });
    storage.write('users.json', users);
    auth.issue(req, res, user, true);
    res.json({ success: true, message: 'E-posta doğrulandı. Yönetici girişi başarılı.' });
  }
  return { login, verify };
}

module.exports = { createAdminLogin };
