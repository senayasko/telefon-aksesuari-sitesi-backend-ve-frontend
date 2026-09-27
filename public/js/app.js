/**
 * VİTRİN — Gen-Z D2C E-Ticaret Uygulaması
 * Çarkıfelek (Spin the Wheel), Yan Menü Filtreleri, Kompakt Ürün Kartları ve 3 Al 2 Öde.
 */

// State Management
const state = {
  products: [],
  activeCategory: 'Kılıf & Koruma', // Default Kılıflar
  selectedModelFilter: 'all',
  onlyCampaignFilter: false,
  searchQuery: '',
  sortBy: 'featured',
  cart: JSON.parse(localStorage.getItem('vitrin_cart') || '[]'),
  appliedCoupon: JSON.parse(localStorage.getItem('vitrin_coupon') || 'null'),
  selectedProduct: null,
  selectedVariant: {
    color: null,
    model: null
  },
  modalQuantity: 1,
  checkoutPaymentMethod: 'iyzico',
  shippingThreshold: 1000.00,
  defaultShippingFee: 59.90,
  doorServiceFee: 29.90,
  wheelSpun: localStorage.getItem('vitrin_wheel_spun') === 'true'
};

// Wheel Configuration
const WHEEL_PRIZES = [
  { text: '3 AL 2 ÖDE', code: '3AL2ODE', color: '#09090b', textCol: '#ffffff' },
  { text: '%20 İNDİRİM', code: 'GENCLIK20', color: '#0284c7', textCol: '#ffffff' },
  { text: '100 TL İNDİRİM', code: 'ILKSIPARIS', color: '#10b981', textCol: '#ffffff' },
  { text: 'ŞANSLI GÜN %25', code: 'HOCA100', color: '#8b5cf6', textCol: '#ffffff' },
  { text: '%10 HOŞGELDİN', code: 'VITRIN10', color: '#f59e0b', textCol: '#000000' },
  { text: 'TEKRAR DENE', code: null, color: '#e2e8f0', textCol: '#0f172a' }
];

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  await loadProducts();
  renderProducts();
  updateCartUI();
  setupEventListeners();
  checkCookieConsent();
  handleUrlHash();
  initSpinWheel();

  // Auto trigger wheel on entry if not spun yet (Gen-Z dropshipping hook)
  if (!state.wheelSpun) {
    setTimeout(() => {
      openWheelModal();
    }, 1200);
  }
}

// ======================== PRODUCTS & FILTERING ========================

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      state.products = data.products;
    }
  } catch (err) {
    console.error('Ürünler yüklenirken hata:', err);
    showToast('Ürünler yüklenemedi.', 'error');
  }
}

