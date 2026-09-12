// CARİ / VERESİYE TAHSİLAT MAKBUZU BASMA METODU
export const printDebtCollectionReceipt = (customer, paidAmount, paymentMethod = 'Nakit') => {
  const printWin = window.open('', '_blank', 'width=400,height=600');
  const dateStr = new Date().toLocaleDateString('tr-TR');
  const timeStr = new Date().toLocaleTimeString('tr-TR');
  const remainingBalance = (customer.balance || 0) - paidAmount;

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TAHSİLAT MAKBUZU - ${customer.name}</title>
        <style>
          @page { size: 80mm auto; margin: 0mm; }
          body { font-family: 'Courier New', Courier, monospace; width: 78mm; margin: 0 auto; padding: 10px 5px; font-size: 11px; color: #000; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
          .double-border { border-top: 3px double #000; border-bottom: 3px double #000; padding: 4px 0; margin: 6px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          p { margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="text-center border-b">
          <p class="bold" style="font-size:14px;">OA TEKEL BAYİ</p>
          <p>TEL: 0507 437 7818</p>
          <p class="bold" style="font-size:12px; margin-top:4px;">*** TAHSİLAT MAKBUZU ***</p>
        </div>

        <div class="border-b">
          <p>TARİH: ${dateStr} - ${timeStr}</p>
          <p className="bold">MÜŞTERİ: ${customer.name}</p>
          <p>TEL: ${customer.phone || '-'}</p>
        </div>

        <div class="border-b">
          <div class="flex-between"><p>ESKİ BORÇ TOPLAMI:</p><p className="bold">${parseFloat(customer.balance || 0).toFixed(2)} TL</p></div>
          <div class="flex-between"><p>ÖDENEN TUTAR (${paymentMethod.toUpperCase()}):</p><p className="bold" style="font-size:13px;">${parseFloat(paidAmount).toFixed(2)} TL</p></div>
        </div>

        <div class="double-border flex-between">
          <span class="bold">KALAN CARİ BORÇ:</span>
          <span class="bold" style="font-size:13px;">${Math.max(0, remainingBalance).toFixed(2)} TL</span>
        </div>

        <div class="text-center" style="margin-top:15px;">
          <p>TAHSİLAT EDİLMİŞTİR</p>
          <p style="margin-top:12px;">TEKST / İMZA: ....................</p>
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