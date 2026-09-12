// pos-bridge.js (Node.js / Arka Plan Servisi)
const { WebSocketServer } = require('ws');
const serialport = require('serialport'); // Cihaza bağlı COM Port iletişimi için

const wss = new WebSocketServer({ port: 8080 });

console.log("Local POS Bridge Servisi 8080 portunda aktif...");

wss.on('connection', (ws) => {
  console.log("Web POS bağlandı.");

  ws.on('message', async (message) => {
    try {
      const saleData = JSON.parse(message);
      console.log("Mali Cihaza Gönderilen Satış:", saleData);

      // 1. Mali Cihaz SDK / COM Port üzerinden işlem başlatma
      const fiscalResponse = await sendToFiscalDevice(saleData);

      // 2. Başarılı Fiş Bilgisini Web POS'a geri bildirme
      ws.send(JSON.stringify({
        status: "SUCCESS",
        fiscalReceiptNo: fiscalResponse.receiptNo,
        zNo: fiscalResponse.zNo
      }));
    } catch (error) {
      ws.send(JSON.stringify({ status: "ERROR", message: error.message }));
    }
  });
});

// ÖÖC Cihazına DLL veya Serial Port İle Komut Gönderme (Örnek Temsili Fonksiyon)
function sendToFiscalDevice(saleData) {
  return new Promise((resolve) => {
    // Cihazın SDK/DLL fonksiyonları burada çağrılır (ör. Hugin / Ingenico GMP3)
    setTimeout(() => {
      resolve({ receiptNo: "0042", zNo: "0118" });
    }, 1500);
  });
}