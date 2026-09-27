/**
 * VİTRİN — Gelişmiş Yönetim (Admin) Paneli Mantığı
 * Sipariş durumları, canlı stok takibi ve istatistik yönetimi.
 */

let adminOrders = [];
let adminProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  loadAdminData();
  setupAdminTabs();
});

async function loadAdminData() {
  await Promise.all([
    fetchStats(),
    fetchOrders(),
    fetchProducts()
  ]);
}

async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      renderStats(data.stats);
    }
  } catch (err) {
    console.error('İstatistik yüklenemedi:', err);
  }
}

function renderStats(stats) {
  document.getElementById('stat-revenue').innerText = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.totalRevenue);
  document.getElementById('stat-orders').innerText = stats.totalOrders;
  document.getElementById('stat-pending').innerText = stats.pendingOrders;
  document.getElementById('stat-low-stock').innerText = stats.lowStockCount;
  document.getElementById('stat-seo-score').innerText = `${stats.seoScore}/100`;
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      adminOrders = data.orders;
      renderOrdersTable(adminOrders);
    }
  } catch (err) {
    console.error('Siparişler yüklenemedi:', err);
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-zinc-500">Henüz sipariş bulunmuyor.</td></tr>`;
    return;
  }

  const statusColors = {
    'Beklemede': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Hazırlanıyor': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Kargoya Verildi': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Teslim Edildi': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'İptal Edildi': 'bg-rose-500/20 text-rose-300 border-rose-500/30'
  };

  tbody.innerHTML = orders.map(order => `
    <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td class="py-4 px-4 font-mono font-bold text-cyan-400">
        <a href="/takip?kod=${order.id}" target="_blank" class="hover:underline flex items-center gap-1" title="Kargo Takipte Gör">
          <span>${order.id}</span>
          <svg class="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </td>
      <td class="py-4 px-4">
        <div class="font-semibold text-white text-xs">${order.customer.fullName}</div>
        <div class="text-[11px] text-zinc-500">${order.customer.city} • ${order.customer.phone}</div>
      </td>
      <td class="py-4 px-4">
        <div class="text-xs text-zinc-300 max-w-xs truncate">
          ${order.items.map(i => `${i.name} (${i.quantity}x)`).join(', ')}
        </div>
      </td>
      <td class="py-4 px-4 font-bold text-white text-xs">
        ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.total)}
      </td>
      <td class="py-4 px-4">
        <span class="text-xs text-zinc-400 block">${order.paymentMethod}</span>
      </td>
      <td class="py-4 px-4">
        <!-- Interactive Status Select -->
        <select 
          onchange="updateOrderStatus('${order.id}', this.value)"
          class="text-xs font-bold py-1.5 px-3 rounded-lg border bg-zinc-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-400 ${statusColors[order.status] || 'text-zinc-300 border-white/10'}"
        >
          <option value="Beklemede" ${order.status === 'Beklemede' ? 'selected' : ''}>Beklemede</option>
          <option value="Hazırlanıyor" ${order.status === 'Hazırlanıyor' ? 'selected' : ''}>Hazırlanıyor</option>
          <option value="Kargoya Verildi" ${order.status === 'Kargoya Verildi' ? 'selected' : ''}>Kargoya Verildi</option>
          <option value="Teslim Edildi" ${order.status === 'Teslim Edildi' ? 'selected' : ''}>Teslim Edildi</option>
          <option value="İptal Edildi" ${order.status === 'İptal Edildi' ? 'selected' : ''}>İptal Edildi</option>
        </select>
      </td>
      <td class="py-4 px-4 text-right">
        <button 
          onclick="viewOrderModal('${order.id}')"
          class="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
        >
          Detay
        </button>
      </td>
    </tr>
  `).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();

    if (data.success) {
      showAdminToast(`Sipariş #${orderId} durumu "${newStatus}" olarak güncellendi!`, 'success');
      await fetchOrders();
      await fetchStats();
    } else {
      showAdminToast(data.message, 'error');
    }
  } catch (err) {
    showAdminToast('Durum güncellenirken hata oluştu.', 'error');
  }
}

async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      adminProducts = data.products;
      renderInventoryTable(adminProducts);
    }
  } catch (err) {
    console.error('Ürünler yüklenemedi:', err);
  }
}

