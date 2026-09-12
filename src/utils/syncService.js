import { db } from './db';

/**
 * Ana Kasa'dan Verileri İstemciye (Telefona) Çekme Fonksiyonu
 */
export async function pullDataFromCentral() {
  const kasaMode = localStorage.getItem('kasa_mode');
  
  // Sadece Yan Kasa (İstemci) modundaysa çalışır
  if (kasaMode === 'yan') {
    const serverIp = localStorage.getItem('server_ip') || '192.168.1.88';
    const serverPort = localStorage.getItem('server_port') || '8080';
    const apiUrl = `http://${serverIp}:${serverPort}/api/sync/pull`;

    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        
        // Ana Kasa'dan gelen verileri telefonun IndexedDB'sine yaz
        if (data.products?.length) await db.products.bulkPut(data.products);
        if (data.categories?.length) await db.categories.bulkPut(data.categories);
        if (data.customers?.length) await db.customers.bulkPut(data.customers);
        if (data.suppliers?.length) await db.suppliers.bulkPut(data.suppliers);
      }
    } catch (err) {
      console.log("Senkronizasyon bekleniyor (Ana Kasa bekleniyor)...");
    }
  }
}

/**
 * Otomatik Senkronizasyon Başlatıcı
 */
export function setupAutoSync() {
  pullDataFromCentral();

  // Her 10 saniyede bir verileri kontrol et ve güncelle
  setInterval(() => {
    pullDataFromCentral();
  }, 10000);
}