# 📱 vitrin. — Yeni Nesil Telefon Aksesuarları E-Ticaret Platformu

Bu proje, üniversite e-ticaret dersi kapsamında belirlenen **12 zorunlu kriterin tamamını** eksiksiz ve en yüksek endüstri standartlarında karşılamak üzere geliştirilmiş, D2C (Direct-to-Consumer) telefon aksesuarları dropshipping platformudur.

---

## ⚡ Hızlı Başlangıç

Projeyi çalıştırmak için tek yapmanız gereken:

```bash
# Proje dizininde:
npm start
```

Tarayıcınızdan aşağıdaki adreslere gidebilirsiniz:
- 🛒 **Müşteri Mağaza Arayüzü:** [http://localhost:3000](http://localhost:3000)
- 📦 **Canlı Kargo ve Sipariş Takibi:** [http://localhost:3000/takip](http://localhost:3000/takip)
- ⚡ **Yönetim (Admin) Paneli:** [http://localhost:3000/admin](http://localhost:3000/admin)
- 🔍 **SEO Dinamik XML Haritası:** [http://localhost:3000/sitemap.xml](http://localhost:3000/sitemap.xml)

---

## 📋 12 Kriter Karşılama Tablosu

| # | İstenen Kriter | vitrin. Projesindeki Uygulama |
|---|----------------|------------------------------|
| **1** | **E-Ticaret Altyapısı** | Node.js + Express REST API + Modern Responsive Single Page & Multi-View Mimarisi. Harici karmaşık kurulum (XAMPP/MySQL) gerektirmez; JSON tabanlı güvenilir yerel veri tabanıyla çalışır. |
| **2** | **En az 12 ürün & 3 kategori** | **12 adet** yüksek çözünürlüklü fotoğrafa, SEO açıklamasına, stok adedine ve fiyatına sahip ürün. 3 Kategori: **Kılıf & Koruma**, **Şarj & Güç**, **Ekran & Kamera**. |
| **3** | **En az 1 varyasyonlu ürün** | **Vitrin Armor MagSafe Titanyum Kılıf**:<br>- **Renkler:** Mat Titanyum, Gece Siyahı, Pasifik Mavisi, Zümrüt Yeşili<br>- **Cihaz Modelleri:** iPhone 15 Pro Max, iPhone 15 Pro, iPhone 15, Samsung Galaxy S24 Ultra |
| **4** | **Sepet ve 2+ Ödeme Akışı** | - Dinamik mini sepet çekmecesi (adet artırma/azaltma, silme).<br>- **Ödeme 1:** Havale / EFT (IBAN bilgileri ve açıklama rehberi).<br>- **Ödeme 2:** Kapıda Ödeme (Nakit / Kredi Kartı seçimi, +29.90 TL hizmet bedeli).<br>- **Ödeme 3:** iyzico Kredi Kartı Test Modu (İnteraktif kart animasyonu, test kartı otomatik doldurma, 3D Secure SMS OTP simülasyonu!). |
| **5** | **Kargo Bölgesi & Kuralı** | - **Kural:** 1.000 TL ve üzeri siparişlerde **Ücretsiz Kargo**, altı için **59.90 TL Sabit Kargo**.<br>- Sepette canlı ilerleme çubuğu (*"Ücretsiz kargoya son X TL kaldı!"*).<br>- Canlı kargo takip kodu üretimi (`TR-YRT-XXXXXX`) ve adım adım takip ekranı. |
| **6** | **E-Fiyatlandırma (Kupon & İndirim)** | - **Kupon Kodları:** `VITRIN10` (%10 indirim), `GENCLIK20` (%20 indirim), `ILKSIPARIS` (100 TL indirim), `HOCA100` (%25 VIP akademisyen indirimi).<br>- **İndirimli Ürünler:** Üstü çizili eski fiyat, yeni indirimli fiyat ve yüzde indirim rozetleri. |
| **7** | **Yasal Sayfalar** | - **KVKK Aydınlatma Metni** (6698 sayılı kanuna tam uyumlu modal)<br>- **Çerez (Cookie) Politikası & Onay Banner'ı**<br>- **Mesafeli Satış Sözleşmesi** (Ödeme adımında zorunlu onay)<br>- **İade ve Cayma Koşulları** (14 gün yasal iade rehberi) |
| **8** | **Kurumsal Sayfalar** | - **Hakkımızda:** Genç girişim vizyonu ve AI tabanlı lojistik hikayesi.<br>- **İletişim:** Çalışan mesaj formu, müşteri hizmetleri ve interaktif gömülü Google Harita.<br>- **Sıkça Sorulan Sorular (SSS):** Açılır-kapanır akordiyon yapısı. |
| **9** | **Mobil Uyumlu Tema, Logo ve Kimlik** | - Koyu mod D2C estetiği (Casetify, Nomad, Nothing esintili).<br>- `assets/logo.jpg` profesyonel wordmark tipografik logo.<br>- %100 mobil, tablet ve masaüstü duyarlı (responsive) tasarım. |
| **10** | **SEO (Yoast / Rank Math Standartları)** | - Sayfa ve ürün bazlı Meta Title, Meta Description ve Keywords.<br>- OpenGraph sosyal medya kartları.<br>- Schema.org JSON-LD yapılandırılmış e-ticaret mağaza verisi.<br>- Dinamik `sitemap.xml` ve `robots.txt`. |
| **11** | **E-Reklam ve E-İletişim** | - Instagram, TikTok ve WhatsApp Sipariş & Destek Hattı linkleri.<br>- E-Bülten kayıt formu (Kayıt olana anında %10 kupon hediye eden UX akışı). |
| **12** | **Test Siparişleri & Durum Güncellemesi** | - Farklı ödeme yöntemleriyle verilmiş 3 hazır test siparişi:<br>  * `VTR-1001` (Havale/EFT) -> `Hazırlanıyor`<br>  * `VTR-1002` (Kapıda Ödeme) -> `Kargoya Verildi`<br>  * `VTR-1003` (iyzico Kredi Kartı) -> `Teslim Edildi`<br>- Admin panelinden sipariş durumunu tek tıkla değiştirebilme ve kargo takip sayfasına anlık yansıması.<br>- Admin panelinde tek tıkla yeni test siparişi oluşturan sihirbaz butonu. |

---

## 🛠️ Mimari & Dosya Yapısı

```
gemini_okulproje/
├── server.js              # Express REST API ve sunucu
├── package.json           # Proje bağımlılıkları ve npm start betiği
├── data/
│   ├── products.json      # 12 ürün, kategoriler, varyasyonlar, stoklar
│   ├── orders.json        # Test siparişleri ve canlı sipariş verisi
│   └── coupons.json       # İndirim kuponları
└── public/
    ├── index.html         # vitrin. ana mağaza arayüzü (SPA)
    ├── tracking.html      # Canlı kargo takip sayfası (Kargom Nerede?)
    ├── admin.html         # Gelişmiş Admin Yönetim Paneli
    ├── css/
    │   └── style.css      # Koyu mod, cam efekti, tipografi ve animasyonlar
    ├── js/
    │   ├── app.js         # Mağaza sepeti, varyantlar, checkout, iyzico simülatörü
    │   ├── tracking.js    # Kargo takip sorgu ve timeline mantığı
    │   └── admin.js       # Sipariş durumu güncelleme, stok yönetimi, test siparişi
    └── assets/
        └── logo.jpg       # vitrin. tipografik logosu
```