function renderProducts() {
  const container = document.getElementById('products-grid');
  if (!container) return;

  let filtered = [...state.products];

  // Category filter
  if (state.activeCategory !== 'Tümü') {
    filtered = filtered.filter(p => p.category.toLowerCase() === state.activeCategory.toLowerCase());
  }

  // Model filter (if selected)
  if (state.selectedModelFilter !== 'all') {
    filtered = filtered.filter(p => 
      !p.variantOptions || 
      p.variantOptions.models.includes(state.selectedModelFilter)
    );
  }

  // Campaign filter (3 al 2 öde)
  if (state.onlyCampaignFilter) {
    filtered = filtered.filter(p => p.category === 'Kılıf & Koruma' || p.badge?.includes('3 AL 2'));
  }

  // Search filter
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q)
    );
  }

  // Sorting
  if (state.sortBy === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  // Header active tag indicator
  const activeFilterIndicator = document.getElementById('active-filter-indicator');
  if (activeFilterIndicator) {
    activeFilterIndicator.innerText = `${state.activeCategory} (${filtered.length} Ürün)`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-zinc-500">
        <p class="text-sm font-semibold text-zinc-800">Seçilen filtrelerde ürün bulunamadı.</p>
        <button onclick="resetFilters()" class="mt-2 text-xs font-bold text-zinc-950 underline">Filtreleri Temizle</button>
      </div>
    `;
    return;
  }

  // Render COMPACT cards (No descriptions, huge visual impact, compact box)
  container.innerHTML = filtered.map(product => {
    const discountPercent = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;
    const isLowStock = product.stock > 0 && product.stock <= 25;
    const isOutOfStock = product.stock <= 0;

    return `
      <div class="compact-card rounded-2xl overflow-hidden flex flex-col group cursor-pointer relative" onclick="openProductModal(${product.id})">
        
        <!-- Image Box -->
        <div class="relative w-full aspect-square bg-zinc-100 overflow-hidden">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            loading="lazy"
            class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            onerror="this.src='https://images.unsplash.com/photo-1584006682522-dc17d6c0d9ac?auto=format&fit=crop&w=800&q=80'"
          />
          
          <!-- Badges -->
          <div class="absolute top-2 left-2 flex flex-col gap-1 z-10">
            ${product.badge ? `
              <span class="px-2 py-0.5 text-[9px] font-black rounded-md bg-zinc-950 text-white tracking-wider uppercase shadow-sm">
                ${product.badge}
              </span>
            ` : ''}
            ${discountPercent ? `
              <span class="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-red-600 text-white">
                -%${discountPercent}
              </span>
            ` : ''}
          </div>

          <!-- Stock Pill -->
          ${isLowStock ? `
            <div class="absolute bottom-2 left-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-50 text-amber-900 border border-amber-200">
              Son ${product.stock}
            </div>
          ` : ''}

          ${isOutOfStock ? `
            <div class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
              <span class="px-2.5 py-1 bg-zinc-950 text-white text-[10px] font-bold rounded uppercase">Tükendi</span>
            </div>
          ` : ''}
        </div>

        <!-- Compact Info (No descriptions) -->
        <div class="p-3.5 flex flex-col flex-1 justify-between bg-white">
          <div>
            <div class="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
              <span class="font-medium truncate">${product.category}</span>
              <span class="text-zinc-800 font-bold">★ ${product.rating}</span>
            </div>

            <h3 class="font-bold text-zinc-900 text-xs leading-snug line-clamp-2 group-hover:text-zinc-600 transition-colors">
              ${product.name}
            </h3>
          </div>

          <div class="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
            <div>
              <span class="text-xs font-black text-zinc-950 block">${formatCurrency(product.price)}</span>
              ${product.oldPrice ? `
                <span class="text-[10px] text-zinc-400 line-through">${formatCurrency(product.oldPrice)}</span>
              ` : ''}
            </div>

            <button 
              onclick="event.stopPropagation(); quickAddToCart(${product.id})"
              ${isOutOfStock ? 'disabled' : ''}
              class="w-7 h-7 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center transition-all disabled:opacity-40"
              title="Hızlı İncele & Ekle"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

// ======================== SIDE DRAWER FILTERS (Yan Menü) ========================

function openFilterDrawer() {
  const drawer = document.getElementById('filter-drawer');
  const panel = document.getElementById('filter-drawer-panel');
  drawer.classList.remove('hidden');
  setTimeout(() => {
    panel.classList.remove('-translate-x-full');
  }, 10);
  document.body.style.overflow = 'hidden';
}

function closeFilterDrawer() {
  const drawer = document.getElementById('filter-drawer');
  const panel = document.getElementById('filter-drawer-panel');
  panel.classList.add('-translate-x-full');
  setTimeout(() => {
    drawer.classList.add('hidden');
    document.body.style.overflow = '';
  }, 300);
}

function applyDrawerCategory(cat) {
  state.activeCategory = cat;
  renderProducts();
  closeFilterDrawer();
}

function applyDrawerModel(model) {
  state.selectedModelFilter = model;
  renderProducts();
  closeFilterDrawer();
}

function toggleCampaignFilter(checked) {
  state.onlyCampaignFilter = checked;
  renderProducts();
}

function resetFilters() {
  state.activeCategory = 'Tümü';
  state.selectedModelFilter = 'all';
  state.onlyCampaignFilter = false;
  state.searchQuery = '';
  state.sortBy = 'featured';
  document.getElementById('search-input').value = '';
  renderProducts();
  closeFilterDrawer();
}

// ======================== SPIN THE WHEEL (ÇARKIFELEK) ========================

let wheelCanvas = null;
let wheelCtx = null;
let currentRotation = 0;
let isSpinning = false;

function initSpinWheel() {
  wheelCanvas = document.getElementById('wheel-canvas');
  if (!wheelCanvas) return;
  wheelCtx = wheelCanvas.getContext('2d');
  drawWheel();
}

function drawWheel() {
  if (!wheelCtx) return;
  const numPrizes = WHEEL_PRIZES.length;
  const arc = (2 * Math.PI) / numPrizes;
  const radius = wheelCanvas.width / 2;

  wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

  WHEEL_PRIZES.forEach((prize, i) => {
    const angle = i * arc;

    // Draw sector
    wheelCtx.beginPath();
    wheelCtx.fillStyle = prize.color;
    wheelCtx.moveTo(radius, radius);
    wheelCtx.arc(radius, radius, radius - 4, angle, angle + arc);
    wheelCtx.lineTo(radius, radius);
    wheelCtx.fill();
    wheelCtx.strokeStyle = '#ffffff';
    wheelCtx.lineWidth = 3;
    wheelCtx.stroke();

    // Draw text
    wheelCtx.save();
    wheelCtx.translate(radius, radius);
    wheelCtx.rotate(angle + arc / 2);
    wheelCtx.textAlign = 'right';
    wheelCtx.fillStyle = prize.textCol;
    wheelCtx.font = 'bold 12px "Space Grotesk", sans-serif';
    wheelCtx.fillText(prize.text, radius - 20, 5);
    wheelCtx.restore();
  });

  // Center hub
  wheelCtx.beginPath();
  wheelCtx.fillStyle = '#ffffff';
  wheelCtx.arc(radius, radius, 26, 0, 2 * Math.PI);
  wheelCtx.fill();
  wheelCtx.lineWidth = 3;
  wheelCtx.strokeStyle = '#09090b';
  wheelCtx.stroke();

  wheelCtx.fillStyle = '#09090b';
  wheelCtx.font = 'black 10px sans-serif';
  wheelCtx.textAlign = 'center';
  wheelCtx.fillText('VİTRİN', radius, radius + 3);
}

function openWheelModal() {
  const modal = document.getElementById('wheel-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeWheelModal() {
  const modal = document.getElementById('wheel-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function spinWheel() {
  if (isSpinning) return;
  isSpinning = true;

  const btn = document.getElementById('spin-btn');
  if (btn) btn.disabled = true;

  // Realistic weighted probability (no rigged 2-item loop)
  // Indices: 0: 3AL2ODE (35%), 1: GENCLIK20 (25%), 2: ILKSIPARIS (15%), 3: HOCA100 (15%), 4: VITRIN10 (10%)
  const rand = Math.random();
  let winningIndex = 0;
  if (rand < 0.35) winningIndex = 0;
  else if (rand < 0.60) winningIndex = 1;
  else if (rand < 0.75) winningIndex = 2;
  else if (rand < 0.90) winningIndex = 3;
  else winningIndex = 4;

  const numPrizes = WHEEL_PRIZES.length;
  const arcDeg = 360 / numPrizes;

  // Calculation for the needle pointing to top (270 deg)
  const targetDeg = 270 - (winningIndex * arcDeg + arcDeg / 2);
  const extraSpins = 6 * 360; // 6 full revolutions
  const finalRotation = extraSpins + ((targetDeg % 360) + 360) % 360;

  const canvas = document.getElementById('wheel-canvas');
  canvas.style.transform = `rotate(${finalRotation}deg)`;

  setTimeout(() => {
    isSpinning = false;
    state.wheelSpun = true;
    localStorage.setItem('vitrin_wheel_spun', 'true');

    const wonPrize = WHEEL_PRIZES[winningIndex];
    showWheelWinningModal(wonPrize);
  }, 4200);
}

function showWheelWinningModal(prize) {
  document.getElementById('wheel-result-title').innerText = `TEBRİKLER! ${prize.text} KAZANDINIZ!`;
  document.getElementById('wheel-coupon-code').innerText = prize.code;
  
  document.getElementById('wheel-play-view').classList.add('hidden');
  document.getElementById('wheel-win-view').classList.remove('hidden');

  // Accurately map coupon values
  let couponType = 'percentage';
  let couponVal = 20;

  if (prize.code === '3AL2ODE') {
    couponType = 'percentage';
    couponVal = 33.33;
  } else if (prize.code === 'GENCLIK20') {
    couponType = 'percentage';
    couponVal = 20;
  } else if (prize.code === 'ILKSIPARIS') {
    couponType = 'fixed';
    couponVal = 100;
  } else if (prize.code === 'HOCA100') {
    couponType = 'percentage';
    couponVal = 25;
  } else if (prize.code === 'VITRIN10') {
    couponType = 'percentage';
    couponVal = 10;
  }

  state.appliedCoupon = {
    code: prize.code,
    type: couponType,
    value: couponVal,
    description: `${prize.text} (Çarkıfelek Hediyesi)`
  };
  localStorage.setItem('vitrin_coupon', JSON.stringify(state.appliedCoupon));
  updateCartUI();
  showToast(`${prize.text} kuponunuz sepetinize uygulandı!`, 'success');
}

function applyWheelCouponAndClose() {
  closeWheelModal();
  openCartDrawer();
}

// ======================== PRODUCT DETAIL MODAL & VARIATIONS ========================

function openProductModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.selectedProduct = product;
  state.modalQuantity = 1;

  if (product.hasVariants && product.variantOptions) {
    state.selectedVariant.color = product.variantOptions.colors[0];
    state.selectedVariant.model = product.variantOptions.models[0];
  } else {
    state.selectedVariant.color = null;
    state.selectedVariant.model = null;
  }

  renderProductModalContent();
  const modal = document.getElementById('product-modal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function renderProductModalContent() {
  const product = state.selectedProduct;
  if (!product) return;

  const content = document.getElementById('product-modal-content');
  const discountPercent = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Image Gallery -->
      <div class="flex flex-col gap-2.5">
        <div class="w-full aspect-square rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 relative">
          <img 
            id="modal-main-image"
            src="${product.image}" 
            alt="${product.name}" 
            class="w-full h-full object-cover"
          />
          ${product.badge ? `
            <span class="absolute top-3 left-3 px-2.5 py-1 bg-zinc-950 text-white text-[10px] font-black rounded uppercase">
              ${product.badge}
            </span>
          ` : ''}
        </div>

        ${product.gallery && product.gallery.length > 1 ? `
          <div class="flex gap-2 overflow-x-auto pb-1">
            ${product.gallery.map(img => `
              <button 
                onclick="document.getElementById('modal-main-image').src='${img}'"
                class="w-14 h-14 rounded-xl overflow-hidden border border-zinc-200 hover:border-zinc-950 transition-all flex-shrink-0"
              >
                <img src="${img}" class="w-full h-full object-cover" />
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Info -->
      <div class="flex flex-col justify-between text-xs">
        <div>
          <div class="flex items-center justify-between text-zinc-500 mb-1.5">
            <span class="font-bold uppercase tracking-wider text-[10px] text-zinc-600">${product.category}</span>
            <span class="font-bold text-zinc-800">★ ${product.rating} (${product.reviewCount})</span>
          </div>

          <h2 class="text-xl font-black text-zinc-950 font-display leading-tight">
            ${product.name}
          </h2>

          <div class="mt-2.5 flex items-baseline gap-2.5">
            <span class="text-2xl font-black text-zinc-950">${formatCurrency(product.price)}</span>
            ${product.oldPrice ? `
              <span class="text-sm text-zinc-400 line-through">${formatCurrency(product.oldPrice)}</span>
              <span class="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded">-%${discountPercent}</span>
            ` : ''}
          </div>

          <div class="mt-2.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
            <span>🎁</span>
            <span>3 Al 2 Öde Kampanyasına Dahildir!</span>
          </div>

          <p class="mt-3 text-zinc-600 leading-relaxed text-xs">
            ${product.description}
          </p>

          <!-- Variations -->
          ${product.hasVariants && product.variantOptions ? `
            <div class="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
              <div>
                <label class="block text-[11px] font-bold text-zinc-700 mb-1.5">
                  Renk: <span class="text-zinc-950">${state.selectedVariant.color.name}</span>
                </label>
                <div class="flex gap-2">
                  ${product.variantOptions.colors.map(c => `
                    <button 
                      type="button"
                      onclick="selectVariantColor('${c.name}', '${c.hex}')"
                      class="color-swatch w-7 h-7 rounded-full border-2 transition-all relative ${state.selectedVariant.color.name === c.name ? 'border-zinc-950 scale-110' : 'border-transparent'}"
                      style="background-color: ${c.hex};"
                      title="${c.name}"
                    >
                      ${state.selectedVariant.color.name === c.name ? '<span class="absolute inset-0 flex items-center justify-center text-white text-[9px]">✓</span>' : ''}
                    </button>
                  `).join('')}
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-zinc-700 mb-1.5">
                  Model: <span class="text-zinc-950">${state.selectedVariant.model}</span>
                </label>
                <div class="grid grid-cols-2 gap-1.5">
                  ${product.variantOptions.models.map(m => `
                    <button 
                      type="button"
                      onclick="selectVariantModel('${m}')"
                      class="py-1.5 px-2 text-[11px] font-semibold rounded-lg border text-left transition-all ${state.selectedVariant.model === m ? 'border-zinc-950 bg-zinc-950 text-white font-bold' : 'border-zinc-200 bg-white text-zinc-700'}"
                    >
                      ${m}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <div class="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-600">
            <span class="w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'}"></span>
            <span>Stok Durumu: <strong>${product.stock} Adet</strong></span>
          </div>
        </div>

        <!-- Add to cart -->
        <div class="mt-5 pt-4 border-t border-zinc-200 flex items-center gap-3">
          <div class="flex items-center rounded-xl bg-zinc-100 border border-zinc-200 p-0.5">
            <button onclick="changeModalQty(-1)" class="w-7 h-7 flex items-center justify-center font-bold text-zinc-800">-</button>
            <span id="modal-qty-display" class="w-7 text-center font-bold text-zinc-950 text-xs">1</span>
            <button onclick="changeModalQty(1)" class="w-7 h-7 flex items-center justify-center font-bold text-zinc-800">+</button>
          </div>

          <button 
            onclick="addModalProductToCart()"
            ${product.stock <= 0 ? 'disabled' : ''}
            class="flex-1 py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span>Sepete Ekle</span>
            <span>•</span>
            <span>${formatCurrency(product.price)}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function selectVariantColor(name, hex) {
  state.selectedVariant.color = { name, hex };
  renderProductModalContent();
}

function selectVariantModel(modelName) {
  state.selectedVariant.model = modelName;
  renderProductModalContent();
}

function changeModalQty(delta) {
  const newQty = state.modalQuantity + delta;
  if (newQty >= 1 && newQty <= (state.selectedProduct?.stock || 10)) {
    state.modalQuantity = newQty;
    document.getElementById('modal-qty-display').innerText = newQty;
  }
}

function addModalProductToCart() {
  if (!state.selectedProduct) return;
  const product = state.selectedProduct;

  let variantName = 'Standart';
  if (product.hasVariants && state.selectedVariant.color && state.selectedVariant.model) {
    variantName = `${state.selectedVariant.color.name} / ${state.selectedVariant.model}`;
  }

  addToCart(product, state.modalQuantity, variantName);
  closeProductModal();
  openUpsellModal(product);
}

function quickAddToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (product.hasVariants) {
    openProductModal(productId);
  } else {
    addToCart(product, 1, 'Standart');
    openUpsellModal(product);
  }
}

// ======================== UPSELL MODAL (Gen-Z Nudge) ========================

function openUpsellModal(lastAddedProduct) {
  const modal = document.getElementById('upsell-modal');
  if (!modal) return;

  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const remainingFor3Al2 = Math.max(0, 3 - totalCount);

  document.getElementById('upsell-added-item-name').innerText = lastAddedProduct.name;
  
  const alertBox = document.getElementById('upsell-campaign-alert');
  if (totalCount >= 3) {
    alertBox.innerHTML = `
      <span class="text-emerald-700 font-bold">🎉 TEBRİKLER! Sepetinizde 3 ürün var; 3 Al 2 Öde hakkı kazandınız!</span>
    `;
    alertBox.className = 'p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs mb-3 text-center';
  } else {
    alertBox.innerHTML = `
      <span class="text-zinc-900 font-bold">🔥 3 AL 2 ÖDE FIRSATINA SON <span class="text-red-600 font-black">${remainingFor3Al2} ÜRÜN</span> KALDI!</span>
      <p class="text-[11px] text-zinc-600 mt-0.5">1 kılıf veya lens koruyucu daha ekleyin, en ucuzu bedava olsun!</p>
    `;
    alertBox.className = 'p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs mb-3 text-center';
  }

  const suggestionsContainer = document.getElementById('upsell-suggestions');
  const suggestions = state.products.filter(p => p.id !== lastAddedProduct.id && (p.category === 'Ekran & Kamera' || p.category === 'Kılıf & Koruma')).slice(0, 2);

  suggestionsContainer.innerHTML = suggestions.map(item => `
    <div class="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
      <div class="flex items-center gap-2.5">
        <img src="${item.image}" class="w-10 h-10 rounded-lg object-cover bg-white" />
        <div>
          <h4 class="text-xs font-bold text-zinc-900">${item.name}</h4>
          <span class="text-[11px] font-black text-zinc-950">${formatCurrency(item.price)}</span>
        </div>
      </div>
      <button 
        onclick="addUpsellItemToCart(${item.id})"
        class="px-2.5 py-1 rounded-lg bg-zinc-950 text-white text-xs font-bold"
      >
        + Ekle
      </button>
    </div>
  `).join('');

  modal.classList.remove('hidden');
}

function closeUpsellModal() {
  document.getElementById('upsell-modal')?.classList.add('hidden');
}

function addUpsellItemToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (product) {
    addToCart(product, 1, 'Standart');
    closeUpsellModal();
    openCartDrawer();
  }
}

// ======================== CART & CHECKOUT ========================

function addToCart(product, quantity = 1, variantName = 'Standart') {
  const existingIndex = state.cart.findIndex(
    item => item.id === product.id && item.selectedVariant === variantName
  );

  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += quantity;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      selectedVariant: variantName,
      quantity: quantity
    });
  }

  const totalItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (totalItemCount >= 3 && !state.appliedCoupon) {
    state.appliedCoupon = {
      code: '3AL2ODE',
      type: 'percentage',
      value: 33.33,
      description: '3 Al 2 Öde Kampanyası'
    };
    localStorage.setItem('vitrin_coupon', JSON.stringify(state.appliedCoupon));
  }

  saveCart();
  updateCartUI();
  showToast(`${product.name} sepete eklendi!`, 'success');
}

function updateCartItemQty(index, delta) {
  if (state.cart[index]) {
    const newQty = state.cart[index].quantity + delta;
    if (newQty <= 0) {
      removeCartItem(index);
    } else {
      state.cart[index].quantity = newQty;
      saveCart();
      updateCartUI();
    }
  }
}

function removeCartItem(index) {
  if (state.cart[index]) {
    state.cart.splice(index, 1);
    saveCart();
    updateCartUI();
  }
}

function saveCart() {
  localStorage.setItem('vitrin_cart', JSON.stringify(state.cart));
}

function getCartCalculations() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let discount = 0;
  if (state.appliedCoupon) {
    if (state.appliedCoupon.type === 'percentage') {
      discount = (subtotal * state.appliedCoupon.value) / 100;
    } else if (state.appliedCoupon.type === 'fixed') {
      discount = Math.min(state.appliedCoupon.value, subtotal);
    }
  }

  const isFreeShipping = subtotal >= state.shippingThreshold || subtotal === 0;
  const shippingFee = (subtotal === 0 || isFreeShipping) ? 0.00 : state.defaultShippingFee;
  const remainingForFreeShipping = Math.max(0, state.shippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / state.shippingThreshold) * 100));

  const total = Math.max(0, subtotal - discount + shippingFee);

  return { subtotal, discount, shippingFee, isFreeShipping, remainingForFreeShipping, freeShippingProgress, total };
}

