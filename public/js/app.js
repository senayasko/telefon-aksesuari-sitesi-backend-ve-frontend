/**
 * VİTRİN — Minimalist Açık Tema D2C Telefon Aksesuarları E-Ticaret Uygulaması
 * 3 Al 2 Öde Kampanyası, Upsell Motoru ve 12 Kriter Tam Uyum.
 */

// State Management
const state = {
  products: [],
  categories: ['Kılıf & Koruma', 'Şarj & Güç', 'Ekran & Kamera', 'Tümü'],
  activeCategory: 'Kılıf & Koruma', // Kılıflar ilk sırada!
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

  // Category filter (Default: Kılıf & Koruma)
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
      <div class="col-span-full py-16 text-center text-zinc-500">
        <p class="text-base font-semibold text-zinc-800">Aradığınız kriterde ürün bulunamadı.</p>
        <p class="text-xs mt-1">Farklı bir arama terimi deneyebilir veya kategoriyi değiştirebilirsiniz.</p>
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
        <div class="relative w-full aspect-square bg-zinc-100 overflow-hidden">
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
              <span class="px-2.5 py-1 text-[10px] font-extrabold rounded-md bg-zinc-900 text-white tracking-wider uppercase">
                ${product.badge}
              </span>
            ` : ''}
            ${discountPercent ? `
              <span class="px-2.5 py-1 text-[10px] font-extrabold rounded-md bg-red-600 text-white tracking-wider">
                -%${discountPercent}
              </span>
            ` : ''}
          </div>

          <!-- Quick Stock Alert -->
          ${isLowStock ? `
            <div class="absolute bottom-3 left-3 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              Son ${product.stock} Adet
            </div>
          ` : ''}
          ${isOutOfStock ? `
            <div class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
              <span class="px-3 py-1 bg-zinc-900 text-white text-xs font-bold rounded-md uppercase tracking-wider">Tükendi</span>
            </div>
          ` : ''}
        </div>

        <!-- Details -->
        <div class="p-5 flex flex-col flex-1 justify-between bg-white">
          <div>
            <div class="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span class="text-zinc-600 font-medium">${product.category}</span>
              <div class="flex items-center gap-1 text-zinc-700">
                <span class="text-amber-500">★</span>
                <span class="font-bold text-zinc-900 text-[11px]">${product.rating}</span>
                <span class="text-zinc-400 text-[10px]">(${product.reviewCount})</span>
              </div>
            </div>

            <h3 class="font-bold text-zinc-900 text-sm leading-snug group-hover:text-zinc-600 transition-colors line-clamp-2">
              ${product.name}
            </h3>
            
            <p class="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
              ${product.shortDescription}
            </p>
          </div>

          <div class="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
            <div>
              <div class="flex items-baseline gap-2">
                <span class="text-base font-extrabold text-zinc-950">${formatCurrency(product.price)}</span>
                ${product.oldPrice ? `
                  <span class="text-xs text-zinc-400 line-through">${formatCurrency(product.oldPrice)}</span>
                ` : ''}
              </div>
              <span class="text-[10px] text-zinc-400 font-mono">Stok: ${product.stock}</span>
            </div>

            <button 
              onclick="event.stopPropagation(); quickAddToCart(${product.id})"
              ${isOutOfStock ? 'disabled' : ''}
              class="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
            >
              ${product.hasVariants ? `
                <span>İncele</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              ` : `
                <span>Sepete Ekle</span>
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
      <div class="flex flex-col gap-3">
        <div class="w-full aspect-square rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 relative">
          <img 
            id="modal-main-image"
            src="${product.image}" 
            alt="${product.name}" 
            class="w-full h-full object-cover"
          />
          ${product.badge ? `
            <span class="absolute top-4 left-4 px-3 py-1 bg-zinc-900 text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider">
              ${product.badge}
            </span>
          ` : ''}
        </div>

        ${product.gallery && product.gallery.length > 1 ? `
          <div class="flex gap-2 overflow-x-auto pb-1">
            ${product.gallery.map(img => `
              <button 
                onclick="document.getElementById('modal-main-image').src='${img}'"
                class="w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 hover:border-zinc-900 focus:border-zinc-900 transition-all flex-shrink-0"
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
          <div class="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span class="text-zinc-600 font-bold uppercase tracking-wider">${product.category}</span>
            <div class="flex items-center gap-1.5 text-zinc-700">
              <span class="text-amber-500">★</span>
              <span class="font-bold text-zinc-900">${product.rating}</span>
              <span class="text-zinc-400">(${product.reviewCount} Değerlendirme)</span>
            </div>
          </div>

          <h2 class="text-2xl font-extrabold text-zinc-950 leading-tight font-display">
            ${product.name}
          </h2>

          <div class="mt-3 flex items-baseline gap-3">
            <span class="text-2xl font-black text-zinc-950">${formatCurrency(product.price)}</span>
            ${product.oldPrice ? `
              <span class="text-base text-zinc-400 line-through">${formatCurrency(product.oldPrice)}</span>
              <span class="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-md">-%${discountPercent}</span>
            ` : ''}
          </div>

          <!-- 3 Al 2 Öde Pill inside product -->
          <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <span>🎁</span>
            <span>Bu ürün <strong>3 Al 2 Öde Kampanyası</strong>na Dahildir!</span>
          </div>

          <p class="mt-4 text-xs text-zinc-600 leading-relaxed">
            ${product.description}
          </p>

          <!-- VARIATION SECTION (Criterion 3) -->
          ${product.hasVariants && product.variantOptions ? `
            <div class="mt-5 p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-4">
              <!-- Color Selector -->
              <div>
                <label class="block text-xs font-bold text-zinc-700 mb-2">
                  Renk: <span id="selected-color-name" class="text-zinc-950">${state.selectedVariant.color.name}</span>
                </label>
                <div class="flex gap-2.5">
                  ${product.variantOptions.colors.map(c => `
                    <button 
                      type="button"
                      onclick="selectVariantColor('${c.name}', '${c.hex}')"
                      class="color-swatch w-8 h-8 rounded-full border-2 transition-all relative ${state.selectedVariant.color.name === c.name ? 'border-zinc-900 scale-110' : 'border-transparent'}"
                      style="background-color: ${c.hex};"
                      title="${c.name}"
                    >
                      ${state.selectedVariant.color.name === c.name ? '<span class="absolute inset-0 flex items-center justify-center text-white text-[10px]">✓</span>' : ''}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Model Selector -->
              <div>
                <label class="block text-xs font-bold text-zinc-700 mb-2">
                  iPhone / Cihaz Modeli: <span id="selected-model-name" class="text-zinc-950">${state.selectedVariant.model}</span>
                </label>
                <div class="grid grid-cols-2 gap-2">
                  ${product.variantOptions.models.map(m => `
                    <button 
                      type="button"
                      onclick="selectVariantModel('${m}')"
                      class="py-2 px-3 text-xs font-semibold rounded-lg border text-left transition-all ${state.selectedVariant.model === m ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'}"
                    >
                      ${m}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Live Stock Indicator -->
          <div class="mt-4 flex items-center gap-2 text-xs">
            <span class="w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}"></span>
            <span class="text-zinc-600 font-medium">
              ${product.stock > 0 ? `Canlı Stok: <strong>${product.stock} adet</strong> hazırda var.` : 'Stok tükendi.'}
            </span>
          </div>

          <!-- Progressive Disclosure: Features Click to expand -->
          ${product.specs ? `
            <div class="mt-4 pt-3 border-t border-zinc-100">
              <details class="cursor-pointer text-xs group">
                <summary class="font-bold text-zinc-800 list-none flex items-center justify-between py-1 hover:text-zinc-600">
                  <span>Teknik Özellikleri ve Detaylar</span>
                  <span class="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2">
                  ${product.specs.map(s => `
                    <div class="p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                      <span class="text-zinc-400 block text-[10px]">${s.label}</span>
                      <span class="text-zinc-900 font-medium block mt-0.5">${s.value}</span>
                    </div>
                  `).join('')}
                </div>
              </details>
            </div>
          ` : ''}
        </div>

        <!-- Add to Cart Footer in Modal -->
        <div class="mt-6 pt-5 border-t border-zinc-100 flex items-center gap-3">
          <!-- Quantity -->
          <div class="flex items-center rounded-xl bg-zinc-100 border border-zinc-200 p-1">
            <button onclick="changeModalQty(-1)" class="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-zinc-800 text-sm font-bold">-</button>
            <span id="modal-qty-display" class="w-8 text-center font-bold text-zinc-900 text-xs">1</span>
            <button onclick="changeModalQty(1)" class="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-zinc-800 text-sm font-bold">+</button>
          </div>

          <!-- Add Button -->
          <button 
            onclick="addModalProductToCart()"
            ${product.stock <= 0 ? 'disabled' : ''}
            class="flex-1 py-3 px-6 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            <span>Sepete Ekle</span>
            <span class="text-zinc-400">•</span>
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
  openUpsellModal(product); // Nudge: Sepete gitmek yerine daha çok ürün aldırma modalı!
}

function quickAddToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (product.hasVariants) {
    openProductModal(productId);
  } else {
    addToCart(product, 1, 'Standart');
    openUpsellModal(product); // Nudge: Sepete gitmek yerine daha çok ürün aldırma modalı!
  }
}

// ======================== UPSELL NUDGE MODAL (Sepete gidişi zorlaştır, ürün aldır!) ========================

function openUpsellModal(lastAddedProduct) {
  const modal = document.getElementById('upsell-modal');
  if (!modal) return;

  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const remainingFor3Al2 = Math.max(0, 3 - totalCount);

  // Update progress
  document.getElementById('upsell-added-item-name').innerText = lastAddedProduct.name;
  
  const alertBox = document.getElementById('upsell-campaign-alert');
  if (totalCount >= 3) {
    alertBox.innerHTML = `
      <span class="text-emerald-700 font-bold">🎉 TEBRİKLER! Sepetinizde 3 ürün var; 3 Al 2 Öde fırsatı kazandınız!</span>
    `;
    alertBox.className = 'p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs mb-4 text-center';
  } else {
    alertBox.innerHTML = `
      <span class="text-zinc-900 font-bold">🔥 3 AL 2 ÖDE FIRSATINA SON <span class="text-red-600 font-black">${remainingFor3Al2} ÜRÜN</span> KALDI!</span>
      <p class="text-[11px] text-zinc-600 mt-0.5">Sepetinize ${remainingFor3Al2} aksesuar daha ekleyin, en ucuz ürün <strong>BEDAVA</strong> olsun!</p>
    `;
    alertBox.className = 'p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs mb-4 text-center';
  }

  // Suggest complementary items (e.g. Lens Protector id:11 or 1500D Carbon id:6)
  const suggestionsContainer = document.getElementById('upsell-suggestions');
  const suggestions = state.products.filter(p => p.id !== lastAddedProduct.id && (p.category === 'Ekran & Kamera' || p.category === 'Kılıf & Koruma')).slice(0, 2);

  suggestionsContainer.innerHTML = suggestions.map(item => `
    <div class="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
      <div class="flex items-center gap-3">
        <img src="${item.image}" class="w-12 h-12 rounded-lg object-cover bg-white" />
        <div>
          <h4 class="text-xs font-bold text-zinc-900">${item.name}</h4>
          <span class="text-[11px] font-extrabold text-zinc-950">${formatCurrency(item.price)}</span>
        </div>
      </div>
      <button 
        onclick="addUpsellItemToCart(${item.id})"
        class="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all"
      >
        + Ekle
      </button>
    </div>
  `).join('');

  modal.classList.remove('hidden');
}

function closeUpsellModal() {
  const modal = document.getElementById('upsell-modal');
  if (modal) modal.classList.add('hidden');
}

function addUpsellItemToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (product) {
    addToCart(product, 1, 'Standart');
    showToast(`${product.name} sepete eklendi!`, 'success');
    closeUpsellModal();
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

  // If cart has >= 3 items and no coupon set, auto-recommend 3AL2ODE
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
  showToast(`${product.name} eklendi!`, 'success');
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
    
    // Check 3 al 2 ode condition
    const totalItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItemCount < 3 && state.appliedCoupon?.code === '3AL2ODE') {
      state.appliedCoupon = null;
      localStorage.removeItem('vitrin_coupon');
    }

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

  // Free shipping progress bar
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
    <div class="flex gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200 items-center">
      <img src="${item.image}" alt="${item.name}" class="w-14 h-14 rounded-lg object-cover bg-white border border-zinc-100 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-bold text-zinc-900 truncate">${item.name}</h4>
        <p class="text-[11px] text-zinc-500 font-medium truncate mt-0.5">${item.selectedVariant}</p>
        <span class="text-xs font-extrabold text-zinc-950 mt-1 block">${formatCurrency(item.price)}</span>
      </div>

      <div class="flex flex-col items-end gap-1.5">
        <button onclick="removeCartItem(${index})" class="text-zinc-400 hover:text-red-600 transition-colors p-1" title="Kaldır">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>

        <div class="flex items-center rounded-lg bg-white border border-zinc-200 px-1 py-0.5">
          <button onclick="updateCartItemQty(${index}, -1)" class="w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-black text-xs font-bold">-</button>
          <span class="w-5 text-center text-xs font-bold text-zinc-900">${item.quantity}</span>
          <button onclick="updateCartItemQty(${index}, 1)" class="w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-black text-xs font-bold">+</button>
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
  closeUpsellModal();
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

  ['iyzico', 'havale', 'kapida'].forEach(m => {
    const card = document.getElementById(`payment-card-${m}`);
    const details = document.getElementById(`payment-details-${m}`);
    if (m === method) {
      card?.classList.add('border-zinc-950', 'bg-zinc-50');
      card?.classList.remove('border-zinc-200');
      details?.classList.remove('hidden');
    } else {
      card?.classList.remove('border-zinc-950', 'bg-zinc-50');
      card?.classList.add('border-zinc-200');
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

  document.getElementById('card-preview-number').innerText = '4242 •••• •••• 4242';
  document.getElementById('card-preview-name').innerText = 'AHMET YILMAZ';
  document.getElementById('card-preview-expiry').innerText = '12/28';

  showToast('iyzico test kart bilgileri dolduruldu!', 'success');
}

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

// Submit Order
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
    showToast('Lütfen teslimat bilgileri alanlarını doldurunuz.', 'error');
    return;
  }

  if (!agreement) {
    showToast('Lütfen sözleşme ve KVKK onayını işaretleyiniz.', 'error');
    return;
  }

  if (state.checkoutPaymentMethod === 'iyzico') {
    const ccNum = document.getElementById('cc-number').value.replace(/\s/g, '');
    const ccCvv = document.getElementById('cc-cvv').value.trim();
    if (ccNum.length < 16 || ccCvv.length < 3) {
      showToast('Lütfen geçerli bir kart numarası ve CVV giriniz.', 'error');
      return;
    }
    open3DSecureModal({ fullName, email, phone, city, district, address, note });
    return;
  }

  finalizeOrder({ fullName, email, phone, city, district, address, note });
}

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
  showToast('3D Secure Doğrulandı!', 'success');
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
      state.cart = [];
      state.appliedCoupon = null;
      saveCart();
      localStorage.removeItem('vitrin_coupon');
      updateCartUI();

      closeCheckoutModal();
      openOrderSuccessModal(data.order);
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

// Legal Modals (Criterion 7)
function openLegalModal(type) {
  const titles = {
    kvkk: 'KVKK Aydınlatma Metni',
    cerez: 'Çerez (Cookie) Politikası',
    mesafeli: 'Mesafeli Satış Sözleşmesi',
    iade: 'İptal ve Cayma/İade Koşulları'
  };

  const texts = {
    kvkk: `
      <h4 class="font-bold text-zinc-900 mb-1">1. Veri Sorumlusu</h4>
      <p class="mb-3">6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, VİTRİN E-Ticaret A.Ş. veri sorumlusu sıfatıyla kişisel verilerinizi işlemektedir.</p>
      
      <h4 class="font-bold text-zinc-900 mb-1">2. Verilerin İşlenme Amacı</h4>
      <p class="mb-3">Ad, soyad, telefon ve adres verileriniz; siparişlerin teslimi, faturalandırma ve müşteri hizmetleri süreçlerinin yürütülmesi amacıyla işlenmektedir.</p>

      <h4 class="font-bold text-zinc-900 mb-1">3. Aktarılan Taraflar</h4>
      <p class="mb-3">Kişisel verileriniz yalnızca siparişinizin fiziki teslimatını gerçekleştirmek üzere anlaşmalı kargo şirketleri (Yurtiçi Kargo, HepsiJet vb.) ile paylaşılmaktadır.</p>
    `,
    cerez: `
      <h4 class="font-bold text-zinc-900 mb-1">Çerezlerin Kullanım Amacı</h4>
      <p class="mb-3">Sitemizde kullanıcı deneyimini iyileştirmek, sepet içeriğinizi hatırlamak ve güvenli oturum yönetimini sağlamak adına zorunlu çerezler kullanılmaktadır.</p>
    `,
    mesafeli: `
      <h4 class="font-bold text-zinc-900 mb-1">Madde 1 - Taraflar</h4>
      <p class="mb-3">İşbu sözleşme, VİTRİN Mağazası (Satıcı) ile siparişi veren Tüketici (Alıcı) arasında 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında akdedilmiştir.</p>
      
      <h4 class="font-bold text-zinc-900 mb-1">Madde 2 - Cayma Hakkı</h4>
      <p class="mb-3">Alıcı, ürünün tesliminden itibaren 14 gün içinde hiçbir gerekçe göstermeksizin cayma hakkına sahiptir.</p>
    `,
    iade: `
      <h4 class="font-bold text-zinc-900 mb-1">14 Gün Koşulsuz Cayma Hakkı</h4>
      <p class="mb-3">Satın aldığınız ürünleri, teslimat tarihinden itibaren 14 gün içerisinde orijinal kutusuyla birlikte ücretsiz iade edebilirsiniz.</p>
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

// Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClasses = {
    success: 'bg-zinc-900 text-white border-zinc-700',
    error: 'bg-red-600 text-white border-red-500',
    info: 'bg-white text-zinc-900 border-zinc-200 shadow-xl'
  };

  toast.className = `p-3.5 rounded-xl border backdrop-blur-md shadow-lg flex items-center gap-2.5 animate-slide-up text-xs font-semibold ${bgClasses[type] || bgClasses.info}`;
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

function formatCurrency(val) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
}

function setupEventListeners() {
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(b => {
        b.classList.remove('bg-zinc-950', 'text-white', 'font-bold');
        b.classList.add('bg-white', 'text-zinc-600', 'border-zinc-200');
      });
      btn.classList.add('bg-zinc-950', 'text-white', 'font-bold');
      btn.classList.remove('bg-white', 'text-zinc-600', 'border-zinc-200');
      state.activeCategory = btn.dataset.category;
      renderProducts();
    });
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
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
    if (!isNaN(id)) {
      setTimeout(() => openProductModal(id), 200);
    }
  }
}
