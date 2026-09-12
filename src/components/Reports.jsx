import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { generateReceiptCommands, printToThermalPrinter } from '../utils/printerService';
import { 
  TrendingUp, 
  Banknote, 
  CreditCard, 
  DollarSign, 
  ShoppingBag, 
  Sun, 
  Moon, 
  Calendar,
  PieChart,
  BookOpen,
  Printer,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  RefreshCw
} from 'lucide-react';

export default function Reports() {
  // YEREL SAAT DİLİMİNE GÖRE BUGÜNÜN TARİHİNİ AL (YYYY-MM-DD)
  const getLocalDateString = (dateObj = new Date()) => {
    return new Date(dateObj).toLocaleDateString('sv-SE');
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [autoZReport, setAutoZReport] = useState(false);
  const [zCounter, setZCounter] = useState(1);
  const [taxSyncStatus, setTaxSyncStatus] = useState('GİB VUK Güncel (%1, %10, %20)');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const setting = await db.settings.get('auto_z_report');
    if (setting) setAutoZReport(setting.value);
    
    const zNum = await db.settings.get('z_counter');
    if (zNum) setZCounter(zNum.value);
  };

  const toggleAutoZReport = async () => {
    const newValue = !autoZReport;
    setAutoZReport(newValue);
    await db.settings.put({ key: 'auto_z_report', value: newValue });
  };

  // IndexedDB'den Tüm Satışları Canlı Çek
  const sales = useLiveQuery(() => db.sales.toArray(), []) || [];

  // Seçilen Tarihe Göre Satışları Yerel Tarih Formatında Filtrele
  const filteredSales = sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDate = getLocalDateString(sale.createdAt);
    return saleDate === selectedDate;
  });

  // 1. Ciro Hesaplamaları
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

  const cashSales = filteredSales
    .filter(s => s.paymentType === 'cash' || s.paymentType === 'Nakit')
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const cardSales = filteredSales
    .filter(s => s.paymentType === 'card' || s.paymentType === 'Kredi Kartı')
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const veresiyeSales = filteredSales
    .filter(s => s.paymentType === 'veresiye' || s.paymentType === 'Veresiye' || s.paymentType === 'credit')
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  // 2. Satılan Ürün Adedi ve Net Kâr Hesaplama
  let totalItemsSold = 0;
  let totalProfit = 0;

  filteredSales.forEach(sale => {
    if (sale.items) {
      sale.items.forEach(item => {
        const qty = item.qty || 1;
        totalItemsSold += qty;
        const costPrice = item.costPrice || (item.price * 0.8);
        totalProfit += (item.price - costPrice) * qty;
      });
    }
  });

  // 3. VUK UYUMLU VERGİ VE KDV MATRAH DÖKÜM MOTORU
  const calculateTaxBreakdown = () => {
    let vat1_Matrah = 0, vat1_Kdv = 0;
    let vat10_Matrah = 0, vat10_Kdv = 0;
    let vat20_Matrah = 0, vat20_Kdv = 0;

    filteredSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const itemTotal = (item.price || 0) * (item.qty || 1);
        const vatRate = item.vatRate || 20;

        if (vatRate === 1) {
          const matrah = itemTotal / 1.01;
          vat1_Matrah += matrah;
          vat1_Kdv += (itemTotal - matrah);
        } else if (vatRate === 10) {
          const matrah = itemTotal / 1.10;
          vat10_Matrah += matrah;
          vat10_Kdv += (itemTotal - matrah);
        } else {
          const matrah = itemTotal / 1.20;
          vat20_Matrah += matrah;
          vat20_Kdv += (itemTotal - matrah);
        }
      });
    });

    if (vat1_Kdv === 0 && vat10_Kdv === 0 && vat20_Kdv === 0 && totalRevenue > 0) {
      vat20_Matrah = totalRevenue / 1.20;
      vat20_Kdv = totalRevenue - vat20_Matrah;
    }

    return {
      vat1_Matrah, vat1_Kdv,
      vat10_Matrah, vat10_Kdv,
      vat20_Matrah, vat20_Kdv,
      totalKdv: vat1_Kdv + vat10_Kdv + vat20_Kdv
    };
  };

  const taxData = calculateTaxBreakdown();

  // 4. Saatlik Satış Dağılımı (24 Saatlik Grafik Verisi)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourSales = filteredSales.filter(s => new Date(s.createdAt).getHours() === hour);
    const revenue = hourSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    return { hour, revenue, count: hourSales.length };
  });

  const maxHourlyRevenue = Math.max(...hourlyData.map(d => d.revenue), 1);

  // 5. Vardiya Analizi
  const nightSales = filteredSales.filter(s => {
    const hour = new Date(s.createdAt).getHours();
    return hour >= 0 && hour < 6;
  });

  const daySales = filteredSales.filter(s => {
    const hour = new Date(s.createdAt).getHours();
    return hour >= 6 && hour < 24;
  });

  const nightRevenue = nightSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const dayRevenue = daySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  // SADECE 80MM MALİ Z RAPORU FİŞİNİ BASAN TETİKLEYİCİ
  const handlePrintZReport = async () => {
    try {
      const zItems = [
        { name: 'GÜNLÜK TOPLAM CİRO', price: totalRevenue, qty: 1 },
        { name: 'NAKİT TAHSİLAT', price: cashSales, qty: 1 },
        { name: 'KREDİ KARTI (POS)', price: cardSales, qty: 1 },
        { name: 'VERESİYE / CARİ', price: veresiyeSales, qty: 1 },
        { name: 'HESAPLANAN KDV (%20)', price: taxData.totalKdv, qty: 1 },
        { name: 'TAHMİNİ NET KÂR', price: totalProfit, qty: 1 }
      ];

      const commands = await generateReceiptCommands(zItems, `MALİ Z RAPORU NO:${zCounter}`, 'Sistem');
      await printToThermalPrinter(commands);
      
      const newZ = zCounter + 1;
      setZCounter(newZ);
      await db.settings.put({ key: 'z_counter', value: newZ });
    } catch (err) {
      window.print();
      const newZ = zCounter + 1;
      setZCounter(newZ);
      await db.settings.put({ key: 'z_counter', value: newZ });
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-6 overflow-y-auto space-y-6">
      
      {/* SADECE 80MM FİŞİ BASAN CSS KURALI */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #z-report-ticket, #z-report-ticket * {
            visibility: visible !important;
          }
          #z-report-ticket {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 78mm !important;
            margin: 0 !important;
            padding: 5px !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Üst Başlık, Otomatik Z Ayarı ve Tarih Seçici */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Ciro & Finansal Raporlar</h1>
          <p className="text-xs text-slate-400 mt-1">Günlük Z Raporu, Net Kâr, Saatlik Grafik ve Vardiya Analizleri</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-cyan-400 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> {taxSyncStatus}
          </div>

          <button
            onClick={toggleAutoZReport}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              autoZReport 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {autoZReport ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
            <span>Otomatik Z Raporu: {autoZReport ? 'AÇIK' : 'KAPALI'}</span>
          </button>

          <button
            onClick={handlePrintZReport}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Printer className="w-4 h-4" /> Z RAPORU BAS (MALİ / VUK)
          </button>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-slate-100 focus:outline-none font-bold"
            />
          </div>
        </div>
      </div>

      {/* METRİK KARTLARI (Ciro, Kâr, Nakit, Kart, Veresiye) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400">Toplam Ciro</span>
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-100">{totalRevenue.toFixed(2)} ₺</p>
          <p className="text-[10px] text-emerald-400 font-bold mt-1">{filteredSales.length} Satış İşlemi</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400">Net Kâr</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-400">{totalProfit.toFixed(2)} ₺</p>
          <p className="text-[10px] text-slate-500 mt-1">Alış-Satış Farkından</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400">Nakit</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-100">{cashSales.toFixed(2)} ₺</p>
          <p className="text-[10px] text-slate-500 mt-1">Kasa Çekmecesi</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400">Kredi Kartı</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-100">{cardSales.toFixed(2)} ₺</p>
          <p className="text-[10px] text-slate-500 mt-1">POS Cihazı</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400">Veresiye</span>
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-400">{veresiyeSales.toFixed(2)} ₺</p>
          <p className="text-[10px] text-slate-500 mt-1">Cari Borç Kaydı</p>
        </div>

      </div>

      {/* SAATLİK SATIŞ & KÂR GRAFİĞİ */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-extrabold text-slate-200 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" /> Saatlik Satış & Yoğunluk Grafiği (00:00 - 23:00)
          </h3>
          <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20">
            Peak Saat: {hourlyData.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), { hour: 0, revenue: 0 }).hour}:00
          </span>
        </div>

        <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 px-2 border-b border-slate-800">
          {hourlyData.map(item => {
            const heightPercent = (item.revenue / maxHourlyRevenue) * 100;
            return (
              <div key={item.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-slate-950 border border-slate-700 text-slate-100 text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap z-10 pointer-events-none shadow-xl">
                  {item.hour}:00 - {item.revenue.toFixed(0)} ₺ ({item.count} Satış)
                </div>

                <div 
                  style={{ height: `${Math.max(heightPercent, 4)}%` }} 
                  className={`w-full rounded-t-md transition-all duration-500 ${
                    item.revenue > 0 ? 'bg-cyan-500 group-hover:bg-cyan-400' : 'bg-slate-800/40'
                  }`}
                />

                <span className="text-[9px] text-slate-500 font-bold mt-2">{item.hour}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAY KARTLARI (Vardiya & Satılan Ürün Analizi) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <h3 className="text-base font-extrabold text-slate-200 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-cyan-400" /> Vardiya & Saat Kırılımları
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Gündüz Satışları (06:00 - 00:00)</h4>
                  <p className="text-xs text-slate-500">{daySales.length} Satış Yapıldı</p>
                </div>
              </div>
              <span className="text-base font-black text-slate-100">{dayRevenue.toFixed(2)} ₺</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Gece Satışları (00:00 - 06:00)</h4>
                  <p className="text-xs text-slate-500">{nightSales.length} Satış Yapıldı</p>
                </div>
              </div>
              <span className="text-base font-black text-indigo-300">{nightRevenue.toFixed(2)} ₺</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-200 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-cyan-400" /> Ürün Hareket Özeti
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Satılan Toplam Parça Ürün:</span>
                <span className="font-extrabold text-slate-100">{totalItemsSold} Adet</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Hesaplanan Toplam KDV (%20):</span>
                <span className="font-black text-amber-400">{taxData.totalKdv.toFixed(2)} ₺</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Ortalama Fiş Tutarı:</span>
                <span className="font-black text-cyan-400">
                  {filteredSales.length > 0 ? (totalRevenue / filteredSales.length).toFixed(2) : '0.00'} ₺
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-400 font-medium">
            Tüm raporlama verileri çevrimdışı öncelikli (IndexedDB) veritabanınızdan gerçek zamanlı hesaplanır.
          </div>
        </div>

      </div>

      {/* YAZDIRILACAK MALİ 80MM Z RAPORU FİŞİ */}
      <div id="z-report-ticket" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '13px', margin: '0' }}>OA TEKEL BAYİ</p>
          <p style={{ margin: '2px 0' }}>Atatürk Cad. No:12/A İzmir</p>
          <p style={{ margin: '2px 0' }}>TEL: 0507 437 7818</p>
          <p style={{ margin: '2px 0' }}>VERGİ DAİRESİ: HASANHASAN</p>
          <p style={{ margin: '2px 0' }}>VKN: 1234567890</p>
        </div>

        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '12px', margin: '4px 0' }}>*** MALİ Z RAPORU ***</p>
          <p style={{ margin: '2px 0' }}>TARİH: {selectedDate}</p>
          <p style={{ margin: '2px 0' }}>SAAT: {new Date().toLocaleTimeString('tr-TR')}</p>
          <p style={{ margin: '2px 0' }}>Z NO: {String(zCounter).padStart(4, '0')}</p>
        </div>

        <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' }}>
          <p style={{ fontWeight: 'bold', margin: '2px 0' }}>SATIŞ İŞLEM ÖZETİ</p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ margin: '2px 0' }}>FİŞ ADEDİ:</p><p style={{ fontWeight: 'bold', margin: '2px 0' }}>{filteredSales.length} ADET</p></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ margin: '2px 0' }}>SATILAN ÜRÜN:</p><p style={{ fontWeight: 'bold', margin: '2px 0' }}>{totalItemsSold} ADET</p></div>
        </div>

        <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' }}>
          <p style={{ fontWeight: 'bold', margin: '2px 0' }}>KASA ÖDEME DAĞILIMI</p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ margin: '2px 0' }}>NAKİT TAHSİLAT:</p><p style={{ fontWeight: 'bold', margin: '2px 0' }}>{cashSales.toFixed(2)} TL</p></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ margin: '2px 0' }}>KREDİ KARTI (POS):</p><p style={{ fontWeight: 'bold', margin: '2px 0' }}>{cardSales.toFixed(2)} TL</p></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ margin: '2px 0' }}>VERESİYE / CARİ:</p><p style={{ margin: '2px 0' }}>{veresiyeSales.toFixed(2)} TL</p></div>
        </div>

        <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' }}>
          <p style={{ fontWeight: 'bold', margin: '2px 0' }}>KDV / MATRAH DÖKÜMÜ</p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ margin: '2px 0' }}>MATRAH (%20):</p><p style={{ margin: '2px 0' }}>{taxData.vat20_Matrah.toFixed(2)} TL</p></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ margin: '2px 0' }}>KDV (%20):</p><p style={{ margin: '2px 0' }}>{taxData.vat20_Kdv.toFixed(2)} TL</p></div>
        </div>

        <div style={{ borderTop: '3px double #000', borderBottom: '3px double #000', padding: '4px 0', margin: '6px 0', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>TOPLAM CİRO:</span>
          <span style={{ fontWeight: 'bold' }}>{totalRevenue.toFixed(2)} TL</span>
        </div>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <p style={{ margin: '2px 0' }}>MALİ DEĞERİ VARDIR</p>
          <p style={{ margin: '8px 0 0 0' }}>İMZA / MÜHÜR: ....................</p>
        </div>
      </div>

    </div>
  );
}