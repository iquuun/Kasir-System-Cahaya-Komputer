import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Eye, CheckCircle, Download, Search, ChevronLeft, ChevronRight, 
  Trash2, Calendar, Edit2, Package, AlertCircle, CreditCard, ShoppingBag, DollarSign,
  Check, X, Minus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import api from '../api';
import { toast } from 'sonner';

interface Distributor {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  harga_beli: number;
}

interface PurchaseItem {
  product_id: number;
  qty: number;
  harga_beli: number;
  product?: Product;
}

interface Purchase {
  id: number;
  invoice: string;
  distributor_id: number;
  distributor?: Distributor;
  tanggal: string;
  total_pembelian: number;
  terbayar: number;
  status_pembayaran: 'lunas' | 'hutang';
  jatuh_tempo?: string | null;
  items?: PurchaseItem[];
}

function StatCard({ title, value, subtitle, icon: Icon, colorClass = "from-blue-600 to-blue-700" }: { title: string; value: string; subtitle: React.ReactNode; icon: any; colorClass?: string }) {
  return (
    <div className={`bg-gradient-to-br ${colorClass} rounded-xl shadow-md border-t border-white/20 p-3 md:p-4 hover:shadow-lg transition-all duration-300 group relative overflow-hidden text-white flex flex-col justify-between h-full`}>
      <div className="absolute top-0 right-0 p-2 md:p-3 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
        <Icon className="w-8 h-8 md:w-12 md:h-12" strokeWidth={1.5} />
      </div>
      <div className="relative z-10">
        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-wider opacity-85 mb-0.5 md:mb-1">{title}</p>
        <p className="text-sm md:text-xl font-black tracking-tight mb-1 truncate" title={value}>{value}</p>
      </div>
      <div className="relative z-10 mt-2 md:mt-3">
        <div className="flex items-center gap-1.5 py-0.5 md:py-1 px-1.5 md:px-2.5 bg-white/10 rounded-md md:rounded-lg w-fit backdrop-blur-sm border border-white/5 max-w-full">
           <Icon size={9} className="opacity-70 flex-shrink-0" />
           <p className="text-[8px] md:text-[9px] font-bold opacity-90 truncate">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
const formatNumber = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '';
  if (value === 0 || value === '0' || value === '') return '';
  const num = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ''), 10) : value;
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('id-ID');
};

