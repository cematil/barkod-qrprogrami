import Dexie from 'dexie';

export const db = new Dexie('PosMasterDB');

// Veritabanı Sürümü 9 (Sistem Logları Eklendi)
db.version(9).stores({
  products: '++id, barcode, name, price, costPrice, category, stock, minStock, supplierId, image',
  sales: '++id, customerId, totalAmount, paymentType, createdAt, synced, cashierName',
  suppliers: '++id, name, phone, company, balance',
  customers: '++id, name, phone, balance',
  categories: '++id, name',
  users: '++id, username, password, role, name',
  settings: 'key, value',
  system_logs: '++id, actionType, details, username, createdAt'
});

export async function initSeedData() {
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd([
      { name: 'Genel' },
      { name: 'Bira' },
      { name: 'Rakı' },
      { name: 'Viski' },
      { name: 'Votka' },
      { name: 'Şarap' },
      { name: 'Sigara' },
      { name: 'Meşrubat' },
      { name: 'Aperatif & Çerez' },
      { name: 'Manav / Terazi' }
    ]);
  }

  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkAdd([
      { username: 'admin', password: '123', role: 'admin', name: 'Süper Yönetici' },
      { username: 'kasiyer1', password: '123', role: 'cashier', name: 'Ahmet Kasiyer' }
    ]);
  }

  const productCount = await db.products.count();
  if (productCount === 0) {
    await db.products.bulkAdd([
      { barcode: '8690527010001', name: 'Amsterdam Navigator 50 cl', price: 82.00, costPrice: 70.00, category: 'Bira', stock: 15, minStock: 5, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&q=80' },
      { barcode: '8690528010002', name: 'Becks 33 cl', price: 70.00, costPrice: 58.00, category: 'Bira', stock: 24, minStock: 5, image: '' },
      { barcode: '8697804010103', name: 'Beylerbeyi Göbek Rakısı 70 cl', price: 1300.00, costPrice: 1100.00, category: 'Rakı', stock: 6, minStock: 2, image: '' },
      { barcode: '8690565010204', name: 'Camel Yellow', price: 72.00, costPrice: 65.00, category: 'Sigara', stock: 40, minStock: 10, image: '' },
      { barcode: '5000281005409', name: 'Chivas Regal 12 Yıl 70 cl', price: 1450.00, costPrice: 1200.00, category: 'Viski', stock: 8, minStock: 3, image: '' }
    ]);
  }
}

// SİLİNEMEZ SİSTEM AKTİVİTESİ KAYDETME FONKSİYONU
export async function logActivity(actionType, details, username = 'Sistem') {
  try {
    const logData = {
      actionType,
      details,
      username,
      createdAt: new Date().toISOString()
    };
    await db.system_logs.add(logData);
    await pushToCentralServer('system_logs', logData);
  } catch (err) {
    console.warn("Log kaydı alınamadı:", err.message);
  }
}

// SUNUCU ADRESİNİ DİNAMİK YÖNLENDİRME (MOBİL VE BİLGİSAYAR İSTEMCİ OTOMATİK ALGILAMA)
function getSyncUrl() {
  const kasaMode = localStorage.getItem('kasa_mode') || 'ana';
  const serverPort = localStorage.getItem('server_port') || '8080';
  
  // Mevcut tarayıcının çalıştığı IP / Hostname
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  // Ana Kasa bilgisayarı localhost üzerindeyse doğrudan localhost'a bağlanır
  if (kasaMode === 'ana' && (currentHost === 'localhost' || currentHost === '127.0.0.1')) {
    return `http://localhost:${serverPort}`;
  }

  // Telefondan veya farklı bir bilgisayardan IP ile girildiğinde, girilen IP'yi otomatik olarak sunucu adresi kabul et
  const targetIp = (currentHost !== 'localhost' && currentHost !== '127.0.0.1') 
    ? currentHost 
    : (localStorage.getItem('server_ip') || '192.168.1.88');

  return `http://${targetIp}:${serverPort}`;
}

