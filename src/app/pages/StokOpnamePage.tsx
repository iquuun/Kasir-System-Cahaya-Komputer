import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
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
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'opname';

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
  const itemsPerPage = 50;

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
        <div><div className="h-5 bg-accent rounded w-40 mb-2" /><div className="h-3 bg-accent rounded w-56" /></div>
        <div className="h-9 bg-accent rounded-lg w-36" />
      </div>
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="h-10 bg-accent border-b border-border" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-1.5 flex gap-4"><div className="h-4 bg-accent rounded w-1/4" /><div className="h-4 bg-accent rounded w-1/6" /><div className="h-4 bg-accent rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {activeTab === 'opname' ? (
        <div className="animate-in fade-in duration-300 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-end mb-4">
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
          <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-3">
             <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3">
               <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Total Terfilter</p>
               <p className="text-base md:text-xl font-bold text-[#3B82F6]">{filteredItems.length}</p>
             </div>
             <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3">
               <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Item Selisih</p>
               <p className="text-base md:text-xl font-bold text-red-600">{itemsWithDiff.length}</p>
             </div>
             <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3 bg-blue-50/50">
               <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Status Opname</p>
               <p className="text-[10px] md:text-base font-bold text-foreground tracking-tight line-clamp-1">READY TO SAVE</p>
             </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Keterangan</label>
                <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} className="w-full px-3 py-1.5 border border-border rounded-lg text-xs outline-none bg-muted focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col">
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Filter Kategori</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)} 
                  className="w-full px-3 py-1.5 border border-border rounded-lg text-xs outline-none bg-muted focus:ring-1 focus:ring-blue-500 font-bold"
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
                    className="w-3.5 h-3.5 rounded border-border text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="stockOnly" className="text-[11px] font-bold text-muted-foreground cursor-pointer select-none">Hanya barang ada stok</label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Cari Produk</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <input type="text" placeholder="Ketik nama produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs outline-none bg-muted focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            
            <div className="hidden md:block overflow-x-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-muted border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground">Nama Produk</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground">Sistem</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground">Fisik</th>
                    <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentItems.map((item) => (
                    <tr key={item.product_id} className={`hover:bg-muted/50 ${item.selisih !== 0 ? 'bg-orange-50/30' : ''}`}>
                      <td className="px-3 py-2 text-xs font-bold text-foreground">{item.product_name}</td>
                      <td className="px-3 py-2 text-center text-xs font-black">{item.stok_sistem}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" value={item.stok_fisik === '' ? '' : item.stok_fisik} onChange={(e) => updateStokFisik(item.product_id, e.target.value)} className="w-16 text-center border border-border rounded text-xs font-bold py-0.5" />
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

            {/* Mobile Card List for Opname */}
            <div className="space-y-3 md:hidden max-h-[60vh] overflow-y-auto">
              {currentItems.map((item) => (
                <div key={item.product_id} className={`bg-card rounded-xl shadow-sm border p-3 space-y-3.5 ${item.selisih !== 0 ? 'border-orange-200 bg-orange-50/10' : 'border-border'}`}>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-foreground line-clamp-2">{item.product_name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${item.selisih > 0 ? 'bg-green-100 text-green-700' : item.selisih < 0 ? 'bg-red-100 text-red-700' : 'bg-accent text-muted-foreground'}`}>
                      {item.selisih > 0 ? '+' : ''}{item.selisih}
                    </span>
                  </div>
                  
                  <div className="border-t border-border pt-2 flex justify-between items-center text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase">Stok Sistem</span>
                      <span className="font-semibold text-foreground">{item.stok_sistem}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase mr-1">Stok Fisik:</span>
                      <input 
                        type="number" 
                        value={item.stok_fisik === '' ? '' : item.stok_fisik} 
                        onChange={(e) => updateStokFisik(item.product_id, e.target.value)} 
                        className="w-16 text-center border border-border rounded text-xs font-bold py-1 bg-card" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center pt-2">
               <div className="flex gap-1">
                 <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-1.5 border rounded hover:bg-muted"><ChevronLeft size={14}/></button>
                 <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-1.5 border rounded hover:bg-muted"><ChevronRight size={14}/></button>
               </div>
               <button onClick={handleSave} disabled={isSubmitting || itemsWithDiff.length === 0} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-md shadow-blue-200">
                 {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN HASIL OPNAME'}
               </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300 space-y-4">
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
             <div className="flex flex-wrap gap-3 mb-6 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Filter Tipe</label>
                    <div className="flex bg-muted p-1 rounded-lg border border-border">
                      {['all', 'in', 'out', 'adjustment'].map(t => (
                        <button key={t} onClick={() => { setHistoryType(t); setHistoryPage(1); }} className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${historyType === t ? 'bg-card shadow text-orange-600' : 'text-muted-foreground'}`}>
                          {t.toUpperCase()}
                        </button>
                      ))}
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Periode Bulan</label>
                    <input type="month" value={historyMonth} onChange={(e) => { setHistoryMonth(e.target.value); setHistoryPage(1); }} className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs font-bold outline-none" />
                </div>
             </div>

             <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
               <table className="w-full text-left">
                 <thead className="bg-muted/50">
                   <tr>
                     <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase">Waktu</th>
                     <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase">Produk</th>
                     <th className="p-3 text-center text-[10px] font-bold text-muted-foreground uppercase">Qty</th>
                     <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase">Sumber</th>
                     <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase">Info</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {historyLoading ? (
                      <tr><td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">Memuat riwayat...</td></tr>
                   ) : movements.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-xs text-muted-foreground italic">Tidak ada data pergerakan</td></tr>
                   ) : (
                      movements.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50/30 transition-colors">
                           <td className="p-3">
                              <p className="text-[11px] font-bold text-foreground">{new Date(m.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</p>
                              <p className="text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
                           </td>
                           <td className="p-3">
                              <p className="text-xs font-bold text-foreground">{m.product?.name || 'Produk Dihapus'}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">KODE: {m.product?.kode || '-'}</p>
                           </td>
                           <td className="p-3 text-center">
                              <span className={`text-xs font-black ${m.qty < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {m.qty > 0 ? '+' : ''}{m.qty}
                              </span>
                           </td>
                           <td className="p-3">
                              <span className="text-[9px] font-black border border-border bg-accent text-muted-foreground px-1.5 py-0.5 rounded uppercase">{m.sumber}</span>
                           </td>
                           <td className="p-3 text-[10px] text-muted-foreground italic italic max-w-xs truncate">{m.keterangan || '-'}</td>
                        </tr>
                      ))
                   )}
                 </tbody>
               </table>
             </div>

             {/* Mobile Card List for History */}
             <div className="space-y-3 md:hidden">
               {historyLoading ? (
                 <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border">Memuat riwayat...</div>
               ) : movements.length === 0 ? (
                 <div className="p-12 text-center text-xs text-muted-foreground italic bg-card rounded-xl border border-border">Tidak ada data pergerakan</div>
               ) : (
                 movements.map(m => (
                   <div key={m.id} className="bg-card rounded-xl shadow-sm border border-border p-4 space-y-2">
                     <div className="flex justify-between items-start">
                       <div>
                         <h4 className="font-bold text-xs text-foreground">{m.product?.name || 'Produk Dihapus'}</h4>
                         <p className="text-[9px] text-muted-foreground uppercase tracking-tight mt-0.5">KODE: {m.product?.kode || '-'}</p>
                       </div>
                       <span className={`text-xs font-black ${m.qty < 0 ? 'text-red-500 bg-red-50 border border-red-100' : 'text-emerald-500 bg-emerald-50 border border-emerald-100'} px-2 py-0.5 rounded-full`}>
                         {m.qty > 0 ? '+' : ''}{m.qty}
                       </span>
                     </div>
                     
                     <div className="border-t border-border pt-2.5 flex justify-between items-center text-[11px] text-muted-foreground">
                       <div className="flex flex-col">
                         <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Waktu</span>
                         <span className="font-medium">
                           {new Date(m.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})} - {new Date(m.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                         </span>
                       </div>
                       
                       <div className="flex flex-col items-end">
                         <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Sumber</span>
                         <span className="text-[9px] font-black border border-border bg-accent text-muted-foreground px-1.5 py-0.5 rounded uppercase">{m.sumber}</span>
                       </div>
                     </div>
                     
                     {m.keterangan && (
                       <div className="bg-muted p-2 rounded-lg mt-1 text-[10px] text-muted-foreground italic">
                         {m.keterangan}
                       </div>
                     )}
                   </div>
                 ))
               )}
             </div>
             
             {historyLastPage > 1 && (
               <div className="mt-4 flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Halaman {historyPage} dari {historyLastPage}</p>
                  <div className="flex gap-2">
                     <button disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)} className="p-1.5 border rounded hover:bg-muted disabled:opacity-20"><ChevronLeft size={16}/></button>
                     <button disabled={historyPage === historyLastPage} onClick={() => setHistoryPage(p => p + 1)} className="p-1.5 border rounded hover:bg-muted disabled:opacity-20"><ChevronRight size={16}/></button>
                  </div>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
}
