import React, { useState } from 'react';
import { Lock, X, Delete } from 'lucide-react';

export default function PinModal({ isOpen, onClose, onSuccess, title }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      // 4 hane girildiğinde otomatik kontrol et
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = (inputPin) => {
    const isCorrect = onSuccess(inputPin);
    if (!isCorrect) {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center relative">
        
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="font-bold text-slate-100 text-lg mb-1">{title || 'Menü Kilitli'}</h3>
        <p className="text-xs text-slate-400 mb-6">Devam etmek için 4 haneli PIN kodunu girin</p>

        {/* PIN Noktaları */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border transition-all ${
                pin.length > i
                  ? 'bg-cyan-400 border-cyan-400 shadow-md shadow-cyan-400/40'
                  : 'bg-slate-800 border-slate-700'
              } ${error ? 'bg-red-500 border-red-500 animate-bounce' : ''}`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-red-400 font-semibold mb-4">Hatalı PIN kordu! Tekrar deneyin.</p>}

        {/* Numpad (Dokunmatik Tuş Takımı) */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="py-3.5 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-lg rounded-xl border border-slate-700/50 transition-all"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleKeyPress('0')}
            className="py-3.5 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-lg rounded-xl border border-slate-700/50 transition-all"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="py-3.5 bg-slate-800/40 hover:bg-red-500/20 text-slate-300 hover:text-red-400 active:scale-95 flex items-center justify-center rounded-xl border border-slate-800 transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
}