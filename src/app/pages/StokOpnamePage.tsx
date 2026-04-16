import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Save, Search, ChevronLeft, ChevronRight, FileSpreadsheet, SortDesc, EyeOff, Eye, History } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import api from '../api';

interface OpnameItem {
  product_id: number;
  product_name: string;
  category_name: string;
  stok_sistem: number;
  stok_fisik: number | '';
  selisih: number;
}

export default function StokOpnamePage() {
  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortByStock, setSortByStock] = useState(true);
  const [showOnlyWithStock, setShowOnlyWithStock] = useState(false);
  const [activeTab, setActiveTab] = useState<'opname' | 'history'>('opname');

  // History State (Moved from StockMovementPage)
  const [movements, setMovements] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyType, setHistoryType] = useState('all');
  const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [historyTotal, setHistoryTotal] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (activeTab === 'opname') {
      fetchProducts();
      fetchCategories();
    }
    else fetchHistory();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [historyType, historyMonth, historyPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      const items = res.data.map((p: any) => ({
        product_id: p.id,
        product_name: p.name,
        category_name: p.category?.name || 'TANPA KATEGORI',
        stok_sistem: p.stok_saat_ini,
        stok_fisik: p.stok_saat_ini,
        selisih: 0,
      }));
      setOpnameItems(items);
    } catch (err) {
      toast.error('Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error("Gagal load kategori", err);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/stok-movements', {
        params: { tipe: historyType, bulan: historyMonth, page: historyPage, limit: 20 }
      });
      setMovements(res.data.data);
      setHistoryLastPage(res.data.last_page);
      setHistoryTotal(res.data.total);
    } catch (err: any) {
      toast.error('Gagal mengambil data histori stok');
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateStokFisik = (productId: number, value: string) => {
    const numericValue = value === '' ? '' : parseInt(value) || 0;
    setOpnameItems(
      opnameItems.map((item: OpnameItem) =>
        item.product_id === productId
          ? { 
              ...item, 
              stok_fisik: numericValue, 
              selisih: numericValue === '' ? 0 : (numericValue as number) - item.stok_sistem 
            }
          : item
      )
    );
  };

  const totalSelisih = opnameItems.reduce((sum: number, item: OpnameItem) => sum + Math.abs(item.selisih), 0);
  const itemsWithDiff = opnameItems.filter((item: OpnameItem) => item.selisih !== 0);

  const handleSave = async () => {
    if (itemsWithDiff.length === 0) {
      toast.info('Tidak ada selisih stok untuk disimpan.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: keterangan || 'Penyesuaian stok opname',
        items: itemsWithDiff.map((i: OpnameItem) => ({
          product_id: i.product_id,
          stok_sistem: i.stok_sistem,
          stok_fisik: i.stok_fisik as number,
          selisih: i.selisih
        }))
      };
      
      await api.post('/stok-opname', payload);
      toast.success('Stok opname berhasil disimpan!');
      setKeterangan('');
      fetchProducts();
    } catch (err) {
      toast.error('Gagal menyimpan hasil stok opname');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    let result = [...opnameItems];

    // Search filter
    if (searchTerm) {
      result = result.filter((item) =>
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Stock availability filter
    if (showOnlyWithStock) {
      result = result.filter((item) => item.stok_sistem > 0);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category_name === selectedCategory);
    }

    // Sorting logic
    result.sort((a, b) => {
      if (sortByStock) {
        // Sort by current stock system (descending)
        if (b.stok_sistem !== a.stok_sistem) {
          return b.stok_sistem - a.stok_sistem;
        }
      }
      // Then by name (ascending)
      return a.product_name.localeCompare(b.product_name);
    });

    return result;
  }, [opnameItems, searchTerm, sortByStock, showOnlyWithStock, selectedCategory]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    const worksheetData: any[][] = [
      ["LEMBAR KERJA STOK OPNAME"],
      [],
      ["Nama Produk", "Stok Sistem", "Stok Fisik", "Selisih"]
    ];

    filteredItems.forEach(item => {
      worksheetData.push([
        item.product_name,
        item.stok_sistem,
        item.stok_fisik === '' ? '' : item.stok_fisik,
        item.selisih
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 55 }, // Nama Produk
      { wch: 15 }, // Stok Sistem
      { wch: 15 }, // Stok Fisik
      { wch: 15 }  // Selisih
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stok Opname");
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Data_Stok_Opname_${dateStr}.xlsx`);
  };

  if (loading && activeTab === 'opname') return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div><div className="h-5 bg-gray-200 rounded w-40 mb-2" /><div className="h-3 bg-gray-200 rounded w-56" /></div>
        <div className="h-9 bg-gray-200 rounded-lg w-36" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-3 flex gap-4"><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex gap-1 w-fit">
        <button
          onClick={() => setActiveTab('opname')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'opname' ? 'bg-[#3B82F6] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <ClipboardList size={16} />
          Input Stok Opname
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'history' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <History size={16} />
          Riwayat Pergerakan Barang
        </button>
      </div>

      {activeTab === 'opname' ? (
        <div className="animate-in fade-in duration-300 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">Stok Opname Rutin</h2>
              <p className="text-xs text-gray-500 mt-0.5">Periksa dan sesuaikan stok fisik dengan sistem</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                <FileSpreadsheet size={16} />
                <span className="hidden sm:inline">Export Excel</span>
              </button>
            </div>
          </div>
          
          {/* Sisa konten opname (Stats, Form, Table) diletakkan di sini */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
               <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Terfilter</p>
               <p className="text-xl font-bold text-[#3B82F6]">{filteredItems.length}</p>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
               <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Item Selisih</p>
               <p className="text-xl font-bold text-red-600">{itemsWithDiff.length}</p>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 bg-blue-50/50">
               <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Status Opname</p>
               <p className="text-base font-bold text-gray-800 tracking-tight">READY TO SAVE</p>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Keterangan</label>
                <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col">
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Filter Kategori</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)} 
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value="all">SEMUA KATEGORI</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>
                  ))}
                  <option value="TANPA KATEGORI">TANPA KATEGORI</option>
                </select>
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="stockOnly" 
                    checked={showOnlyWithStock} 
                    onChange={(e) => setShowOnlyWithStock(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="stockOnly" className="text-[11px] font-bold text-gray-600 cursor-pointer select-none">Hanya barang ada stok</label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cari Produk</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="text" placeholder="Ketik nama produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Nama Produk</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Sistem</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Fisik</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentItems.map((item) => (
                    <tr key={item.product_id} className={`hover:bg-gray-50/50 ${item.selisih !== 0 ? 'bg-orange-50/30' : ''}`}>
                      <td className="px-3 py-2 text-xs font-bold text-gray-800">{item.product_name}</td>
                      <td className="px-3 py-2 text-center text-xs font-black">{item.stok_sistem}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" value={item.stok_fisik === '' ? '' : item.stok_fisik} onChange={(e) => updateStokFisik(item.product_id, e.target.value)} className="w-16 text-center border border-gray-200 rounded text-xs font-bold py-0.5" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded font-black ${item.selisih > 0 ? 'bg-green-100 text-green-700' : item.selisih < 0 ? 'bg-red-100 text-red-700' : 'text-gray-300'}`}>
                          {item.selisih > 0 ? '+' : ''}{item.selisih}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center pt-2">
               <div className="flex gap-1">
                 <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-1.5 border rounded hover:bg-gray-50"><ChevronLeft size={14}/></button>
                 <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-1.5 border rounded hover:bg-gray-50"><ChevronRight size={14}/></button>
               </div>
               <button onClick={handleSave} disabled={isSubmitting || itemsWithDiff.length === 0} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-md shadow-blue-200">
                 {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN HASIL OPNAME'}
               </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">Riwayat Pergerakan Barang</h2>
              <p className="text-xs text-gray-500 mt-0.5">Log otomatis setiap ada barang masuk, keluar, atau dipindahkan</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
             <div className="flex flex-wrap gap-3 mb-6 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Filter Tipe</label>
                    <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100">
                      {['all', 'in', 'out', 'adjustment'].map(t => (
                        <button key={t} onClick={() => { setHistoryType(t); setHistoryPage(1); }} className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${historyType === t ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}>
                          {t.toUpperCase()}
                        </button>
                      ))}
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Periode Bulan</label>
                    <input type="month" value={historyMonth} onChange={(e) => { setHistoryMonth(e.target.value); setHistoryPage(1); }} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none" />
                </div>
             </div>

             <div className="overflow-x-auto rounded-xl border border-gray-50">
               <table className="w-full text-left">
                 <thead className="bg-gray-50/50">
                   <tr>
                     <th className="p-3 text-[10px] font-bold text-gray-400 uppercase">Waktu</th>
                     <th className="p-3 text-[10px] font-bold text-gray-400 uppercase">Produk</th>
                     <th className="p-3 text-center text-[10px] font-bold text-gray-400 uppercase">Qty</th>
                     <th className="p-3 text-[10px] font-bold text-gray-400 uppercase">Sumber</th>
                     <th className="p-3 text-[10px] font-bold text-gray-400 uppercase">Info</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {historyLoading ? (
                      <tr><td colSpan={5} className="p-8 text-center text-xs text-gray-400">Memuat riwayat...</td></tr>
                   ) : movements.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-xs text-gray-400 italic">Tidak ada data pergerakan</td></tr>
                   ) : (
                      movements.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50/30 transition-colors">
                           <td className="p-3">
                              <p className="text-[11px] font-bold text-gray-700">{new Date(m.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</p>
                              <p className="text-[9px] text-gray-400">{new Date(m.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
                           </td>
                           <td className="p-3">
                              <p className="text-xs font-bold text-gray-800">{m.product?.name || 'Produk Dihapus'}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-tighter">KODE: {m.product?.kode || '-'}</p>
                           </td>
                           <td className="p-3 text-center">
                              <span className={`text-xs font-black ${m.qty < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {m.qty > 0 ? '+' : ''}{m.qty}
                              </span>
                           </td>
                           <td className="p-3">
                              <span className="text-[9px] font-black border border-gray-200 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">{m.sumber}</span>
                           </td>
                           <td className="p-3 text-[10px] text-gray-400 italic italic max-w-xs truncate">{m.keterangan || '-'}</td>
                        </tr>
                      ))
                   )}
                 </tbody>
               </table>
             </div>
             
             {historyLastPage > 1 && (
               <div className="mt-4 flex justify-between items-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Halaman {historyPage} dari {historyLastPage}</p>
                  <div className="flex gap-2">
                     <button disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)} className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-20"><ChevronLeft size={16}/></button>
                     <button disabled={historyPage === historyLastPage} onClick={() => setHistoryPage(p => p + 1)} className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-20"><ChevronRight size={16}/></button>
                  </div>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
}
