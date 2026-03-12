import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Printer, History, ShoppingCart } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  kode?: string;
  name: string;
  harga_jual: number;
  stok_saat_ini: number;
  category_id: number;
  category?: Category;
}

interface SaleItem {
  id?: number;
  product: Product;
  qty: number;
  harga_jual_saat_itu: number;
  is_sub?: boolean;
  parent_id?: number;
  satuan?: string;
  manual_name?: string;
}

interface Sale {
  id: number;
  invoice: string;
  channel: string;
  tanggal: string;
  total_penjualan: number;
  pembayaran: number;
  kembalian: number;
  items: SaleItem[];
  user?: { name: string };
  tax_percent: number;
  tax_amount: number;
}

export default function PenjualanPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sale Options
  const [channel, setChannel] = useState('Offline');
  const [payment, setPayment] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    if (lastSale && shouldPrint) {
      setTimeout(() => {
        window.print();
        setShouldPrint(false);
        toast.success('Transaksi Berhasil!');
      }, 500);
    }
  }, [lastSale, shouldPrint]);
  const [taxPercent, setTaxPercent] = useState(0);

  const channels = ['Offline', 'SCahaya Komputer ID', 'SCahaya Tech', 'Lazada', 'Tiktokshop'];

  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const fetchData = async () => {
    // ... existing fetch logic
    try {
      setLoading(true);
      const [prodRes, catRes, saleRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/sales')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setSales(saleRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchLower) || (p.kode && p.kode.toLowerCase().includes(searchLower));
    const matchesCategory = selectedCategory === 'all' || p.category_id.toString() === selectedCategory;
    return matchesSearch && matchesCategory && p.stok_saat_ini > 0;
  });

  const addItem = (product: Product) => {
    // For PC Builders, they might want the same product as normal and as sub
    // So let's allow adding same product multiple times if we want? 
    // No, keep current logic but add is_sub: false
    const existing = saleItems.find((item) => item.product.id === product.id && !item.is_sub);
    if (existing) {
      updateQtyByProduct(product.id, existing.qty + 1);
    } else {
      setSaleItems([...saleItems, { product, qty: 1, harga_jual_saat_itu: product.harga_jual, is_sub: false, satuan: 'PCS' }]);
    }
  };

  const addManualItem = () => {
    const manualProduct: Product = {
      id: -Date.now(),
      kode: '',
      name: 'NAMA PAKET / JASA',
      harga_jual: 0,
      stok_saat_ini: 999,
      category_id: 0
    };
    setSaleItems([...saleItems, { product: manualProduct, qty: 1, harga_jual_saat_itu: 0, is_sub: false, satuan: 'SET' }]);
  };

  const removeItem = (idx: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== idx));
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    const item = saleItems[idx];
    if (item.product.stok_saat_ini < qty) {
      toast.error('Stok tidak cukup');
      return;
    }
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, qty } : item
      )
    );
  };

  const updateQtyByProduct = (productId: number, qty: number) => {
    setSaleItems(
      saleItems.map((item) =>
        item.product.id === productId && !item.is_sub ? { ...item, qty } : item
      )
    );
  };

  const updateItemPrice = (idx: number, newPrice: number) => {
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, harga_jual_saat_itu: newPrice } : item
      )
    );
  };

  const updateItemName = (idx: number, newName: string) => {
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, product: { ...item.product, name: newName } } : item
      )
    );
  };

  const updateItemSatuan = (idx: number, newSatuan: string) => {
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, satuan: newSatuan } : item
      )
    );
  };

  const toggleSubItem = (idx: number) => {
    setSaleItems(saleItems.map((item, i) => {
      if (i === idx) {
        const isNowSub = !item.is_sub;
        return {
          ...item,
          is_sub: isNowSub,
          harga_jual_saat_itu: isNowSub ? 0 : item.product.harga_jual
        };
      }
      return item;
    }));
  };

  const calculatedTotal = saleItems.reduce(
    (sum, item) => sum + item.harga_jual_saat_itu * item.qty,
    0
  );

  const [customTotal, setCustomTotal] = useState(0);

  useEffect(() => {
    setCustomTotal(calculatedTotal);
  }, [saleItems]);

  const handleNumpadInput = (val: string) => {
    if (val === 'C') {
      setPayment('0');
    } else if (val === 'PAS') {
      setPayment(customTotal.toString());
    } else if (payment === '0') {
      setPayment(val);
    } else {
      setPayment(prev => prev + val);
    }
  };

  const handleSubmit = async () => {
    if (parseFloat(payment) < customTotal) {
      toast.error('Pembayaran kurang!');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        channel,
        total_penjualan: customTotal,
        tax_percent: taxPercent,
        pembayaran: parseFloat(payment),
        kembalian: parseFloat(payment) - customTotal,
        items: saleItems.map((item, idx) => {
          let parent_idx = null;
          if (item.is_sub) {
            // Find the nearest previous item that is NOT a sub
            for (let i = idx - 1; i >= 0; i--) {
              if (!saleItems[i].is_sub) {
                parent_idx = i;
                break;
              }
            }
          }
          return {
            product_id: item.product.id < 0 ? null : item.product.id, // Manual items don't have real product_id
            manual_name: item.product.id < 0 ? item.product.name : null,
            qty: item.qty,
            harga_jual: item.harga_jual_saat_itu,
            satuan: item.satuan,
            is_sub: item.is_sub,
            parent_idx: parent_idx
          };
        })
      };

      const res = await api.post('/sales', payload);
      setLastSale({
        ...res.data,
        customer_name: customerName || 'UMUM',
        customer_address: customerAddress || '-',
        customer_phone: customerPhone || '-'
      });
      setShouldPrint(true);
      setSaleItems([]);
      setPayment('0');
      setTaxPercent(0);
      setCustomerName('');
      setCustomerAddress('');
      setCustomerPhone('');
      fetchData(); // Refresh products and history

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {loading ? (
        <div className="p-8 text-center text-gray-500 no-print">Memuat Kasir...</div>
      ) : (
        <div className="space-y-6">
          {/* Tab Switcher */}
          <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 max-w-fit no-print">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'pos' ? 'bg-[#3B82F6] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <ShoppingCart size={18} />
              Kasir
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-[#3B82F6] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <History size={18} />
              Riwayat Penjualan
            </button>
          </div>

          {activeTab === 'pos' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 no-print items-start">
              
              {/* Left: Customer Info & Review E-Faktur */}
              <div className="lg:col-span-2 flex flex-col gap-2.5 h-[calc(100vh-110px)]">
                {/* Customer Info Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 shrink-0">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Informasi Pelanggan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Nama Pelanggan</label>
                      <input
                        type="text"
                        placeholder="Nama Pelanggan / UMUM..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Input Alamat</label>
                      <input
                        type="text"
                        placeholder="Alamat..."
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Input No. HP/WA</label>
                      <input
                        type="text"
                        placeholder="No. HP/WA..."
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* E-FAKTUR REVIEW (Keranjang) */}
                <div className="bg-white rounded-xl shadow-lg border-t-[3px] border-[#3B82F6] p-3 flex flex-col flex-1 min-h-0">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 shrink-0">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight">REVIEW E-FAKTUR</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={addManualItem} className="text-[10px] bg-gray-100 border border-gray-200 hover:bg-gray-200 py-1.5 px-2.5 rounded-md font-bold text-gray-700">+ BARIS MANUAL</button>
                        <select value={channel} onChange={(e) => setChannel(e.target.value)} className="text-[10px] bg-gray-100 border-none rounded-md px-2 py-1.5 outline-none font-bold text-gray-700">
                          {channels.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                  </div>

                  {/* Cart Table */}
                  <div className="flex-1 overflow-y-auto pr-1 mb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {saleItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-50">
                        <ShoppingCart size={48} strokeWidth={1} />
                        <p className="text-sm font-medium italic">Keranjang Masih Kosong</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                          <tr>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase">Produk</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-center">Qty</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-right">Harga</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-right">Subtotal</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {saleItems.map((item, idx) => {
                            const subtotal = item.harga_jual_saat_itu * item.qty;
                            return (
                              <tr key={idx} className={`group hover:bg-gray-50 transition-colors ${item.is_sub ? 'bg-gray-50/50' : ''}`}>
                                <td className="py-2 px-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {item.is_sub && <div className="w-2.5 h-4 border-l-2 border-b-2 border-gray-300 rounded-bl ml-1" />}
                                    {item.product.id < 0 ? (
                                      <input
                                        type="text"
                                        value={item.product.name}
                                        onChange={(e) => updateItemName(idx, e.target.value)}
                                        className="font-semibold text-xs bg-blue-50 border-b border-blue-200 outline-none w-full px-1.5 py-0.5 rounded"
                                      />
                                    ) : (
                                      <p className={`font-semibold text-xs leading-tight text-gray-800 ${item.is_sub ? 'ml-0.5' : ''}`}>{item.product.name}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-1.5">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button onClick={() => updateQty(idx, item.qty - 1)} className="w-5 h-5 flex justify-center items-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition-colors">-</button>
                                    <span className="w-6 text-center text-xs font-bold text-gray-800">{item.qty}</span>
                                    <button onClick={() => updateQty(idx, item.qty + 1)} className="w-5 h-5 flex justify-center items-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition-colors">+</button>
                                    <select value={item.satuan} onChange={(e) => updateItemSatuan(idx, e.target.value)} className="bg-gray-100 border-none rounded text-[10px] px-0.5 py-0.5 outline-none ml-1">
                                      <option value="PCS">PCS</option>
                                      <option value="SET">SET</option>
                                      <option value="Unit">Unit</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="py-2 px-1.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-[10px] text-gray-400">Rp</span>
                                    <input
                                      type="number"
                                      value={item.harga_jual_saat_itu}
                                      onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                      className="w-20 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-xs font-bold text-gray-800 text-right outline-none focus:ring-1 focus:ring-[#3B82F6]"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-1.5 text-right">
                                  <p className="font-bold text-[#3B82F6] text-xs leading-tight">Rp {subtotal.toLocaleString('id-ID')}</p>
                                </td>
                                <td className="py-2 px-1.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => toggleSubItem(idx)} className={`p-1 rounded transition-colors shadow-sm ${item.is_sub ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-400 hover:text-[#3B82F6]'}`} title="Jadikan Komponen Rakitan">
                                      <Plus size={12} />
                                    </button>
                                    <button onClick={() => removeItem(idx)} className="p-1 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors shadow-sm">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Cart Totals Summary */}
                  <div className="border-t border-gray-100 pt-4 mt-auto shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                      {/* Left side: Tax / Additional fee */}
                      <div className="w-full md:w-1/3">
                        <div className="flex items-center justify-between text-xs bg-gray-50 border border-gray-100 text-gray-600 px-3 py-2 rounded-lg">
                          <span className="font-semibold">Pajak / Fee (%) :</span>
                          <input
                            type="number"
                            value={taxPercent}
                            onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                            className="w-12 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-right outline-none focus:border-[#3B82F6] font-bold"
                          />
                        </div>
                      </div>
                      
                      {/* Right side: Grand Total */}
                      <div className="w-full md:w-1/2 flex flex-col items-end">
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-0.5">TOTAL KESELURUHAN</p>
                        <div className="flex items-center gap-2 bg-[#3B82F6]/5 rounded-lg px-4 py-2 border border-[#3B82F6]/20">
                          <span className="text-base font-bold text-[#3B82F6]">Rp</span>
                          <input
                            type="number"
                            value={customTotal}
                            onChange={(e) => setCustomTotal(parseFloat(e.target.value) || 0)}
                            className="text-right font-black text-2xl text-[#3B82F6] w-36 bg-transparent outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Pilih Produk & Numpad */}
              <div className="lg:col-span-1 flex flex-col gap-2.5 h-[calc(100vh-110px)]">
                
                {/* Product Search & List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col flex-1 min-h-0">
                  <div className="shrink-0 mb-2">
                    <h3 className="text-sm font-bold text-gray-800 mb-2">Pilih Produk</h3>
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="text"
                          placeholder="Cari Produk..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs"
                        />
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50 font-medium"
                      >
                        <option value="all">Semua Kategori</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {filteredProducts.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 mt-6">Produk tidak ditemukan</p>
                    ) : (
                      filteredProducts.map(product => (
                        <div key={product.id} className="p-2.5 bg-white border border-gray-100 rounded-lg flex justify-between items-center hover:shadow-sm hover:border-[#3B82F6] transition-all group">
                          <div className="flex-1 pr-2">
                            <p className="font-bold text-xs text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                            <p className="text-[11px] font-black text-[#3B82F6] mt-0.5">Rp {product.harga_jual.toLocaleString('id-ID')}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded font-bold">Stok: {product.stok_saat_ini}</span>
                              <span className="text-[9px] text-gray-400 uppercase">{product.category?.name || 'UMUM'}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => addItem(product)} 
                            className="w-8 h-8 bg-[#3B82F6] text-white rounded-md flex items-center justify-center hover:bg-[#2563EB] shadow-sm transform active:scale-95 transition-all"
                          >
                            <Plus size={16}/>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Numpad & Payment */}
                <div className="bg-white rounded-xl shadow-lg border-t-[3px] border-green-500 p-3 mt-auto shrink-0">
                  <div className="mb-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">Tunai Dibayar</span>
                      <span className="font-black text-xl text-green-600">Rp {parseFloat(payment).toLocaleString('id-ID')}</span>
                    </div>
                    
                    {parseFloat(payment) >= customTotal && customTotal > 0 && (
                      <div className="flex items-center justify-between bg-green-50 text-green-700 px-3 py-2 rounded-md border border-green-100 mt-1.5">
                        <span className="font-bold text-xs">KEMBALIAN</span>
                        <span className="font-black text-sm">Rp {(parseFloat(payment) - customTotal).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {parseFloat(payment) < customTotal && parseFloat(payment) > 0 && (
                      <div className="flex items-center justify-between bg-red-50 text-red-600 px-3 py-2 rounded-md border border-red-100 mt-1.5">
                        <span className="font-bold text-xs">KURANG BAYAR</span>
                        <span className="font-black text-sm">Rp {(customTotal - parseFloat(payment)).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
                      <button key={key} onClick={() => handleNumpadInput(key)} className="h-9 rounded-md text-sm font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors">{key}</button>
                    ))}
                    <button onClick={() => handleNumpadInput('C')} className="h-9 rounded-md text-sm font-black bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors">C</button>
                    <button onClick={() => handleNumpadInput('0')} className="h-9 rounded-md text-sm font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors">0</button>
                    <button onClick={() => handleNumpadInput('00')} className="h-9 rounded-md text-sm font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors">00</button>
                    
                    <button onClick={() => handleNumpadInput('PAS')} className="col-span-3 h-10 mt-1 rounded-md text-[11px] bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 active:bg-green-300 transition-colors font-black tracking-widest uppercase">Uang Pas / Transfer</button>
                    
                    <button
                      onClick={handleSubmit}
                      disabled={saleItems.length === 0 || isSubmitting || parseFloat(payment) < customTotal}
                      className="col-span-3 h-10 mt-1 bg-green-600 text-white rounded-lg font-black text-[13px] tracking-widest shadow-md shadow-green-600/20 disabled:bg-gray-300 disabled:shadow-none transition-all active:scale-[0.98] hover:bg-green-700 uppercase"
                    >
                      {isSubmitting ? 'Memproses...' : 'Submit (F10)'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Sales History Tab */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden no-print">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Invoice</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Tanggal</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Channel</th>
                      <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Total</th>
                      <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 font-bold text-gray-800">{sale.invoice}</td>
                        <td className="px-3 py-2 text-gray-600">{new Date(sale.tanggal).toLocaleString('id-ID')}</td>
                        <td className="px-3 py-2"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium uppercase">{sale.channel}</span></td>
                        <td className="px-3 py-2 text-right font-bold text-gray-800">Rp {Number(sale.total_penjualan).toLocaleString('id-ID')}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => { setLastSale(sale); setTimeout(() => window.print(), 100); }} className="p-2 text-gray-400 hover:text-[#3B82F6]"><Printer size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAKTUR TEMPLATE - A4 LANDSCAPE - FULL WIDTH */}
      <div id="print-area" className="faktur-print bg-white text-black font-sans" style={{ width: '100%', margin: '0' }}>
        {lastSale && (
          <div className="bg-white">
            {/* ===== HEADER BOX (Matched to Reference) ===== */}
            {/* Header with Store Info and Faktur box */}
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="p-1" style={{ width: '60%', verticalAlign: 'top' }}>
                    <div className="flex items-center gap-4">
                      {settings.store_logo && (
                        <img
                          src={`${api.defaults.baseURL?.replace('/api', '')}/storage/${settings.store_logo}`}
                          alt="Logo"
                          className="h-14 w-14 object-contain"
                        />
                      )}
                      <div className="color-[#000]">
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.0', margin: '0' }}>{settings.store_name || 'CAHAYA KOMPUTER ID'}</h1>
                        <p style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '2px' }}>{settings.store_address || 'Alamat Toko Belum Diatur'}</p>
                        <p style={{ fontSize: '15px', fontWeight: 'bold' }}>Telepon/HP : {settings.store_phone || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-1 text-right" style={{ width: '40%', verticalAlign: 'top' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.0', margin: 0 }}>FAKTUR PENJUALAN</h1>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '4px' }}>
                      {new Date(lastSale.tanggal).toLocaleDateString('id-ID')} ## {new Date(lastSale.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Top Horizontal Line */}
            <div className="border-b-[2px] border-black w-full my-1"></div>

            {/* Info table (Customer and Trans details) */}
            <table className="w-full border-collapse text-[18px] font-bold">
              <tbody>
                <tr>
                  <td className="py-1" style={{ width: '55%', verticalAlign: 'top' }}>
                    <div className="space-y-0.5 color-[#000]">
                      <p className="underline">Kepada Yth.</p>
                      <p className="uppercase" style={{ fontSize: '20px' }}>{(lastSale as any).customer_name || 'UMUM'}</p>
                      <table className="border-collapse mt-1" style={{ fontSize: '16px' }}>
                        <tbody>
                          <tr><td style={{ width: '100px' }}>Alamat</td><td style={{ width: '10px' }}>:</td><td>{(lastSale as any).customer_address || '-'}</td></tr>
                          <tr><td>No. HP</td><td>:</td><td>{(lastSale as any).customer_phone || '-'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                  <td className="py-1" style={{ width: '45%', verticalAlign: 'top' }}>
                    <table className="w-full border-collapse color-[#000]" style={{ marginLeft: 'auto', textAlign: 'left' }}>
                      <tbody>
                        <tr><td style={{ width: '120px' }}>Tanggal / Jam</td><td style={{ width: '10px' }}>:</td><td>{new Date(lastSale.tanggal).toLocaleDateString('id-ID')} {new Date(lastSale.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td></tr>
                        <tr><td>No. Faktur</td><td>:</td><td className="uppercase">{lastSale.invoice}</td></tr>
                        <tr><td>Kasir</td><td>:</td><td className="uppercase">{lastSale.user?.name || user?.name || 'ADMIN'}</td></tr>
                        <tr><td>Pemesanan</td><td>:</td><td className="uppercase">{lastSale.channel}</td></tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Info Horizontal Line */}
            <div className="border-b-[2px] border-black w-full mt-1 mb-2"></div>

            <table className="w-full border-collapse text-[18px] color-[#000] font-bold" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-y-[2px] border-black">
                  <th className="py-2 px-1 text-left" style={{ width: '50px' }}>No</th>
                  <th className="py-2 px-1 text-left" style={{ width: 'auto' }}>Nama Barang</th>
                  <th className="py-2 px-1 text-center" style={{ width: '70px' }}>Qty</th>
                  <th className="py-2 px-1 text-center" style={{ width: '90px' }}>Satuan</th>
                  <th className="py-2 px-1 text-right" style={{ width: '160px' }}>Harga</th>
                  <th className="py-2 px-1 text-right" style={{ width: '180px' }}>Sub Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let noCount = 0;
                  return [...lastSale.items].map((item, idx) => {
                    const isSubItem = !!item.parent_id;
                    if (!isSubItem) noCount++;
                    return (
                      <tr key={idx} className="leading-tight font-bold">
                        <td className="py-1 px-1 text-left">{!isSubItem && noCount}</td>
                        <td className={`py-1 px-1 ${isSubItem ? 'pl-8' : ''}`}>
                          {item.product?.name || item.manual_name || 'Unit'}
                        </td>
                        <td className="py-1 px-1 text-center">{item.qty}</td>
                        <td className="py-1 px-1 text-center">{item.satuan || 'PCS'}</td>
                        <td className="py-1 px-1 text-right">
                          {isSubItem ? '0' : Number(item.harga_jual_saat_itu).toLocaleString('id-ID')}
                        </td>
                        <td className="py-1 px-1 text-right">
                          {isSubItem ? '0' : (item.qty * Number(item.harga_jual_saat_itu)).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>

            {/* Table Bottom Horizontal Line */}
            <div className="border-b-[2px] border-black w-full my-1"></div>

            <div className="flex justify-between items-start mt-4">
              {/* Keterangan and Totals Section */}
              <div className="w-[55%] color-[#000]">
                <div className="font-bold text-[18px]">KETERANGAN:</div>
                <div className="text-[17px] whitespace-pre-line leading-tight font-bold">
                  {settings.store_notes || 'Terima kasih atas kepercayaan Anda.\nMohon simpan Faktur ini sebagai bukti transaksi.\nBerlaku Untuk Claim Garansi'}
                </div>
              </div>

              <div className="w-[40%] text-[18px] color-[#000]">
                <table className="w-full border-collapse font-bold">
                  <tbody>
                    <tr><td className="py-0.5 text-left">Subtotal :</td><td className="text-right">{Number(lastSale?.total_penjualan || 0).toLocaleString('id-ID')}</td></tr>
                    <tr><td className="py-0.5 text-left">Pajak (0.00%) :</td><td className="text-right">0</td></tr>
                    <tr className="border-y-[2px] border-black my-1">
                      <td className="py-1 text-left text-[20px]">Total :</td>
                      <td className="text-right text-[20px]">{Number(lastSale?.total_penjualan || 0).toLocaleString('id-ID')}</td>
                    </tr>
                    <tr><td className="py-1 text-left">Tunai :</td><td className="text-right">{Number(lastSale?.pembayaran || 0).toLocaleString('id-ID')}</td></tr>
                    <tr><td className="py-0.5 text-left">Kembalian :</td><td className="text-right">{Number(lastSale?.kembalian || 0).toLocaleString('id-ID')}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* FULL WIDTH SIGNATURE SECTION */}
            <div className="mt-12 flex justify-between w-full text-[18px] font-bold color-[#000]">
              <div className="text-center" style={{ width: '200px' }}>
                <p>Hormat Kami,</p>
                <div className="mt-16 uppercase">{settings.store_name || 'CAHAYA KOMPUTER ID'}</div>
              </div>
              <div className="text-center" style={{ width: '200px' }}>
                <p>Diterima Oleh,</p>
                <div className="mt-16">( ........................ )</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .faktur-print { display: none; }

        @media print {
          body { 
            visibility: hidden !important; 
            margin: 0 !important; 
            padding: 0 !important;
          }
          
          #print-area {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            left: 0.25px !important;
            top: 0.10px !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            background: white !important;
          }

          #print-area * {
            visibility: visible !important;
            color: black !important;
            border-color: black !important;
            background: transparent !important;
            font-family: 'Arial', 'Helvetica', sans-serif !important;
            -webkit-font-smoothing: none !important;
            -moz-osx-font-smoothing: unset !important;
            text-rendering: optimizeSpeed !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}
