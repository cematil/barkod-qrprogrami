// X RAPORU (VARDİYA DEVİR FİŞİ) BASMA MOTORU
export const handlePrintXReport = async (todaySales, cashierName = 'Kasiyer') => {
  const todayStr = new Date().toLocaleDateString('sv-SE');
  
  // Sadece bugünün satışlarını hesapla
  const todaysSales = todaySales.filter(s => {
    if (!s.createdAt) return false;
    return new Date(s.createdAt).toLocaleDateString('sv-SE') === todayStr;
  });

  const totalRevenue = todaysSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const cashSales = todaysSales.filter(s => s.paymentType === 'cash' || s.paymentType === 'Nakit').reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const cardSales = todaysSales.filter(s => s.paymentType === 'card' || s.paymentType === 'Kredi Kartı').reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const veresiyeSales = todaysSales.filter(s => s.paymentType === 'veresiye' || s.paymentType === 'Veresiye' || s.paymentType === 'credit').reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const printWin = window.open('', '_blank', 'width=400,height=600');
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>VARDİYA DEVİR RAPORU (X RAPORU)</title>
        <style>
          @page { size: 80mm auto; margin: 0mm; }
          body { font-family: 'Courier New', Courier, monospace; width: 78mm; margin: 0 auto; padding: 10px 5px; font-size: 11px; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
          .flex-between { display: flex; justify-content: space-between; }
          p { margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="text-center border-b">
          <p class="bold" style="font-size:14px;">OA TEKEL BAYİ</p>
          <p class="bold" style="font-size:12px; margin-top:4px;">*** X RAPORU (VARDİYA ARA DÖKÜM) ***</p>
        </div>

        <div class="border-b">
          <p>TARİH: ${todayStr}</p>
          <p>SAAT: ${new Date().toLocaleTimeString('tr-TR')}</p>
          <p>AKTİF KASİYER: ${cashierName}</p>
        </div>

        <div class="border-b">
          <p class="bold">ANLIK KASA DURUMU</p>
          <div class="flex-between"><p>FİŞ ADEDİ:</p><p class="bold">${todaysSales.length} ADET</p></div>
          <div class="flex-between"><p>KASA NAKİT:</p><p class="bold">${cashSales.toFixed(2)} TL</p></div>
          <div class="flex-between"><p>POS / KREDİ KARTI:</p><p class="bold">${cardSales.toFixed(2)} TL</p></div>
          <div class="flex-between"><p>VERESİYE TOPLAM:</p><p>${veresiyeSales.toFixed(2)} TL</p></div>
        </div>

        <div class="flex-between" style="font-size:13px; font-weight:bold; margin-top:6px;">
          <span>ANLIK TOPLAM CİRO:</span>
          <span>${totalRevenue.toFixed(2)} TL</span>
        </div>

        <div class="text-center" style="margin-top:15px;">
          <p>ARA VARDİYA BİLGİ FİŞİDİR</p>
          <p>GUN SONU Z RAPORU YERİNE GEÇMEZ</p>
          <p style="margin-top:10px;">KASİYER İMZA: ....................</p>
        </div>
      </body>
    </html>
  `);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
    printWin.close();
  }, 400);
};