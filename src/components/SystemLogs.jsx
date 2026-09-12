import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { 
  ShieldAlert, 
  Search, 
  UserCheck, 
  Clock, 
  Filter, 
  Lock,
  Activity
} from 'lucide-react';

export default function SystemLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('TÜMÜ');

  // Log verilerini canlı olarak Dexie veritabanından çek (En yeni işlem en üstte)
  const logs = useLiveQuery(async () => {
    const allLogs = await db.system_logs.toArray();
    return allLogs.reverse();
  }, []) || [];

  // Arama ve İşlem Tipi Filtreleme
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.username && log.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.actionType && log.actionType.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = selectedFilter === 'TÜMÜ' || log.actionType === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-6 overflow-y-auto space-y-6">
      
      {/* ÜST BAŞLIK VE GÜVENLİK BİLGİSİ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-cyan-400" /> Sistem İşlem & Aktivite Logları
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kasa ve veritabanı üzerinde gerçekleşen tüm kritik işlemler kayıt altındadır.
          </p>
        </div>

        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Lock className="w-4 h-4" /> Güvenlik Modu: Silinemez Kayıtlar
        </div>
      </div>

      {/* ARAMA VE FİLTRE BARI */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 w-full">
          <Search className="w-6 h-6 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="İşlem detayı, kullanıcı veya işlem tipi ile arayın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-base text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
          />
        </div>

        <div className="relative w-full md:w-64">
          <Filter className="w-5 h-5 absolute left-3.5 top-3.5 text-cyan-400 pointer-events-none" />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-bold rounded-2xl pl-11 pr-8 py-3.5 appearance-none focus:outline-none focus:border-cyan-500"
          >
            <option value="TÜMÜ">Tüm İşlem Tipleri</option>
            <option value="SATIŞ_YAPILDI">Satış İşlemleri</option>
            <option value="ÜRÜN_EKLEME">Ürün Ekleme</option>
            <option value="ÜRÜN_SİLME">Ürün Silme</option>
            <option value="MÜŞTERİ_EKLEME">Müşteri / Cari Ekleme</option>
            <option value="TOPTANCI_EKLEME">Toptancı Ekleme</option>
          </select>
        </div>
      </div>

      {/* LOG LİSTESİ TABLOSU */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Tarih / Saat</th>
              <th className="p-4">Kullanıcı</th>
              <th className="p-4">İşlem Kategori</th>
              <th className="p-4">İşlem Detayı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLogs.map(log => {
              const isDelete = log.actionType?.includes('SİLME');
              const isSale = log.actionType?.includes('SATIŞ');

              return (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </td>
                  <td className="p-4 font-extrabold text-slate-100 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-cyan-400" />
                      {log.username || 'Sistem'}
                    </div>
                  </td>
                  <td className="p-4 text-xs font-black whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold border ${
                      isDelete 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                        : isSale 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                    }`}>
                      {log.actionType}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-semibold text-slate-200">
                    {log.details}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm font-semibold">
            Kayıtlı sistem logu bulunamadı.
          </div>
        )}
      </div>

    </div>
  );
}