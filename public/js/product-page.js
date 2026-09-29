/* ==========================================================================
   VİTRİN — ÜRÜN DETAY SAYFASI  (/urun/:id)
   Yorumlar, stok bildirimi, kampanya sayacı, paylasim ve BUYUTEC
   ========================================================================== */

const PP = {
  product: null,
  reviews: [],
  summary: { avg: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  image: null,
  qty: 1,
  color: null,
  model: null,
  notifyDone: false,
  rating: 0,
  timer: null,
};

/* ---------------------------------------------------------------- yardimci */

function ppStars(rating, size = 'w-4 h-4') {
  const full = Math.round(rating || 0);
  let out = '<span class="inline-flex items-center gap-0.5 align-middle">';
  for (let i = 1; i <= 5; i++) {
    out += `<svg class="${size} ${i <= full ? 'text-amber-400' : 'text-zinc-300'}" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  }
  return out + '</span>';
}

function ppEsc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function ppAllImages(product) {
  const fromColors = (product.variantOptions?.colors || []).map((c) => c.image).filter(Boolean);
  const fromGallery = (product.gallery || []).filter(Boolean);
  return [...new Set([...fromColors, ...fromGallery])];
}

function ppVariantLabel() {
  const parts = [];
  if (PP.color) parts.push(PP.color.name);
  if (PP.model) parts.push(PP.model);
  return parts.length ? parts.join(' / ') : 'Standart';
}

function ppShareUrl() {
  return location.origin + '/urun/' + (PP.product ? PP.product.id : '');
}

function ppShareText() {
  return PP.product ? PP.product.name + ' | vitrin.' : 'vitrin.';
}

/* ------------------------------------------------------- urun ozellikleri */

function ppFeatures(product) {
  const base = [];
  if (product.category === 'Kılıf & Koruma') {
    base.push('Kamera halkasını tamamen çevreleyen darbe dayanımlı kenar');
    base.push('Mikrofiber iç yüzey — çizik bırakmaz, toz tutmaz');
    base.push('Mıknatıslı MagSafe hizalama (güçlü manyetik tutuş)');
    base.push('Yanlarda parmak yuvası, tam kesim tuş delikleri');
  } else if (product.category === 'Şarj & Güç') {
    base.push('GaN teknolojisi — daha küçük, daha güçlü');
    base.push('Aşırı ısınmaya karşı çoklu güvenlik koruması');
    base.push('Tüm iPhone ve iPad modelleriyle uyumlu');
    base.push('Kompakt tasarım, taşımada pratik');
  } else {
    base.push('9H sertlik — çizilmeye dayanıklı yüzey');
    base.push('Optik yapıştırıcı, çizgi izi bırakmaz');
    base.push('Kamera çıkıntısına tam oturur');
    base.push('Kolay temizlik, parmak izi tutmaz');
  }
  base.push('2 yıl birebir garanti');
  base.push('14 gün ücretsiz iade ve değişim');
  return base;
}

/* ------------------------------------------------------- kampanya sayaci */

function ppCampaignEnd() {
  const KEY = 'vitrin_campaign_end';
  let end = parseInt(localStorage.getItem(KEY) || '0', 10);
  if (!end || end < Date.now()) {
    // Suresi dolmamis yeni bir kampanya: 2 gun 14 saat
    end = Date.now() + (2 * 24 * 60 * 60 * 1000) + (14 * 60 * 60 * 1000);
    localStorage.setItem(KEY, String(end));
  }
  return end;
}

function ppStartTimer() {
  if (PP.timer) clearInterval(PP.timer);
  const tick = () => {
    const el = document.getElementById('pp-countdown');
    if (!el) { if (PP.timer) clearInterval(PP.timer); return; }
    const left = ppCampaignEnd() - Date.now();
    if (left <= 0) { el.innerHTML = '<span class="text-emerald-700 font-black">Kampanya bitti</span>'; return; }
    const d = Math.floor(left / 86400000);
    const h = Math.floor((left % 86400000) / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    const s = Math.floor((left % 60000) / 1000);
    const box = (n, l) => `<span class="inline-flex flex-col items-center justify-center bg-zinc-50 border border-zinc-300 text-zinc-950 rounded-lg px-3 py-1.5 min-w-[56px]">
      <b class="text-lg font-black tabular-nums leading-none">${String(n).padStart(2, '0')}</b>
      <em class="not-italic text-[9px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">${l}</em></span>`;
    el.innerHTML = [box(d, 'Gün'), box(h, 'Saat'), box(m, 'Dakika'), box(s, 'Saniye')].join('<span class="text-zinc-400 font-black text-lg">:</span>');
  };
  tick();
  PP.timer = setInterval(tick, 1000);
}

/* ------------------------------------------------------------------ paylas */

function ppShare(kind) {
  const url = encodeURIComponent(ppShareUrl());
  const text = encodeURIComponent(ppShareText());
  const links = {
    whatsapp: `https://wa.me/?text=${text}%20${url}`,
    x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
  };
  if (kind === 'copy') {
    const done = () => showToast('Bağlantı kopyalandı!');
    if (navigator.clipboard) navigator.clipboard.writeText(ppShareUrl()).then(done).catch(done);
    else done();
    return;
  }
  window.open(links[kind], '_blank', 'noopener,width=640,height=560');
}

const PP_SHARE_BTNS = [
  ['whatsapp', 'WhatsApp', 'M20.5 3.5A10.9 3.5 14 3.5-3.5 10.9 3.5M20.5 17a9 9 0 01-14.9 7.1L3 21l1.9-2.6A9 9 0 1120.5 17z'],
  ['x', 'X', 'M4 4l16 16M20 4L4 20'],
  ['facebook', 'Facebook', 'M15 3h-2.5A3.5 3.5 0 009 6.5V9H7v3h2v9h3v-9h2.5l.5-3H12V6.5A.5.5 0 0112.5 6H15V3z'],
  ['telegram', 'Telegram', 'M21 4L3 11l5 2 2 6 3-4 4 3 4-14z'],
];

function ppShareHtml() {
  return `<div>
    <span class="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">Paylaş:</span>
    <div class="flex flex-wrap items-center gap-2">
      ${PP_SHARE_BTNS.map(([k, label, path]) => `<button onclick="ppShare('${k}')" title="${label}" aria-label="${label} ile paylaş" class="w-10 h-10 rounded-lg border border-zinc-300 hover:border-zinc-950 hover:bg-zinc-950 hover:text-white text-zinc-700 flex items-center justify-center transition-colors">
        <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${path}"/></svg>
      </button>`).join('')}
      <button onclick="ppShare('copy')" title="Bağlantıyı kopyala" aria-label="Bağlantıyı kopyala" class="w-10 h-10 rounded-lg border border-zinc-300 hover:border-zinc-950 hover:bg-zinc-950 hover:text-white text-zinc-700 flex items-center justify-center transition-colors">
        <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
      </button>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ BUYUTEC */

function ppInitZoom() {
  const wrap = document.getElementById('pp-zoom-wrap');
  const lens = document.getElementById('pp-zoom-lens');
  const img = document.getElementById('pp-main-image');
  const zoomImg = document.getElementById('pp-zoom-img');
  if (!wrap || !lens || !img || !zoomImg) return;

  const ZOOM = 2.4;
  const SIZE = 120;

  const place = (x, y) => {
    const r = wrap.getBoundingClientRect();
    // Buyutulen gorsel, kaplayacinin ZOOM katindan buyuk olacak sekilde
    const bigW = r.width * ZOOM;
    const bigH = r.height * ZOOM;
    zoomImg.style.width = bigW + 'px';
    zoomImg.style.height = bigH + 'px';
    // Imlec konumunu buyuk gorsel koordinatina cevir
    const ratioX = (x - r.left) / r.width;
    const ratioY = (y - r.top) / r.height;
    zoomImg.style.left = -(ratioX * bigW - SIZE / 2) + 'px';
    zoomImg.style.top = -(ratioY * bigH - SIZE / 2) + 'px';
    // Buyutec kaplari icinde kalmasin
    const lx = Math.min(Math.max(x - r.left, SIZE / 2), r.width - SIZE / 2);
    const ly = Math.min(Math.max(y - r.top, SIZE / 2), r.height - SIZE / 2);
    lens.style.left = lx - SIZE / 2 + 'px';
    lens.style.top = ly - SIZE / 2 + 'px';
  };

  const show = () => {
    zoomImg.src = img.currentSrc || img.src;
    lens.style.display = 'block';
    wrap.classList.add('is-zooming');
  };
  const hide = () => {
    lens.style.display = 'none';
    wrap.classList.remove('is-zooming');
  };

  wrap.addEventListener('mouseenter', show);
  wrap.addEventListener('mousemove', (e) => place(e.clientX, e.clientY));
  wrap.addEventListener('mouseleave', hide);
  // Dokunmatik
  wrap.addEventListener('touchstart', (e) => { show(); place(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  wrap.addEventListener('touchmove', (e) => { place(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  wrap.addEventListener('touchend', hide);
}

/* --------------------------------------------------------------- yorumlar */

async function ppLoadReviews(productId) {
  try {
    const res = await fetch(`/api/products/${productId}/reviews`);
    const data = await res.json();
    if (data.success) {
      PP.reviews = data.reviews || [];
      PP.summary = data.summary || PP.summary;
    }
  } catch (err) {
    console.error('Yorumlar yüklenemedi:', err);
  }
}

function ppReviewsHtml() {
  const { avg, count, distribution } = PP.summary;
  const rows = [5, 4, 3, 2, 1].map((star) => {
    const n = distribution[star] || 0;
    const pct = count ? Math.round((n / count) * 100) : 0;
    return `<div class="flex items-center gap-2.5">
      <span class="w-9 shrink-0 text-xs font-bold text-zinc-700">${star} ★</span>
      <div class="flex-1 h-2.5 bg-zinc-200 rounded-md overflow-hidden">
        <div class="h-full bg-amber-400 rounded-md" style="width:${pct}%"></div>
      </div>
      <span class="w-9 shrink-0 text-right text-xs font-bold text-zinc-500">${n}</span>
    </div>`;
  }).join('');

  const list = PP.reviews.length
    ? PP.reviews.map((r) => `<article class="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
        <div class="flex items-center justify-between gap-3 mb-1.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-9 h-9 rounded-lg bg-zinc-950 text-white text-sm font-black flex items-center justify-center shrink-0">${ppEsc((r.name || '?').charAt(0).toUpperCase())}</span>
            <div class="min-w-0">
              <p class="text-sm font-bold text-zinc-950 truncate">${ppEsc(r.name)}</p>
              <p class="text-[11px] text-zinc-500">${ppEsc(r.date || '')}</p>
            </div>
          </div>
          ${ppStars(r.rating, 'w-3.5 h-3.5')}
        </div>
        ${r.verified ? '<p class="text-[11px] font-bold text-emerald-700 mb-1.5">✓ Doğrulanmış satın alma</p>' : ''}
        <p class="text-sm text-zinc-700 leading-relaxed">${ppEsc(r.text)}</p>
      </article>`).join('')
    : `<p class="text-sm text-zinc-500 py-6 text-center">Henüz değerlendirme yok. İlk yorumu sen yaz!</p>`;

  return `<div class="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8">
    <div>
      <div class="flex items-baseline gap-2.5 mb-1">
        <span class="text-5xl font-black text-zinc-950 tabular-nums">${avg ? avg.toFixed(1) : '—'}</span>
        <span class="text-sm text-zinc-500">/ 5</span>
      </div>
      <div class="mb-4">${ppStars(avg, 'w-5 h-5')}</div>
      <p class="text-sm text-zinc-500 mb-5">${count} değerlendirme</p>
      <div class="space-y-2">${rows}</div>
    </div>
    <div>
      <div class="p-5 rounded-xl border border-zinc-300 bg-white mb-6">
        <h3 class="font-display text-lg font-black text-zinc-950 mb-1">Değerlendirme Yaz</h3>
        <p class="text-sm text-zinc-500 mb-4">Ürünü kullandıktan sonra diğer müşterilere yardımcı ol.</p>
        <form id="review-form" class="space-y-3.5">
          <div>
            <span class="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Puanın</span>
            <div id="review-star-input" class="flex items-center gap-1.5"></div>
            <p id="review-rating-error" class="hidden text-xs font-semibold text-red-600 mt-1">Lütfen 1-5 arası bir puan seç.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="review-name" class="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Adın</label>
              <input type="text" id="review-name" maxlength="40" placeholder="Örn: Ayşe Y." class="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:border-zinc-900 focus:outline-none" />
            </div>
            <div>
              <label for="review-email" class="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">E-posta (yayımlanmaz)</label>
              <input type="email" id="review-email" maxlength="80" placeholder="ornek@mail.com" class="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:border-zinc-900 focus:outline-none" />
            </div>
          </div>
          <div>
            <label for="review-text" class="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Yorumun</label>
            <textarea id="review-text" rows="4" maxlength="1000" placeholder="Ürün nasıl? Kullanım, kalıcılık, paketleme..." class="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:border-zinc-900 focus:outline-none resize-y"></textarea>
            <p id="review-text-error" class="hidden text-xs font-semibold text-red-600 mt-1">Yorumun en az 10 karakter olmalı.</p>
          </div>
          <p id="review-form-message" class="hidden text-sm font-semibold"></p>
          <button type="submit" class="px-6 py-3 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-black uppercase tracking-wider transition-colors">Değerlendirmeyi Gönder</button>
        </form>
      </div>
      <div class="space-y-3">${list}</div>
    </div>
  </div>`;
}

function ppInitReviewStars() {
  const box = document.getElementById('review-star-input');
  if (!box) return;
  PP.rating = 0;
  const paint = () => {
    box.innerHTML = [1, 2, 3, 4, 5].map((i) => `<button type="button" onclick="ppSetRating(${i})" class="p-0.5 transition-transform hover:scale-110" aria-label="${i} yıldız">
      <svg class="w-8 h-8 ${i <= PP.rating ? 'text-amber-400' : 'text-zinc-300'}" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    </button>`).join('');
  };
  box._paint = paint;
  paint();
}

function ppSetRating(n) {
  PP.rating = n;
  const box = document.getElementById('review-star-input');
  if (box && box._paint) box._paint();
  document.getElementById('review-rating-error')?.classList.add('hidden');
}

async function ppSubmitReview(event) {
  event.preventDefault();
  if (!PP.product) return;
  const name = (document.getElementById('review-name').value || '').trim();
  const email = (document.getElementById('review-email').value || '').trim();
  const text = (document.getElementById('review-text').value || '').trim();
  const msg = document.getElementById('review-form-message');
  const btn = event.target.querySelector('button[type="submit"]');

  if (!PP.rating) { document.getElementById('review-rating-error')?.classList.remove('hidden'); return; }
  if (name.length < 2) { showToast('Adını yazmalısın.', 'error'); return; }
  if (text.length < 10) { document.getElementById('review-text-error')?.classList.remove('hidden'); return; }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) { showToast('Geçerli bir e-posta gir.', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Gönderiliyor...';
  try {
    const res = await fetch(`/api/products/${PP.product.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, rating: PP.rating, text }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Gönderilemedi.');
    await ppLoadReviews(PP.product.id);
    await ppPaint();
    const m = document.getElementById('review-form-message');
    if (m) {
      m.className = 'text-sm font-semibold text-emerald-700';
      m.textContent = 'Teşekkürler! Değerlendirmen yayımlandı.';
      m.classList.remove('hidden');
    }
    document.getElementById('review-text').value = '';
    ppSetRating(0);
    showToast('Değerlendirmen eklendi.');
  } catch (err) {
    if (msg) {
      msg.className = 'text-sm font-semibold text-red-600';
      msg.textContent = err.message || 'Bir hata oluştu.';
      msg.classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Değerlendirmeyi Gönder';
  }
}

/* ---------------------------------------------------------- stok bildirimi */

async function ppCheckNotify() {
  if (!PP.product || PP.product.stock > 0) return;
  const saved = localStorage.getItem('vitrin_notify_email') || '';
  if (!saved) return;
  try {
    const res = await fetch(`/api/stock-notify?productId=${PP.product.id}&email=${encodeURIComponent(saved)}`);
    const data = await res.json();
    PP.notifyDone = !!data.alreadyRegistered;
  } catch (err) { /* sessiz */ }
}

async function ppSubmitNotify(event) {
  event.preventDefault();
  if (!PP.product) return;
  const input = document.getElementById('notify-email');
  const msg = document.getElementById('notify-message');
  const email = (input.value || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    msg.className = 'text-sm font-semibold text-red-600';
    msg.textContent = 'Geçerli bir e-posta adresi gir.';
    msg.classList.remove('hidden');
    return;
  }
  try {
    const res = await fetch('/api/stock-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: PP.product.id, email }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Kayıt yapılamadı.');
    localStorage.setItem('vitrin_notify_email', email);
    PP.notifyDone = true;
    msg.className = 'text-sm font-semibold text-emerald-700';
    msg.textContent = data.already ? 'Bu e-posta zaten listeye kayıtlıydı.' : 'Listeye eklendik! Ürün stoğa girdiğinde haber vereceğiz.';
    msg.classList.remove('hidden');
    input.value = '';
    input.disabled = true;
  } catch (err) {
    msg.className = 'text-sm font-semibold text-red-600';
    msg.textContent = err.message || 'Bir hata oluştu.';
    msg.classList.remove('hidden');
  }
}

/* ----------------------------------------------------------------- render */

function ppStockBlock(p, out, low) {
  if (out) {
    return `<div class="p-5 rounded-xl bg-amber-50 border border-amber-300">
      <p class="text-base font-black text-amber-900 mb-1 flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
        Şu an tükendi
      </p>
      <p class="text-sm text-amber-800 mb-4">Stoğa girdiğinde haber vereceğiz.</p>
      ${PP.notifyDone
        ? `<p class="text-sm font-bold text-emerald-700">✓ Listeye eklendin, haber vereceğiz.</p>`
        : `<form onsubmit="ppSubmitNotify(event)" class="flex flex-col sm:flex-row gap-2.5">
            <input type="email" id="notify-email" required placeholder="E-posta adresin" class="flex-1 px-3.5 py-3 rounded-lg border border-amber-400 bg-white text-sm focus:border-zinc-900 focus:outline-none" />
            <button type="submit" class="px-6 py-3 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-black uppercase tracking-wider transition-colors shrink-0">Bildirim Al</button>
          </form>`}
      <p id="notify-message" class="hidden mt-2.5"></p>
    </div>`;
  }
  if (low) {
    return `<div class="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center gap-3">
      <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
      <p class="text-sm font-black text-amber-900">Son ${p.stock} adet! <span class="font-semibold">Stok azaldı, kaçırma.</span></p>
    </div>`;
  }
  return `<p class="flex items-center gap-2 text-sm font-bold text-emerald-700">
    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Stokta (${p.stock} adet)
  </p>`;
}

async function ppPaint() {
  const box = document.getElementById('product-page');
  if (!box || !PP.product) return;
  const p = PP.product;

  const images = ppAllImages(p);
  const main = PP.image || images[0] || p.image || '/assets/images/placeholder.svg';
  const discount = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : null;
  const out = p.stock <= 0;
  const low = p.stock > 0 && p.stock <= 25;
  const isFav = state.favorites.includes(p.id);
  // Kilif disi urunlerde (ekran/sarj) gorsel kare formatinda ve kucuk kutu
  const isCase = p.category === 'Kılıf & Koruma';
  // Kılıf dışı aksesuarlarda kutu, açıklama uzunluğuna göre orantılı ölçeklenir
  const desc = p.description || p.shortDescription || '';
  const descLen = desc.trim().length;
  let boxCls = 'relative w-full aspect-[4/5]';
  if (!isCase) {
    if (descLen > 320) boxCls = 'relative w-full aspect-square';
    else if (descLen > 180) boxCls = 'relative w-full aspect-[5/4]';
    else if (descLen > 90) boxCls = 'relative w-full aspect-[4/3]';
    else boxCls = 'relative w-full aspect-[16/10]';
  }

  const thumbs = isCase && images.length > 1
    ? `<div class="flex gap-2.5 mt-3 overflow-x-auto pb-1">
        ${images.map((img, i) => `<button onclick="ppSelectImage(${i})" title="Görsel ${i + 1}" class="w-[72px] h-[72px] shrink-0 rounded-lg border-2 overflow-hidden bg-zinc-50 transition-colors ${img === main ? 'border-zinc-950' : 'border-zinc-200 hover:border-zinc-400'}">
          <img src="${img}" alt="${ppEsc(p.name)}" class="w-full h-full object-contain" loading="lazy" />
        </button>`).join('')}
      </div>`
    : '';

  const colorBlock = (p.variantOptions?.colors || []).length
    ? `<div>
        <div class="flex items-baseline justify-between mb-2.5">
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-500">Renk</span>
          <span class="text-sm font-bold text-zinc-950">${ppEsc(PP.color ? PP.color.name : '')}</span>
        </div>
        <div class="flex flex-wrap gap-2.5">
          ${p.variantOptions.colors.map((c, i) => `<button onclick="ppSelectColor(${i})" title="${ppEsc(c.name)}" class="w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${PP.color && PP.color.name === c.name ? 'border-zinc-950 scale-105' : 'border-zinc-200 hover:border-zinc-400'}">
            ${c.image
              ? `<img src="${c.image}" alt="${ppEsc(c.name)}" class="w-full h-full object-contain" />`
              : `<span class="w-full h-full block" style="background:${c.hex}"></span>`}
          </button>`).join('')}
        </div>
      </div>` : '';

  const modelBlock = (p.variantOptions?.models || []).length
    ? `<div>
        <div class="flex items-center justify-between mb-2.5">
          <label for="pp-model" class="text-xs font-bold uppercase tracking-wider text-zinc-500">Telefon Markanızı Seçin <span class="text-red-500">*</span></label>
          <span class="text-sm font-bold text-zinc-950">${ppEsc(PP.model || '')}</span>
        </div>
        <select id="pp-model" onchange="ppSelectModel(this.value)" class="w-full px-3.5 py-3 rounded-lg border border-zinc-300 text-sm font-semibold text-zinc-900 focus:border-zinc-900 focus:outline-none bg-white">
          ${p.variantOptions.models.map((m) => `<option value="${ppEsc(m)}" ${PP.model === m ? 'selected' : ''}>${ppEsc(m)}</option>`).join('')}
        </select>
        <p class="text-[11px] text-zinc-400 mt-1.5">${p.variantOptions.models.length} model ile uyumlu</p>
      </div>` : '';

  const related = state.products.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 5);
  const features = ppFeatures(p);

  box.innerHTML = `
  <nav class="flex items-center gap-2 text-sm text-zinc-500 mb-6">
    <a href="/" class="hover:text-zinc-950 hover:underline">Ana Sayfa</a>
    <span>/</span>
    <a href="/" class="hover:text-zinc-950 hover:underline">${ppEsc(p.category)}</a>
    <span>/</span>
    <span class="text-zinc-950 font-semibold truncate">${ppEsc(p.name)}</span>
  </nav>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-14 items-start">
    <!-- SOL: GALERI -->
    <div class="lg:sticky lg:top-24">
      <div id="pp-zoom-wrap" class="${boxCls} rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden cursor-zoom-in">
        <img id="pp-main-image" src="${main}" alt="${ppEsc(p.name)}" class="w-full h-full object-contain select-none ${isCase ? 'p-6' : 'p-4'}" onload="ppFitNative(this)" />
        <div id="pp-zoom-lens" class="pp-zoom-lens"><img id="pp-zoom-img" src="" alt="" draggable="false" /><span class="pp-zoom-crosshair"></span></div>
        <div class="absolute top-4 left-4 flex flex-col items-start gap-1.5 pointer-events-none">
          ${p.badge ? `<span class="px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-black uppercase tracking-wider">${ppEsc(p.badge)}</span>` : ''}
          ${discount ? `<span class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-black">-%${discount}</span>` : ''}
        </div>
        ${out ? '<div class="absolute inset-0 bg-white/70 flex items-center justify-center"><span class="px-4 py-2 rounded-lg bg-zinc-950 text-white text-sm font-black uppercase tracking-wider">Tükendi</span></div>' : ''}
        <span class="pp-zoom-tag absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-zinc-950/70 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M11 8v6M8 11h6"/></svg>
          Yakınlaştırmak için üzerine gel
        </span>
      </div>
      ${thumbs}
      ${(!isCase && desc) ? `<div class="mt-4 p-4 rounded-xl bg-white border border-zinc-200">
        <h2 class="font-display text-lg font-black text-zinc-950 mb-1.5">Ürün Hakkında</h2>
        <p class="text-sm text-zinc-600 leading-relaxed">${ppEsc(desc)}</p>
      </div>` : ''}
      <div class="mt-3 grid grid-cols-3 gap-2.5">
        <div class="p-2.5 rounded-lg bg-white border border-zinc-200 text-center">
          <p class="text-base font-black text-zinc-950">2 Yıl</p>
          <p class="text-[11px] font-semibold text-zinc-500">Garanti</p>
        </div>
        <div class="p-2.5 rounded-lg bg-white border border-zinc-200 text-center">
          <p class="text-base font-black text-zinc-950">14 Gün</p>
          <p class="text-[11px] font-semibold text-zinc-500">İade Hakkı</p>
        </div>
        <div class="p-2.5 rounded-lg bg-white border border-zinc-200 text-center">
          <p class="text-base font-black text-zinc-950">Aynı Gün</p>
          <p class="text-[11px] font-semibold text-zinc-500">Kargo</p>
        </div>
      </div>
    </div>

    <!-- SAG: BILGI -->
    <div>
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <span class="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-black uppercase tracking-wider">${ppEsc(p.category)}</span>
        <span class="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-black uppercase tracking-wider">${ppEsc(p.collection === 'diger' ? 'Genel' : p.collection)}</span>
        ${out ? '<span class="px-2.5 py-1 rounded-md bg-red-600 text-white text-[11px] font-black uppercase tracking-wider">Tükeniyor</span>' : ''}
      </div>

      <h1 class="font-display text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight leading-tight">${ppEsc(p.name)}</h1>

      <a href="#yorumlar" class="flex items-center gap-2.5 mt-3">
        ${ppStars(PP.summary.count ? PP.summary.avg : (p.rating || 0), 'w-4 h-4')}
        <span class="text-sm text-zinc-600 underline underline-offset-2">${PP.summary.count ? PP.summary.count + ' değerlendirme' : 'Henüz değerlendirme yok'}</span>
      </a>

      <div class="mt-5 flex flex-wrap items-baseline gap-3">
        <span class="text-4xl font-black text-zinc-950 tabular-nums">${formatCurrency(p.price)}</span>
        ${p.oldPrice ? `<span class="text-lg text-zinc-400 line-through tabular-nums">${formatCurrency(p.oldPrice)}</span>` : ''}
        ${discount ? `<span class="px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-sm font-black">%${discount} indirim</span>` : ''}
      </div>

      <a href="#" onclick="openLegalModal('iade'); return false;" class="inline-block mt-2 text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-950">İptal ve İade Politikası</a>

      <div class="mt-5 space-y-5">
        ${modelBlock}
        ${colorBlock}
      </div>

      <div class="mt-5">${ppStockBlock(p, out, low)}</div>

      <!-- KAMPANYA + SAYAC -->
      <div class="mt-5 p-5 rounded-xl bg-white border-2 border-zinc-950 text-center">
        <p class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-black uppercase tracking-wider mb-3">
          Kampanya devam ediyor
        </p>
        <p class="font-display text-2xl font-black tracking-tight text-zinc-950">3 AL 2 ÖDE + %50 İNDİRİM</p>
        <p class="text-sm text-zinc-600 mt-1.5 mb-4">Süre dolmadan siparişini tamamla, avantajlı fiyatı kaçırma.</p>
        <div id="pp-countdown" class="flex items-center justify-center gap-1.5 flex-wrap"></div>
      </div>

      <!-- SEPET -->
      <div class="mt-5 flex flex-wrap items-center gap-3">
        <div class="flex items-center rounded-xl bg-zinc-100 border border-zinc-300 p-1">
          <button onclick="ppChangeQty(-1)" class="w-11 h-11 flex items-center justify-center text-xl font-bold text-zinc-800 hover:text-black" aria-label="Azalt">−</button>
          <span id="pp-qty" class="w-12 text-center text-base font-black text-zinc-950 tabular-nums">${PP.qty}</span>
          <button onclick="ppChangeQty(1)" class="w-11 h-11 flex items-center justify-center text-xl font-bold text-zinc-800 hover:text-black" aria-label="Arttır">+</button>
        </div>
        <button onclick="ppAddToCart()" ${out ? 'disabled' : ''} class="flex-1 min-w-[200px] py-4 px-6 rounded-xl bg-cyan-700 hover:bg-cyan-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base font-black uppercase tracking-wider transition-colors shadow-sm">${out ? 'Tükendi' : 'Sepete Ekle'}</button>
        <button onclick="ppToggleFav()" class="w-14 h-14 shrink-0 rounded-xl border border-zinc-300 hover:border-zinc-900 flex items-center justify-center transition-colors" title="Favorilere ekle" aria-label="Favorilere ekle">
          <svg class="w-6 h-6 ${isFav ? 'text-red-500' : 'text-zinc-500'}" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      <p class="mt-2.5 text-sm text-zinc-500">Seçilen: <span id="pp-variant-label" class="font-bold text-zinc-800">${ppEsc(ppVariantLabel())}</span></p>

      <div class="mt-5 pt-5 border-t border-zinc-200">
        ${ppShareHtml()}
      </div>

      <!-- OZELLIKLER -->
      <div class="mt-5 pt-5 border-t border-zinc-200">
        <span class="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Ürün Özellikleri</span>
        <ul class="space-y-2">
          ${features.map((f) => `<li class="flex items-start gap-2.5 text-sm text-zinc-700">
            <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
            <span>${ppEsc(f)}</span></li>`).join('')}
        </ul>
      </div>

      <!-- KARGO / IADE -->
      <div class="mt-5 pt-5 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="p-4 rounded-lg bg-white border border-zinc-200">
          <p class="text-sm font-black text-zinc-950 mb-1">Kargo</p>
          <p class="text-[13px] text-zinc-600 leading-relaxed">16:00'a kadar verilen siparişler aynı gün kargoya verilir. 1.000 TL üzeri kargo bedava.</p>
        </div>
        <div class="p-4 rounded-lg bg-white border border-zinc-200">
          <p class="text-sm font-black text-zinc-950 mb-1">İade</p>
          <p class="text-[13px] text-zinc-600 leading-relaxed">Teslimden itibaren 14 gün içinde koşulsuz iade. Kargo iadesi bize aittir.</p>
        </div>
      </div>

      <!-- ODEME GUVENLIGI -->
      <div class="mt-5 flex flex-wrap items-center gap-2.5">
        <span class="px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-600 text-[11px] font-black uppercase tracking-wider">iyzico 3D Secure</span>
        <span class="px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-600 text-[11px] font-black uppercase tracking-wider">256-Bit SSL</span>
        <span class="px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-600 text-[11px] font-black uppercase tracking-wider">Kapıda Ödeme</span>
      </div>
    </div>
  </div>

  ${(isCase && p.description) ? `<section class="mb-14">
    <h2 class="font-display text-2xl font-black text-zinc-950 mb-4">Ürün Açıklaması</h2>
    <p class="text-zinc-700 leading-relaxed max-w-3xl">${ppEsc(p.description)}</p>
  </section>` : ''}

  <section id="yorumlar" class="mb-14 pt-4 scroll-mt-28">
    <h2 class="font-display text-2xl font-black text-zinc-950 mb-6">Değerlendirmeler</h2>
    ${ppReviewsHtml()}
  </section>

  ${related.length ? `<section>
    <h2 class="font-display text-2xl font-black text-zinc-950 mb-6">Benzer Ürünler</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
      ${related.map((r) => `<a href="/urun/${r.id}" class="compact-card rounded-lg overflow-hidden flex flex-col group">
        <div class="relative w-full aspect-[4/5] bg-zinc-50 overflow-hidden">
          <img src="${r.image || '/assets/images/placeholder.svg'}" alt="${ppEsc(r.name)}" loading="lazy" class="w-full h-full object-contain object-center p-4 group-hover:scale-[1.03] transition-transform duration-500" />
          ${r.stock <= 0 ? '<div class="absolute inset-0 bg-white/70 flex items-center justify-center"><span class="px-2.5 py-1 rounded-md bg-zinc-950 text-white text-[10px] font-black uppercase">Tükendi</span></div>' : ''}
        </div>
        <div class="p-3.5 flex flex-col flex-1">
          <h3 class="text-sm font-bold text-zinc-950 leading-snug line-clamp-2 mb-2">${ppEsc(r.name)}</h3>
          <div class="mt-auto pt-2 border-t border-zinc-200 flex items-center justify-between">
            <p class="text-lg font-black text-zinc-950 tabular-nums">${formatCurrency(r.price)}</p>
            <p class="text-xs font-bold text-zinc-500">★ ${r.rating || '-'}</p>
          </div>
        </div>
      </a>`).join('')}
    </div>
  </section>` : ''}`;

  if (document.getElementById('review-form')) {
    document.getElementById('review-form').addEventListener('submit', ppSubmitReview);
    ppInitReviewStars();
  }
  ppInitZoom();
  ppStartTimer();
  if (out) await ppCheckNotify();
}

/* ---------------------------------------------------------------- eylemler */

function ppFitNative(img) {
  // Düşük çözünürlüklü görselleri aşırı büyütüp bulanıklaştırmıyoruz,
  // ama kutu gereksiz yere boş kalmasın diye en az %70'ini dolduruyoruz.
  const box = img.parentElement;
  if (!box) return;
  const nw = img.naturalWidth;
  const boxW = box.clientWidth || 0;
  if (!nw || !boxW) return;
  const minW = boxW * 0.7;
  const target = Math.min(Math.max(nw, minW), boxW);
  if (target >= boxW) {
    img.classList.remove('pp-native-size');
    img.style.width = '';
    return;
  }
  img.classList.add('pp-native-size');
  img.style.width = target + 'px';
  img.style.objectFit = 'contain';
}

function ppSelectImage(i) {
  const images = ppAllImages(PP.product);
  PP.image = images[i];
  ppPaint();
}

function ppSelectColor(i) {
  const colors = PP.product.variantOptions?.colors || [];
  PP.color = colors[i] || null;
  if (PP.color && PP.color.image) PP.image = PP.color.image;
  ppPaint();
}

function ppSelectModel(m) {
  PP.model = m;
  const label = document.getElementById('pp-variant-label');
  if (label) label.textContent = ppVariantLabel();
}

function ppChangeQty(d) {
  const max = Math.max(1, PP.product ? PP.product.stock : 1);
  PP.qty = Math.min(Math.max(1, PP.qty + d), max);
  const el = document.getElementById('pp-qty');
  if (el) el.textContent = PP.qty;
}

function ppAddToCart() {
  const p = PP.product;
  if (!p || p.stock <= 0) return;
  addToCart(p, PP.qty, ppVariantLabel());
  showToast(`${p.name} sepete eklendi (${PP.qty} adet).`);
  openCartDrawer();
}

function ppToggleFav() {
  if (typeof toggleFavorite === 'function') toggleFavorite(PP.product.id);
  ppPaint();
}

function goToProduct(id) {
  window.location.href = '/urun/' + id;
}

/* ------------------------------------------------------------------ init */

function ppSeo(product) {
  const title = `${product.name} | vitrin.`;
  const desc = `${product.name} — ${product.category}. ${formatCurrency(product.price)}. 3 Al 2 Öde kampanyasına dahil, 1.000 TL üzeri ücretsiz kargo.`;
  document.title = title;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.setAttribute('content', val); };
  set('seo-description', desc);
  set('og-type', 'product');
  set('og-title', title);
  set('og-description', desc);
  set('og-image', product.image || '/assets/images/banner.png');
}

async function ppInit() {
  const m = location.pathname.match(/^\/urun\/(\d+)\/?$/);
  if (!m) return;

  let tries = 0;
  while ((!state.products || !state.products.length) && tries < 40) {
    await new Promise((r) => setTimeout(r, 100));
    tries++;
  }

  const product = (state.products || []).find((p) => p.id.toString() === m[1]);
  const shell = document.getElementById('product-page');
  const main = document.getElementById('urunler');

  if (!product) {
    if (main) main.classList.remove('hidden');
    if (shell) {
      shell.classList.remove('hidden');
      shell.innerHTML = `<div class="py-20 text-center">
        <h1 class="font-display text-3xl font-black text-zinc-950 mb-3">Ürün bulunamadı</h1>
        <p class="text-zinc-500 mb-6">Aradığınız ürün kaldırılmış olabilir.</p>
        <a href="/" class="inline-block px-6 py-3 rounded-lg bg-zinc-950 text-white text-sm font-black uppercase tracking-wider">Ana Sayfaya Dön</a>
      </div>`;
    }
    return;
  }

  PP.product = product;
  PP.qty = 1;
  PP.image = ppAllImages(product)[0] || product.image || null;
  PP.color = product.variantOptions?.colors?.[0] || null;
  PP.model = product.variantOptions?.models?.[0] || null;

  if (main) main.classList.add('hidden');
  document.querySelectorAll('body > section').forEach((el) => el.classList.add('hidden'));
  if (shell) {
    shell.classList.remove('hidden');
    shell.className = 'flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12';
  }

  ppSeo(product);
  await ppLoadReviews(product.id);
  await ppPaint();
  window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => { ppInit(); });
