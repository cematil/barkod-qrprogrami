import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CurrencyBar() {
  const [time, setTime] = useState(new Date());
  const [rates, setRates] = useState({ USD: { A: '48.43', S: '48.51' }, EUR: { A: '56.17', S: '56.27' }, GBP: { A: '65.32', S: '65.66' } });

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
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex flex-wrap items-center justify-between text-xs text-slate-300 font-mono">
      <div className="flex items-center gap-3">
        <Clock className="w-4 h-4 text-cyan-400" />
        <span className="font-bold text-slate-100">{formatDate(time)}</span>
        <span className="font-extrabold text-cyan-400 text-sm">{time.toLocaleTimeString('tr-TR')}</span>
      </div>

      <div className="flex items-center gap-6">
        <span className="text-emerald-400 font-bold">TCMB</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100">USD</span>
          <span className="text-slate-400 text-[11px]">A: {rates.USD.A}</span>
          <span className="text-cyan-400 text-[11px]">S: {rates.USD.S}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100">EUR</span>
          <span className="text-slate-400 text-[11px]">A: {rates.EUR.A}</span>
          <span className="text-cyan-400 text-[11px]">S: {rates.EUR.S}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100">GBP</span>
          <span className="text-slate-400 text-[11px]">A: {rates.GBP.A}</span>
          <span className="text-cyan-400 text-[11px]">S: {rates.GBP.S}</span>
        </div>
      </div>
    </div>
  );
}