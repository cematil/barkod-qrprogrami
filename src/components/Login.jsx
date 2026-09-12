import React, { useState } from 'react';
import { db } from '../utils/db';
import { Lock, User, ShieldCheck } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const user = await db.users.where('username').equals(username).first();
    
    if (user && user.password === password) {
      onLoginSuccess(user);
    } else {
      setError('Kullanıcı adı veya şifre hatalı!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
        <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-100 mb-1 tracking-wide">POS MASTER PRO</h2>
        <p className="text-xs text-slate-400 mb-6">Lütfen devam etmek için giriş yapın</p>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Kullanıcı Adı</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                placeholder="Örn: admin veya kasiyer1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Şifre</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                placeholder="****"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
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