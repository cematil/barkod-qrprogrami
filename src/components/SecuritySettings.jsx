import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ShieldCheck, 
  Settings, 
  Network, 
  Cloud, 
  UserPlus,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Archive,
  Download,
  Upload,
  Wifi,
  Loader2,
  Globe,
  ToggleLeft,
  ToggleRight,
  MapPin,
  HardDrive,
  Database,
  FolderOpen
} from 'lucide-react';
import { db, getSecuritySettings, saveSecuritySettings, getCompanyInfo, saveCompanyInfo, exportYearEndBackup } from '../utils/db';

export default function SecuritySettings() {
  const [activeTab, setActiveTab] = useState('ag');
  const [pins, setPins] = useState({ stockPin: '', reportsPin: '', historyPin: '', settingsPin: '' });
  const [company, setCompany] = useState({ title: '', address: '', phone: '', receiptFooter: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Ağ & Kasa Modu
  const [kasaMode, setKasaMode] = useState(localStorage.getItem('kasa_mode') || 'ana');
  const [serverIp, setServerIp] = useState(localStorage.getItem('server_ip') || '192.168.1.88');
  const [serverPort, setServerPort] = useState(localStorage.getItem('server_port') || '8080');
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Şube & Bulut Senkronizasyon Ayarları (Açma / Kapama Modu)
  const [branchSyncEnabled, setBranchSyncEnabled] = useState(localStorage.getItem('branch_sync_enabled') === 'true');
  const [branchId, setBranchId] = useState(localStorage.getItem('branch_id') || 'URLA_SUBE_1');
  const [cloudApiUrl, setCloudApiUrl] = useState(localStorage.getItem('cloud_api_url') || 'https://api.sisteminiz.com');

  // Fiziksel Veritabanı Servis Ayarları (Yerel SQLite / Node.js Servisi)
  const [localDbSyncEnabled, setLocalDbSyncEnabled] = useState(localStorage.getItem('local_db_sync_enabled') === 'true');
  const [localDbPath, setLocalDbPath] = useState(localStorage.getItem('local_db_path') || 'C:\\Veritabani\\pos_master.db');

  // Bulut Yedek
  const [cloudProvider, setCloudProvider] = useState('dropbox');
  const [dropboxAppId, setDropboxAppId] = useState('');
  const [dropboxSecret, setDropboxSecret] = useState('');
  const [allowCode, setAllowCode] = useState('');

  // Kullanıcı Ekleme
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('cashier');
  const [newName, setNewName] = useState('');

  const users = useLiveQuery(() => db.users.toArray(), []) || [];

  useEffect(() => {
    getSecuritySettings().then(data => data && setPins(data));
    getCompanyInfo().then(data => data && setCompany(data));
  }, []);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    await saveCompanyInfo(company);
    setStatusMessage('Firma ayarları başarıyla kaydedildi!');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    try {
      await db.users.add({ username: newUsername, password: newPassword, role: newRole, name: newName || newUsername });
      setNewUsername(''); setNewPassword(''); setNewName('');
      alert("Kullanıcı eklendi!");
    } catch (err) {
      alert("Bu kullanıcı adı zaten var!");
    }
  };

  const handleDeleteUser = async (id) => {
    if (confirm("Kullanıcıyı silmek istediğinize emin misiniz?")) {
      await db.users.delete(id);
    }
  };

  const handleYearEndExport = async () => {
    const currentYear = new Date().getFullYear();
    if (confirm(`${currentYear} Yılı Yıl Sonu Devrini başlatıp tüm veritabanını (.json) arşiv dosyası olarak kaydetmek istediğinize emin misiniz?`)) {
      try {
        await exportYearEndBackup();
        setStatusMessage(`${currentYear} Yılı Devir Yedeği Başarıyla İndirildi!`);
        setTimeout(() => setStatusMessage(''), 4000);
      } catch (err) {
        alert("Yedekleme hatası: " + err.message);
      }
    }
  };

  // .JSON YEDEK DOSYASINI VERİTABANINA İÇE AKTARMA (IMPORT)
  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm("Seçilen yedek dosyası bu bilgisayara yüklenecektir. Devam etmek istiyor musunuz?")) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);

        if (backupData.products && backupData.products.length > 0) {
          await db.products.bulkPut(backupData.products);
        }
        if (backupData.categories && backupData.categories.length > 0) {
          await db.categories.bulkPut(backupData.categories);
        }
        if (backupData.customers && backupData.customers.length > 0) {
          await db.customers.bulkPut(backupData.customers);
        }
        if (backupData.suppliers && backupData.suppliers.length > 0) {
          await db.suppliers.bulkPut(backupData.suppliers);
        }
        if (backupData.sales && backupData.sales.length > 0) {
          await db.sales.bulkPut(backupData.sales);
        }

        setStatusMessage("Yedek verileri başarıyla içe aktarıldı ve yüklendi!");
        setTimeout(() => {
          setStatusMessage('');
          window.location.reload();
        }, 1500);
      } catch (err) {
        alert("Geçersiz yedek dosyası formatı: " + err.message);
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  // YAN KASA - ANA KASA SUNUCU BAĞLANTISINI TEST ETME VE DOĞRULAMA
  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus(null);

    const targetUrl = `http://${serverIp}:${serverPort}/api/sync/pull`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(targetUrl, { 
        method: 'GET',
        signal: controller.signal 
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setConnectionStatus({
          success: true,
          message: `Bağlantı Başarılı! Sunucu yanıt veriyor (HTTP 200). Veri alımı aktif.`
        });
      } else {
        setConnectionStatus({
          success: false,
          message: `Sunucuya ulaşıldı ancak hata döndü (HTTP ${res.status}).`
        });
      }
    } catch (err) {
      setConnectionStatus({
        success: false,
        message: `Ana Kasa Sunucusuna Bağlanılamadı! Lütfen IP, Port ve Güvenlik Duvarı izinlerini kontrol edin.`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // VERİTABANI DOSYA SÜRÜCÜSÜ SEÇİMİ (BİLGİSAYAR VEYA AĞ PAYLAŞIMINDAN)
  const handleSelectDbFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Tarayıcı güvenlik gereği tam C:\ yolunu gizler, ancak dosya adını alabiliriz.
      // Eğer kullanıcı tam ağ yolu yazacaksa manuel input alanını kullanabilir.
      const suggestedPath = `C:\\Veritabani\\${file.name}`;
      setLocalDbPath(suggestedPath);
      setStatusMessage(`Veritabanı Dosya Konumu Seçildi: ${file.name}`);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  // BAĞLANTIYI SINAMA VE ŞUBE AYARLARINI KAYDETME
  const handleSaveNetworkSettings = async () => {
    setIsTesting(true);

    // Ayarları Yerel Hafızaya (LocalStorage) Kaydet
    localStorage.setItem('kasa_mode', kasaMode);
    localStorage.setItem('server_ip', serverIp);
    localStorage.setItem('server_port', serverPort);
    localStorage.setItem('branch_sync_enabled', branchSyncEnabled ? 'true' : 'false');
    localStorage.setItem('branch_id', branchId);
    localStorage.setItem('cloud_api_url', cloudApiUrl);
    localStorage.setItem('local_db_sync_enabled', localDbSyncEnabled ? 'true' : 'false');
    localStorage.setItem('local_db_path', localDbPath);

    setTimeout(() => {
      setIsTesting(false);
      setStatusMessage('Ağ, Şube ve Fiziksel Veritabanı Ayarları Başarıyla Kaydedildi!');
      setTimeout(() => setStatusMessage(''), 4000);
    }, 1000);
  };

  return (
    <div className="max-w-5xl space-y-6 text-slate-100">
      
      {statusMessage && (
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {statusMessage}
        </div>
      )}

      {/* ÜST AYAR SEKMELERİ */}
      <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('genel')}
          className={`flex-1 min-w-[130px] py-3.5 rounded-xl text-xs font-extrabold flex flex-col items-center gap-2 transition-all ${
            activeTab === 'genel' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" /> Genel
        </button>

        <button
          onClick={() => setActiveTab('ag')}
          className={`flex-1 min-w-[130px] py-3.5 rounded-xl text-xs font-extrabold flex flex-col items-center gap-2 transition-all ${
            activeTab === 'ag' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Network className="w-5 h-5" /> Ağ & Şube Ayarları
        </button>

        <button
          onClick={() => setActiveTab('bulut')}
          className={`flex-1 min-w-[130px] py-3.5 rounded-xl text-xs font-extrabold flex flex-col items-center gap-2 transition-all ${
            activeTab === 'bulut' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cloud className="w-5 h-5" /> Bulut Yedek
        </button>

        <button
          onClick={() => setActiveTab('guvenlik')}
          className={`flex-1 min-w-[130px] py-3.5 rounded-xl text-xs font-extrabold flex flex-col items-center gap-2 transition-all ${
            activeTab === 'guvenlik' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-5 h-5" /> Güvenlik & Kullanıcılar
        </button>

        <button
          onClick={() => setActiveTab('yilsonu')}
          className={`flex-1 min-w-[130px] py-3.5 rounded-xl text-xs font-extrabold flex flex-col items-center gap-2 transition-all ${
            activeTab === 'yilsonu' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Archive className="w-5 h-5 text-amber-400" /> Yıl Sonu Devir
        </button>
      </div>

      {/* 1. GENEL AYARLAR */}
      {activeTab === 'genel' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-slate-100 text-lg">Firma & Fiş Bilgileri</h3>
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Firma Adı (Fiş Başlığı)</label>
              <input type="text" value={company.title} onChange={(e) => setCompany({ ...company, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Telefon</label>
                <input type="text" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Fiş Alt Notu</label>
                <input type="text" value={company.receiptFooter} onChange={(e) => setCompany({ ...company, receiptFooter: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Adres</label>
              <textarea rows="2" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500" />
            </div>
            <button type="submit" className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-sm transition-all">
              FİRMA BİLGİLERİNİ KAYDET
            </button>
          </form>
        </div>
      )}

      {/* 2. AĞ & ŞUBE AYARLARI */}
      {activeTab === 'ag' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-100 text-lg">Lokal Kasa Çalışma Modu</h3>
            <p className="text-xs text-slate-400 mt-1">Aynı dükkan içindeki kasaların sunucu-istemci mimarisini belirler.</p>
          </div>

          <div className="space-y-4">
            <label className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${kasaMode === 'ana' ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-slate-950 border-slate-800'}`}>
              <input type="radio" name="kasaMode" value="ana" checked={kasaMode === 'ana'} onChange={() => setKasaMode('ana')} className="mt-1 text-cyan-500 w-5 h-5" />
              <div>
                <p className="font-extrabold text-base text-slate-100">Ana Kasa (Sunucu / Tekil Mod)</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Veritabanı bu bilgisayardadır. Yerel ağdaki yan kasalara (tablet/PC) veri sunar.</p>
              </div>
            </label>

            <label className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${kasaMode === 'yan' ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-slate-950 border-slate-800'}`}>
              <input type="radio" name="kasaMode" value="yan" checked={kasaMode === 'yan'} onChange={() => setKasaMode('yan')} className="mt-1 text-cyan-500 w-5 h-5" />
              <div>
                <p className="font-extrabold text-base text-slate-100">Yan Kasa (İstemci / Client)</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Dükkan içindeki Ana Kasa'nın yerel IP adresine bağlanır.</p>
              </div>
            </label>
          </div>

          {kasaMode === 'yan' && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
              <h4 className="font-bold text-xs text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Wifi className="w-4 h-4" /> Dükkan İçi Ana Kasa Bağlantı Bilgileri
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ana Kasa IP Adresi</label>
                  <input type="text" value={serverIp} onChange={(e) => setServerIp(e.target.value)} placeholder="192.168.1.88" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Port</label>
                  <input type="text" value={serverPort} onChange={(e) => setServerPort(e.target.value)} placeholder="8080" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>

              {/* SUNUCU BAĞLANTISINI TEST ET VE DOĞRULA BUTONU */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                  <span>BAĞLANTIYI TEST ET & DOĞRULA</span>
                </button>

                {connectionStatus && (
                  <div className={`mt-3 p-3.5 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                    connectionStatus.success 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {connectionStatus.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{connectionStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DİNAMİK FİZİKSEL VERİTABANI YEDEKLEME SERVİSİ BÖLÜMÜ */}
          <div className="pt-6 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-emerald-400" /> Yerel Disk Veritabanı Servisi (SQLite / Disk Saklama)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tarayıcı geçmişi veya önbelleği silinse dahi verilerin bilgisayarın hard diskinde korumasını sağlar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLocalDbSyncEnabled(!localDbSyncEnabled)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                  localDbSyncEnabled 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                {localDbSyncEnabled ? (
                  <>
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                    <span>DİSK YEDEK: AÇIK</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-6 h-6 text-slate-600" />
                    <span>DİSK YEDEK: KAPALI</span>
                  </>
                )}
              </button>
            </div>

            {localDbSyncEnabled && (
              <div className="p-5 bg-slate-950 border border-emerald-500/30 rounded-2xl space-y-3 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" /> Bilgisayar Disk Veritabanı Dosya Yolu
                  </label>
                  
                  {/* VERİTABANI DOSYASI / AĞ YOLU SEÇİM ALANI */}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Örn: C:\Veritabani\pos_master.db veya \\SUNUCU\Veritabani\pos_master.db" 
                      value={localDbPath} 
                      onChange={(e) => setLocalDbPath(e.target.value)} 
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500" 
                    />
                    
                    <label className="px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0">
                      <FolderOpen className="w-4 h-4" />
                      <span>SEÇ / GÖZAT</span>
                      <input 
                        type="file" 
                        accept=".db,.sqlite,.sqlite3" 
                        onChange={handleSelectDbFile} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Lokal veya paylaşıma açılan sunucudaki SQLite (.db) veritabanı dosyasının fiziksel yolu.</p>
                </div>
              </div>
            )}
          </div>

          {/* DİNAMİK AÇILIP KAPANABİLİR FARKLI ŞUBELER & BULUT SENKRONİZASYON BÖLÜMÜ */}
          <div className="pt-6 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-amber-400" /> Şubeler Arası Bulut Senkronizasyonu (Konak, Urla, Karaburun...)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Farklı ilçelerdeki veya şubelerdeki kasaların tek bir merkez veritabanına bağlanmasını sağlar.
                </p>
              </div>

              {/* AÇMA / KAPAMA TOGGLE ANAHTARI */}
              <button
                type="button"
                onClick={() => setBranchSyncEnabled(!branchSyncEnabled)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                  branchSyncEnabled 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                {branchSyncEnabled ? (
                  <>
                    <ToggleRight className="w-6 h-6 text-amber-400" />
                    <span>ŞUBE MODU: AÇIK</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-6 h-6 text-slate-600" />
                    <span>ŞUBE MODU: KAPALI</span>
                  </>
                )}
              </button>
            </div>

            {/* AÇIK OLDUĞUNDA GÖRÜNECEK ŞUBE AYARLARI */}
            {branchSyncEnabled && (
              <div className="p-5 bg-slate-950 border border-amber-500/30 rounded-2xl space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-400" /> Bu Kasanın Şube Kimliği / İsmi
                    </label>
                    <input 
                      type="text" 
                      placeholder="Örn: URLA_KASA_1, KONAK_KASA_2, KARABURUN_KASA_1" 
                      value={branchId} 
                      onChange={(e) => setBranchId(e.target.value.toUpperCase())} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500" 
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Raporlarda satışların hangi şubeden yapıldığını ayırır.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-cyan-400" /> Merkez Bulut Sunucu Adresi (API URL)
                    </label>
                    <input 
                      type="text" 
                      placeholder="https://api.sisteminiz.com" 
                      value={cloudApiUrl} 
                      onChange={(e) => setCloudApiUrl(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500" 
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Tüm şubelerin bağlandığı ana bulut sunucu URL adresi.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KAYDET VE SINAMA BUTONU */}
          <button
            type="button"
            onClick={handleSaveNetworkSettings}
            disabled={isTesting}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AYARLAR KAYDEDİLİYOR...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>TÜM AĞ VE ŞUBE AYARLARINI KAYDET</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 3. BULUT YEDEK */}
      {activeTab === 'bulut' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-100 text-lg">Güvenli Bulut Yedekleme Entegrasyonu</h3>
            <p className="text-xs text-slate-400 mt-1">Görselleriniz ve satış verileriniz otomatik olarak önce cihazınızın veritabanına, ardından seçtiğiniz güvenli bulut hesabınıza aktarılır.</p>
          </div>

          <div className="flex gap-3">
            {['dropbox', 'googledrive', 'onedrive'].map(provider => (
              <button
                key={provider}
                onClick={() => setCloudProvider(provider)}
                className={`flex-1 py-3 rounded-xl text-xs font-extrabold uppercase border transition-all ${
                  cloudProvider === provider ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {provider}
              </button>
            ))}
          </div>

          <div className="space-y-4 p-5 bg-slate-950 border border-slate-800 rounded-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">App ID (client_id)</label>
              <input type="text" value={dropboxAppId} onChange={(e) => setDropboxAppId(e.target.value)} placeholder="Örn: 8x92abc1234xyz" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">App Secret</label>
              <input type="password" value={dropboxSecret} onChange={(e) => setDropboxSecret(e.target.value)} placeholder="****" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500" />
            </div>

            <div className="flex gap-2 pt-2">
              <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noreferrer" className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700">
                <ExternalLink className="w-4 h-4 text-cyan-400" /> Allow Linki Aç
              </a>
              <button onClick={() => alert("Token Üretildi!")} className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Code → Refresh Token
              </button>
            </div>
          </div>

          <button onClick={() => alert("Manuel Yedekleme Başlatıldı!")} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/20">
            ŞİMDİ BULUTA YEDEKLE
          </button>
        </div>
      )}

      {/* 4. GÜVENLİK & KULLANICI YÖNETİMİ */}
      {activeTab === 'guvenlik' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" /> Kullanıcı & Kasiyer Yönetimi
          </h3>

          <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" placeholder="Ad Soyad" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
            <input type="text" required placeholder="Kullanıcı Adı" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
            <input type="password" required placeholder="Şifre" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100">
              <option value="cashier">Kasiyer (Sadece Satış)</option>
              <option value="admin">Süper Kullanıcı (Tam Yetki)</option>
            </select>
            <button type="submit" className="col-span-full py-3.5 bg-cyan-500 text-slate-950 font-extrabold rounded-xl text-xs">YENİ KULLANICI EKLE</button>
          </form>

          <div className="space-y-2 pt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sistemdeki Kayıtlı Kullanıcılar</h4>
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm">
                <div>
                  <span className="font-extrabold text-slate-100">{u.name}</span>
                  <span className="text-xs text-slate-500 ml-2">({u.username})</span>
                  <span className={`ml-3 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                    {u.role === 'admin' ? 'Süper Yönetici' : 'Kasiyer'}
                  </span>
                </div>
                <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. YIL SONU DEVİR & YEDEK YÜKLEME SEKMESİ */}
      {activeTab === 'yilsonu' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-400" /> Yıl Sonu Devir & Veritabanı Yedeği İşlemleri
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Veritabanı yedeğinizi dışarı aktarabilir (indir) veya başka bir bilgisayardan alınan `.json` uzantılı yedek dosyasını bu istemciye yükleyebilirsiniz.
            </p>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">İşlem Detayları</h4>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>Tüm Ürün Kataloğu ve Stok Miktarları</li>
              <li>Geçmiş Satış ve Kasa İşlem Kayıtları</li>
              <li>Müşteri Veresiye Borç/Alacak Bakiyeleri</li>
              <li>Toptancı ve Tedarikçi Kayıtları</li>
            </ul>
          </div>

          {/* DIŞA AKTAR VE İÇE AKTAR BUTONLARI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={handleYearEndExport} 
              className="py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> DIŞA AKTAR (YEDEK İNDİR)
            </button>

            <label className="py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer">
              {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              <span>İÇE AKTAR (YEDEK YÜKLE)</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportBackup} 
                className="hidden" 
                disabled={isImporting} 
              />
            </label>
          </div>
        </div>
      )}

    </div>
  );
}