// SUNUCUYA CANLI VERİ GÖNDERME (PUSH)
export async function pushToCentralServer(tableName, data) {
  const baseUrl = getSyncUrl();
  try {
    await fetch(`${baseUrl}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: tableName, data })
    });
  } catch (err) {
    console.warn("Sunucuya anlık veri gönderilemedi (Offline):", err.message);
  }
}

// SUNUCUDAN TÜM CANLI VERİLERİ ÇEKME VE YEREL VERİTABANINI GÜNCELLEME (PULL + SILININLERI TEMIZLEME)
export async function syncWithCentralServer() {
  const baseUrl = getSyncUrl();
  const kasaMode = localStorage.getItem('kasa_mode') || 'ana';

  try {
    // 1. Eğer Ana Kasa ise, kendi yerel verilerini sunucuya yedekle/yayınla
    if (kasaMode === 'ana') {
      const localProducts = await db.products.toArray();
      const localCategories = await db.categories.toArray();
      const localCustomers = await db.customers.toArray();
      const localSuppliers = await db.suppliers.toArray();
      const localSales = await db.sales.toArray();

      if (localProducts.length > 0) {
        await fetch(`${baseUrl}/api/sync/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'products', fullTable: localProducts })
        });
      }
      if (localCategories.length > 0) {
        await fetch(`${baseUrl}/api/sync/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'categories', fullTable: localCategories })
        });
      }
      if (localCustomers.length > 0) {
        await fetch(`${baseUrl}/api/sync/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'customers', fullTable: localCustomers })
        });
      }
      if (localSuppliers.length > 0) {
        await fetch(`${baseUrl}/api/sync/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'suppliers', fullTable: localSuppliers })
        });
      }
      if (localSales.length > 0) {
        await fetch(`${baseUrl}/api/sync/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'sales', fullTable: localSales })
        });
      }
    }

    // 2. Sunucudaki güncel verileri çek ve yerel veritabanı ile eşitle
    const response = await fetch(`${baseUrl}/api/sync/pull`);
    if (response.ok) {
      const centralData = await response.json();
      
      // ÜRÜN SENKRONİZASYONU (Sunucuda silinen ürünü istemciden de kaldırır)
      if (centralData.products) {
        const centralProductIds = centralData.products.map(p => p.id);
        await db.transaction('rw', db.products, async () => {
          if (centralData.products.length > 0) {
            await db.products.bulkPut(centralData.products);
          }
          const localProducts = await db.products.toArray();
          const idsToDelete = localProducts
            .filter(p => !centralProductIds.includes(p.id))
            .map(p => p.id);
          if (idsToDelete.length > 0) {
            await db.products.bulkDelete(idsToDelete);
          }
        });
      }

      // KATEGORİ SENKRONİZASYONU
      if (centralData.categories) {
        const centralCatIds = centralData.categories.map(c => c.id);
        await db.transaction('rw', db.categories, async () => {
          if (centralData.categories.length > 0) {
            await db.categories.bulkPut(centralData.categories);
          }
          const localCats = await db.categories.toArray();
          const catIdsToDelete = localCats
            .filter(c => !centralCatIds.includes(c.id))
            .map(c => c.id);
          if (catIdsToDelete.length > 0) {
            await db.categories.bulkDelete(catIdsToDelete);
          }
        });
      }

      // MÜŞTERİ / CARİ SENKRONİZASYONU
      if (centralData.customers) {
        const centralCustIds = centralData.customers.map(c => c.id);
        await db.transaction('rw', db.customers, async () => {
          if (centralData.customers.length > 0) {
            await db.customers.bulkPut(centralData.customers);
          }
          const localCusts = await db.customers.toArray();
          const custIdsToDelete = localCusts
            .filter(c => !centralCustIds.includes(c.id))
            .map(c => c.id);
          if (custIdsToDelete.length > 0) {
            await db.customers.bulkDelete(custIdsToDelete);
          }
        });
      }

      // TOPTANCI SENKRONİZASYONU
      if (centralData.suppliers) {
        const centralSuppIds = centralData.suppliers.map(s => s.id);
        await db.transaction('rw', db.suppliers, async () => {
          if (centralData.suppliers.length > 0) {
            await db.suppliers.bulkPut(centralData.suppliers);
          }
          const localSupps = await db.suppliers.toArray();
          const suppIdsToDelete = localSupps
            .filter(s => !centralSuppIds.includes(s.id))
            .map(s => s.id);
          if (suppIdsToDelete.length > 0) {
            await db.suppliers.bulkDelete(suppIdsToDelete);
          }
        });
      }

      // SATIŞ GEÇMİŞİ SENKRONİZASYONU
      if (centralData.sales && centralData.sales.length > 0) {
        await db.transaction('rw', db.sales, async () => {
          for (const item of centralData.sales) {
            await db.sales.put(item);
          }
        });
      }

      // SİSTEM LOGLARI SENKRONİZASYONU
      if (centralData.logs && centralData.logs.length > 0) {
        await db.transaction('rw', db.system_logs, async () => {
          for (const item of centralData.logs) {
            await db.system_logs.put(item);
          }
        });
      }
    }
  } catch (err) {
    console.warn("Senkronizasyon bekleniyor:", err.message);
  }
}