function renderInventoryTable(products) {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;

  tbody.innerHTML = products.map(product => {
    const isLow = product.stock < 30;
    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${product.image}" class="w-10 h-10 rounded-lg object-cover bg-zinc-800" />
            <div>
              <div class="text-xs font-bold text-white">${product.name}</div>
              <span class="text-[11px] text-cyan-400">${product.category}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 text-xs font-bold text-white">
          ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold ${isLow ? 'text-rose-400' : 'text-emerald-400'}">
              ${product.stock} Adet
            </span>
            ${isLow ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold">Kritik</span>' : ''}
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-1.5">
            <button onclick="modifyStock(${product.id}, -5)" class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300">-5</button>
            <button onclick="modifyStock(${product.id}, -1)" class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300">-1</button>
            <button onclick="modifyStock(${product.id}, 1)" class="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-xs font-mono text-cyan-300 font-bold">+1</button>
            <button onclick="modifyStock(${product.id}, 10)" class="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-xs font-mono text-cyan-300 font-bold">+10</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function modifyStock(productId, delta) {
  const prod = adminProducts.find(p => p.id === productId);
  if (!prod) return;

  const newStock = Math.max(0, prod.stock + delta);
  try {
    const res = await fetch(`/api/products/${productId}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock })
    });
    const data = await res.json();
    if (data.success) {
      showAdminToast(`${prod.name} stoğu ${newStock} olarak güncellendi.`, 'success');
      await fetchProducts();
      await fetchStats();
    }
  } catch (err) {
    showAdminToast('Stok güncellenemedi.', 'error');
  }
}

// Quick Test Order Generator for Presentations (Criterion 12)
async function createQuickTestOrder() {
  const names = ['Burak Demir', 'Elif Yıldız', 'Mert Öztürk', 'Selin Aksoy', 'Hakan Çelik'];
  const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'];
  const methods = ['iyzico Kredi Kartı (Test Modu)', 'Havale / EFT', 'Kapıda Ödeme'];

  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomCity = cities[Math.floor(Math.random() * cities.length)];
  const randomMethod = methods[Math.floor(Math.random() * methods.length)];
  const randomProduct = adminProducts[Math.floor(Math.random() * adminProducts.length)] || {
    id: 1,
    name: 'Vitrin Armor MagSafe Titanyum Kılıf',
    price: 599.00,
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80'
  };

  const payload = {
    customer: {
      fullName: randomName,
      email: `${randomName.toLowerCase().replace(' ', '.')}@example.com`,
      phone: '+90 532 ' + Math.floor(100 + Math.random() * 900) + ' ' + Math.floor(10 + Math.random() * 90) + ' ' + Math.floor(10 + Math.random() * 90),
      city: randomCity,
      district: 'Merkez',
      address: 'Atatürk Bulvarı No:' + Math.floor(1 + Math.random() * 100),
      note: 'Hızlı test siparişi'
    },
    items: [
      {
        id: randomProduct.id,
        name: randomProduct.name,
        selectedVariant: 'Standart / Siyah',
        price: randomProduct.price,
        quantity: 1,
        image: randomProduct.image
      }
    ],
    subtotal: randomProduct.price,
    discount: 0,
    shippingFee: randomProduct.price >= 1000 ? 0 : 59.90,
    doorServiceFee: randomMethod.includes('Kapıda') ? 29.90 : 0,
    total: randomProduct.price + (randomProduct.price >= 1000 ? 0 : 59.90) + (randomMethod.includes('Kapıda') ? 29.90 : 0),
    paymentMethod: randomMethod,
    paymentDetails: { status: 'Onaylandı' }
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showAdminToast(`Yeni Test Siparişi (${data.order.id}) başarıyla oluşturuldu!`, 'success');
      await fetchOrders();
      await fetchStats();
      await fetchProducts();
    }
  } catch (err) {
    showAdminToast('Test siparişi oluşturulurken hata çıktı.', 'error');
  }
}

// Order View Modal
function viewOrderModal(orderId) {
  const order = adminOrders.find(o => o.id === orderId);
  if (!order) return;

  const modal = document.getElementById('admin-order-modal');
  document.getElementById('modal-order-id').innerText = order.id;
  document.getElementById('modal-cust-name').innerText = order.customer.fullName;
  document.getElementById('modal-cust-contact').innerText = `${order.customer.email} • ${order.customer.phone}`;
  document.getElementById('modal-cust-address').innerText = `${order.customer.address}, ${order.customer.district} / ${order.customer.city}`;
  document.getElementById('modal-cust-note').innerText = order.customer.note || 'Not girilmemiş.';
  document.getElementById('modal-cargo-code').innerText = `${order.cargo.company} — ${order.cargo.trackingNumber}`;
  document.getElementById('modal-payment-method').innerText = order.paymentMethod;
  document.getElementById('modal-total-amt').innerText = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.total);

  const itemsList = document.getElementById('modal-items-list');
  itemsList.innerHTML = order.items.map(i => `
    <div class="flex justify-between items-center text-xs py-1.5 border-b border-white/5 last:border-0">
      <span class="text-zinc-300 font-medium">${i.name} (${i.selectedVariant || 'Standart'}) x${i.quantity}</span>
      <span class="text-white font-bold">${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(i.price * i.quantity)}</span>
    </div>
  `).join('');

  modal.classList.remove('hidden');
}

function closeAdminOrderModal() {
  document.getElementById('admin-order-modal').classList.add('hidden');
}

// Tab navigation
function setupAdminTabs() {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => {
        b.classList.remove('border-cyan-400', 'text-cyan-400', 'bg-white/5');
        b.classList.add('border-transparent', 'text-zinc-400');
      });
      btn.classList.add('border-cyan-400', 'text-cyan-400', 'bg-white/5');
      btn.classList.remove('border-transparent', 'text-zinc-400');

      const target = btn.dataset.tab;
      document.querySelectorAll('.admin-tab-pane').forEach(pane => {
        pane.classList.add('hidden');
      });
      document.getElementById(`tab-pane-${target}`)?.classList.remove('hidden');
    });
  });
}

function showAdminToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgClasses = {
    success: 'bg-emerald-500/90 text-white border-emerald-400',
    error: 'bg-rose-600/90 text-white border-rose-500',
    info: 'bg-zinc-800/95 text-white border-cyan-500/50'
  };

  toast.className = `fixed bottom-5 right-5 p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-xs font-semibold z-50 ${bgClasses[type] || bgClasses.info}`;
  toast.innerHTML = `<span>✓</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
