import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, recordSaleOffline, getCompanyInfo } from '../utils/db';
import { generateReceiptCommands, printToThermalPrinter } from '../utils/printerService';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  QrCode, 
  User, 
  Sun, 
  Moon,
  X,
  AlertTriangle,
  BookOpen,
  Zap,
  PackageCheck
} from 'lucide-react';

export default function POSDashboard({ currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('HEPSİ');
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState(1);
  const [isNightTariff, setIsNightTariff] = useState(false);
  
  // MOBİL EKRAN İÇİN SEKMELER: 'products' veya 'cart'
  const [mobileActiveView, setMobileActiveView] = useState('products');

  // Fiş Basım Durumu ve Firma Bilgileri
  const [lastSale, setLastSale] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({
    title: 'TEKEL BAYİ',
    address: 'URLA/İZMİR',
    phone: '0507 437 7818',
    receiptFooter: 'Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!'
  });

  // Cari / Müşteri Seçimi Modal Durumları
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers?.toArray(), []) || [];

  const cashierName = currentUser?.name || 'Süper Yönetici';

  // Firma Bilgilerini Ayarlardan Çek
  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    const info = await getCompanyInfo();
    if (info) setCompanyInfo(info);
  };

  // Hızlı Satış Butonları
  const quickProducts = products.filter(p => p.stock > 0).slice(0, 6);

  // SÜREKLİ BARKOD / QR OKUYUCU DİNLEYİCİSİ
  useEffect(() => {
    let scannedBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = async (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        scannedBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (scannedBuffer.length >= 3) {
          const matchedProduct = await db.products.where('barcode').equals(scannedBuffer).first();
          if (matchedProduct) {
            addToCart(matchedProduct);
          } else {
            alert(`Sistemde kayıtlı olmayan barkod okutuldu: ${scannedBuffer}`);
          }
          scannedBuffer = '';
        }
      } else if (e.key.length === 1) {
        scannedBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prevCart =>
      prevCart
        .map(item => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const totalAmount = cart.reduce((sum, item) => {
    const itemPrice = isNightTariff ? item.price * 1.1 : item.price;
    return sum + itemPrice * item.qty;
  }, 0);

  // GERÇEK FİŞ BASMA VE SATIŞ TAMAMLAMA (QR KOD DAHİL)
  const handleCheckout = async (paymentType) => {
    if (cart.length === 0) {
      alert("Sepetiniz boş!");
      return;
    }

    if (paymentType === 'veresiye' && !selectedCustomer) {
      setIsCustomerModalOpen(true);
      return;
    }

    try {
      const custName = selectedCustomer ? selectedCustomer.name : `Müşteri ${activeTab}`;
      const currentCart = [...cart];
      const currentTotal = totalAmount;

      // 1. Satışı Kaydet
      await recordSaleOffline(currentCart, paymentType, custName, cashierName);

      if (paymentType === 'veresiye' && selectedCustomer) {
        const newBalance = (selectedCustomer.balance || 0) + currentTotal;
        await db.customers.update(selectedCustomer.id, { balance: newBalance });
      }

      // 2. Fiş Verisini State'e Yaz
      const saleDateStr = new Date().toLocaleString('tr-TR');
      setLastSale({
        cart: currentCart,
        paymentType: paymentType === 'cash' ? 'NAKİT' : paymentType === 'card' ? 'KREDİ KART' : 'VERESİYE',
        total: currentTotal,
        date: saleDateStr,
        cashier: cashierName,
        customer: custName
      });

      // 3. Ekran Yenilendikten Sonra Yazdırma Penceresini Aç
      setTimeout(() => {
        window.print();
        clearCart();
        setIsCustomerModalOpen(false);
        setMobileActiveView('products');
      }, 300);

    } catch (err) {
      alert("İşlem Hatası: " + err.message);
    }
  };

  // QR KODA GÖMÜLECEK SATIŞ ÖZETİ YAZISI
  const generateQrData = () => {
    if (!lastSale) return '';
    const itemsText = lastSale.cart.map(i => `${i.name} x${i.qty} (${(i.price * i.qty).toFixed(2)}TL)`).join(', ');
    return `${companyInfo.title || 'TEKEL BAYI'} | Tarih: ${lastSale.date} | Odeme: ${lastSale.paymentType} | Toplam: ${lastSale.total.toFixed(2)}TL | Urunler: ${itemsText}`;
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'HEPSİ' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100 relative">
      
      {/* SADECE YAZDIRMA ANINDA EKRANDA GÖRÜNECEK GERÇEK BİLGİ FİŞİ CSS STİLİ */}
      <style>{`
        .print-receipt-container {
          display: none;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-receipt-container, .print-receipt-container * {
            visibility: visible !important;
            display: block !important;
          }
          .print-receipt-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 12px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-receipt-container table {
            display: table !important;
          }
          .print-receipt-container tr {
            display: table-row !important;
          }
          .print-receipt-container td, .print-receipt-container th {
            display: table-cell !important;
          }
          .print-receipt-container img {
            display: block !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      {/* MOBİL EKRAN SEKMELERİ (Sadece Telefonda Görünür) */}
      <div className="lg:hidden flex bg-slate-900 border-b border-slate-800 p-2 gap-2 z-10 shrink-0">
        <button
          onClick={() => setMobileActiveView('products')}
          className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
            mobileActiveView === 'products'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950 text-slate-400 border border-slate-800'
          }`}
        >
          <PackageCheck className="w-4 h-4" /> Ürün Kataloğu
        </button>

        <button
          onClick={() => setMobileActiveView('cart')}
          className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all relative ${
            mobileActiveView === 'cart'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950 text-slate-400 border border-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Sepet
          {cart.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          )}
        </button>
      </div>

      {/* YAZDIRILACAK FİŞ ŞABLONU (QR KOD EKLENMİŞ) */}
      {lastSale && (
        <div className="print-receipt-container">
          <div style={{ textTransform: 'uppercase', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
            {companyInfo.title || 'TEKEL BAYİ'}
          </div>
          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '2px' }}>
            {companyInfo.address}
          </div>
          <div style={{ textAlign: 'center', fontSize: '10px' }}>
            Tel: {companyInfo.phone}
          </div>
          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>
          
          <div style={{ fontSize: '10px' }}>
            <div>Tarih: {lastSale.date}</div>
            <div>Kasiyer: {lastSale.cashier}</div>
            <div>Ödeme: {lastSale.paymentType}</div>
            {lastSale.paymentType === 'VERESİYE' && <div>Müşteri: {lastSale.customer}</div>}
          </div>
          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>

          <table style={{ width: '100%', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th>Ürün</th>
                <th style={{ textAlign: 'center' }}>Adet</th>
                <th style={{ textAlign: 'right' }}>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {lastSale.cart.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '3px 0' }}>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right' }}>{(item.price * item.qty).toFixed(2)} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
            <span>TOPLAM:</span>
            <span>{lastSale.total.toFixed(2)} ₺</span>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>
          
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(generateQrData())}`} 
              alt="Fiş QR" 
              style={{ width: '80px', height: '80px', margin: '0 auto' }} 
            />
            <div style={{ fontSize: '8px', marginTop: '2px', color: '#555' }}>Fiş Doğrulama QR Kodu</div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
            {companyInfo.receiptFooter || 'Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!'}
          </div>
        </div>
      )}

      {/* İÇERİK ALANI (MOBİLDE SEKMELİ, MASAÜSTÜNDE YAN YANA) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* SOL / ORTA: KATALOG VE HIZLI SATIŞ */}
        <div className={`flex-1 flex-col h-full overflow-hidden p-4 space-y-3 ${
          mobileActiveView === 'products' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Üst Bar */}
          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="font-black text-sm tracking-wide text-cyan-400">BARKOD&QR KASA</h2>
              <span className="text-[10px] bg-slate-950 text-slate-400 px-2.5 py-1 rounded-lg font-bold border border-slate-800">
                Kasa #01 • Kasiyer: {cashierName}
              </span>
            </div>

            <button
              onClick={() => setIsNightTariff(!isNightTariff)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isNightTariff 
                  ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {isNightTariff ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>{isNightTariff ? 'Gece Tarifesi (%10)' : 'Gündüz Tarifesi'}</span>
            </button>
          </div>

          {/* HIZLI DOKUNMATİK SATIŞ BUTONLARI */}
          {quickProducts.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2.5">
              <p className="text-[10px] font-black text-cyan-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Hızlı Dokunmatik Satış
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {quickProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-2 text-left transition-all truncate"
                  >
                    <p className="font-bold text-xs text-slate-200 truncate">{p.name}</p>
                    <p className="text-[10px] font-extrabold text-cyan-400 mt-0.5">{p.price.toFixed(2)} ₺</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kategori Seçim Butonları */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('HEPSİ')}
              className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all ${
                selectedCategory === 'HEPSİ' 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              HEPSİ
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  selectedCategory === cat.name 
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Arama Barı */}
          <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <Search className="w-5 h-5 text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="Ürün adı yazın veya barkod okutun..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
            />
          </div>

          {/* Ürün Kataloğu Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1 pb-16 lg:pb-0">
            {filteredProducts.map(product => {
              const isLowStock = product.stock <= (product.minStock || 3);
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`bg-slate-900 border ${isLowStock ? 'border-red-500/40' : 'border-slate-800'} hover:border-cyan-500/50 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-lg relative overflow-hidden`}
                >
                  <span className="absolute top-2 left-2 text-[10px] font-bold bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-amber-400 border border-slate-800">
                    {product.category}
                  </span>

                  {isLowStock && (
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md animate-pulse">
                      <AlertTriangle className="w-3 h-3" /> Azaldı
                    </span>
                  )}

                  <div className="h-28 my-2 flex items-center justify-center overflow-hidden rounded-xl bg-slate-950/50">
                    {product.image ? (
                      <img src={product.image} alt="" className="h-full w-full object-cover rounded-xl" />
                    ) : (
                      <ShoppingCart className="w-8 h-8 text-slate-700" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-xs text-slate-100 line-clamp-2">{product.name}</h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">{product.barcode}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                      <span className="text-xs font-extrabold text-cyan-400">
                        {(isNightTariff ? product.price * 1.1 : product.price).toFixed(2)} ₺
                      </span>
                      <span className={`text-[10px] font-black ${isLowStock ? 'text-red-400' : 'text-slate-400'}`}>
                        Stok: {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* SAĞ: SEPET VE ÖDEME ALANI */}
        <div className={`w-full lg:w-96 bg-slate-900 flex-col h-full border-l border-slate-800 p-4 ${
          mobileActiveView === 'cart' ? 'flex flex-1' : 'hidden lg:flex'
        }`}>
          
          {/* Sepet Başlığı */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-6 h-6 text-cyan-400" />
              <h3 className="font-black text-base text-slate-100">Sepet</h3>
              {selectedCustomer && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/30 font-bold truncate max-w-[120px]">
                  {selectedCustomer.name}
                </span>
              )}
            </div>

            {cart.length > 0 && (
              <button 
                onClick={clearCart} 
                className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-500/10"
                title="Tüm Sepeti Temizle"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Sepet Listesi */}
          <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm">
                <ShoppingCart className="w-16 h-16 mb-3 opacity-30" />
                <span className="font-bold">Sepetiniz boş</span>
              </div>
            ) : (
              cart.map(item => {
                const unitPrice = isNightTariff ? item.price * 1.1 : item.price;
                return (
                  <div key={item.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-black text-sm text-slate-100 truncate">{item.name}</p>
                      <p className="text-xs text-cyan-400 font-extrabold mt-0.5">{unitPrice.toFixed(2)} ₺ / adet</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                        <button 
                          onClick={() => updateQty(item.id, -1)} 
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                        >
                          <Minus className="w-4 h-4 font-bold" />
                        </button>
                        <span className="px-2.5 font-black text-slate-100 text-sm min-w-[24px] text-center">{item.qty}</span>
                        <button 
                          onClick={() => updateQty(item.id, 1)} 
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                        >
                          <Plus className="w-4 h-4 font-bold" />
                        </button>
                      </div>

                      <span className="font-black text-slate-100 text-sm min-w-[60px] text-right">
                        {(unitPrice * item.qty).toFixed(2)} ₺
                      </span>

                      <button 
                        onClick={() => removeFromCart(item.id)} 
                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all ml-1"
                        title="Ürünü Sepetten Çıkar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ödeme / Toplam Paneli */}
          <div className="pt-3.5 border-t border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between text-base">
              <span className="font-extrabold text-slate-300 text-lg">Genel Toplam</span>
              <span className="font-black text-3xl text-cyan-400">{totalAmount.toFixed(2)} ₺</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => handleCheckout('cash')}
                className="py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black rounded-2xl text-sm flex flex-col items-center justify-center gap-1.5 shadow-xl shadow-emerald-900/30 transition-all border border-emerald-500/40"
              >
                <Banknote className="w-6 h-6" />
                <span>Nakit</span>
              </button>

              <button
                onClick={() => handleCheckout('card')}
                className="py-4 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black rounded-2xl text-sm flex flex-col items-center justify-center gap-1.5 shadow-xl shadow-cyan-500/30 transition-all border border-cyan-400/40"
              >
                <CreditCard className="w-6 h-6" />
                <span>Kredi Kartı</span>
              </button>

              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="py-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-2xl text-sm flex flex-col items-center justify-center gap-1.5 shadow-xl shadow-amber-500/30 transition-all border border-amber-400/40"
              >
                <BookOpen className="w-6 h-6" />
                <span>Veresiye</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* MOBİL KATALOG EKRANINDA YÜZEN SEPETE GİT ÇUBUĞU */}
      {mobileActiveView === 'products' && cart.length > 0 && (
        <div className="lg:hidden absolute bottom-4 left-4 right-4 z-30">
          <button
            onClick={() => setMobileActiveView('cart')}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between border border-cyan-300 animate-bounce"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs uppercase font-extrabold">Sepeti Gör ({cart.reduce((s, i) => s + i.qty, 0)} Ürün)</span>
            </div>
            <span className="text-sm font-black">{totalAmount.toFixed(2)} ₺</span>
          </button>
        </div>
      )}

      {/* VERESİYE MÜŞTERİ SEÇİM MODALI */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-amber-400" /> Veresiye Müşteri Seçimi
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
              {customers.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Kayıtlı veresiye müşterisi bulunamadı.</p>
              ) : (
                customers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      handleCheckout('veresiye');
                    }}
                    className="p-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div>
                      <p className="font-extrabold text-sm text-slate-100">{c.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{c.phone || 'Telefon yok'}</p>
                    </div>
                    <span className="text-sm font-black text-amber-400">
                      Borç: {(c.balance || 0).toFixed(2)} ₺
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsCustomerModalOpen(false)}
              className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
            >
              İptal
            </button>
          </div>
        </div>
      )}

    </div>
  );
}