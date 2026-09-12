import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, pushToCentralServer } from '../utils/db';
import { Scan, Plus, CheckCircle, PackageSearch } from 'lucide-react';

export default function QuickStockCount() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [lastScanned, setLastScanned] = useState(null);

  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = products.find(p => p.barcode === barcodeInput.trim());
    if (!product) {
      alert(`"${barcodeInput}" barkodlu ürün veritabanında bulunamadı!`);
      setBarcodeInput('');
      return;
    }

    const qtyToAdd = parseInt(addQty) || 1;
    const newStock = (product.stock || 0) + qtyToAdd;

    const updatedProduct = { ...product, stock: newStock };

    // 1. Dexie güncelle
    await db.products.update(product.id, { stock: newStock });

    // 2. Ana Kasa SQLite sunucusuna gönder
    await pushToCentralServer('products', updatedProduct);

    setLastScanned({ ...product, newStock, added: qtyToAdd });
    setBarcodeInput('');
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-6 overflow-y-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Scan className="w-8 h-8 text-cyan-400" /> Hızlı Stok Sayımı & Girişi
        </h1>
        <p className="text-xs text-slate-400 mt-1">Barkod okutarak elinizdeki ürünlerin stoğuna hızlıca ekleme yapın</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-2xl space-y-4 shadow-xl">
        <form onSubmit={handleScanSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">Barkod Okutun</label>
              <input
                type="text"
                autoFocus
                placeholder="Barkod okutun veya yazın..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-lg font-mono text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Eklenecek Adet</label>
              <input
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-lg font-black text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> STOĞA EKLE
          </button>
        </form>

        {lastScanned && (
          <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="font-extrabold text-slate-100 text-sm">{lastScanned.name}</p>
                <p className="text-xs text-slate-400">Barkod: {lastScanned.barcode}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-400 font-bold">+{lastScanned.added} Adet Eklendi</span>
              <p className="text-lg font-black text-slate-100">Yeni Stok: {lastScanned.newStock} Adet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}