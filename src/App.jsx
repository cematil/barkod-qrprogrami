import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Package, 
  BarChart3, 
  History, 
  Settings as SettingsIcon, 
  PhoneCall, 
  Barcode, 
  LogOut,
  Clock,
  Users,
  Truck,
  Menu,
  X,
  ShieldAlert
} from 'lucide-react';

import POSDashboard from './components/POSDashboard';
import StockManagement from './components/StockManagement';
import Reports from './components/Reports';
import SalesHistory from './components/SalesHistory';
import SecuritySettings from './components/SecuritySettings';
import BarcodeGenerator from './components/BarcodeGenerator';
import CustomerManagement from './components/CustomerManagement';
import SupplierManagement from './components/SupplierManagement';
import SystemLogs from './components/SystemLogs';
import { setupAutoSync, db } from './utils/db';

function CurrencyBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y} ${days[date.getDay()]}`;
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-3 md:px-6 py-2 flex flex-col md:flex-row items-center justify-between text-xs md:text-sm text-slate-200 font-mono gap-1.5 md:gap-0">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-cyan-400" />
        <span className="font-bold text-slate-100">{formatDate(time)}</span>
        <span className="font-black text-cyan-400 ml-1">{time.toLocaleTimeString('tr-TR')}</span>
      </div>

      <div className="flex items-center gap-3 md:gap-8 text-[11px] md:text-sm overflow-x-auto w-full md:w-auto justify-center md:justify-end">
        <span className="text-emerald-400 font-extrabold shrink-0">TCMB</span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-bold text-slate-100">USD</span>
          <span className="text-slate-400 font-semibold hidden sm:inline">A: 48.4305</span>
          <span className="text-cyan-400 font-extrabold">S: 48.5178</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-bold text-slate-100">EUR</span>
          <span className="text-slate-400 font-semibold hidden sm:inline">A: 56.1754</span>
          <span className="text-cyan-400 font-extrabold">S: 56.2766</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-bold text-slate-100">GBP</span>
          <span className="text-slate-400 font-semibold hidden sm:inline">A: 65.3215</span>
          <span className="text-cyan-400 font-extrabold">S: 65.6621</span>
        </div>
      </div>
    </div>
  );
}

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Güvenlik: Girdi Temizleme (Sanitization & Trimming)
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Lütfen kullanıcı adı ve şifrenizi girin.');
      return;
    }

    if (cleanUsername === 'admin' && cleanPassword === '123') {
      onLoginSuccess({ username: 'admin', role: 'admin', name: 'Süper Yönetici' });
      return;
    }
    if (cleanUsername === 'kasiyer1' && cleanPassword === '123') {
      onLoginSuccess({ username: 'kasiyer1', role: 'cashier', name: 'Ahmet Kasiyer' });
      return;
    }

    try {
      const user = await db.users.where('username').equals(cleanUsername).first();
      if (user && user.password === cleanPassword) {
        onLoginSuccess({
          username: user.username,
          role: user.role || 'cashier',
          name: user.name || user.username
        });
      } else {
        setError('Kullanıcı adı veya şifre hatalı!');
      }
    } catch (err) {
      setError('Giriş yetkilendirme hatası oluştu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-center">
        <div className="flex justify-center mb-5">
          <div className="p-2.5 bg-slate-950 rounded-3xl border-2 border-cyan-500/40 shadow-xl shadow-cyan-500/20">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl"
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-100 mb-1 tracking-wide">BARKOD&QR KASA PROGRAMI</h2>
        <p className="text-xs text-slate-400 mb-6">Lütfen devam etmek için giriş yapın</p>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Kullanıcı Adı</label>
            <input
              type="text"
              required
              placeholder="Örn: admin veya kasiyer1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Şifre</label>
            <input
              type="password"
              required
              placeholder="****"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 mt-2"
          >
            SİSTEME GİRİŞ YAP
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('kasa');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setupAutoSync();
  }, []);

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const menuItems = [
    { key: 'kasa', label: 'Kasa', icon: Store, allowedRoles: ['admin', 'cashier'] },
    { key: 'stok', label: 'Stok', icon: Package, allowedRoles: ['admin'] },
    { key: 'barkod', label: 'Barkod & QR Üretici', icon: Barcode, allowedRoles: ['admin'] },
    { key: 'customers', label: 'Cari / Müşteriler', icon: Users, allowedRoles: ['admin', 'cashier'] },
    { key: 'suppliers', label: 'Toptancılar', icon: Truck, allowedRoles: ['admin'] },
    { key: 'raporlar', label: 'Raporlar', icon: BarChart3, allowedRoles: ['admin'] },
    { key: 'gecmis', label: 'Satış Geçmişi', icon: History, allowedRoles: ['admin', 'cashier'] },
    { key: 'loglar', label: 'Sistem Logları', icon: ShieldAlert, allowedRoles: ['admin'] },
    { key: 'ayarlar', label: 'Ayarlar', icon: SettingsIcon, allowedRoles: ['admin'] }
  ];

  const allowedMenuItems = menuItems.filter(item => item.allowedRoles.includes(currentUser.role));

  // Güvenlik: Kasiyer rolündeki kullanıcıların yetkisiz sekme URL/State erişimlerini engelleme (RBAC)
  const isTabAllowed = (tabKey) => {
    const targetItem = menuItems.find(item => item.key === tabKey);
    return targetItem ? targetItem.allowedRoles.includes(currentUser.role) : false;
  };

  const handleTabChange = (key) => {
    if (isTabAllowed(key)) {
      setActiveTab(key);
      setIsMobileMenuOpen(false);
    } else {
      alert("Güvenlik Uyarısı: Bu alana erişim yetkiniz bulunmamaktadır!");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      <CurrencyBar />

      {/* MOBİL ÜST BAR */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-8 h-8 rounded-lg object-contain"
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
          <span className="font-black text-xs text-cyan-400">BARKOD&QR KASA</span>
        </div>

        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-slate-300 hover:text-cyan-400 bg-slate-950 rounded-xl border border-slate-800"
          aria-label="Menüyü Aç/Kapat"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* YAN MENÜ (MASAÜSTÜNDE SABİT, MOBİLDE AÇILIR/KAPANIR OVERLAY) */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 transition-transform duration-300 md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div>
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
              <div className="p-1 bg-slate-950 rounded-xl border border-cyan-500/40 shadow-md shadow-cyan-500/10 shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-10 h-10 rounded-lg object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-xs tracking-wider text-cyan-400 truncate">BARKOD&QR KASA</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase truncate">
                  {currentUser.name} ({currentUser.role === 'admin' ? 'Yönetici' : 'Kasiyer'})
                </p>
              </div>
            </div>

            <nav className="space-y-1">
              {allowedMenuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleTabChange(item.key)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-md shadow-cyan-500/5' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-cyan-400 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-3">
            <a 
              href="https://wa.me/905074377818" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              <span className="truncate">Destek: +90 507 437 7818</span>
            </a>

            <button 
              onClick={() => {
                setCurrentUser(null);
                setActiveTab('kasa');
              }} 
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </aside>

        {/* MOBİL MENÜ AÇIKKEN ARKA PLAN KARARTMASI */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="fixed inset-0 bg-slate-950/80 z-30 md:hidden backdrop-blur-sm"
          />
        )}

        {/* ANA İÇERİK ALANI (GÜVENLİ ROL DÖNÜŞÜMÜ İLE) */}
        <main className="flex-1 flex flex-col h-full overflow-hidden w-full">
          {activeTab === 'kasa' && isTabAllowed('kasa') && <POSDashboard currentUser={currentUser} />}
          {activeTab === 'stok' && isTabAllowed('stok') && <StockManagement />}
          {activeTab === 'barkod' && isTabAllowed('barkod') && <BarcodeGenerator />}
          {activeTab === 'customers' && isTabAllowed('customers') && <CustomerManagement />}
          {activeTab === 'suppliers' && isTabAllowed('suppliers') && <SupplierManagement />}
          {activeTab === 'raporlar' && isTabAllowed('raporlar') && <Reports />}
          {activeTab === 'gecmis' && isTabAllowed('gecmis') && <SalesHistory />}
          {activeTab === 'loglar' && isTabAllowed('loglar') && <SystemLogs />}
          {activeTab === 'ayarlar' && isTabAllowed('ayarlar') && <div className="p-4 sm:p-6 overflow-y-auto"><SecuritySettings /></div>}
        </main>
      </div>
    </div>
  );
}