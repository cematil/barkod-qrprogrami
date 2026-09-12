import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, pushToCentralServer } from '../utils/db';
import { 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  Plus, 
  Dices, 
  Upload, 
  Image as ImageIcon,
  Tags,
  FolderPlus,
  ScanLine,
  AlertTriangle,
  Filter,
  CheckSquare,
  Square,
  Percent,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function StockManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // TOPLU FİYAT GÜNCELLEME STATE'LERİ
  const [bulkCategory, setBulkCategory] = useState('Tümü');
  const [bulkPercentage, setBulkPercentage] = useState('');
  const [bulkTargetField, setBulkTargetField] = useState('price'); // 'price' veya 'costPrice'
  const [bulkOperationType, setBulkOperationType] = useState('increase'); // 'increase' (+) veya 'decrease' (-)

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('3');
  const [category, setCategory] = useState('Genel');
  const [image, setImage] = useState('');

  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];

  const templateCatalog = [
    { title: 'Ekmek / Unlu', keywords: ['ekmek', 'somun', 'pide'], url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80' },
    { title: 'Süt / Şişe', keywords: ['sut', 'süt', 'ayran'], url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&q=80' },
    { title: 'Kutu İçecek', keywords: ['cola', 'kola', 'fanta', 'gazoz', 'frizzy'], url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&q=80' },
    { title: 'Bira Şişe', keywords: ['bira', 'beer', 'tuborg', 'efes', 'amsterdam', 'carlsberg'], url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&q=80' },
    { title: 'Viski / Votka', keywords: ['viski', 'whiskey', 'chivas', 'jack', 'votka'], url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&q=80' },
    { title: 'Çerez / Paket', keywords: ['cerez', 'çerez', 'fistik', 'fıstık', 'cips'], url: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=300&q=80' },
    { title: 'Çekiç / El Aleti', keywords: ['cekic', 'çekiç', 'pense', 'hirdavat'], url: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=300&q=80' },
    { title: 'Vida / Civata', keywords: ['vida', 'civata', 'somun'], url: 'https://images.unsplash.com/photo-1508873696983-2df515122519?w=300&q=80' }
  ];

  const handleNameChange = (val) => {
    setName(val);
    if (!image) {
      const lower = val.toLowerCase();
      const matched = templateCatalog.find(item => item.keywords.some(k => lower.includes(k)));
      if (matched) {
        setImage(matched.url);
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleScanBarcodeInModal = async () => {
    const scanned = prompt("Barkod Okuyucuyla Kodu Okutun:");
    if (!scanned) return;

    const existing = await db.products.where('barcode').equals(scanned).first();
    if (existing && (!editingProduct || editingProduct.id !== existing.id)) {
      alert(`UYARI: Bu barkod (${scanned}) zaten "${existing.name}" ürününe tanımlı! Aynı barkodla 2. ürün eklenemez.`);
      return;
    }

    setBarcode(scanned);
  };

  const handleAddCategory = async (e) => {
    if (e) e.preventDefault();
    const catName = newCategoryName.trim();
    if (!catName) return;

    try {
      await db.categories.add({ name: catName });
      setNewCategoryName('');
      setIsCatModalOpen(false);
    } catch (err) {
      alert("Kategori eklenirken hata oluştu: " + err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) {
      await db.categories.delete(id);
    }
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setName(''); 
    setBarcode(''); 
    setPrice(''); 
    setCostPrice(''); 
    setStock(''); 
    setMinStock('3');
    setImage('');
    setCategory(categories.length > 0 ? categories[0].name : 'Genel');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setBarcode(product.barcode);
    setPrice(product.price);
    setCostPrice(product.costPrice || '');
    setStock(product.stock);
    setMinStock(product.minStock || '3');
    setCategory(product.category || 'Genel');
    setImage(product.image || '');
    setIsModalOpen(true);
  };

  const generateRandomBarcode = () => {
    const randomCode = '270' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setBarcode(randomCode);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name || !barcode || !price) return;

    const existingProduct = await db.products.where('barcode').equals(barcode).first();
    if (existingProduct && (!editingProduct || editingProduct.id !== existingProduct.id)) {
      alert(`HATA: "${barcode}" barkodu zaten "${existingProduct.name}" ürününde kayıtlı! Aynı barkod tekrar eklenemez.`);
      return;
    }

    const payload = {
      name,
      barcode,
      price: parseFloat(price) || 0,
      costPrice: parseFloat(costPrice) || 0,
      stock: parseInt(stock) || 0,
      minStock: parseInt(minStock) || 3,
      category: category || 'Genel',
      image: image || ''
    };

    try {
      if (editingProduct) {
        await db.products.update(editingProduct.id, payload);
        await pushToCentralServer('products', { ...payload, id: editingProduct.id });
      } else {
        const id = await db.products.add(payload);
        await pushToCentralServer('products', { ...payload, id });
      }
      setIsModalOpen(false);
    } catch (err) {
      alert("Kayıt hatası: " + err.message);
    }
  };

  // TEKİL ÜRÜN SİLME
  const handleDeleteProduct = async (id) => {
    if (confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
      await pushToCentralServer('products_delete', { id });
      await db.products.delete(id);
      setSelectedProductIds(selectedProductIds.filter(item => item !== id));
    }
  };

  // TOPLU ÜRÜN SEÇİMİ VE SİLME FONKSİYONLARI
  const toggleSelectProduct = (id) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter(item => item !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;

    if (confirm(`Seçilen ${selectedProductIds.length} adet ürünü silmek istediğinize emin misiniz?`)) {
      await pushToCentralServer('products_delete', { ids: selectedProductIds });
      await db.products.bulkDelete(selectedProductIds);
      setSelectedProductIds([]);
    }
  };

  // KATEGORİ BAZLI TOPLU YÜZDESEL FİYAT GÜNCELLEME İŞLEMİ
  const handleApplyBulkPriceUpdate = async (e) => {
    e.preventDefault();
    const percentVal = parseFloat(bulkPercentage);

    if (isNaN(percentVal) || percentVal <= 0) {
      alert("Lütfen geçerli bir yüzde oranı girin (Örn: 10)!");
      return;
    }

    const targetProducts = products.filter(p => bulkCategory === 'Tümü' || p.category === bulkCategory);

    if (targetProducts.length === 0) {
      alert("Seçilen kategoride güncellenecek ürün bulunamadı.");
      return;
    }

    const fieldLabel = bulkTargetField === 'price' ? 'Satış Fiyatı' : 'Alış Fiyatı';
    const opLabel = bulkOperationType === 'increase' ? 'zam' : 'indirim';

    if (confirm(`"${bulkCategory}" kategorisindeki ${targetProducts.length} adet ürünün ${fieldLabel} değerine %${percentVal} oranında ${opLabel} uygulanacak. Onaylıyor musunuz?`)) {
      const multiplier = bulkOperationType === 'increase' 
        ? (1 + (percentVal / 100)) 
        : (1 - (percentVal / 100));

      for (const prod of targetProducts) {
        const currentVal = prod[bulkTargetField] || 0;
        const newVal = Math.max(0, parseFloat((currentVal * multiplier).toFixed(2)));

        const updatedProduct = {
          ...prod,
          [bulkTargetField]: newVal
        };

        // 1. Dexie Veritabanını Güncelle
        await db.products.update(prod.id, { [bulkTargetField]: newVal });

        // 2. Sunucuya Gönder (SQLite)
        await pushToCentralServer('products', updatedProduct);
      }

      alert(`İşlem Başarılı! ${targetProducts.length} ürünün ${fieldLabel} değeri güncellendi.`);
      setIsBulkPriceModalOpen(false);
      setBulkPercentage('');
    }
  };

  // ARAMA VE KATEGORİYE GÖRE FİLTRELEME
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode.includes(searchTerm);
    
    const matchesCategory = 
      selectedCategory === 'Tümü' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-6 overflow-y-auto space-y-6">
      
      {/* ÜST BAŞLIK VE BUTONLAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Stok & Ürün Yönetimi</h1>
          <p className="text-xs text-slate-400 mt-1">Toplam <span className="text-cyan-400 font-bold">{products.length}</span> çeşit ürün kayıtlı</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setIsBulkPriceModalOpen(true)} 
            className="flex items-center gap-2 px-4 py-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold rounded-2xl text-xs transition-all"
          >
            <Percent className="w-4 h-4" /> Toplu Fiyat Güncelle
          </button>

          <button 
            onClick={() => setIsCatModalOpen(true)} 
            className="flex items-center gap-2 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold rounded-2xl text-xs transition-all"
          >
            <FolderPlus className="w-4 h-4" /> Kategori Ekle
          </button>

          <button 
            onClick={openNewModal} 
            className="flex items-center gap-2 px-5 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" /> YENİ ÜRÜN EKLE
          </button>
        </div>
      </div>

      {/* KATEGORİ BARI */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Tags className="w-4 h-4" /> Kayıtlı Kategoriler
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <span key={cat.id} className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 text-slate-200">
              {cat.name}
              <button type="button" onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 hover:text-red-300 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* ARAMA VE KATEGORİ FİLTRE BARI + TOPLU SİLME BUTONU */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 w-full">
          <Search className="w-6 h-6 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Ürün adı veya barkod ile arayın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-base text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
          />
        </div>

        {/* KATEGORİ DROPDOWN FİLTRESİ */}
        <div className="relative w-full md:w-60">
          <Filter className="w-5 h-5 absolute left-3.5 top-3.5 text-cyan-400 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-bold rounded-2xl pl-11 pr-8 py-3.5 appearance-none focus:outline-none focus:border-cyan-500"
          >
            <option value="Tümü">Tüm Kategoriler</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* TOPLU SİLME BUTONU */}
        {selectedProductIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="w-full md:w-auto px-5 py-3.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" /> Seçilen ({selectedProductIds.length}) Ürünü Sil
          </button>
        )}
      </div>

      {/* TABLO */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4 w-10 text-center">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-cyan-400">
                  {selectedProductIds.length > 0 && selectedProductIds.length === filteredProducts.length ? (
                    <CheckSquare className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th className="p-4">Ürün</th>
              <th className="p-4">Kategori</th>
              <th className="p-4">Barkod</th>
              <th className="p-4">Alış Fiyatı</th>
              <th className="p-4">Satış Fiyatı</th>
              <th className="p-4">Stok Durumu</th>
              <th className="p-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredProducts.map(product => {
              const isSelected = selectedProductIds.includes(product.id);
              const isLowStock = product.stock <= (product.minStock || 3);
              return (
                <tr key={product.id} className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-cyan-500/10' : ''}`}>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleSelectProduct(product.id)} className="text-slate-400 hover:text-cyan-400">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="p-4 font-bold text-slate-100 text-base flex items-center gap-4">
                    {product.image ? (
                      <img src={product.image} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-700 shadow-md" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800">
                        <ImageIcon className="w-6 h-6 text-slate-700" />
                      </div>
                    )}
                    <div>
                      <span>{product.name}</span>
                      {isLowStock && (
                        <p className="text-[10px] text-red-400 font-extrabold flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Kritik Stok
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-300">{product.category}</td>
                  <td className="p-4 font-mono text-sm text-slate-400">{product.barcode}</td>
                  <td className="p-4 font-extrabold text-amber-400 text-sm">{(product.costPrice || 0).toFixed(2)} ₺</td>
                  <td className="p-4 font-black text-cyan-400 text-base">{product.price.toFixed(2)} ₺</td>
                  <td className="p-4 font-extrabold text-base">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${isLowStock ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-950 text-slate-200 border border-slate-800'}`}>
                      {product.stock} Adet
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEditModal(product)} className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all"><Edit3 className="w-5 h-5" /></button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all ml-1"><Trash2 className="w-5 h-5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TOPLU YÜZDESEL FİYAT GÜNCELLEME MODALI */}
      {isBulkPriceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" /> Toplu Fiyat Güncelle (% Yüzde)
              </h3>
              <button onClick={() => setIsBulkPriceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyBulkPriceUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Hedef Kategori</label>
                <select 
                  value={bulkCategory} 
                  onChange={(e) => setBulkCategory(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="Tümü">Tüm Kategoriler</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Güncellenecek Alan</label>
                  <select 
                    value={bulkTargetField} 
                    onChange={(e) => setBulkTargetField(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-100 font-bold"
                  >
                    <option value="price">Satış Fiyatı</option>
                    <option value="costPrice">Alış / Maliyet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">İşlem Tipi</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBulkOperationType('increase')}
                      className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 ${
                        bulkOperationType === 'increase' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Zam (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkOperationType('decrease')}
                      className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 ${
                        bulkOperationType === 'decrease' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" /> İndirim (-)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Uygulanacak Yüzde Oranı (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    placeholder="Örn: 10 veya 15.5" 
                    value={bulkPercentage} 
                    onChange={(e) => setBulkPercentage(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-black text-amber-400 focus:outline-none focus:border-amber-500" 
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-black text-slate-500">%</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsBulkPriceModalOpen(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">İptal</button>
                <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/10">Fiyatları Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YENİ KATEGORİ EKLEME MODALI */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-cyan-400" /> Yeni Kategori Ekle
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Kategori Adı</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Örn: Şarküteri, Hırdavat..." 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCatModalOpen(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">İptal</button>
                <button type="submit" className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs">Ekle & Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÜRÜN EKLEME / DÜZENLEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-xl text-slate-100 mb-4">{editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Tanımla'}</h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Ürün Adı (Yazdıkça Resim Önerir)</label>
                <input type="text" required placeholder="Örn: Ekmek, Süt, Tuborg Bira..." value={name} onChange={(e) => handleNameChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Barkod No</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required 
                    placeholder="8690000000000" 
                    value={barcode} 
                    onChange={(e) => setBarcode(e.target.value)} 
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500" 
                  />
                  <button 
                    type="button" 
                    onClick={handleScanBarcodeInModal} 
                    className="p-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 flex items-center gap-1 transition-all"
                    title="Barkod / QR Okut"
                  >
                    <ScanLine className="w-5 h-5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={generateRandomBarcode} 
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 transition-all"
                    title="Rastgele Barkod Oluştur"
                  >
                    <Dices className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Kategori</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100">
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <label className="block text-xs font-extrabold text-cyan-400 uppercase tracking-wider">Ürün Görseli Seçin</label>
                
                <div className="flex gap-2">
                  <label className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-cyan-400" /> Bilgisayardan Dosya Yükle
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <input type="text" placeholder="Veya İnternet Görsel Linki (URL) Yapıştırın..." value={image} onChange={(e) => setImage(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100" />

                <div>
                  <p className="text-[10px] text-slate-500 font-bold mb-2">SEKTÖREL HAZIR ŞABLON KATALOĞU:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {templateCatalog.map((t, idx) => (
                      <button key={idx} type="button" onClick={() => setImage(t.url)} className="p-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-500 rounded-xl text-center transition-all">
                        <img src={t.url} alt="" className="w-full h-12 object-cover rounded-lg mb-1" />
                        <span className="text-[9px] text-slate-300 font-bold truncate block">{t.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* FİYAT VE STOK GRUBU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Alış Fiyatı / Maliyet (₺)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-amber-400 font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Satış Fiyatı (₺)</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-cyan-400 font-black" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Mevcut Stok Adedi</label>
                  <input type="number" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Kritik Stok Uyarısı Limiti</label>
                  <input type="number" placeholder="3" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-red-400 font-bold" />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm">İptal</button>
                <button type="submit" className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-sm">KAYDET</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}