import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const app = express();
const PORT = 8080;

// MOBİL TARAYICI VE YEREL AĞ UYUMLU CORS İZİNLERİ
app.use(cors({ 
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['*'] 
}));

app.use(express.json({ limit: '200mb' }));

const dbFolder = 'C:\\Veritabani';
if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });

const dbPath = path.join(dbFolder, 'pos_master.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, barcode TEXT, name TEXT, price REAL, costPrice REAL, category TEXT, stock INTEGER, minStock INTEGER, supplierId INTEGER, image TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, balance REAL)`);
  db.run(`CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, company TEXT, balance REAL)`);
  db.run(`CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY, customerId INTEGER, items TEXT, totalAmount REAL, paymentType TEXT, createdAt TEXT, synced INTEGER, cashierName TEXT)`);
  // SİLİNEMEZ SİSTEM LOGLARI TABLOSU
  db.run(`CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY, actionType TEXT, details TEXT, username TEXT, createdAt TEXT)`);
});

// OTOMATİK VERİTABANI YEDEKLEME MOTORU
const backupFolder = path.join(dbFolder, 'Yedekler');
if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder, { recursive: true });

function performDatabaseBackup() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const backupFileName = `pos_master_backup_${todayStr}.db`;
    const destPath = path.join(backupFolder, backupFileName);

    if (!fs.existsSync(destPath) && fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, destPath);
      console.log(`[OTOMATİK YEDEK] Veritabanı yedeği alındı: ${backupFileName}`);
    }
  } catch (err) {
    console.error('[YEDEK HATASI]:', err.message);
  }
}

// Sunucu başladığında yedek al
performDatabaseBackup();

// Her 24 saatte bir otomatik yedek al
setInterval(performDatabaseBackup, 24 * 60 * 60 * 1000);

app.get('/api/sync/pull', (req, res) => {
  db.all('SELECT * FROM products', [], (err, products) => {
    db.all('SELECT * FROM categories', [], (err, categories) => {
      db.all('SELECT * FROM customers', [], (err, customers) => {
        db.all('SELECT * FROM suppliers', [], (err, suppliers) => {
          db.all('SELECT * FROM sales', [], (err, sales) => {
            db.all('SELECT * FROM system_logs ORDER BY id DESC LIMIT 500', [], (err, logs) => {
              const formattedSales = (sales || []).map(s => {
                try { return { ...s, items: typeof s.items === 'string' ? JSON.parse(s.items) : s.items }; }
                catch (e) { return { ...s, items: [] }; }
              });
              res.status(200).json({
                products: products || [],
                categories: categories || [],
                customers: customers || [],
                suppliers: suppliers || [],
                sales: formattedSales || [],
                logs: logs || []
              });
            });
          });
        });
      });
    });
  });
});

app.post('/api/sync/push', (req, res) => {
  const { table, data, fullTable } = req.body;

  try {
    // SİLME İŞLEMLERİ (TEKİL VEYA TOPLU SİLME)
    if (table === 'products_delete') {
      if (data && data.ids && Array.isArray(data.ids)) {
        const placeholders = data.ids.map(() => '?').join(',');
        db.run(`DELETE FROM products WHERE id IN (${placeholders})`, data.ids);
      } else if (data && data.id) {
        db.run(`DELETE FROM products WHERE id = ?`, [data.id]);
      }
      return res.status(200).json({ success: true });
    }

    // SİSTEM LOG KAYDI (Sadece ekleme yapılabilir, silme seçeneği yoktur)
    if (table === 'system_logs' && data) {
      const stmt = db.prepare(`INSERT INTO system_logs (actionType, details, username, createdAt) VALUES (?, ?, ?, ?)`);
      stmt.run(data.actionType, data.details, data.username, data.createdAt || new Date().toISOString());
      stmt.finalize();
      return res.status(200).json({ success: true });
    }

    if (fullTable && Array.isArray(fullTable)) {
      if (table === 'products') {
        const stmt = db.prepare(`INSERT OR REPLACE INTO products (id, barcode, name, price, costPrice, category, stock, minStock, supplierId, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        fullTable.forEach(item => stmt.run(item.id, item.barcode, item.name, item.price, item.costPrice, item.category, item.stock, item.minStock, item.supplierId, item.image || ''));
        stmt.finalize();
      }
      return res.status(200).json({ success: true });
    }

    if (table === 'products' && data) {
      const stmt = db.prepare(`INSERT OR REPLACE INTO products (id, barcode, name, price, costPrice, category, stock, minStock, supplierId, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      stmt.run(data.id, data.barcode, data.name, data.price, data.costPrice, data.category, data.stock, data.minStock, data.supplierId, data.image || '');
      stmt.finalize();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ANA KASA VERİTABANI SUNUCUSU AKTİF (:8080)`);
});