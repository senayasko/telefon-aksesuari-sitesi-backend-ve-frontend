/**
 * VİTRİN — Canlı Kargo ve Sipariş Takip Mantığı (Kargom Nerede?)
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('kod');

  if (codeParam) {
    document.getElementById('tracking-input').value = codeParam;
    trackOrder(codeParam);
  }

  const form = document.getElementById('tracking-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = document.getElementById('tracking-input').value.trim();
      if (code) {
        trackOrder(code);
      }
    });
  }
});

async function trackOrder(code) {
  const resultCard = document.getElementById('tracking-result-card');
  const emptyState = document.getElementById('tracking-empty-state');
  const notFoundState = document.getElementById('tracking-not-found');
  const loadingState = document.getElementById('tracking-loading');

  emptyState?.classList.add('hidden');
  notFoundState?.classList.add('hidden');
  resultCard?.classList.add('hidden');
  loadingState?.classList.remove('hidden');

  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(code)}`);
    const data = await res.json();

    loadingState?.classList.add('hidden');

    if (data.success && data.order) {
      renderTrackingDetails(data.order);
      resultCard?.classList.remove('hidden');
    } else {
      notFoundState?.classList.remove('hidden');
    }
  } catch (err) {
    loadingState?.classList.add('hidden');
    notFoundState?.classList.remove('hidden');
  }
}

function renderTrackingDetails(order) {
  document.getElementById('res-order-id').innerText = order.id;
  document.getElementById('res-cargo-company').innerText = order.cargo.company;
  document.getElementById('res-cargo-code').innerText = order.cargo.trackingNumber;
  document.getElementById('res-est-delivery').innerText = order.cargo.estimatedDelivery || '2 Gün İçinde';
  document.getElementById('res-recipient-name').innerText = order.customer.fullName;
  document.getElementById('res-recipient-city').innerText = `${order.customer.city} / ${order.customer.district}`;
  document.getElementById('res-recipient-address').innerText = order.customer.address;
  document.getElementById('res-payment-method').innerText = order.paymentMethod;
  document.getElementById('res-order-total').innerText = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.total);

  // Status Badge
  const statusBadge = document.getElementById('res-status-badge');
  const statusColors = {
    'Beklemede': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'Hazırlanıyor': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'Kargoya Verildi': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'Teslim Edildi': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'İptal Edildi': 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  };
  statusBadge.className = `px-3 py-1 rounded-full text-xs font-bold border ${statusColors[order.status] || 'bg-zinc-800 text-zinc-300'}`;
  statusBadge.innerText = order.status;

  // Timeline
  const timelineContainer = document.getElementById('res-timeline');
  if (timelineContainer && order.cargo.history) {
    timelineContainer.innerHTML = order.cargo.history.map((step, idx) => `
      <div class="relative flex items-start gap-4 pb-6 last:pb-0">
        ${idx !== order.cargo.history.length - 1 ? `
          <div class="absolute left-3.5 top-7 bottom-0 w-0.5 ${step.completed ? 'bg-cyan-500' : 'bg-zinc-800'}"></div>
        ` : ''}
        <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${step.completed ? 'bg-cyan-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/30' : 'bg-zinc-800 text-zinc-500 border border-white/10 text-xs'}">
          ${step.completed ? '✓' : idx + 1}
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-bold ${step.completed ? 'text-white' : 'text-zinc-500'}">${step.title}</h4>
          <span class="text-xs text-zinc-400 block mt-0.5">${step.date}</span>
        </div>
      </div>
    `).join('');
  }

  // Items List
  const itemsContainer = document.getElementById('res-items-list');
  if (itemsContainer) {
    itemsContainer.innerHTML = order.items.map(item => `
      <div class="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-white/5">
        <img src="${item.image}" alt="${item.name}" class="w-12 h-12 rounded-lg object-cover bg-zinc-800" />
        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold text-white truncate">${item.name}</p>
          <span class="text-[11px] text-cyan-400 block">${item.selectedVariant || 'Standart'}</span>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-white">${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price)}</span>
          <span class="text-[10px] text-zinc-500 block">x${item.quantity} Adet</span>
        </div>
      </div>
    `).join('');
  }
}
