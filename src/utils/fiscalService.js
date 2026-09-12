// src/utils/fiscalService.js

export function sendToFiscalRegister(cart, paymentType) {
  return new Promise((resolve, reject) => {
    // Yerel bilgisayardaki köprü servisine baglan
    const socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
      const payload = {
        action: "PRINT_FISCAL_RECEIPT",
        paymentType, // "Nakit" veya "Kredi Kartı"
        items: cart.map(item => ({
          name: item.name,
          price: item.price,
          qty: item.qty,
          vatRate: 20 // KDV Oranı (%)
        }))
      };
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.status === "SUCCESS") {
        resolve(response);
      } else {
        reject(new Error(response.message));
      }
      socket.close();
    };

    socket.onerror = (err) => {
      reject(new Error("Local POS Bridge servisine bağlanılamadı. Servisin çalıştığından emin olun."));
    };
  });
}