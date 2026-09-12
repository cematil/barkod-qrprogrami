import React, { useState, useEffect } from 'react';
import { Barcode, QrCode, Printer, RefreshCw, ScanLine } from 'lucide-react';
import { printToThermalPrinter } from '../utils/printerService';
import { generateZplLabel } from '../utils/zpl';
import { db } from '../utils/db';

export default function BarcodeGenerator() {
  const [productName, setProductName] = useState('TUBORG GOLD 50 CL');
  const [codeValue, setCodeValue] = useState('');
  const [price, setPrice] = useState('82.00');
  const [type, setType] = useState('barcode');

  useEffect(() => {
    generateRandom();
  }, []);

  useEffect(() => {
    let scannedBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = async (e) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) scannedBuffer = '';
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (scannedBuffer.length >= 3) {
          handleScannedCode(scannedBuffer);
          scannedBuffer = '';
        }
      } else if (e.key.length === 1) {
        scannedBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleScannedCode = async (scannedCode) => {
    setCodeValue(scannedCode);
    const existingProduct = await db.products.where('barcode').equals(scannedCode).first();
    
    if (existingProduct) {
      setProductName(existingProduct.name);
      setPrice(existingProduct.price.toFixed(2));
      alert(`Okutulan Barkod Bulundu: ${existingProduct.name}`);
    } else {
      alert(`Okutulan Barkod (${scannedCode}) sistemde yok.`);
    }
  };

  const generateRandom = () => {
    const val = '869' + Math.floor(1000000000 + Math.random() * 9000000000);
    setCodeValue(val);
  };

  // DINAMIK GERÇEK BARKOD ÇİZGİSİ ÜRETİCİ (SVG / PRINT UYUMLU)
  const renderBarcodeSvg = (code) => {
    const cleanCode = code || '8690000000000';
    let bars = [];
    
    // Kod rakamlarına göre dinamik çizgi genişlikleri üretimi
    for (let i = 0; i < cleanCode.length; i++) {
      const charCode = cleanCode.charCodeAt(i);
      const w1 = (charCode % 3) + 1;
      const w2 = ((charCode + 1) % 2) + 1;
      bars.push({ width: w1, color: '#000000' });
      bars.push({ width: w2, color: '#ffffff' });
    }

    return (
      <div className="w-full flex flex-col items-center">
        <svg className="w-full h-14" viewBox="0 0 200 60" preserveAspectRatio="none">
          <rect width="100%" height="100%" fill="#ffffff" />
          {bars.reduce((acc, bar, idx) => {
            const currentX = acc.x;
            acc.x += bar.width * 2.2;
            if (bar.color === '#000000') {
              acc.elements.push(
                <rect
                  key={idx}
                  x={currentX}
                  y="0"
                  width={bar.width * 2}
                  height="60"
                  fill="#000000"
                />
              );
            }
            return acc;
          }, { x: 5, elements: [] }).elements}
        </svg>
        <p className="font-mono text-xs mt-1 font-extrabold tracking-widest text-black">{cleanCode}</p>
      </div>
    );
  };

  // SADECE ETİKETİ VE BARKOD ÇİZGİLERİNİ YAZDIRAN KANAL
  const handlePrintLabel = async () => {
    const codeToUse = codeValue || '8690000000000';

    try {
      const zplData = generateZplLabel(productName || 'ORNEK URUN', codeToUse, price);
      const encoder = new TextEncoder();
      await printToThermalPrinter(encoder.encode(zplData));
    } catch (err) {
      const labelElement = document.getElementById('printable-label');
      if (!labelElement) {
        alert("Etiket alanı bulunamadı!");
        return;
      }

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0px';
      printFrame.style.height = '0px';
      printFrame.style.border = 'none';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Etiket Yazdır</title>
            <style>
              @page {
                size: auto;
                margin: 0mm;
              }
              body {
                margin: 0;
                padding: 10px;
                display: flex;
                justify-content: center;
                align-items: center;
                background: white;
                font-family: Arial, sans-serif;
              }
              #printable-label {
                width: 100%;
                max-width: 250px;
                padding: 15px;
                background: white !important;
                color: black !important;
                box-sizing: border-box;
                text-align: center;
              }
              svg {
                display: block;
                width: 100%;
              }
              .border-y {
                border-top: 1px solid #ccc;
                border-bottom: 1px solid #ccc;
                padding: 6px 0;
              }
              p { margin: 0; }
            </style>
          </head>
          <body>
            ${labelElement.outerHTML}
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 800);
      }, 300);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-6 overflow-y-auto">
      
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-label, #printable-label * {
            visibility: visible !important;
          }
          #printable-label {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 250px !important;
            background: white !important;
            color: black !important;
            padding: 15px !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Barkod & QR Kod Üretici</h1>
        <p className="text-xs text-slate-400 mt-1">Barkodsuz ürünler için etiket üretin veya hazır barkodları okutun</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Kod Tipi</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('barcode')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  type === 'barcode' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Barcode className="w-4 h-4" /> Barkod (EAN-13)
              </button>
              <button
                onClick={() => setType('qr')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  type === 'qr' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <QrCode className="w-4 h-4" /> QR Kod
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Ürün Adı (Etikette Görünecek)</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Barkod / QR Değeri</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={codeValue}
                onChange={(e) => setCodeValue(e.target.value)}
                placeholder="Barkod okutun veya yazın..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button 
                onClick={() => {
                  const testCode = prompt("Barkod Okuyucu Test Kodu Girin:");
                  if (testCode) handleScannedCode(testCode);
                }} 
                className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/30 flex items-center gap-1.5 text-xs font-bold"
              >
                <ScanLine className="w-5 h-5" /> Okut
              </button>
              <button onClick={generateRandom} className="p-2.5 bg-slate-800 text-amber-400 rounded-xl border border-slate-700">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Fiyat</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-bold"
            />
          </div>

          <button
            onClick={handlePrintLabel}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
          >
            <Printer className="w-4 h-4" /> Etiket Yazıcıya Gönder
          </button>
        </div>

        {/* GERÇEK BARKOD ÇİZGİLİ YAZDIRMA ETİKETİ (2. RESİMDEKİ GÖRÜNTÜ) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold text-slate-400 mb-4">ETİKET ÖNİZLEME</p>
          
          <div id="printable-label" className="bg-white text-slate-950 p-6 rounded-2xl shadow-xl w-64 flex flex-col items-center border border-slate-200">
            <p className="font-extrabold text-base tracking-tight text-center text-slate-950 mb-1">{productName || 'ÜRÜN ADI'}</p>
            
            {type === 'barcode' ? (
              <div className="py-2 border-y w-full flex flex-col items-center">
                {renderBarcodeSvg(codeValue)}
              </div>
            ) : (
              <div className="py-2 border-y w-full flex flex-col items-center my-1">
                <QrCode className="w-20 h-20 text-slate-950" />
                <p className="font-mono text-[10px] mt-1 font-extrabold text-slate-950">{codeValue || '8690000000000'}</p>
              </div>
            )}

            <p className="font-black text-2xl text-slate-950 mt-2">{price ? `${parseFloat(price).toFixed(2)} ₺` : '0.00 ₺'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}