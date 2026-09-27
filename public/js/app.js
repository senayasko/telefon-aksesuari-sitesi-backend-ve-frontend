/**
 * VİTRİN — Modern D2C Telefon Aksesuarları E-Ticaret Uygulaması
 * Tüm 12 kriteri kapsayan tam fonksiyonel istemci mantığı.
 */

// State Management
const state = {
  products: [],
  categories: ['Tümü', 'Kılıf & Koruma', 'Şarj & Güç', 'Ekran & Kamera'],
  activeCategory: 'Tümü',
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
  doorServiceFee: 29.90
};

// DOM Content Loaded
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
    console.error('Ürünler yüklenirken hata oluştu:', err);
    showToast('Ürünler yüklenemedi. Lütfen sayfayı yenileyin.', 'error');
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

  // Search query filter
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
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

  // Render count
  const countEl = document.getElementById('product-count');
  if (countEl) countEl.innerText = `${filtered.length} ürün listeleniyor`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-zinc-400">
        <svg class="w-12 h-12 mx-auto mb-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p class="text-lg font-medium text-white">Aradığınız kriterde ürün bulunamadı.</p>
        <p class="text-sm mt-1">Farklı bir arama terimi deneyebilir veya kategoriyi değiştirebilirsiniz.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(product => {
    const discountPercent = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;
    const isLowStock = product.stock > 0 && product.stock <= 25;
    const isOutOfStock = product.stock <= 0;

    return `
      <div class="product-card rounded-2xl overflow-hidden flex flex-col group cursor-pointer" onclick="openProductModal(${product.id})">
        <!-- Image Container -->
        <div class="relative w-full aspect-square bg-zinc-900/60 overflow-hidden">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            loading="lazy"
            class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            onerror="this.src='https://images.unsplash.com/photo-1584006682522-dc17d6c0d9ac?auto=format&fit=crop&w=800&q=80'"
          />
          
          <!-- Badges -->
          <div class="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            ${product.badge ? `
              <span class="px-2.5 py-1 text-xs font-bold rounded-md bg-cyan-500/90 text-black backdrop-blur-md">
                ${product.badge}
              </span>
            ` : ''}
            ${discountPercent ? `
              <span class="px-2.5 py-1 text-xs font-bold rounded-md bg-rose-600/90 text-white backdrop-blur-md">
                -%${discountPercent}
              </span>
            ` : ''}
          </div>

          <!-- Quick Stock Alert -->
          ${isLowStock ? `
            <div class="absolute bottom-3 left-3 px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              🔥 Son ${product.stock} Adet!
            </div>
          ` : ''}
          ${isOutOfStock ? `
            <div class="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center">
              <span class="px-3 py-1 bg-red-600/90 text-white text-xs font-bold rounded-md uppercase tracking-wider">Tükendi</span>
            </div>
          ` : ''}
        </div>

        <!-- Details -->
        <div class="p-5 flex flex-col flex-1 justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
              <span class="text-cyan-400 font-medium">${product.category}</span>
              <div class="flex items-center gap-1 text-amber-400">
                <span>★</span>
                <span class="font-semibold text-zinc-300">${product.rating}</span>
                <span class="text-zinc-500">(${product.reviewCount})</span>
              </div>
            </div>

            <h3 class="font-bold text-white text-base leading-snug group-hover:text-cyan-400 transition-colors line-clamp-2">
              ${product.name}
            </h3>
            
            <p class="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
              ${product.shortDescription}
            </p>
          </div>

          <div class="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
              <div class="flex items-baseline gap-2">
                <span class="text-lg font-extrabold text-white">${formatCurrency(product.price)}</span>
                ${product.oldPrice ? `
                  <span class="text-xs text-zinc-500 line-through">${formatCurrency(product.oldPrice)}</span>
                ` : ''}
              </div>
              <span class="text-[10px] text-zinc-400">Stok: ${product.stock} adet</span>
            </div>

            <button 
              onclick="event.stopPropagation(); quickAddToCart(${product.id})"
              ${isOutOfStock ? 'disabled' : ''}
              class="px-3 py-2 rounded-xl bg-white/10 hover:bg-cyan-500 hover:text-black text-white text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              title="${product.hasVariants ? 'Seçenekleri Görüntüle' : 'Sepete Ekle'}"
            >
              ${product.hasVariants ? `
                <span>Seçenekler</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              ` : `
                <span>Ekle</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              `}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ======================== PRODUCT DETAIL MODAL & VARIATIONS ========================

function openProductModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.selectedProduct = product;
  state.modalQuantity = 1;

  // Initialize variants if applicable
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
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Image Gallery -->
      <div class="flex flex-col gap-4">
        <div class="w-full aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 relative">
          <img 
            id="modal-main-image"
            src="${product.image}" 
            alt="${product.name}" 
            class="w-full h-full object-cover"
          />
          ${product.badge ? `
            <span class="absolute top-4 left-4 px-3 py-1 bg-cyan-500 text-black text-xs font-bold rounded-lg uppercase tracking-wide">
              ${product.badge}
            </span>
          ` : ''}
        </div>

        ${product.gallery && product.gallery.length > 1 ? `
          <div class="flex gap-3 overflow-x-auto pb-1">
            ${product.gallery.map((img, i) => `
              <button 
                onclick="document.getElementById('modal-main-image').src='${img}'"
                class="w-16 h-16 rounded-xl overflow-hidden border border-white/20 hover:border-cyan-400 focus:border-cyan-400 transition-all flex-shrink-0"
              >
                <img src="${img}" class="w-full h-full object-cover" />
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Product Info -->
      <div class="flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span class="text-cyan-400 font-semibold uppercase tracking-wider">${product.category}</span>
            <div class="flex items-center gap-1.5 text-amber-400">
              <span>★</span>
              <span class="font-bold text-white">${product.rating}</span>
              <span class="text-zinc-400">(${product.reviewCount} Değerlendirme)</span>
            </div>
          </div>

          <h2 class="text-2xl lg:text-3xl font-bold text-white leading-tight font-display">
            ${product.name}
          </h2>

          <div class="mt-4 flex items-baseline gap-3">
            <span class="text-3xl font-extrabold text-cyan-400">${formatCurrency(product.price)}</span>
            ${product.oldPrice ? `
              <span class="text-lg text-zinc-500 line-through">${formatCurrency(product.oldPrice)}</span>
              <span class="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs font-bold rounded-md">-%${discountPercent}</span>
            ` : ''}
          </div>

          <p class="mt-4 text-sm text-zinc-300 leading-relaxed">
            ${product.description}
          </p>

          <!-- VARIATION SECTION (Criterion 3) -->
          ${product.hasVariants && product.variantOptions ? `
            <div class="mt-6 p-4 rounded-xl bg-zinc-900/80 border border-white/10 space-y-4">
              <!-- Color Selector -->
              <div>
                <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Renk: <span id="selected-color-name" class="text-white font-bold">${state.selectedVariant.color.name}</span>
                </label>
                <div class="flex gap-3">
                  ${product.variantOptions.colors.map(c => `
                    <button 
                      type="button"
                      onclick="selectVariantColor('${c.name}', '${c.hex}')"
                      class="color-swatch w-9 h-9 rounded-full border-2 transition-all relative ${state.selectedVariant.color.name === c.name ? 'border-cyan-400 scale-110' : 'border-transparent'}"
                      style="background-color: ${c.hex};"
                      title="${c.name}"
                    >
                      ${state.selectedVariant.color.name === c.name ? '<span class="absolute inset-0 flex items-center justify-center text-white text-xs">✓</span>' : ''}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Model Selector -->
              <div>
                <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Cihaz Modeli: <span id="selected-model-name" class="text-white font-bold">${state.selectedVariant.model}</span>
                </label>
                <div class="grid grid-cols-2 gap-2">
                  ${product.variantOptions.models.map(m => `
                    <button 
                      type="button"
                      onclick="selectVariantModel('${m}')"
                      class="py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-all ${state.selectedVariant.model === m ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 font-bold' : 'border-white/10 bg-zinc-800/50 text-zinc-300 hover:border-white/30'}"
                    >
                      ${m}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Live Stock Indicator -->
          <div class="mt-5 flex items-center gap-2 text-xs">
            <span class="w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}"></span>
            <span class="text-zinc-300">
              ${product.stock > 0 ? `Canlı Stok: <strong>${product.stock} adet</strong> hazırda var.` : 'Stok tükendi.'}
            </span>
          </div>

          <!-- Specs List -->
          ${product.specs ? `
            <div class="mt-6 pt-6 border-t border-white/10">
              <h4 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Öne Çıkan Özellikler</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                ${product.specs.map(s => `
                  <div class="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span class="text-zinc-400 block">${s.label}</span>
                    <span class="text-white font-medium mt-0.5 block">${s.value}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Add to Cart Footer in Modal -->
        <div class="mt-8 pt-6 border-t border-white/10 flex items-center gap-4">
          <!-- Quantity -->
          <div class="flex items-center rounded-xl bg-zinc-900 border border-white/10 p-1">
            <button onclick="changeModalQty(-1)" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white text-base font-bold">-</button>
            <span id="modal-qty-display" class="w-10 text-center font-bold text-white text-sm">1</span>
            <button onclick="changeModalQty(1)" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white text-base font-bold">+</button>
          </div>

          <!-- Add Button -->
          <button 
            onclick="addModalProductToCart()"
            ${product.stock <= 0 ? 'disabled' : ''}
            class="flex-1 py-3 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-sm transition-all transform active:scale-95 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            <span>Sepete Ekle</span>
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
  openCartDrawer();
}

function quickAddToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (product.hasVariants) {
    openProductModal(productId);
  } else {
    addToCart(product, 1, 'Standart');
    openCartDrawer();
  }
}

// ======================== CART & COUPON MANAGEMENT ========================

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
    const name = state.cart[index].name;
    state.cart.splice(index, 1);
    saveCart();
    updateCartUI();
    showToast(`${name} sepetten çıkarıldı.`, 'info');
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

  // Shipping rule: Free if >= 1000 TL, else 59.90 TL
  const isFreeShipping = subtotal >= state.shippingThreshold || subtotal === 0;
  const shippingFee = (subtotal === 0 || isFreeShipping) ? 0.00 : state.defaultShippingFee;
  const remainingForFreeShipping = Math.max(0, state.shippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / state.shippingThreshold) * 100));

  const total = Math.max(0, subtotal - discount + shippingFee);

  return {
    subtotal,
    discount,
    shippingFee,
    isFreeShipping,
    remainingForFreeShipping,
    freeShippingProgress,
    total
  };
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

  // Free shipping progress bar update
  const progressEl = document.getElementById('free-shipping-progress');
  const progressText = document.getElementById('free-shipping-text');
  if (progressEl && progressText) {
    progressEl.style.width = `${calcs.freeShippingProgress}%`;
    if (calcs.isFreeShipping && calcs.subtotal > 0) {
      progressText.innerHTML = `🎉 <strong>Harika!</strong> Ücretsiz kargo hakkı kazandınız.`;
    } else if (calcs.subtotal === 0) {
      progressText.innerText = `1.000 TL üzeri alışverişlerde KARGO ÜCRETSİZ!`;
    } else {
      progressText.innerHTML = `Ücretsiz kargoya son <strong class="text-cyan-400 font-bold">${formatCurrency(calcs.remainingForFreeShipping)}</strong> kaldı!`;
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
    <div class="flex gap-4 p-3 rounded-xl bg-zinc-900/60 border border-white/5 items-center">
      <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover bg-zinc-800 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-bold text-white truncate">${item.name}</h4>
        <p class="text-xs text-cyan-400 font-medium truncate mt-0.5">${item.selectedVariant}</p>
        <span class="text-xs font-semibold text-zinc-300 mt-1 block">${formatCurrency(item.price)}</span>
      </div>

      <div class="flex flex-col items-end gap-2">
        <button onclick="removeCartItem(${index})" class="text-zinc-500 hover:text-red-400 transition-colors p-1" title="Kaldır">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>

        <div class="flex items-center rounded-lg bg-zinc-800 border border-white/10 px-1 py-0.5">
          <button onclick="updateCartItemQty(${index}, -1)" class="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white text-xs font-bold">-</button>
          <span class="w-6 text-center text-xs font-bold text-white">${item.quantity}</span>
          <button onclick="updateCartItemQty(${index}, 1)" class="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white text-xs font-bold">+</button>
        </div>
      </div>
    </div>
  `).join('');

  // Update totals
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

  // Active coupon chip
  const couponChip = document.getElementById('applied-coupon-chip');
  if (state.appliedCoupon) {
    couponChip.classList.remove('hidden');
    couponChip.innerHTML = `
      <span class="text-xs text-cyan-300 font-bold">Kupon: ${state.appliedCoupon.code} (-${formatCurrency(calcs.discount)})</span>
      <button onclick="removeCoupon()" class="text-zinc-400 hover:text-red-400 text-xs font-bold ml-2">✕</button>
    `;
  } else {
    couponChip.classList.add('hidden');
  }
}

async function applyCoupon() {
  const input = document.getElementById('coupon-input');
  const code = input ? input.value.trim() : '';

  if (!code) {
    showToast('Lütfen bir kupon kodu giriniz.', 'error');
    return;
  }

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
    showToast('Kupon doğrulanırken hata oluştu.', 'error');
  }
}

function removeCoupon() {
  state.appliedCoupon = null;
  localStorage.removeItem('vitrin_coupon');
  updateCartUI();
  showToast('Kupon kaldırıldı.', 'info');
}

function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const panel = document.getElementById('cart-drawer-panel');
  drawer.classList.remove('hidden');
  setTimeout(() => {
    panel.classList.remove('translate-x-full');
  }, 10);
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const panel = document.getElementById('cart-drawer-panel');
  panel.classList.add('translate-x-full');
  setTimeout(() => {
    drawer.classList.add('hidden');
    document.body.style.overflow = '';
  }, 350);
}

// ======================== CHECKOUT & PAYMENTS (Criterion 4) ========================

function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Sepetiniz boş.', 'error');
    return;
  }
  closeCartDrawer();

  const calcs = getCartCalculations();
  document.getElementById('checkout-subtotal').innerText = formatCurrency(calcs.subtotal);
  document.getElementById('checkout-shipping').innerText = calcs.shippingFee === 0 ? 'Ücretsiz' : formatCurrency(calcs.shippingFee);
  document.getElementById('checkout-discount').innerText = calcs.discount > 0 ? `-${formatCurrency(calcs.discount)}` : '0.00 TL';
  
  updateCheckoutTotal();

  const modal = document.getElementById('checkout-modal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function selectPaymentMethod(method) {
  state.checkoutPaymentMethod = method;

  // Toggle radio styles
  ['iyzico', 'havale', 'kapida'].forEach(m => {
    const card = document.getElementById(`payment-card-${m}`);
    const details = document.getElementById(`payment-details-${m}`);
    if (m === method) {
      card?.classList.add('border-cyan-400', 'bg-cyan-500/10');
      card?.classList.remove('border-white/10');
      details?.classList.remove('hidden');
    } else {
      card?.classList.remove('border-cyan-400', 'bg-cyan-500/10');
      card?.classList.add('border-white/10');
      details?.classList.add('hidden');
    }
  });

  updateCheckoutTotal();
}

function updateCheckoutTotal() {
  const calcs = getCartCalculations();
  let total = calcs.total;

  const doorFeeRow = document.getElementById('checkout-door-fee-row');
  let doorFee = 0;

  if (state.checkoutPaymentMethod === 'kapida') {
    doorFee = state.doorServiceFee;
    total += doorFee;
    doorFeeRow?.classList.remove('hidden');
    document.getElementById('checkout-door-fee').innerText = formatCurrency(doorFee);
  } else {
    doorFeeRow?.classList.add('hidden');
  }

  document.getElementById('checkout-total').innerText = formatCurrency(total);
}

// iyzico Auto-Fill Test Helper
function fillIyzicoTestCard() {
  document.getElementById('cc-number').value = '4242 4242 4242 4242';
  document.getElementById('cc-name').value = 'AHMET YILMAZ';
  document.getElementById('cc-expiry').value = '12/28';
  document.getElementById('cc-cvv').value = '424';

  // update preview card
  document.getElementById('card-preview-number').innerText = '4242 •••• •••• 4242';
  document.getElementById('card-preview-name').innerText = 'AHMET YILMAZ';
  document.getElementById('card-preview-expiry').innerText = '12/28';

  showToast('iyzico test kart bilgileri dolduruldu!', 'success');
}

// Format credit card inputs
function formatCardNumber(e) {
  let val = e.target.value.replace(/\D/g, '');
  val = val.substring(0, 16);
  const parts = [];
  for (let i = 0; i < val.length; i += 4) {
    parts.push(val.substring(i, i + 4));
  }
  e.target.value = parts.join(' ');

  const preview = document.getElementById('card-preview-number');
  if (preview) {
    preview.innerText = val.length > 0 ? parts.join(' ') : '•••• •••• •••• ••••';
  }
}

function formatCardExpiry(e) {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length >= 2) {
    val = val.substring(0, 2) + '/' + val.substring(2, 4);
  }
  e.target.value = val;

  const preview = document.getElementById('card-preview-expiry');
  if (preview) {
    preview.innerText = val.length > 0 ? val : 'AA/YY';
  }
}

// Submit Order Process
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
    showToast('Lütfen teslimat bilgileri alanlarını eksiksiz doldurunuz.', 'error');
    return;
  }

  if (!agreement) {
    showToast('Lütfen Mesafeli Satış Sözleşmesi ve KVKK onayını işaretleyiniz.', 'error');
    return;
  }

  // If iyzico Credit Card is chosen, simulate 3D Secure Verification
  if (state.checkoutPaymentMethod === 'iyzico') {
    const ccNum = document.getElementById('cc-number').value.replace(/\s/g, '');
    const ccCvv = document.getElementById('cc-cvv').value.trim();
    if (ccNum.length < 16 || ccCvv.length < 3) {
      showToast('Lütfen geçerli bir kart numarası ve güvenlik kodu girin.', 'error');
      return;
    }
    open3DSecureModal({ fullName, email, phone, city, district, address, note });
    return;
  }

  // For Havale or Kapıda Ödeme, finalize immediately
  finalizeOrder({ fullName, email, phone, city, district, address, note });
}

// 3D Secure Simulation Modal
let pendingOrderData = null;
function open3DSecureModal(customerData) {
  pendingOrderData = customerData;
  const modal = document.getElementById('3d-secure-modal');
  modal.classList.remove('hidden');
  document.getElementById('otp-code').value = '';
}

function verify3DSecure() {
  const code = document.getElementById('otp-code').value.trim();
  if (code !== '123456' && code !== '424242' && code.length < 4) {
    showToast('Hatalı SMS kodu! Test kodu: 123456', 'error');
    return;
  }

  document.getElementById('3d-secure-modal').classList.add('hidden');
  showToast('3D Secure Doğrulaması Başarılı!', 'success');
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
    paymentDetails = {
      bank: document.getElementById('bank-select').value,
      status: 'Ödeme Bekleniyor'
    };
  } else if (state.checkoutPaymentMethod === 'kapida') {
    paymentMethodName = 'Kapıda Ödeme';
    paymentDetails = {
      type: document.querySelector('input[name="kapida-type"]:checked')?.value || 'Nakit',
      serviceFee: 29.90,
      status: 'Teslimatta Tahsil Edilecek'
    };
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
    paymentDetails: paymentDetails
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const data = await res.json();

    if (data.success) {
      // Clear Cart
      state.cart = [];
      state.appliedCoupon = null;
      saveCart();
      localStorage.removeItem('vitrin_coupon');
      updateCartUI();

      closeCheckoutModal();
      openOrderSuccessModal(data.order);
      // Reload products to reflect updated stocks
      loadProducts();
    } else {
      showToast(data.message || 'Sipariş oluşturulamadı.', 'error');
    }
  } catch (err) {
    showToast('Sunucu bağlantı hatası oluştu.', 'error');
  }
}

function openOrderSuccessModal(order) {
  const modal = document.getElementById('order-success-modal');
  document.getElementById('success-order-id').innerText = order.id;
  document.getElementById('success-tracking-code').innerText = order.cargo.trackingNumber;
  document.getElementById('success-order-total').innerText = formatCurrency(order.total);
  document.getElementById('success-payment-method').innerText = order.paymentMethod;
  document.getElementById('success-tracking-link').href = `/takip?kod=${order.id}`;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeOrderSuccessModal() {
  document.getElementById('order-success-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ======================== NEWSLETTER & CONTACT ========================

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
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Bülten kaydı yapılırken hata oluştu.', 'error');
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
      document.getElementById('contact-form').reset();
    }
  } catch (err) {
    showToast('Mesaj iletilirken bir hata oluştu.', 'error');
  }
}

// ======================== LEGAL & STATIC MODALS (Criterion 7) ========================

function openLegalModal(type) {
  const titles = {
    kvkk: 'KVKK Aydınlatma Metni',
    cerez: 'Çerez (Cookie) Politikası',
    mesafeli: 'Mesafeli Satış Sözleşmesi',
    iade: 'İptal ve Cayma/İade Koşulları'
  };

  const texts = {
    kvkk: `
      <h4 class="font-bold text-white mb-2">1. Veri Sorumlusu</h4>
      <p class="mb-4">6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, VİTRİN E-Ticaret A.Ş. veri sorumlusu sıfatıyla kişisel verilerinizi işlemektedir.</p>
      
      <h4 class="font-bold text-white mb-2">2. Kişisel Verilerin İşlenme Amacı</h4>
      <p class="mb-4">Ad, soyad, iletişim bilgileri, sipariş geçmişi ve adres verileriniz; siparişlerin teslimi, faturalandırma ve müşteri hizmetleri süreçlerinin yürütülmesi amacıyla işlenmektedir.</p>

      <h4 class="font-bold text-white mb-2">3. Aktarılan Taraflar</h4>
      <p class="mb-4">Kişisel verileriniz yalnızca siparişinizin fiziki teslimatını gerçekleştirmek üzere anlaşmalı kargo şirketleri (Yurtiçi Kargo, HepsiJet vb.) ve yasal zorunluluk halinde yetkili kamu kurumlarıyla paylaşılmaktadır.</p>
    `,
    cerez: `
      <h4 class="font-bold text-white mb-2">Çerezlerin Kullanım Amacı</h4>
      <p class="mb-4">Sitemizde kullanıcı deneyimini iyileştirmek, sepet içeriğinizi hatırlamak ve güvenli oturum yönetimini sağlamak adına zorunlu ve işlevsel çerezler kullanılmaktadır.</p>
      
      <h4 class="font-bold text-white mb-2">Çerezleri Yönetme</h4>
      <p class="mb-4">Tarayıcınızın ayarlarından dilediğiniz zaman çerez tercihlerini değiştirebilir veya kayıtlı çerezleri temizleyebilirsiniz.</p>
    `,
    mesafeli: `
      <h4 class="font-bold text-white mb-2">Madde 1 - Taraflar</h4>
      <p class="mb-4">İşbu sözleşme, VİTRİN Mağazası (Satıcı) ile siparişi veren Tüketici (Alıcı) arasında 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında akdedilmiştir.</p>
      
      <h4 class="font-bold text-white mb-2">Madde 2 - Konu</h4>
      <p class="mb-4">Alıcının satıcıya ait www.vitrin.com internet sitesinden elektronik ortamda siparişini yaptığı ürünün satışı ve teslimi ile ilgili hak ve yükümlülükleri düzenler.</p>

      <h4 class="font-bold text-white mb-2">Madde 3 - Cayma Hakkı</h4>
      <p class="mb-4">Alıcı, sözleşme konusu ürünün kendisine veya gösterdiği adresteki kişi/kuruluşa tesliminden itibaren 14 gün içinde hiçbir gerekçe göstermeksizin cayma hakkına sahiptir.</p>
    `,
    iade: `
      <h4 class="font-bold text-white mb-2">14 Gün Koşulsuz Cayma Hakkı</h4>
      <p class="mb-4">Satın aldığınız ürünleri, teslimat tarihinden itibaren 14 gün içerisinde orijinal kutusu ve faturasıyla birlikte ücretsiz olarak iade edebilirsiniz.</p>
      
      <h4 class="font-bold text-white mb-2">İade Adımları</h4>
      <ol class="list-decimal pl-5 space-y-1 mb-4">
        <li>Müşteri hizmetlerimizden veya 'Kargom Nerede' sayfasından iade talebi oluşturun.</li>
        <li>Size verilen ücretsiz Yurtiçi Kargo iade kodunu kargo görevlisine iletin.</li>
        <li>Ürün depomuza ulaştıktan sonra 2 iş günü içinde ödemeniz kesintisiz iade edilir.</li>
      </ol>
    `
  };

  document.getElementById('legal-modal-title').innerText = titles[type] || 'Yasal Metin';
  document.getElementById('legal-modal-body').innerHTML = texts[type] || '';
  document.getElementById('legal-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLegalModal() {
  document.getElementById('legal-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// Cookie Consent Banner
function checkCookieConsent() {
  if (!localStorage.getItem('vitrin_cookie_accepted')) {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.classList.remove('hidden');
  }
}

function acceptCookies() {
  localStorage.setItem('vitrin_cookie_accepted', 'true');
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.classList.add('hidden');
  showToast('Çerez tercihleriniz kaydedildi.', 'info');
}

// Copy to Clipboard Helper
function copyText(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} panoya kopyalandı!`, 'success');
  });
}

// FAQ Accordion
function toggleFaq(index) {
  const answer = document.getElementById(`faq-ans-${index}`);
  const icon = document.getElementById(`faq-icon-${index}`);
  if (answer.classList.contains('hidden')) {
    answer.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';
  } else {
    answer.classList.add('hidden');
    icon.style.transform = 'rotate(0deg)';
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClasses = {
    success: 'bg-emerald-500/90 text-white border-emerald-400',
    error: 'bg-rose-600/90 text-white border-rose-500',
    info: 'bg-zinc-800/95 text-white border-cyan-500/50'
  };

  toast.className = `p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 animate-slide-up text-xs font-semibold ${bgClasses[type] || bgClasses.info}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Currency Formatter
function formatCurrency(val) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
}

// Event Listeners Setup
function setupEventListeners() {
  // Category pill buttons
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.cat-pill').forEach(b => {
        b.classList.remove('bg-cyan-500', 'text-black', 'font-bold');
        b.classList.add('bg-zinc-900', 'text-zinc-400');
      });
      btn.classList.add('bg-cyan-500', 'text-black', 'font-bold');
      btn.classList.remove('bg-zinc-900', 'text-zinc-400');
      state.activeCategory = btn.dataset.category;
      renderProducts();
    });
  });

  // Search Input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderProducts();
    });
  }

  // Sort Select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProducts();
    });
  }

  // Live Card number format
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

// URL Hash Routing Helper
function handleUrlHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#urun-')) {
    const id = parseInt(hash.replace('#urun-', ''), 10);
    if (!isNaN(id)) {
      setTimeout(() => openProductModal(id), 200);
    }
  }
}
