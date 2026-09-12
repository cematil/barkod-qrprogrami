import { getCompanyInfo } from './db';

export async function generateReceiptCommands(cart, paymentType, cashierName = 'Kasiyer') {
  const company = await getCompanyInfo();
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR');
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Thermal ESC/POS Komut Dizisi (Raw Uint8Array / Text)
  const ESC = '\x1B';
  const GS = '\x1D';

  let receipt = '';

  // Yazıcıyı Sıfırla
  receipt += ESC + '@';

  // Ortala & Firma Başlığı (Büyük Font)
  receipt += ESC + 'a' + '\x01'; // Ortala
  receipt += ESC + 'E' + '\x01'; // Bold
  receipt += (company.title || 'BARKOD&QR KASA').toUpperCase() + '\n';
  receipt += ESC + 'E' + '\x00'; // Bold Kapat

  if (company.address) receipt += company.address + '\n';
  if (company.phone) receipt += 'Tel: ' + company.phone + '\n';

  receipt += '--------------------------------\n';

  // Sola Hizala & Bilgiler
  receipt += ESC + 'a' + '\x00'; // Sola Hizala
  receipt += `Tarih: ${dateStr}\n`;
  receipt += `Kasiyer: ${cashierName}\n`;
  receipt += `Ödeme: ${paymentType === 'cash' ? 'Nakit' : 'Kredi Kartı'}\n`;
  receipt += '--------------------------------\n';

  // Ürün Kalemleri
  for (const item of cart) {
    const itemTotal = (item.price * item.qty).toFixed(2);
    const lineStr = `${item.name.substring(0, 18)}`;
    receipt += lineStr + '\n';
    receipt += `  ${item.qty} x ${item.price.toFixed(2)} TL`.padEnd(22) + `${itemTotal} TL\n`;
  }

  receipt += '--------------------------------\n';

  // Toplam Tutar (Büyük & Bold)
  receipt += ESC + 'a' + '\x02'; // Sağa Hizala
  receipt += ESC + 'E' + '\x01'; // Bold
  receipt += `TOPLAM: ${totalAmount.toFixed(2)} TL\n`;
  receipt += ESC + 'E' + '\x00'; // Bold Kapat

  receipt += '--------------------------------\n';

  // Fiş Altı Mesajı
  receipt += ESC + 'a' + '\x01'; // Ortala
  receipt += (company.receiptFooter || 'Teşekkür Ederiz!') + '\n\n\n';

  // Kağıt Kesme
  receipt += GS + 'V' + '\x41' + '\x03';

  // Metni Uint8Array kodlamasına çevir
  const encoder = new TextEncoder();
  return encoder.encode(receipt);
}

export async function printToThermalPrinter(commands) {
  try {
    if ('navigator' in window && 'serial' in navigator) {
      // Web Serial API (Sanal COM / USB Termal Yazıcı)
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      await writer.write(commands);
      writer.releaseLock();
      await port.close();
    } else {
      // Yazıcı bulunamazsa varsayılan tık sesi / fiş yazdırma simülasyonu
      console.log("Fiş yazdırma komutu gönderildi.");
    }
  } catch (err) {
    console.warn("Yazıcıya doğrudan erişilemedi (Tarayıcı yazdırma moduna geçiliyor):", err);
    window.print();
  }
}