function updateCartUI() {
  const totalItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badgeEl = document.getElementById('cart-badge-count');
  if (badgeEl) {
    badgeEl.innerText = totalItemCount;
    badgeEl.style.display = totalItemCount > 0 ? 'flex' : 'none';
  }

  const itemsContainer = document.getElementById('cart-items-container');
  const emptyMessage = document.getElementById('cart-empty-message');
  const footerContainer = document.getElementById('cart-footer');

  if (!itemsContainer) return;

  const calcs = getCartCalculations();

  const progressEl = document.getElementById('free-shipping-progress');
  const progressText = document.getElementById('free-shipping-text');
  if (progressEl && progressText) {
    progressEl.style.width = `${calcs.freeShippingProgress}%`;
    if (calcs.isFreeShipping && calcs.subtotal > 0) {
      progressText.innerHTML = `🎉 <strong>Tebrikler!</strong> Ücretsiz kargo hakkı kazandınız.`;
    } else if (calcs.subtotal === 0) {
      progressText.innerText = `1.000 TL üzeri alışverişlerde KARGO ÜCRETSİZ!`;
    } else {
      progressText.innerHTML = `Ücretsiz kargoya son <strong class="text-zinc-950 font-bold">${formatCurrency(calcs.remainingForFreeShipping)}</strong> kaldı!`;
    }
  }

  if (state.cart.length === 0) {
    itemsContainer.innerHTML = '';
    emptyMessage.classList.remove('hidden');
    footerContainer.classList.add('hidden');
    return;
  }

  emptyMessage.classList.add('hidden');
  footerContainer.classList.remove('hidden');

  itemsContainer.innerHTML = state.cart.map((item, index) => `
    <div class="flex gap-2.5 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 items-center">
      <img src="${item.image}" alt="${item.name}" class="w-12 h-12 rounded-lg object-cover bg-white flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-bold text-zinc-900 truncate">${item.name}</h4>
        <span class="text-[10px] text-zinc-500 block truncate">${item.selectedVariant}</span>
        <span class="text-xs font-black text-zinc-950 block mt-0.5">${formatCurrency(item.price)}</span>
      </div>

      <div class="flex flex-col items-end gap-1">
        <button onclick="removeCartItem(${index})" class="text-zinc-400 hover:text-red-600 text-xs">✕</button>
        <div class="flex items-center rounded bg-white border border-zinc-200 px-1">
          <button onclick="updateCartItemQty(${index}, -1)" class="w-4 h-4 text-xs font-bold">-</button>
          <span class="w-4 text-center text-xs font-bold">${item.quantity}</span>
          <button onclick="updateCartItemQty(${index}, 1)" class="w-4 h-4 text-xs font-bold">+</button>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('cart-subtotal').innerText = formatCurrency(calcs.subtotal);
  document.getElementById('cart-shipping').innerText = calcs.shippingFee === 0 ? 'Ücretsiz' : formatCurrency(calcs.shippingFee);
  
  const discountRow = document.getElementById('cart-discount-row');
  if (calcs.discount > 0) {
    discountRow.classList.remove('hidden');
    document.getElementById('cart-discount').innerText = `-${formatCurrency(calcs.discount)}`;
  } else {
    discountRow.classList.add('hidden');
  }

  document.getElementById('cart-total').innerText = formatCurrency(calcs.total);

  const couponChip = document.getElementById('applied-coupon-chip');
  if (state.appliedCoupon) {
    couponChip.classList.remove('hidden');
    couponChip.innerHTML = `
      <span class="text-xs text-zinc-900 font-bold">${state.appliedCoupon.description || state.appliedCoupon.code} (-${formatCurrency(calcs.discount)})</span>
      <button onclick="removeCoupon()" class="text-zinc-500 hover:text-red-600 text-xs font-bold ml-2">✕</button>
    `;
  } else {
    couponChip.classList.add('hidden');
  }
}

async function applyCoupon() {
  const input = document.getElementById('coupon-input');
  const code = input ? input.value.trim() : '';
  if (!code) return;

  const calcs = getCartCalculations();
  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal: calcs.subtotal })
    });
    const data = await res.json();

    if (data.success) {
      state.appliedCoupon = data.coupon;
      localStorage.setItem('vitrin_coupon', JSON.stringify(data.coupon));
      updateCartUI();
      showToast(data.message, 'success');
      if (input) input.value = '';
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Kupon uygulanamadı.', 'error');
  }
}

function removeCoupon() {
  state.appliedCoupon = null;
  localStorage.removeItem('vitrin_coupon');
  updateCartUI();
}

function openCartDrawer() {
  closeUpsellModal();
  const drawer = document.getElementById('cart-drawer');
  const panel = document.getElementById('cart-drawer-panel');
  drawer.classList.remove('hidden');
  setTimeout(() => panel.classList.remove('translate-x-full'), 10);
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const panel = document.getElementById('cart-drawer-panel');
  panel.classList.add('translate-x-full');
  setTimeout(() => {
    drawer.classList.add('hidden');
    document.body.style.overflow = '';
  }, 300);
}

// ======================== CHECKOUT (Havale, Kapıda, iyzico) ========================

function openCheckoutModal() {
  if (state.cart.length === 0) return;
  closeCartDrawer();

  const calcs = getCartCalculations();
  document.getElementById('checkout-subtotal').innerText = formatCurrency(calcs.subtotal);
  document.getElementById('checkout-shipping').innerText = calcs.shippingFee === 0 ? 'Ücretsiz' : formatCurrency(calcs.shippingFee);
  document.getElementById('checkout-discount').innerText = calcs.discount > 0 ? `-${formatCurrency(calcs.discount)}` : '0.00 TL';
  
  updateCheckoutTotal();
  document.getElementById('checkout-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

function selectPaymentMethod(method) {
  state.checkoutPaymentMethod = method;

  ['iyzico', 'havale', 'kapida'].forEach(m => {
    const card = document.getElementById(`payment-card-${m}`);
    const details = document.getElementById(`payment-details-${m}`);
    if (m === method) {
      card?.classList.add('border-zinc-950', 'bg-zinc-50');
      details?.classList.remove('hidden');
    } else {
      card?.classList.remove('border-zinc-950', 'bg-zinc-50');
      details?.classList.add('hidden');
    }
  });

  updateCheckoutTotal();
}

function updateCheckoutTotal() {
  const calcs = getCartCalculations();
  let total = calcs.total;
  let doorFee = 0;

  if (state.checkoutPaymentMethod === 'kapida') {
    doorFee = state.doorServiceFee;
    total += doorFee;
    document.getElementById('checkout-door-fee-row')?.classList.remove('hidden');
    document.getElementById('checkout-door-fee').innerText = formatCurrency(doorFee);
  } else {
    document.getElementById('checkout-door-fee-row')?.classList.add('hidden');
  }

  document.getElementById('checkout-total').innerText = formatCurrency(total);
}

function fillIyzicoTestCard() {
  document.getElementById('cc-number').value = '4242 4242 4242 4242';
  document.getElementById('cc-name').value = 'AHMET YILMAZ';
  document.getElementById('cc-expiry').value = '12/28';
  document.getElementById('cc-cvv').value = '424';

  document.getElementById('card-preview-number').innerText = '4242 •••• •••• 4242';
  document.getElementById('card-preview-name').innerText = 'AHMET YILMAZ';
  document.getElementById('card-preview-expiry').innerText = '12/28';

  showToast('iyzico test kartı dolduruldu!', 'success');
}

function formatCardNumber(e) {
  let val = e.target.value.replace(/\D/g, '').substring(0, 16);
  const parts = [];
  for (let i = 0; i < val.length; i += 4) parts.push(val.substring(i, i + 4));
  e.target.value = parts.join(' ');
  document.getElementById('card-preview-number').innerText = val.length > 0 ? parts.join(' ') : '•••• •••• •••• ••••';
}

function formatCardExpiry(e) {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
  e.target.value = val;
  document.getElementById('card-preview-expiry').innerText = val.length > 0 ? val : 'AA/YY';
}

async function processOrderSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('order-name').value.trim();
  const email = document.getElementById('order-email').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  const city = document.getElementById('order-city').value.trim();
  const district = document.getElementById('order-district').value.trim();
  const address = document.getElementById('order-address').value.trim();
  const note = document.getElementById('order-note').value.trim();
  const agreement = document.getElementById('order-agreement').checked;

  if (!fullName || !email || !phone || !city || !district || !address) {
    showToast('Lütfen teslimat alanlarını doldurun.', 'error');
    return;
  }
  if (!agreement) {
    showToast('Lütfen sözleşme onayını işaretleyin.', 'error');
    return;
  }

  if (state.checkoutPaymentMethod === 'iyzico') {
    open3DSecureModal({ fullName, email, phone, city, district, address, note });
    return;
  }

  finalizeOrder({ fullName, email, phone, city, district, address, note });
}

let pendingOrderData = null;
function open3DSecureModal(customerData) {
  pendingOrderData = customerData;
  document.getElementById('3d-secure-modal').classList.remove('hidden');
}

function verify3DSecure() {
  const code = document.getElementById('otp-code').value.trim();
  if (code !== '123456' && code !== '424242' && code.length < 4) {
    showToast('Test şifresi: 123456', 'error');
    return;
  }

  document.getElementById('3d-secure-modal').classList.add('hidden');
  finalizeOrder(pendingOrderData, {
    cardBrand: 'Mastercard / Visa',
    cardLast4: document.getElementById('cc-number').value.slice(-4),
    transactionId: `IYZ-${Date.now()}-TEST`,
    status: '3D Secure Onaylandı'
  });
}

async function finalizeOrder(customerData, paymentDetailsOverride = null) {
  const calcs = getCartCalculations();
  const doorFee = state.checkoutPaymentMethod === 'kapida' ? state.doorServiceFee : 0;
  const grandTotal = calcs.total + doorFee;

  let paymentMethodName = 'iyzico Kredi Kartı (Test Modu)';
  let paymentDetails = paymentDetailsOverride || { status: 'Onaylandı' };

  if (state.checkoutPaymentMethod === 'havale') {
    paymentMethodName = 'Havale / EFT';
    paymentDetails = { bank: document.getElementById('bank-select').value, status: 'Ödeme Bekleniyor' };
  } else if (state.checkoutPaymentMethod === 'kapida') {
    paymentMethodName = 'Kapıda Ödeme';
    paymentDetails = { type: document.querySelector('input[name="kapida-type"]:checked')?.value || 'Nakit', status: 'Teslimatta Tahsilat' };
  }

  const orderPayload = {
    customer: customerData,
    items: state.cart,
    subtotal: calcs.subtotal,
    discount: calcs.discount,
    couponCode: state.appliedCoupon ? state.appliedCoupon.code : null,
    shippingFee: calcs.shippingFee,
    doorServiceFee: doorFee,
    total: grandTotal,
    paymentMethod: paymentMethodName,
    paymentDetails
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const data = await res.json();

    if (data.success) {
      state.cart = [];
      state.appliedCoupon = null;
      saveCart();
      localStorage.removeItem('vitrin_coupon');
      updateCartUI();

      closeCheckoutModal();
      openOrderSuccessModal(data.order);
      loadProducts();
    }
  } catch (err) {
    showToast('Sipariş iletilemedi.', 'error');
  }
}

function openOrderSuccessModal(order) {
  document.getElementById('success-order-id').innerText = order.id;
  document.getElementById('success-tracking-code').innerText = order.cargo.trackingNumber;
  document.getElementById('success-order-total').innerText = formatCurrency(order.total);
  document.getElementById('success-payment-method').innerText = order.paymentMethod;
  document.getElementById('success-tracking-link').href = `/takip?kod=${order.id}`;

  document.getElementById('order-success-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeOrderSuccessModal() {
  document.getElementById('order-success-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// Newsletter & Contact
async function submitNewsletter(e) {
  e.preventDefault();
  const input = document.getElementById('newsletter-email');
  const email = input.value.trim();
  try {
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      input.value = '';
    }
  } catch (err) {
    showToast('Bülten kaydı başarısız.', 'error');
  }
}

async function submitContactForm(e) {
  e.preventDefault();
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const message = document.getElementById('contact-message').value.trim();
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('contact-form')?.reset();
    }
  } catch (err) {
    showToast('Mesaj iletilemedi.', 'error');
  }
}

// Legal Modals (Criterion 7)
function openLegalModal(type) {
  const titles = {
    kvkk: 'KVKK Aydınlatma Metni (6698 Sayılı Kanun)',
    cerez: 'Çerez (Cookie) Kullanım Politikası',
    mesafeli: 'Mesafeli Satış Sözleşmesi',
    iade: 'Cayma Hakkı, İade ve Değişim Koşulları'
  };

  const texts = {
    kvkk: `
      <div class="space-y-3">
        <p><strong>1. Veri Sorumlusu:</strong> 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, <strong>Vitrin Teknoloji ve Aksesuar Ltd. Şti.</strong> (“vitrin.”) olarak, kişisel verilerinizi mevzuata uygun şekilde işlemekte ve korumaktayız.</p>
        <p><strong>2. İşlenen Kişisel Veriler:</strong> Sipariş tamamlama, teslimat ve faturalandırma amacıyla adınız, soyadınız, telefon numaranız, e-posta adresiniz, teslimat adresiniz ve işlem güvenliği bilgileriniz işlenmektedir.</p>
        <p><strong>3. Veri İşleme Amaçları:</strong> Sözleşmenin ifası, kargo gönderiminin sağlanması, yasal yükümlülüklerin yerine getirilmesi (e-fatura vb.), müşteri destek hizmetleri ve müşteri onayı bulunan hallerde kampanya bildirimlerinin iletilmesi.</p>
        <p><strong>4. Verilerin Aktarımı:</strong> Kişisel verileriniz yalnızca siparişin teslimi için anlaşmalı kargo şirketlerine (Yurtiçi Kargo, MNG, Aras, HepsiJet) ve güvenli ödeme altyapısı sağlayıcımız BDDK lisanslı <strong>iyzico</strong>'ya aktarılmaktadır. Üçüncü şahıslara veya yurt dışına asla satılmaz.</p>
        <p><strong>5. Haklarınız:</strong> KVKK Madde 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini talep etme ve silinmesini isteme hakkına sahipsiniz. Başvurularınız için: <em>kvkk@vitrin.store</em></p>
      </div>
    `,
    cerez: `
      <div class="space-y-3">
        <p><strong>1. Çerez Nedir?</strong> Çerezler (cookies), vitrin. web sitemizi ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza kaydedilen küçük metin dosyalarıdır.</p>
        <p><strong>2. Kullandığımız Çerez Türleri:</strong></p>
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Zorunlu Çerezler:</strong> Sepetinizin hatırlanması, oturum yönetimi ve ödeme güvenliği için teknik olarak şarttır.</li>
          <li><strong>Performans ve Analiz Çerezleri:</strong> Sitemizin hızını ve ziyaretçi deneyimini ölçmek amacıyla anonim olarak kullanılır.</li>
          <li><strong>Fonksiyonel Çerezler:</strong> Çarkıfelek çarkı ve kupon kullanım tercihlerinizi hatırlar.</li>
        </ul>
        <p><strong>3. Çerezleri Nasıl Yönetebilirsiniz?</strong> Tarayıcınızın ayarlarından çerezleri dilediğiniz zaman engelleyebilir veya silebilirsiniz. Ancak zorunlu çerezlerin kapatılması sepet fonksiyonlarının çalışmasını engelleyebilir.</p>
      </div>
    `,
    mesafeli: `
      <div class="space-y-3">
        <p><strong>1. Taraflar:</strong><br>
        <strong>SATICI:</strong> Vitrin Teknoloji ve Aksesuar Ltd. Şti. (Caferağa Mah. Moda Cad. No:42 Kadıköy / İstanbul - destek@vitrin.store)<br>
        <strong>ALICI:</strong> Siteden sipariş veren tüketici.</p>
        <p><strong>2. Sözleşmenin Konusu:</strong> 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, Alıcı'nın vitrin. üzerinden elektronik ortamda siparişini verdiği ürünlerin satışı ve teslimi ile ilgili hak ve yükümlülükleri düzenler.</p>
        <p><strong>3. Teslimat ve Kargo:</strong> 1.000 TL ve üzeri siparişlerde kargo bedelsizdir. Ürünler azami 3 iş günü içinde anlaşmalı kargo şirketine teslim edilir.</p>
        <p><strong>4. Cayma Hakkı:</strong> Alıcı, hiçbir gerekçe göstermeksizin ürünün kendisine veya gösterdiği adresteki kişiye tesliminden itibaren <strong>14 (on dört) gün</strong> içinde sözleşmeden cayma hakkına sahiptir.</p>
        <p><strong>5. Yetkili Mahkeme:</strong> Uyuşmazlıklarda Ticaret Bakanlığı'nca ilan edilen değere kadar Tüketici Hakem Heyetleri ile Alıcı'nın veya Satıcı'nın yerleşim yerindeki Tüketici Mahkemeleri yetkilidir.</p>
      </div>
    `,
    iade: `
      <div class="space-y-3">
        <p><strong>1. 14 Gün Koşulsuz Ücretsiz İade:</strong> vitrin.'den aldığınız tüm kılıf ve aksesuarları teslimat tarihinden itibaren 14 gün içinde hiçbir ceza ödemeden iade edebilirsiniz.</p>
        <p><strong>2. Nasıl İade Edebilirim?</strong></p>
        <ol class="list-decimal pl-5 space-y-1">
          <li>Fatura veya sipariş numaranızla (Örn: VTR-XXXX) birlikte ürünü orijinal kutusuna koyun.</li>
          <li>En yakın <strong>Yurtiçi Kargo</strong> şubesine gidin.</li>
          <li>Vitrin ücretsiz iade anlaşma kodumuzu söyleyin: <strong class="bg-zinc-100 px-1 py-0.5 rounded font-mono text-zinc-950">452 910 338</strong></li>
        </ol>
        <p><strong>3. Ücret İadesi:</strong> Ürün depomuza ulaşıp kontrol edildikten sonra <strong>3 iş günü</strong> içerisinde ödeme yaptığınız karta/hesaba aynen iade edilir.</p>
      </div>
    `
  };

  document.getElementById('legal-modal-title').innerText = titles[type] || 'Yasal Bilgilendirme';
  document.getElementById('legal-modal-body').innerHTML = texts[type] || '';
  document.getElementById('legal-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLegalModal() {
  document.getElementById('legal-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// Corporate Modals: Hakkımızda & İletişim (Criterion 8)
function openCorporateModal(type) {
  const modal = document.getElementById('corporate-modal');
  const titleEl = document.getElementById('corporate-modal-title');
  const bodyEl = document.getElementById('corporate-modal-body');
  if (!modal || !titleEl || !bodyEl) return;

  if (type === 'hakkimizda') {
    titleEl.innerText = 'vitrin. — Biz Kimiz & Hikayemiz';
    bodyEl.innerHTML = `
      <div class="space-y-4 text-xs text-zinc-700 leading-relaxed">
        <div class="w-full h-40 rounded-2xl overflow-hidden bg-zinc-900 relative">
          <img src="https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80" class="w-full h-full object-cover brightness-75" />
          <div class="absolute inset-0 flex items-center justify-center p-4 text-center">
            <span class="text-white text-base font-black font-display tracking-tight">"Aksesuar Değil, Tarzının Vitrini."</span>
          </div>
        </div>

        <p>
          <strong>vitrin.</strong>, 2026 yılında genç kreatifler tarafından İstanbul Kadıköy'de kuruldu. Amacımız; sıkıcı, birbirinin kopyası telefon kılıfları yerine <strong>Pinterest ve TikTok trendlerini</strong> anında yakalayan, dayanıklı ve estetik ürünleri doğrudan gençlerle buluşturmak.
        </p>

        <div class="grid grid-cols-2 gap-3 pt-2">
          <div class="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <h4 class="font-bold text-zinc-950 mb-1">🌿 %100 Geri Dönüştürülebilir</h4>
            <p class="text-[11px] text-zinc-500">Kutularımız sıfır plastik ve çevre dostu soya mürekkebiyle üretilir.</p>
          </div>
          <div class="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <h4 class="font-bold text-zinc-950 mb-1">⚡ Düşme ve Darbe Garantisi</h4>
            <p class="text-[11px] text-zinc-500">Tüm kılıflarımız 2.5 metre düşme testinden tam notla geçmiştir.</p>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs">
          <strong>Öğrenci Dostu Felsefe:</strong> Yüksek fiyatlara karşı her zaman <strong>3 Al 2 Öde</strong> ve gençlik indirimlerini aktif tutuyoruz.
        </div>
      </div>
    `;
  } else if (type === 'iletisim') {
    titleEl.innerText = 'İletişim & Showroom';
    bodyEl.innerHTML = `
      <div class="space-y-4 text-xs text-zinc-700">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">📍 Kadıköy Showroom</span>
            <p class="font-bold text-zinc-900 mt-1">Caferağa Mah. Moda Cad. No:42/A</p>
            <p class="text-zinc-500 text-[11px]">Kadıköy, İstanbul (Moda Tramvay Durağı Karşısı)</p>
          </div>
          <div class="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">📞 Müşteri Destek & WhatsApp</span>
            <p class="font-bold text-zinc-900 mt-1">+90 (212) 555 00 00</p>
            <p class="text-zinc-500 text-[11px]">Hafta İçi 09:00 - 19:00 | destek@vitrin.store</p>
          </div>
        </div>

        <!-- Working Contact Form (Criterion 8) -->
        <form onsubmit="submitContactForm(event)" id="modal-contact-form" class="space-y-2.5 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
          <span class="font-bold text-zinc-950 block">Bize Mesaj Bırakın</span>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="contact-name" required placeholder="Adınız Soyadınız *" class="w-full py-2 px-3 rounded-xl bg-white border border-zinc-200 text-xs" />
            <input type="email" id="contact-email" required placeholder="E-Posta Adresiniz *" class="w-full py-2 px-3 rounded-xl bg-white border border-zinc-200 text-xs" />
          </div>
          <textarea id="contact-message" rows="3" required placeholder="Mesajınız veya sipariş sorunuz... *" class="w-full py-2 px-3 rounded-xl bg-white border border-zinc-200 text-xs"></textarea>
          <button type="submit" class="w-full py-2.5 rounded-xl bg-zinc-950 text-white font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 transition-all">
            Mesajı Gönder ✉️
          </button>
        </form>

        <!-- Simulated Map View -->
        <div class="rounded-xl overflow-hidden border border-zinc-200 h-32 relative bg-zinc-200 flex items-center justify-center">
          <iframe 
            src="https://maps.google.com/maps?q=Moda+Caddesi+Kadikoy+Istanbul&t=&z=15&ie=UTF8&iwloc=&output=embed" 
            class="w-full h-full border-0" 
            loading="lazy"
            title="Vitrin Kadıköy Konum"
          ></iframe>
        </div>
      </div>
    `;
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCorporateModal() {
  const modal = document.getElementById('corporate-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function checkCookieConsent() {
  if (!localStorage.getItem('vitrin_cookie_accepted')) {
    document.getElementById('cookie-banner')?.classList.remove('hidden');
  }
}

function acceptCookies() {
  localStorage.setItem('vitrin_cookie_accepted', 'true');
  document.getElementById('cookie-banner')?.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `p-3.5 rounded-xl border shadow-lg flex items-center gap-2 animate-slide-up text-xs font-semibold bg-zinc-950 text-white border-zinc-800`;
  toast.innerHTML = `<span>✓</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function formatCurrency(val) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      const mobileInput = document.getElementById('mobile-search-input');
      if (mobileInput) mobileInput.value = e.target.value;
      renderProducts();
    });
  }

  // Mobile search input listener
  const mobileSearchInput = document.getElementById('mobile-search-input');
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (searchInput) searchInput.value = e.target.value;
      renderProducts();
    });
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProducts();
    });
  }

  const ccNumberInput = document.getElementById('cc-number');
  if (ccNumberInput) ccNumberInput.addEventListener('input', formatCardNumber);

  const ccExpiryInput = document.getElementById('cc-expiry');
  if (ccExpiryInput) ccExpiryInput.addEventListener('input', formatCardExpiry);

  const ccNameInput = document.getElementById('cc-name');
  if (ccNameInput) {
    ccNameInput.addEventListener('input', (e) => {
      document.getElementById('card-preview-name').innerText = e.target.value.toUpperCase() || 'AD SOYAD';
    });
  }
}

function handleUrlHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#urun-')) {
    const id = parseInt(hash.replace('#urun-', ''), 10);
    if (!isNaN(id)) setTimeout(() => openProductModal(id), 200);
  }
}
