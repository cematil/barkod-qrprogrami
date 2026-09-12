// ESC/POS Komut Yapılandırıcı
export class EscPosEncoder {
  constructor() {
    this.buffer = [];
  }

  // Komut Ekleme Yardımcısı
  addBytes(bytes) {
    this.buffer.push(...bytes);
  }

  // Metin Ekleme
  addText(text) {
    const encoder = new TextEncoder(); // UTF-8 / CP857 dönüşümü
    const bytes = encoder.encode(text);
    this.buffer.push(...bytes);
  }

  // Yazıcıyı Sıfırla (Initialize)
  init() {
    this.addBytes([0x1B, 0x40]);
    return this;
  }

  // Hizalama: 0: Sol, 1: Orta, 2: Sağ
  align(alignType) {
    this.addBytes([0x1B, 0x61, alignType]);
    return this;
  }

  // Metin Boyutu (0: Normal, 1: Çift Genişlik/Yükseklik)
  size(doubleWidth = false, doubleHeight = false) {
    let sizeByte = 0;
    if (doubleWidth) sizeByte |= 0x20;
    if (doubleHeight) sizeByte |= 0x01;
    this.addBytes([0x1D, 0x21, sizeByte]);
    return this;
  }

  // Kağıt Besle ve Kes
  cut() {
    this.addBytes([0x1D, 0x56, 0x42, 0x00]); // Full Cut
    return this;
  }

  // Bayt Dizisini Döndür
  encode() {
    return new Uint8Array(this.buffer);
  }
}