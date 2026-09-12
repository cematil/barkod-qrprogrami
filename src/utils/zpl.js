export function generateZplLabel(productName, barcode, price) {
  const numericPrice = parseFloat(price) || 0;
  const formattedPrice = numericPrice.toFixed(2);

  return `
^XA
^PW400
^LL240
^FO30,20^A0N,25,25^FD${productName}^FS
^FO30,55^A0N,20,20^FDKod: ${barcode}^FS
^FO30,90^BY2,2,60^BCN,60,Y,N,N^FD${barcode}^FS
^FO30,175^A0N,35,35^FDFiyat: ${formattedPrice} TL^FS
^XZ
  `;
}