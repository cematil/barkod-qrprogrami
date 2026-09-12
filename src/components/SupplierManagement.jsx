import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Building2, Phone, Plus, Search, Trash2, PackagePlus } from 'lucide-react';

export default function SupplierManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');

  const suppliers = useLiveQuery(() => db.suppliers?.toArray(), []) || [];

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!name) return;

    try {
      await db.suppliers.add({
        name,
        company: company || '',
        phone: phone || '',
        balance: 0
      });
      setName('');
      setCompany('');
      setPhone('');
      setIsModalOpen(false);
    } catch (err) {
      alert("Toptancı ekleme hatası: " + err.message);
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (confirm("Bu toptancıyı silmek istediğinize emin misiniz?")) {
      await db.suppliers.delete(id);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Toptancı & Tedarikçi Yönetimi</h1>
          <p className="text-xs text-slate-400 mt-1">Mal alınan firmaların takibi ve iletişim kartları</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)} 
          className="flex items-center gap-2 px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" /> TOPTANCI EKLE
        </button>
      </div>

      <div className="flex items-center gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
        <Search className="w-6 h-6 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Toptancı adı veya firma ile arayın..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none text-base text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
        />
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Tedarikçi Yetkilisi</th>
              <th className="p-4">Firma Unvanı</th>
              <th className="p-4">Telefon</th>
              <th className="p-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredSuppliers.map(s => (
              <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-4 font-bold text-slate-100 text-base flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 text-cyan-400 font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span>{s.name}</span>
                </td>
                <td className="p-4 text-sm font-semibold text-slate-200">{s.company || '-'}</td>
                <td className="p-4 text-sm font-mono text-slate-400">{s.phone || '-'}</td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handleDeleteSupplier(s.id)} 
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* YENİ TOPTANCI MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="font-extrabold text-xl text-slate-100 mb-4">Yeni Toptancı Tanımla</h3>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Yetkili Adı Soyadı</label>
                <input type="text" required placeholder="Örn: Mehmet Toptancı" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Firma / Dağıtıcı Adı</label>
                <input type="text" placeholder="Örn: Mey İçki Dağıtım" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Telefon No</label>
                <input type="text" placeholder="05XX XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm">İptal</button>
                <button type="submit" className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-sm">KAYDET</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}