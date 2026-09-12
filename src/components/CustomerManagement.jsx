import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { User, Phone, Plus, Search, Trash2, DollarSign, BookOpen, CreditCard } from 'lucide-react';

export default function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const customers = useLiveQuery(() => db.customers?.toArray(), []) || [];

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!name) return;

    try {
      await db.customers.add({
        name,
        phone: phone || '',
        balance: parseFloat(initialBalance) || 0
      });
      setName('');
      setPhone('');
      setInitialBalance('');
      setIsModalOpen(false);
    } catch (err) {
      alert("Müşteri ekleme hatası: " + err.message);
    }
  };

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    const payVal = parseFloat(paymentAmount) || 0;
    if (!selectedCustomer || payVal <= 0) return;

    try {
      const newBalance = Math.max(0, (selectedCustomer.balance || 0) - payVal);
      await db.customers.update(selectedCustomer.id, { balance: newBalance });
      setPaymentAmount('');
      setIsPaymentModalOpen(false);
      alert("Tahsilat başarıyla düşüldü!");
    } catch (err) {
      alert("Tahsilat hatası: " + err.message);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) {
      await db.customers.delete(id);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Veresiye & Müşteri Takibi</h1>
          <p className="text-xs text-slate-400 mt-1">Cari hesaplar, açık borçlar ve tahsilat yönetimi</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)} 
          className="flex items-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-5 h-5" /> YENİ MÜŞTERİ EKLE
        </button>
      </div>

      <div className="flex items-center gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
        <Search className="w-6 h-6 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Müşteri adı veya telefon ile arayın..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none text-base text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
        />
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Müşteri Adı Soyadı</th>
              <th className="p-4">Telefon</th>
              <th className="p-4">Veresiye Borç Bakiyesi</th>
              <th className="p-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredCustomers.map(c => (
              <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-4 font-bold text-slate-100 text-base flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 text-amber-400 font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <span>{c.name}</span>
                </td>
                <td className="p-4 text-sm font-semibold text-slate-400">{c.phone || '-'}</td>
                <td className="p-4 font-black text-amber-400 text-base">{(c.balance || 0).toFixed(2)} ₺</td>
                <td className="p-4 text-right space-x-2">
                  <button 
                    onClick={() => {
                      setSelectedCustomer(c);
                      setIsPaymentModalOpen(true);
                    }} 
                    className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold rounded-xl border border-emerald-500/30 text-xs transition-all"
                  >
                    Tahsilat Yap
                  </button>
                  <button 
                    onClick={() => handleDeleteCustomer(c.id)} 
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

      {/* YENİ MÜŞTERİ MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="font-extrabold text-xl text-slate-100 mb-4">Yeni Müşteri Kartı</h3>
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Müşteri Adı Soyadı</label>
                <input type="text" required placeholder="Örn: Ahmet Yılmaz" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Telefon No</label>
                <input type="text" placeholder="05XX XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Mevcut Borç Devri (₺)</label>
                <input type="number" step="0.01" placeholder="0.00" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-amber-400 font-bold" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm">İptal</button>
                <button type="submit" className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm">KAYDET</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAHSİLAT MODALI */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="font-extrabold text-xl text-slate-100 mb-1">Tahsilat Al: {selectedCustomer.name}</h3>
            <p className="text-xs text-amber-400 font-bold mb-4">Mevcut Borç: {(selectedCustomer.balance || 0).toFixed(2)} ₺</p>
            <form onSubmit={handleReceivePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Ödenen Tutar (₺)</label>
                <input type="number" step="0.01" required placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-emerald-400 font-black" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-5 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm">İptal</button>
                <button type="submit" className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm">DÜŞ & KAYDET</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}