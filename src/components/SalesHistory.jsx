import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Printer, Eye, X, Receipt, Search, CheckCircle } from 'lucide-react';

export default function SalesHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  const sales = useLiveQuery(async () => {
    const allSales = await db.sales.toArray();
    return allSales.reverse(); // En son satışı en üstte göster
  }, []) || [];

  const filteredSales = sales.filter(s => 
    s.id.toString().includes(searchTerm) || 
    (s.paymentType && s.paymentType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePrintReceipt = (sale) => {
    setSelectedSale(sale);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-6 overflow-y-auto">
      
      {/* SADECE FİŞ ALANINI YAZDIRAN CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt-modal-content, #receipt-modal-content * { visibility: visible !important; }
          #receipt-modal-content {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }
        }
      `}</style>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Satış Geçmişi</h1>
        <p className="text-xs text-slate-400 mt-1">Gerçekleşen tüm satışlar ve bilgi fişi kopyaları</p>
      </div>

      {/* ARAMA ÇUBUĞU */}
      <div className="relative mb-6">
        <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="İşlem No veya Ödeme Tipi ile arayın..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
        />
      </div>

      {/* SATIŞ LİSTESİ */}
      <div className="space-y-3">
        {filteredSales.map((sale) => (
          <div key={sale.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-slate-700 transition-all">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-slate-100">İşlem #{sale.id}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {sale.paymentType === 'cash' ? 'Nakit' : sale.paymentType === 'card' ? 'Kredi Kartı' : sale.paymentType}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Senkronize
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {new Date(sale.createdAt).toLocaleString('tr-TR')} • {sale.items?.length || 0} Çeşit Ürün
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="text-lg font-black text-cyan-400 font-mono mr-2">
                {parseFloat(sale.totalAmount || 0).toFixed(2)} ₺
              </span>

              {/* FİŞİ GÖR BUTONU */}
              <button
                onClick={() => setSelectedSale(sale)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <Eye className="w-4 h-4" /> Fişi Gör
              </button>

              {/* FİŞ BAS BUTONU */}
              <button
                onClick={() => handlePrintReceipt(sale)}
                className="px-3.5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/10"
              >
                <Printer className="w-4 h-4" /> Fiş Bas
              </button>
            </div>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm font-semibold bg-slate-900 border border-slate-800 rounded-2xl">
            Kayıtlı satış işlemi bulunamadı.
          </div>
        )}
      </div>

      {/* FİŞ DETAY POP-UP MODALI */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedSale(null)} 
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white bg-slate-950 rounded-xl border border-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* FİŞ İÇERİĞİ */}
            <div id="receipt-modal-content" className="bg-white text-slate-950 p-6 rounded-2xl space-y-4 font-mono text-xs">
              <div className="text-center border-b border-slate-200 pb-3">
                <h3 className="font-extrabold text-base tracking-wider">OA TEKEL BAYİ</h3>
                <p className="text-[10px] text-slate-600 mt-0.5">Atatürk Cad. No:12/A İzmir</p>
                <p className="text-[10px] text-slate-600">Tel: 0507 437 7818</p>
              </div>

              <div className="flex justify-between text-[11px] font-bold border-b border-slate-200 pb-2">
                <span>Fiş No: #{selectedSale.id}</span>
                <span>{new Date(selectedSale.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>

              {/* ÜRÜN LİSTESİ */}
              <div className="space-y-2 py-1 max-h-60 overflow-y-auto">
                <div className="flex justify-between font-extrabold border-b border-slate-100 pb-1 text-[10px] text-slate-500">
                  <span>ÜRÜN</span>
                  <span>ADET x FİYAT</span>
                  <span>TUTAR</span>
                </div>
                {(selectedSale.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="font-bold truncate max-w-[140px]">{item.name}</span>
                    <span className="text-slate-600">{item.qty} x {parseFloat(item.price).toFixed(2)}</span>
                    <span className="font-extrabold">{(item.qty * item.price).toFixed(2)} ₺</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-slate-950 pt-3 space-y-1">
                <div className="flex justify-between text-sm font-black">
                  <span>TOPLAM TUTAR:</span>
                  <span>{parseFloat(selectedSale.totalAmount || 0).toFixed(2)} ₺</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>ÖDEME TİPİ:</span>
                  <span className="uppercase font-bold">{selectedSale.paymentType === 'cash' ? 'Nakit' : 'Kredi Kartı'}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>KASİYER:</span>
                  <span>{selectedSale.cashierName || 'Kasiyer'}</span>
                </div>
              </div>

              <div className="text-center border-t border-slate-200 pt-3 text-[10px] text-slate-500">
                Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!
              </div>
            </div>

            {/* MODAL BUTONLARI */}
            <div className="flex gap-2 mt-4 pt-2">
              <button
                onClick={() => setSelectedSale(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Kapat
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Yazdır
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}