// ÜRÜN EKLEME (İSTEMCİ / ANA KASA DESTEKLİ)
export async function addProduct(productData, activeUser = 'Sistem') {
  const id = await db.products.add(productData);
  const newProduct = { ...productData, id };

  await pushToCentralServer('products', newProduct);
  await logActivity('ÜRÜN_EKLEME', `"${productData.name}" adında yeni ürün eklendi. Barkod: ${productData.barcode}`, activeUser);

  return id;
}

// MÜŞTERİ / CARİ EKLEME (İSTEMCİ / ANA KASA DESTEKLİ)
export async function addCustomer(customerData, activeUser = 'Sistem') {
  const id = await db.customers.add(customerData);
  const newCustomer = { ...customerData, id };

  await pushToCentralServer('customers', newCustomer);
  await logActivity('MÜŞTERİ_EKLEME', `"${customerData.name}" isimli yeni cari/müşteri eklendi.`, activeUser);

  return id;
}

// TOPTANCI EKLEME (İSTEMCİ / ANA KASA DESTEKLİ)
export async function addSupplier(supplierData, activeUser = 'Sistem') {
  const id = await db.suppliers.add(supplierData);
  const newSupplier = { ...supplierData, id };

  await pushToCentralServer('suppliers', newSupplier);
  await logActivity('TOPTANCI_EKLEME', `"${supplierData.name}" isimli yeni toptancı eklendi.`, activeUser);

  return id;
}

// YIL SONU DEVRİ / TÜM VERİTABANINI YILLIK ARŞİV OLARAK İNDİRME
export async function exportYearEndBackup() {
  try {
    const currentYear = new Date().getFullYear();
    const backupData = {
      year: currentYear,
      exportDate: new Date().toISOString(),
      products: await db.products.toArray(),
      sales: await db.sales.toArray(),
      suppliers: await db.suppliers.toArray(),
      customers: await db.customers.toArray(),
      categories: await db.categories.toArray(),
      users: await db.users.toArray(),
      settings: await db.settings.toArray(),
      system_logs: await db.system_logs.toArray()
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `BARKOD_QR_KASA_${currentYear}_YIL_SONU_DEVRİ_YEDEĞİ.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (err) {
    console.error("Yıl Sonu Devri Hatası:", err);
    throw err;
  }
}

export async function saveCompanyInfo(info) {
  await db.settings.put({ key: 'company_info', value: info });
}

export async function getCompanyInfo() {
  const data = await db.settings.get('company_info');
  return data ? data.value : {
    title: 'OA TEKEL BAYİ',
    address: 'Atatürk Cad. No:12/A İzmir',
    phone: '0507 437 7818',
    receiptFooter: 'Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!'
  };
}

export async function recordSaleOffline(cart, paymentType, customerId, cashierName = 'Kasiyer') {
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const saleData = {
    customerId,
    items: cart,
    totalAmount,
    paymentType,
    createdAt: new Date().toISOString(),
    synced: 0,
    cashierName
  };

  const saleId = await db.sales.add(saleData);

  for (const item of cart) {
    const product = await db.products.get(item.id);
    if (product) {
      await db.products.update(item.id, {
        stock: Math.max(0, product.stock - item.qty)
      });
    }
  }

  await pushToCentralServer('sales', { ...saleData, id: saleId });
  await logActivity('SATIŞ_YAPILDI', `Satış yapıldı (#${saleId}). Ödeme Tipi: ${paymentType.toUpperCase()}, Toplam: ${totalAmount.toFixed(2)} TL`, cashierName);

  return saleId;
}

// ANA KASADAN VERİLERİ YAN KASA / TELEFONA İNDİRME (PULL)
export async function fetchCentralDataToClient() {
  await syncWithCentralServer();
}

export async function syncPendingSales() {
  if (!navigator.onLine) return;
  const pendingSales = await db.sales.where('synced').equals(0).toArray();
  for (const sale of pendingSales) {
    try {
      await db.sales.update(sale.id, { synced: 1 });
    } catch (err) {
      console.error(err);
    }
  }
}

export async function setupAutoSync() {
  await syncPendingSales();
  await syncWithCentralServer();
  window.addEventListener('online', () => {
    syncPendingSales();
    syncWithCentralServer();
  });

  // Periyodik olarak 3 saniyede bir çift taraflı senkronizasyonu çalıştır
  setInterval(() => {
    syncPendingSales();
    syncWithCentralServer();
  }, 3000);
}

export async function saveSecuritySettings(pinConfig) {
  await db.settings.put({ key: 'menu_pins', value: pinConfig });
}

export async function getSecuritySettings() {
  const setting = await db.settings.get('menu_pins');
  return setting ? setting.value : { stockPin: '', reportsPin: '', historyPin: '', settingsPin: '' };
}