const parseNumber = (text: string): number => {
  if (!text) return 0;
  const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

export default function PembelianTab() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    // Default: Bulan Ini (1 s/d Akhir Bulan)
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const toDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      preset: 'month',
      start: toDateString(start),
      end: toDateString(end)
    };
  });

  const applyPreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (preset === 'today') {
      // default
    } else if (preset === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (preset === 'week') {
      start.setDate(today.getDate() - 7);
    } else if (preset === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (preset === '3month') {
      start.setMonth(today.getMonth() - 3);
    } else if (preset === 'all') {
      start = new Date('2020-01-01');
    }
    
    const toDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDateRange({
      preset,
      start: toDateString(start),
      end: toDateString(end)
    });
    if (preset !== 'custom') setShowDatePicker(false);
  };
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modal 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedDetailPurchase, setSelectedDetailPurchase] = useState<Purchase | null>(null);
  const [payAmount, setPayAmount] = useState('');
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Quick Product Modal
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [currentRowIdx, setCurrentRowIdx] = useState<number | null>(null);
  const [quickProductFormData, setQuickProductFormData] = useState({
    name: '',
    category_id: '',
    harga_jual: ''
  });

  interface FormDataState {
    invoice: string;
    distributor_id: string;
    tanggal: string;
    total_pembelian: string;
    terbayar: string;
    status_pembayaran: 'lunas' | 'hutang';
    jatuh_tempo: string;
    items: {
      product_id: string;
      qty: string;
      harga_beli: string;
    }[];
  }

  const [formData, setFormData] = useState<FormDataState>({
    invoice: '',
    distributor_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    total_pembelian: '0',
    terbayar: '0',
    status_pembayaran: 'lunas',
    jatuh_tempo: '',
    items: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const handleAddCategoryQuick = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setIsSavingCategory(true);
      const res = await api.post('/categories', { name: newCategoryName });
      const newCat = res.data.data || res.data;
      setCategories(prev => [...prev, newCat]);
      setQuickProductFormData(prev => ({ ...prev, category_id: newCat.id.toString() }));
      setNewCategoryName('');
      setIsAddingCategory(false);
      toast.success(`Kategori "${newCat.name}" berhasil dibuat`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuat kategori');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handlePasteFromCatatan = () => {
    const catatan = localStorage.getItem('catatan_belanja');
    if (!catatan) {
      toast.error('Catatan belanja masih kosong');
      return;
    }
    
    const lines = catatan.split('\n');
    const newItems = [...formData.items];
    let addedCount = 0;

    lines.forEach(line => {
      const match = line.match(/^\d+\.\s*(.+?)\s*-\s*(\d+)\s*pcs.*$/);
      if (match) {
        const name = match[1].trim();
        const baseQty = parseInt(match[2], 10);
        
        let parsedItems: { name: string, qty: number }[] = [];
        
        if (name.toUpperCase().startsWith('PAKET ')) {
          const itemsStr = name.substring(6); // remove "PAKET "
          const parts = itemsStr.split('+').map(s => s.trim());
          parts.forEach(part => {
             parsedItems.push({ name: part, qty: baseQty }); // each part gets the package qty
          });
        } else {
          parsedItems.push({ name: name, qty: baseQty });
        }

        parsedItems.forEach(item => {
          // Find product by exact or case-insensitive name match
          const product = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
          
          if (product) {
            const existingIdx = newItems.findIndex(i => i.product_id === product.id.toString());
            if (existingIdx >= 0) {
              newItems[existingIdx].qty = (parseInt(newItems[existingIdx].qty) + item.qty).toString();
            } else {
              newItems.push({
                product_id: product.id.toString(),
                qty: item.qty.toString(),
                harga_beli: product.harga_beli.toString()
              });
            }
            addedCount++;
          }
        });
      }
    });

    if (addedCount > 0) {
      setFormData(prev => ({ ...prev, items: newItems }));
      toast.success(`${addedCount} produk berhasil disalin dari Catatan!`);
    } else {
      toast.warning('Tidak ada produk di Catatan yang namanya persis dengan data barang.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchasesRes, distributorsRes, productsRes, categoriesRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/distributors'),
        api.get('/products'),
        api.get('/categories')
      ]);
      setPurchases(purchasesRes.data);
      setDistributors(distributorsRes.data);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        // Date Range Filter
        const pDateStr = p.tanggal.split(' ')[0]; // YYYY-MM-DD
        const pDate = new Date(pDateStr);
        pDate.setHours(0,0,0,0);
        
        let matchesDate = true;
        if (dateRange.preset !== 'all') {
           const start = new Date(dateRange.start);
           start.setHours(0,0,0,0);
           const end = new Date(dateRange.end);
           end.setHours(23,59,59,999);
           if (pDate < start || pDate > end) matchesDate = false;
        }

        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          p.invoice?.toLowerCase().includes(searchLower) ||
          p.distributor?.name.toLowerCase().includes(searchLower);
        
        return matchesDate && matchesSearch;
      })
      .sort((a, b) => b.id - a.id);
  }, [purchases, dateRange, searchQuery]);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(start, start + itemsPerPage);
  }, [filteredPurchases, currentPage, itemsPerPage]);

  const handleOpenModal = () => {
    setIsEditMode(false);
    setEditId(null);
    setFormData({
      invoice: '',
      distributor_id: distributors.length > 0 ? distributors[0].id.toString() : '',
      tanggal: new Date().toISOString().split('T')[0],
      total_pembelian: '0',
      terbayar: '0',
      status_pembayaran: 'lunas',
      jatuh_tempo: '',
      items: [],
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const total = parseFloat(formData.total_pembelian);
      const terbayar = parseFloat(formData.terbayar);
      const payload = {
        ...formData,
        invoice: formData.invoice || undefined, // Allow backend to generate if empty
        distributor_id: parseInt(formData.distributor_id),
        total_pembelian: total,
        terbayar: terbayar,
        status_pembayaran: (terbayar >= total) ? 'lunas' : 'hutang',
        jatuh_tempo: (terbayar < total && formData.jatuh_tempo) ? formData.jatuh_tempo : undefined,
        items: formData.items
          .filter(i => i.product_id) // Filter out empty rows
          .map(i => ({
            product_id: parseInt(i.product_id),
            qty: parseInt(i.qty) || 1,
            harga_beli: parseFloat(i.harga_beli) || 0,
          }))
      };

      if (isEditMode && editId) {
        await api.put(`/purchases/${editId}`, payload);
        toast.success('Pembelian berhasil diperbarui');
      } else {
        await api.post('/purchases', payload);
        toast.success('Pembelian berhasil disimpan');
      }
      
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pembelian');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPayModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    // Suggest paying off the rest
    setPayAmount((purchase.total_pembelian - purchase.terbayar).toString());
    setIsPayModalOpen(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    try {
      setIsSubmitting(true);
      const currentTerbayar = Number(selectedPurchase.terbayar);
      const newPayment = parseFloat(payAmount);
      const totalTerbayar = currentTerbayar + newPayment;

      await api.put(`/purchases/${selectedPurchase.id}`, { 
        terbayar: totalTerbayar,
        distributor_id: selectedPurchase.distributor_id,
        tanggal: selectedPurchase.tanggal,
        total_pembelian: selectedPurchase.total_pembelian,
        invoice: selectedPurchase.invoice,
        jatuh_tempo: selectedPurchase.jatuh_tempo
      });
      setIsPayModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetailModal = (purchase: Purchase) => {
    setSelectedDetailPurchase(purchase);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setIsEditMode(true);
    setEditId(purchase.id);
    setFormData({
      invoice: purchase.invoice || '',
      distributor_id: purchase.distributor_id.toString(),
      tanggal: purchase.tanggal,
      total_pembelian: purchase.total_pembelian.toString(),
      terbayar: purchase.terbayar.toString(),
      status_pembayaran: purchase.status_pembayaran,
      jatuh_tempo: purchase.jatuh_tempo || '',
      items: (purchase.items || []).map(item => ({
        product_id: item.product_id.toString(),
        qty: item.qty.toString(),
        harga_beli: item.harga_beli.toString(),
      })),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (purchase: Purchase) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data pembelian ${purchase.invoice || ''}?`)) {
      try {
        await api.delete(`/purchases/${purchase.id}`);
        toast.success('Pembelian berhasil dihapus');
        fetchData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Gagal menghapus pembelian');
      }
    }
  };

  const handleOpenQuickProductModal = (idx: number) => {
    setCurrentRowIdx(idx);
    setQuickProductFormData({
      name: '',
      category_id: categories.length > 0 ? categories[0].id.toString() : '',
      harga_jual: ''
    });
    setIsQuickProductModalOpen(true);
  };

  const handleQuickProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductFormData.name || !quickProductFormData.category_id || currentRowIdx === null) return;

    try {
      setIsSubmitting(true);
      const purchasePrice = parseFloat(formData.items[currentRowIdx].harga_beli || '0');
      
      const payload = {
        name: quickProductFormData.name,
        category_id: parseInt(quickProductFormData.category_id),
        harga_beli: purchasePrice || 0,
        harga_jual: parseNumber(quickProductFormData.harga_jual),
        stok_saat_ini: 0 // New product starts with 0 stock, will be increased by purchase
      };

      const res = await api.post('/products', payload);
      const newProduct = res.data.data || res.data; // Backend might return { data: {id, ...} } or {id, ...}
      
      toast.success(`Produk ${quickProductFormData.name} berhasil ditambahkan!`);
      
      // Refresh products list
      const productsRes = await api.get('/products');
      setProducts(productsRes.data);

      // Auto-select for the current row
      const newItems = [...formData.items];
      newItems[currentRowIdx] = {
        ...newItems[currentRowIdx],
        product_id: newProduct.id.toString(),
        harga_beli: purchasePrice.toString()
      };
      setFormData(prev => ({ ...prev, items: newItems }));

      setIsQuickProductModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan produk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = (items: typeof formData.items) => {
    const total = items
      .filter(item => item.product_id) // Only count filled rows
      .reduce((sum, item) => sum + (parseFloat(item.harga_beli || '0') * parseInt(item.qty || '0')), 0);
    setFormData(prev => ({ ...prev, total_pembelian: total.toString() }));
  };

  const handleAddItem = () => {
    const newItem = { product_id: '', qty: '1', harga_beli: '0' };
    const newItems = [...formData.items, newItem];
    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotal(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotal(newItems);
  };

  const handleItemChange = (index: number, field: keyof typeof formData.items[0], value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-update harga_beli if product is changed
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id.toString() === value);
      if (selectedProduct) {
        newItems[index].harga_beli = selectedProduct.harga_beli.toString();
      }

      // Auto-add new empty row when filling the last item
      if (value && index === newItems.length - 1) {
        newItems.push({ product_id: '', qty: '1', harga_beli: '0' });
      }
    }

    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotal(newItems);
  };

  const exportPurchasesCSV = () => {
    const worksheetData: any[][] = [
      ["LAPORAN SELURUH DATA PEMBELIAN"],
      [],
      ["Invoice", "Distributor", "Tanggal", "Status", "Total Pembelian", "Terbayar", "Sisa Hutang"]
    ];
    
    // Use the filtered or all
    const filtered = purchases;

    filtered.forEach(p => {
      const hutang = p.total_pembelian - p.terbayar;
      worksheetData.push([
        p.invoice,
        p.distributor?.name || '-',
        p.tanggal,
        p.status_pembayaran,
        p.total_pembelian,
        p.terbayar,
        hutang
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 20 }, // Invoice
      { wch: 25 }, // Distributor
      { wch: 15 }, // Tanggal
      { wch: 20 }, // Status
      { wch: 20 }, // Total Pembelian
      { wch: 15 }, // Terbayar
      { wch: 15 }  // Sisa Hutang
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pembelian");
    
    XLSX.writeFile(workbook, `Riwayat_Pembelian.xlsx`);
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div><div className="h-5 bg-accent rounded w-40 mb-2" /><div className="h-3 bg-accent rounded w-56" /></div>
        <div className="h-9 bg-accent rounded-lg w-36" />
      </div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-3"><div className="flex gap-3"><div className="flex-1 h-9 bg-accent rounded-lg" /><div className="w-48 h-9 bg-accent rounded-lg" /></div></div>
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="h-10 bg-accent border-b border-border" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-1.5 flex gap-4"><div className="h-4 bg-accent rounded w-1/6" /><div className="h-4 bg-accent rounded w-1/4" /><div className="h-4 bg-accent rounded w-1/6" /><div className="h-4 bg-accent rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );
  if (error) return <div className="p-5 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 bg-[#3B82F6] text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:bg-[#2563EB] transition-colors"
        >
          <Plus size={14} />
          Tambah Pembelian
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <StatCard
          title="Total Nilai Pembelian"
          value={`Rp ${purchases.reduce((sum, p) => sum + Number(p.total_pembelian), 0).toLocaleString('id-ID')}`}
          subtitle="Seluruh riwayat belanja"
          icon={ShoppingBag}
          colorClass="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Sudah Lunas"
          value={purchases.filter((p) => p.status_pembayaran === 'lunas').length.toString()}
          subtitle="Invoice berhasil dibayar"
          icon={CheckCircle}
          colorClass="from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="Invoice Hutang"
          value={purchases.filter((p) => p.status_pembayaran === 'hutang').length.toString()}
          subtitle="Belum lunas sepenuhnya"
          icon={AlertCircle}
          colorClass="from-orange-500 to-orange-600"
        />
        <StatCard
          title="Total Sisa Hutang"
          value={`Rp ${purchases.reduce((sum, p) => sum + (Number(p.total_pembelian) - Number(p.terbayar)), 0).toLocaleString('id-ID')}`}
          subtitle="Kewajiban pembayaran aktif"
          icon={CreditCard}
          colorClass="from-rose-500 to-rose-600"
        />
      </div>

      {/* Filter */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row gap-3 w-full flex-1">
          <div className="flex items-center bg-muted border border-border rounded-lg px-2 w-full sm:max-w-md focus-within:ring-1 focus-within:ring-[#3B82F6] focus-within:border-[#3B82F6] transition-all">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input 
              type="text" 
              placeholder="Cari invoice atau distributor..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-xs px-2 py-2 outline-none font-medium" 
            />
          </div>
          
          <div className="relative w-full sm:w-auto z-20">
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-[11px] font-bold text-foreground hover:bg-muted focus:ring-2 focus:ring-blue-500 w-full sm:w-[265px] justify-between whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">📅</span>
                {dateRange.preset === 'all' ? 'Semua Waktu' : 
                 `${dateRange.start} s/d ${dateRange.end}`}
              </div>
              <ChevronRight size={14} className={`text-muted-foreground transition-transform ${showDatePicker ? 'rotate-90' : ''}`} />
            </button>

            {showDatePicker && (
              <div className="absolute top-11 right-0 w-[320px] md:w-[450px] bg-card rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-200">
                {/* Presets Sidebar */}
                <div className="w-full md:w-40 bg-muted border-b md:border-b-0 md:border-r border-border flex flex-col p-2 gap-1 relative z-10">
                  {[
                    { id: 'today', label: 'Hari Ini' },
                    { id: 'yesterday', label: 'Kemarin' },
                    { id: 'week', label: '1 Minggu Terakhir' },
                    { id: 'month', label: 'Bulan Ini' },
                    { id: '3month', label: '3 Bulan Terakhir' },
                    { id: 'all', label: 'Semua Waktu' },
                    { id: 'custom', label: 'Pilih Sendiri' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${dateRange.preset === p.id ? 'bg-[#3B82F6] text-white shadow-md' : 'text-muted-foreground hover:bg-white'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                
                {/* Custom Date Picker Inputs */}
                <div className="p-4 flex-1 bg-card relative z-10">
                  <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-wider">Rentang Waktu</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">Mulai Tanggal</label>
                      <input 
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value, preset: 'custom' })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">Sampai Tanggal</label>
                      <input 
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value, preset: 'custom' })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      />
                    </div>
                    <button 
                      onClick={() => setShowDatePicker(false)}
                      className="w-full mt-2 py-2 bg-[#3B82F6] text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      Terapkan / Tutup
                    </button>
                  </div>
                </div>
                
                {/* Click outside Overlay (Invisible) */}
                <div 
                  className="fixed inset-0 z-0 bg-transparent" 
                  onClick={() => setShowDatePicker(false)}
                  style={{zIndex: -1}}
                />
              </div>
            )}
          </div>
        </div>
        <button
          onClick={exportPurchasesCSV}
          className="px-4 py-2 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Download size={14} />
          Export Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Invoice</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Distributor</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tanggal</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Total</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Sisa Hutang</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Jatuh Tempo</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Pencarian pembelian tidak ditemukan
                  </td>
                </tr>
              ) : (
                currentItems.map((purchase) => {
                  const total = Number(purchase.total_pembelian);
                const terbayar = Number(purchase.terbayar);
                const sisa = total - terbayar;
                return (
                  <tr key={purchase.id} className="hover:bg-blue-50/50 transition-colors border-b border-border last:border-0">
                    <td className="px-3 py-2 text-xs">
                      <p className="font-bold text-foreground">{purchase.invoice || '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground">{purchase.distributor?.name || '-'}</td>
                    <td className="px-3 py-2 text-xs text-foreground">
                      {new Date(purchase.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-medium text-foreground">
                      Rp {total.toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {sisa > 0 ? (
                        <span className="text-red-600 font-medium">
                          Rp {sisa.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                      {(sisa > 0 && purchase.jatuh_tempo) ? new Date(purchase.jatuh_tempo).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${purchase.status_pembayaran === 'lunas'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {purchase.status_pembayaran === 'lunas' ? 'Lunas' : 'Hutang'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(purchase)}
                          title="Edit Pembelian"
                          className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDetailModal(purchase)}
                          title="Lihat Detail Barang"
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(purchase)}
                          title="Hapus Pembelian"
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden divide-y divide-gray-100 bg-card">
          {currentItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-xs">Pencarian data tidak ditemukan.</div>
          ) : currentItems.map((purchase) => {
            const total = Number(purchase.total_pembelian);
            const terbayar = Number(purchase.terbayar);
            const sisa = total - terbayar;
            return (
              <div key={purchase.id} className="p-2.5 space-y-1.5 hover:bg-muted transition-colors">
                {/* Row 1: Invoice & Date */}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground text-xs">{purchase.invoice || '-'}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{new Date(purchase.tanggal).toLocaleDateString('id-ID')}</span>
                </div>

                {/* Row 2: Distributor */}
                <div className="text-[11px] text-foreground">
                  <span className="text-muted-foreground">Distributor: </span>
                  <span className="font-semibold text-foreground">{purchase.distributor?.name || '-'}</span>
                </div>

                {/* Row 3: Financial Details */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 bg-muted p-1.5 rounded text-[10px] text-foreground">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-gray-950">Rp {total.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sisa Hutang:</span>
                    {sisa > 0 ? (
                      <span className="text-red-600 font-bold">Rp {sisa.toLocaleString('id-ID')}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                  {sisa > 0 && purchase.jatuh_tempo && (
                    <div className="flex justify-between col-span-2 border-t border-gray-200/50 pt-0.5 mt-0.5">
                      <span className="text-muted-foreground">Jatuh Tempo:</span>
                      <span className="font-medium text-amber-600">{new Date(purchase.jatuh_tempo).toLocaleDateString('id-ID')}</span>
                    </div>
                  )}
                </div>

                {/* Row 4: Status and Action Buttons */}
                <div className="flex justify-between items-center pt-1.5 border-t border-border">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${purchase.status_pembayaran === 'lunas'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {purchase.status_pembayaran === 'lunas' ? 'Lunas' : 'Hutang'}
                  </span>

                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(purchase)} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Edit Pembelian">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleOpenDetailModal(purchase)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Lihat Detail Barang">
                      <Eye size={13} />
                    </button>
                    <button onClick={() => handleDelete(purchase)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Hapus Pembelian">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-border px-3 py-2 flex items-center justify-between bg-muted/50">
          <p className="text-[10px] text-muted-foreground font-medium">
            Menampilkan {currentItems.length} dari {filteredPurchases.length} riwayat pembelian
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} className="text-muted-foreground" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="text-muted-foreground text-[10px] px-0.5">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[24px] h-6 text-[11px] font-bold rounded transition-colors ${
                      currentPage === p
                        ? 'bg-[#3B82F6] text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))
            }
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-end md:items-center justify-center md:p-3 z-50">
          <div className="bg-card md:rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-4xl overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh]">
            {/* Header - sticky on mobile */}
            <div className="p-3 md:p-4 border-b border-border shrink-0 flex items-center gap-3 bg-card sticky top-0 z-20">
              <button
                type="button"
                onClick={handleCloseModal}
                className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-gray-800 hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-base md:text-lg font-semibold text-foreground">
                {isEditMode ? 'Edit Pembelian' : 'Tambah Pembelian'}
              </h3>
            </div>

            {/* Scrollable Content */}
            <div className="px-3 py-1.5 md:p-4 overflow-y-auto flex-1 overscroll-contain">
              <form id="purchaseForm" onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                {/* Invoice & Tanggal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      No. Invoice (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.invoice}
                      onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                      placeholder="Dibebaskan ke sistem jika kosong"
                      className="w-full px-3 py-2.5 md:py-1.5 border border-border rounded-lg focus:ring-1 text-sm md:text-xs font-medium bg-muted focus:ring-[#3B82F6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      className="w-full px-3 py-2.5 md:py-1.5 border border-border rounded-lg focus:ring-1 text-sm md:text-xs font-medium bg-muted focus:ring-[#3B82F6] outline-none"
                    />
                  </div>
                </div>

                {/* Distributor */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Distributor</label>
                  <select
                    required
                    value={formData.distributor_id}
                    onChange={(e) => setFormData({ ...formData, distributor_id: e.target.value })}
                    className="w-full px-3 py-2.5 md:py-1.5 border border-border rounded-lg focus:ring-1 text-sm md:text-xs font-medium bg-muted focus:ring-[#3B82F6] outline-none"
                  >
                    <option value="" disabled>Pilih Distributor</option>
                    {distributors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Items Input */}
                <div className="border border-border rounded-lg p-2.5 md:p-3 bg-muted overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <label className="block text-xs font-medium text-foreground">Barang yang dibeli</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handlePasteFromCatatan}
                        className="text-[11px] flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 active:scale-95 transition-all font-bold"
                        title="Salin list produk dari tab Catatan"
                      >
                        <Package size={14} /> Ambil dr Catatan
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="text-[11px] flex items-center gap-1 bg-card border border-border px-2.5 py-1.5 rounded-lg hover:bg-accent active:scale-95 transition-all font-medium"
                      >
                        <Plus size={14} /> Tambah
                      </button>
                    </div>
                  </div>

                  {formData.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-1.5">Tidak ada barang spesifik dicatat (Hanya mencatat total).</p>
                  ) : (
                    <>
                      {/* Desktop View - table layout */}
                      <div className="hidden md:block bg-card border border-border rounded max-h-[400px] min-h-[120px] overflow-y-auto">
                        <div className="min-w-[600px]">
                          <div className="flex gap-2 items-center bg-muted/80 px-2 py-1.5 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
                            <div className="w-5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">No</div>
                            <div className="flex-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Produk</div>
                            <div className="w-24 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Qty</div>
                            <div className="w-28 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Harga Satuan</div>
                            <div className="w-6"></div>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {formData.items.map((item, idx) => (
                              <div key={idx} className="flex gap-2 items-center p-1.5 hover:bg-muted/50 transition-colors">
                                <div className="w-5 text-center">
                                  <span className="text-[10px] font-bold text-muted-foreground">{idx + 1}.</span>
                                </div>
                                <div className="flex-1 flex gap-1 items-center">
                                  <Select
                                    className="text-xs flex-1"
                                    options={[...products].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ value: p.id.toString(), label: p.name }))}
                                    value={
                                      item.product_id
                                        ? {
                                          value: item.product_id.toString(),
                                          label: products.find(p => p.id.toString() === item.product_id.toString())?.name || ''
                                        }
                                        : null
                                    }
                                    onChange={(selectedOption) => {
                                      if (selectedOption) {
                                        handleItemChange(idx, 'product_id', selectedOption.value);
                                      }
                                    }}
                                    placeholder="Cari..."
                                    isSearchable
                                    menuPortalTarget={document.body}
                                    styles={{
                                      control: (base) => ({ ...base, minHeight: '28px', height: '28px', backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }),
                                      valueContainer: (base) => ({ ...base, padding: '0 6px' }),
                                      singleValue: (base) => ({ ...base, color: 'var(--foreground)' }),
                                      input: (base) => ({ ...base, margin: 0, padding: 0, color: 'var(--foreground)' }),
                                      menu: (base) => ({ ...base, backgroundColor: 'var(--card)' }),
                                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                      option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? 'var(--accent)' : 'transparent', color: state.isFocused ? 'var(--primary)' : 'var(--foreground)', cursor: 'pointer', fontSize: '11px', padding: '6px 8px' }),
                                      indicatorsContainer: (base) => ({ ...base, height: '28px' })
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuickProductModal(idx)}
                                    title="Tambah Produk Baru"
                                    className="h-[28px] w-7 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 transition-colors shrink-0"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                                <div className="w-24 flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(idx, 'qty', Math.max(1, parseNumber(item.qty) - 1).toString())}
                                    className="w-7 h-[28px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-l flex items-center justify-center transition-colors active:scale-95 shrink-0"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="text"
                                    value={formatNumber(item.qty)}
                                    onChange={(e) => handleItemChange(idx, 'qty', parseNumber(e.target.value).toString())}
                                    className="w-10 px-1 py-1 border-y border-border focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs h-[28px] text-center"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(idx, 'qty', (parseNumber(item.qty) + 1).toString())}
                                    className="w-7 h-[28px] bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded-r flex items-center justify-center transition-colors active:scale-95 shrink-0"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                                <div className="w-28 shrink-0">
                                  <input
                                    type="text"
                                    value={formatNumber(item.harga_beli)}
                                    onChange={(e) => handleItemChange(idx, 'harga_beli', parseNumber(e.target.value).toString())}
                                    className="w-full px-2 py-1 border border-border rounded focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs h-[28px] text-right"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="w-6 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                                  title="Hapus"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile View - compact card layout */}
                      <div className="block md:hidden space-y-1.5">
                        {formData.items.map((item, idx) => (
                          <div key={idx} className="bg-card border border-border rounded-lg p-2 space-y-1.5">
                            {/* Row 1: badge + product selector + delete */}
                            <div className="flex gap-1 items-center">
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">{idx + 1}</span>
                              <Select
                                className="text-xs flex-1"
                                options={[...products].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ value: p.id.toString(), label: p.name }))}
                                value={
                                  item.product_id
                                    ? {
                                      value: item.product_id.toString(),
                                      label: products.find(p => p.id.toString() === item.product_id.toString())?.name || ''
                                    }
                                    : null
                                }
                                onChange={(selectedOption) => {
                                  if (selectedOption) {
                                    handleItemChange(idx, 'product_id', selectedOption.value);
                                  }
                                }}
                                placeholder="Pilih Produk..."
                                isSearchable
                                menuPortalTarget={document.body}
                                styles={{
                                  control: (base) => ({ ...base, minHeight: '32px', borderRadius: '6px', borderColor: 'var(--border)', backgroundColor: 'var(--card)', fontSize: '12px', color: 'var(--foreground)' }),
                                  valueContainer: (base) => ({ ...base, padding: '0 6px' }),
                                  input: (base) => ({ ...base, margin: 0, padding: 0, fontSize: '12px', color: 'var(--foreground)' }),
                                  singleValue: (base) => ({ ...base, fontSize: '12px', color: 'var(--foreground)' }),
                                  menu: (base) => ({ ...base, backgroundColor: 'var(--card)' }),
                                  option: (base, state) => ({ ...base, fontSize: '12px', padding: '8px 10px', backgroundColor: state.isFocused ? 'var(--accent)' : 'transparent', color: state.isFocused ? 'var(--primary)' : 'var(--foreground)', cursor: 'pointer' }),
                                  indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                  placeholder: (base) => ({ ...base, fontSize: '12px' }),
                                  dropdownIndicator: (base) => ({ ...base, padding: '4px' })
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenQuickProductModal(idx)}
                                title="Tambah Produk Baru"
                                className="h-[32px] w-[32px] flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-200 rounded-md shrink-0 active:scale-95"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="h-[32px] w-[32px] flex items-center justify-center text-red-500 bg-red-50 border border-red-200 rounded-md shrink-0 active:scale-95"
                                title="Hapus"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            
                            {/* Row 2: Qty + Harga + Subtotal in one row */}
                            <div className="flex gap-1.5 items-end">
                              <div className="flex-1">
                                <label className="block text-[9px] text-muted-foreground mb-0.5 font-semibold uppercase">Qty</label>
                                <div className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(idx, 'qty', Math.max(1, parseNumber(item.qty) - 1).toString())}
                                    className="w-7 h-[30px] bg-red-50 text-red-600 border border-red-200 rounded-l flex items-center justify-center active:scale-95 shrink-0"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="text"
                                    value={formatNumber(item.qty)}
                                    onChange={(e) => handleItemChange(idx, 'qty', parseNumber(e.target.value).toString())}
                                    className="w-full px-1 border-y border-border outline-none text-xs h-[30px] text-center font-semibold"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(idx, 'qty', (parseNumber(item.qty) + 1).toString())}
                                    className="w-7 h-[30px] bg-green-50 text-green-600 border border-green-200 rounded-r flex items-center justify-center active:scale-95 shrink-0"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </div>
                              <div className="flex-[1.3]">
                                <label className="block text-[9px] text-muted-foreground mb-0.5 font-semibold uppercase">Harga (Rp)</label>
                                <input
                                  type="text"
                                  value={formatNumber(item.harga_beli)}
                                  onChange={(e) => handleItemChange(idx, 'harga_beli', parseNumber(e.target.value).toString())}
                                  className="w-full px-2 border border-border rounded outline-none text-xs h-[30px] text-right font-semibold"
                                />
                              </div>
                              <div className="shrink-0 text-right pb-0.5">
                                <span className="text-[9px] text-muted-foreground block">Subtotal</span>
                                <span className="text-[11px] font-bold text-blue-600">Rp {(parseNumber(item.qty) * parseNumber(item.harga_beli)).toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Total & Terbayar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Total Pembelian (Rp)</label>
                    <input
                      type="text"
                      value={formatNumber(formData.total_pembelian)}
                      onChange={(e) => setFormData({ ...formData, total_pembelian: parseNumber(e.target.value).toString() })}
                      className="w-full px-3 py-2.5 md:py-1.5 border border-border rounded-lg focus:ring-1 text-sm md:text-xs font-medium bg-muted focus:ring-[#3B82F6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Jumlah Terbayar (Rp)</label>
                    <input
                      type="text"
                      value={formatNumber(formData.terbayar)}
                      onChange={(e) => setFormData({ ...formData, terbayar: parseNumber(e.target.value).toString() })}
                      className="w-full px-3 py-2.5 md:py-1.5 border border-border rounded-lg focus:ring-1 text-sm md:text-xs font-medium bg-muted focus:ring-[#3B82F6] outline-none"
                    />
                  </div>
                </div>
                {Number(formData.total_pembelian) > Number(formData.terbayar) && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 space-y-3">
                    <p className="text-xs text-red-600 font-medium">
                      Sisa hutang: Rp {(Number(formData.total_pembelian) - Number(formData.terbayar)).toLocaleString('id-ID')}
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-red-700 mb-1">Tanggal Jatuh Tempo</label>
                      <input
                        type="date"
                        required
                        value={formData.jatuh_tempo}
                        onChange={(e) => setFormData({ ...formData, jatuh_tempo: e.target.value })}
                        className="w-full px-3 py-2.5 md:py-1.5 border border-red-200 rounded-lg focus:ring-1 text-sm md:text-xs font-medium bg-card focus:ring-red-400 outline-none text-red-800"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer - sticky on mobile */}
            <div className="p-3 md:p-4 border-t border-border flex justify-end gap-3 shrink-0 bg-card sticky bottom-0 z-20">
              <button
                type="button"
                onClick={handleCloseModal}
                className="hidden md:block px-3 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="purchaseForm"
                disabled={isSubmitting}
                className="flex-1 md:flex-none px-4 py-2.5 md:py-2 bg-[#3B82F6] text-white rounded-xl md:rounded-lg hover:bg-[#2563EB] disabled:opacity-50 font-semibold text-sm active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {isPayModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-end md:items-center justify-center md:p-3 z-50">
          <div className="bg-card md:rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-sm overflow-hidden h-full md:h-auto flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0 sticky top-0 bg-card z-20">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsPayModalOpen(false)} className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:bg-accent rounded-lg"><ChevronLeft size={20}/></button>
                <h3 className="text-lg font-semibold text-foreground">Bayar Cicilan Hutang</h3>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="hidden md:block text-muted-foreground hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handlePay} className="p-4 space-y-4 flex-1 overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Sisa hutang untuk Invoice <b>{selectedPurchase.invoice}</b> adalah Rp {(Number(selectedPurchase.total_pembelian) - Number(selectedPurchase.terbayar)).toLocaleString('id-ID')}
              </p>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Nominal Pembayaran (Rp)</label>
                <input
                  type="text"
                  required
                  value={formatNumber(payAmount)}
                  onChange={(e) => {
                    const parsed = parseNumber(e.target.value);
                    const max = Number(selectedPurchase.total_pembelian) - Number(selectedPurchase.terbayar);
                    setPayAmount(Math.min(parsed, max).toString());
                  }}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg focus:ring-1 text-xs font-medium bg-muted focus:ring-green-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-card mt-auto md:mt-0 border-t border-border md:border-none">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="hidden md:block px-3 py-2 text-muted-foreground hover:bg-accent rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 md:flex-none px-3 py-1.5 bg-green-600 text-white rounded-xl md:rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold active:scale-[0.98]"
                >
                  {isSubmitting ? 'Memproses...' : 'Proses Bayar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Detail Modal */}
      {isDetailModalOpen && selectedDetailPurchase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-end md:items-center justify-center md:p-3 z-50">
          <div className="bg-card md:rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-2xl overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center shrink-0 sticky top-0 bg-card z-20">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsDetailModalOpen(false)} className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:bg-accent rounded-lg"><ChevronLeft size={20}/></button>
                <h3 className="text-lg font-semibold text-foreground truncate">
                  Detail Invoice: {selectedDetailPurchase.invoice || '-'}
                </h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="hidden md:block text-muted-foreground hover:text-gray-600">
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Distributor</p>
                  <p className="font-bold text-xs text-foreground">{selectedDetailPurchase.distributor?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal</p>
                  <p className="font-bold text-xs text-foreground">{new Date(selectedDetailPurchase.tanggal).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              <h4 className="font-medium text-foreground mb-3 border-b pb-2">Daftar Barang Dibeli</h4>

              {!selectedDetailPurchase.items || selectedDetailPurchase.items.length === 0 ? (
                <p className="text-muted-foreground italic text-xs text-center py-1.5 bg-muted rounded">
                  Tidak ada rincian barang untuk transaksi ini. (Hanya nominal total).
                </p>
              ) : (
                <div className="border border-border rounded overflow-x-auto">
                  <div className="min-w-[500px]">
                    <table className="w-full text-xs">
                      <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="text-left px-3 py-2 text-foreground font-medium">Produk</th>
                        <th className="text-right px-3 py-2 text-foreground font-medium w-24">Qty</th>
                        <th className="text-right px-3 py-2 text-foreground font-medium w-32">Harga Beli</th>
                        <th className="text-right px-3 py-2 text-foreground font-medium w-32">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedDetailPurchase.items.map((item, idx) => {
                        const subtotal = Number(item.qty) * Number(item.harga_beli);
                        return (
                          <tr key={idx} className="hover:bg-muted">
                            <td className="px-3 py-2">{item.product?.name || `Product ID: ${item.product_id}`}</td>
                            <td className="px-3 py-2 text-right">{item.qty}</td>
                            <td className="px-3 py-2 text-right">Rp {Number(item.harga_beli).toLocaleString('id-ID')}</td>
                            <td className="px-3 py-2 text-right font-medium">Rp {subtotal.toLocaleString('id-ID')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted border-t border-border font-semibold">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right">Total Keseluruhan</td>
                        <td className="px-3 py-2 text-right text-[#3B82F6]">
                          Rp {Number(selectedDetailPurchase.total_pembelian).toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right">Terbayar</td>
                        <td className="px-3 py-2 text-right text-green-600">
                          Rp {Number(selectedDetailPurchase.terbayar).toLocaleString('id-ID')}
                        </td>
                      </tr>
                      {Number(selectedDetailPurchase.total_pembelian) > Number(selectedDetailPurchase.terbayar) && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-red-600">Sisa Hutang</td>
                          <td className="px-3 py-2 text-right text-red-600">
                            Rp {(Number(selectedDetailPurchase.total_pembelian) - Number(selectedDetailPurchase.terbayar)).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-border shrink-0 flex justify-end sticky bottom-0 bg-card z-20">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full md:w-auto px-4 py-2.5 md:py-2 bg-accent text-foreground hover:bg-accent rounded-xl md:rounded-lg transition-colors font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Add Product Modal */}
      {isQuickProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-end md:items-center justify-center md:p-3 z-[60]">
          <div className="bg-card md:rounded-2xl shadow-2xl modal-content w-full max-w-md overflow-hidden flex flex-col h-full md:h-auto">
            <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-20">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsQuickProductModalOpen(false)}
                  className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:bg-accent rounded-lg"
                >
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-sm font-bold text-foreground">Tambah Produk Cepat</h3>
              </div>
              <button 
                onClick={() => setIsQuickProductModalOpen(false)}
                className="hidden md:block text-muted-foreground hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleQuickProductSubmit} className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-widest">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: HDD External 1TB..."
                  value={quickProductFormData.name}
                  onChange={(e) => setQuickProductFormData({ ...quickProductFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs font-medium bg-muted"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-widest">
                  Kategori Produk
                </label>
                <div className="flex gap-2">
                  {isAddingCategory ? (
                    <div className="flex-1 flex gap-1 animate-in slide-in-from-right-2 duration-200">
                      <input 
                        type="text"
                        autoFocus
                        placeholder="Nama kategori..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategoryQuick())}
                        className="flex-1 px-3 py-2 border border-blue-400 rounded-lg text-xs outline-none bg-blue-50/50"
                      />
                      <button 
                        type="button"
                        onClick={handleAddCategoryQuick}
                        disabled={isSavingCategory}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <select
                        required
                        value={quickProductFormData.category_id}
                        onChange={(e) => setQuickProductFormData({ ...quickProductFormData, category_id: e.target.value })}
                        className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs font-medium bg-muted"
                      >
                        <option value="" disabled>Pilih Kategori</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
                        title="Tambah Kategori Baru"
                      >
                        <Plus size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-widest">
                  Harga Jual
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Rp 0"
                  value={quickProductFormData.harga_jual}
                  onChange={(e) => setQuickProductFormData({ ...quickProductFormData, harga_jual: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs font-bold text-blue-600 bg-blue-50/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 sticky bottom-0 bg-card mt-auto md:mt-0 border-t border-border md:border-t-gray-50 md:pt-4">
                <button
                  type="button"
                  onClick={() => setIsQuickProductModalOpen(false)}
                  className="hidden md:block px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg text-xs font-bold uppercase tracking-wider"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 md:flex-none px-4 py-1.5 bg-[#3B82F6] text-white rounded-xl md:rounded-lg hover:bg-[#2563EB] disabled:opacity-50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isSubmitting ? 'Memproses...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
