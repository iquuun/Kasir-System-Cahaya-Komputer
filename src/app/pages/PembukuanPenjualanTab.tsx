import { useState, useEffect, useMemo } from 'react';
import { Edit2, CheckCircle, Save, X, Search, ChevronLeft, ChevronRight, ShoppingCart, DollarSign, TrendingUp, Wallet, ArrowDown, ArrowUp } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Sale {
  id: number;
  tanggal: string;
  invoice: string;
  channel: string;
  total_penjualan: number;
  nama_barang_manual: string | null;
  username_pembeli: string | null;
  harga_modal_manual: number | null;
  masuk_dp: number | null;
  keluar_tf: number | null;
  status_pencairan: 'belum' | 'lunas';
  is_verified: boolean;
  items: Array<{ qty: number }>;
  no_pesanan?: string | null;
  no_resi?: string | null;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  className?: string;
  colorClass?: string;
  iconBgClass?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, colorClass = "from-blue-600 to-blue-700" }: { title: string; value: string; subtitle: string; icon: React.ElementType; colorClass?: string }) {
  return (
    <div className={`bg-gradient-to-br ${colorClass} rounded-xl md:rounded-2xl shadow-md border-t border-white/20 p-3.5 md:p-5 hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden text-white`}>
      <div className="absolute top-0 right-0 p-3 md:p-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500">
        <Icon className="w-10 h-10 md:w-16 md:h-16" strokeWidth={1.5} />
      </div>
      <div className="relative z-10">
        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] opacity-80 mb-0.5 md:mb-1">{title}</p>
        <p className="text-sm md:text-2xl font-black tracking-tight mb-1.5 md:mb-2">{value}</p>
        <div className="flex items-center gap-1.5 py-0.5 md:py-1 px-1.5 md:px-2.5 bg-white/10 rounded-md md:rounded-lg w-fit backdrop-blur-sm border border-white/5">
           <Icon size={10} className="opacity-70" />
           <p className="text-[8px] md:text-[10px] font-bold opacity-90">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function PembukuanPenjualanTab() {
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

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit mode tracking
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    nama_barang_manual: '',
    username_pembeli: '',
    harga_modal_manual: 0,
    masuk_dp: 0,
    keluar_tf: 0
  });
  const [saving, setSaving] = useState(false);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
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
      preset: 'month', // today, yesterday, week, month, 3month, all, custom
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
      // Bulan Ini (1 s/d Akhir Bulan)
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // New Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'lunas' | 'belum'>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // New Local Checkbox State (Not saved to DB)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange]);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (err) {
      toast.error('Gagal memuat data penjualan');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setEditForm({
      nama_barang_manual: sale.nama_barang_manual || '',
      username_pembeli: sale.username_pembeli || '',
      harga_modal_manual: sale.harga_modal_manual || 0,
      masuk_dp: sale.masuk_dp || 0,
      keluar_tf: sale.keluar_tf || 0
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    try {
      setSaving(true);
      const masukDP = Number(editForm.masuk_dp);
      const keluarTF = Number(editForm.keluar_tf);
      const isLunas = (masukDP > 0 && keluarTF >= masukDP) ? 'lunas' : 'belum';
      
      const payload = {
        ...editForm,
        status_pencairan: isLunas
      };

      await api.put(`/sales/${id}`, payload);
      toast.success('Pembukuan berhasil diperbarui');
      setEditingId(null);
      fetchSales();
    } catch (err) {
      toast.error('Gagal menyimpan pembukuan');
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = (id: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedItems(newChecked);
  };

  // Filtering Logic
  const filteredSales = useMemo(() => {
    let result = sales.filter(s => {
      // Dynamic Date Range Filter
      const saleDateStr = s.tanggal.split(' ')[0]; // YYYY-MM-DD
      const saleDate = new Date(saleDateStr);
      saleDate.setHours(0,0,0,0);
      
      if (dateRange.preset !== 'all') {
         const start = new Date(dateRange.start);
         start.setHours(0,0,0,0);
         const end = new Date(dateRange.end);
         end.setHours(23,59,59,999);
         if (saleDate < start || saleDate > end) return false;
      }

      // Search Filter
      const search = searchTerm.toLowerCase();
      if (search) {
        const matchesSearch = (
          s.invoice.toLowerCase().includes(search) ||
          (s.nama_barang_manual || '').toLowerCase().includes(search) ||
          (s.username_pembeli || '').toLowerCase().includes(search) ||
          (s.no_pesanan || '').toLowerCase().includes(search) ||
          (s.no_resi || '').toLowerCase().includes(search) ||
          s.channel.toLowerCase().includes(search)
        );
        if (!matchesSearch) return false;
      }

      // Status Filter
      if (filterStatus !== 'all') {
        const isLunas = (Number(s.masuk_dp) > 0 && Number(s.keluar_tf) >= Number(s.masuk_dp));
        if (filterStatus === 'lunas' && !isLunas) return false;
        if (filterStatus === 'belum' && isLunas) return false;
      }

      // Channel Filter
      if (filterChannel !== 'all' && s.channel !== filterChannel) return false;

      return true;
    });

    result.sort((a, b) => {
      const valA = new Date(a.tanggal).getTime();
      const valB = new Date(b.tanggal).getTime();
      if (sortOrder === 'desc') {
        return valB - valA || b.id - a.id;
      }
      return valA - valB || a.id - b.id;
    });

    return result;
  }, [sales, searchTerm, dateRange, filterStatus, filterChannel, sortOrder]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  // Calculations for Stats (Based on filtered data)
  const totalOmzet = useMemo(() => filteredSales.reduce((sum, s) => sum + Number(s.total_penjualan), 0), [filteredSales]);
  const totalNet = useMemo(() => filteredSales.reduce((sum, s) => sum + Number(s.masuk_dp || 0), 0), [filteredSales]);
  const totalHpp = useMemo(() => filteredSales.reduce((sum, s) => sum + Number(s.harga_modal_manual || 0), 0), [filteredSales]);
  const totalAdm = useMemo(() => filteredSales.reduce((sum, s) => {
    if (s.channel !== 'UMUM' && Number(s.masuk_dp) > 0) {
      return sum + (Number(s.total_penjualan) - Number(s.masuk_dp));
    }
    return sum;
  }, 0), [filteredSales]);
  
  const totalLabaBersih = totalNet - totalHpp; // Margin is now Sales - HPP - ADM which is equal to Net - HPP if Net = Sales - ADM
  const totalHutangMarket = useMemo(() => {
    return filteredSales
      .filter(s => {
        const isLunas = (Number(s.masuk_dp) > 0 && Number(s.keluar_tf) >= Number(s.masuk_dp));
        return !isLunas && Number(s.masuk_dp) > 0;
      })
      .reduce((sum, s) => sum + (Number(s.masuk_dp) - Number(s.keluar_tf || 0)), 0);
  }, [filteredSales]);

  const totalPendapatanHariIni = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sales
      .filter(s => s.tanggal.startsWith(today))
      .reduce((sum, s) => sum + Number(s.total_penjualan), 0);
  }, [sales]);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-card rounded-xl shadow-sm border border-border p-3"><div className="flex gap-3"><div className="h-9 bg-accent rounded-lg w-24" /><div className="h-9 bg-accent rounded-lg w-36" /></div></div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">{[...Array(5)].map((_, i) => (<div key={i} className="bg-card rounded-xl shadow-sm border border-border p-3"><div className="h-3 bg-accent rounded w-20 mb-2" /><div className="h-6 bg-accent rounded w-28" /></div>))}</div>
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="h-10 bg-accent border-b border-border" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-1.5 flex gap-4"><div className="h-4 bg-accent rounded w-1/6" /><div className="h-4 bg-accent rounded w-1/4" /><div className="h-4 bg-accent rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">


      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
        <StatCard
          title="Total Omzet (Gross)"
          value={`Rp ${totalOmzet.toLocaleString('id-ID')}`}
          subtitle="Total nilai penjualan kotor"
          icon={TrendingUp}
          colorClass="from-blue-600 to-blue-700"
        />
        <StatCard
          title="Total Harga Modal (HPP)"
          value={`Rp ${totalHpp.toLocaleString('id-ID')}`}
          subtitle="Modal stok barang terjual"
          icon={ShoppingCart}
          colorClass="from-slate-600 to-slate-700"
        />
        <StatCard
          title="Biaya ADM Market"
          value={`Rp ${totalAdm.toLocaleString('id-ID')}`}
          subtitle="Total potongan marketplace"
          icon={DollarSign}
          colorClass="from-rose-600 to-rose-700"
        />
        <StatCard
          title="Laba Bersih (Profit)"
          value={`Rp ${totalLabaBersih.toLocaleString('id-ID')}`}
          subtitle={`Margin keuntungan (${((totalLabaBersih / (totalOmzet || 1)) * 100).toFixed(1)}%)`}
          icon={TrendingUp}
          colorClass="from-emerald-600 to-emerald-700"
        />
        <StatCard
          title="Hutang Market (Saldo)"
          value={`Rp ${totalHutangMarket.toLocaleString('id-ID')}`}
          subtitle="Dana mengendap belum ditarik"
          icon={Wallet}
          colorClass="from-orange-600 to-orange-700"
        />
      </div>

      {/* Today Highlight Indicator */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 rounded-2xl flex items-center justify-between shadow-lg shadow-purple-200/50 relative overflow-hidden group">
        <div className="absolute right-0 top-0 opacity-10 group-hover:scale-110 transition-transform">
           <ShoppingCart size={80} strokeWidth={1} className="text-white" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-card animate-pulse ring-4 ring-white/20"></div>
          <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">STATISTIK OMZET HARI INI</span>
        </div>
        <div className="text-right relative z-10">
           <p className="text-[9px] font-bold text-purple-100 uppercase leading-none mb-1 opacity-70">GROSS REVENUE</p>
           <p className="text-2xl font-black text-white tracking-tight">Rp {totalPendapatanHariIni.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Filters & Time Selection */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-card p-3 rounded-xl border border-border shadow-sm">
        {/* Search Bar - LEFTSIDE */}
        <div className="relative w-full xl:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Cari invoice, pembeli..."
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* PRESET & SPECIFIC FILTERS - RIGHTSIDE */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
          {/* DATE RANGE FILTER */}
          <div className="relative w-full xl:w-auto z-20">
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-[11px] font-bold text-foreground hover:bg-muted focus:ring-2 focus:ring-blue-500 w-full xl:w-[265px] justify-between whitespace-nowrap"
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
                      className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${dateRange.preset === p.id ? 'bg-[#1D4ED8] text-white shadow-md' : 'text-muted-foreground hover:bg-white'}`}
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
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">Sampai Tanggal</label>
                      <input 
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value, preset: 'custom' })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button 
                      onClick={() => setShowDatePicker(false)}
                      className="w-full mt-2 py-2 bg-[#1D4ED8] text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
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

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-muted border border-border rounded-lg text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">SEMUA STATUS</option>
            <option value="lunas">LUNAS CAIR</option>
            <option value="belum">BELUM CAIR</option>
          </select>

          {/* Channel Filter */}
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="px-3 py-2 bg-muted border border-border rounded-lg text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          >
            <option value="all">SEMUA MARKET</option>
            {Array.from(new Set(sales.map(s => s.channel))).sort().map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-3 py-2 text-center text-[10px] uppercase font-bold text-muted-foreground tracking-wider">#</th>
                <th 
                  className="text-left px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  <div className="flex items-center gap-1 w-fit">
                    Tgl / Inv
                    {sortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  </div>
                </th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Nama Barang</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Market / User</th>
                <th className="px-3 py-2 text-center text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Cek</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Harga Jual</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Harga Modal</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Bersih</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">ADM</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Masuk/DP</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Keluar/TF</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Sisa Hutang Market</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Pencarian data tidak ditemukan
                  </td>
                </tr>
              ) : (
                currentItems.map((sale, index) => {
                  const totalQty = sale.items.reduce((s, i) => s + Number(i.qty), 0);
                  const isEditing = editingId === sale.id;
                  const isChecked = checkedItems.has(sale.id);

                  // Kalkulasi (Jika tidak ngedit, pakai dari DB. Jika ngedit, pakai form sementara untuk preview realtime)
                  const hrgJual = Number(sale.total_penjualan);
                  const hrgModal = isEditing ? Number(editForm.harga_modal_manual) : Number(sale.harga_modal_manual || 0);
                  const masukDP = isEditing ? Number(editForm.masuk_dp) : Number(sale.masuk_dp || 0);
                  const keluarTF = isEditing ? Number(editForm.keluar_tf) : Number(sale.keluar_tf || 0);

                  const amdMarket = hrgJual - masukDP;
                  const labaBersih = masukDP > 0 ? (masukDP - hrgModal) : 0;
                  const sisa = masukDP - keluarTF;

                  const rowIndex = index + 1 + (currentPage - 1) * itemsPerPage;

                  return (
                    <tr key={sale.id} className={`transition-colors text-xs ${isChecked ? 'bg-blue-50/70 hover:bg-blue-100/70' : 'hover:bg-blue-50/10'}`}>
                      <td className="px-3 py-2 text-center text-muted-foreground font-bold">
                         {rowIndex}
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-xs font-black text-foreground uppercase leading-none">{sale.invoice}</p>
                        <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">
                          {new Date(sale.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.nama_barang_manual}
                            onChange={(e) => setEditForm({ ...editForm, nama_barang_manual: e.target.value })}
                            className="w-32 px-2 py-1 border border-blue-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="PC Rakitan..."
                          />
                        ) : (
                          <div>
                            <p className="font-medium text-foreground">{sale.nama_barang_manual || '-'}</p>
                            <p className="text-[10px] text-muted-foreground">Qty: {totalQty}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent text-muted-foreground border border-border">{sale.channel}</span>
                        <div className="mt-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.username_pembeli}
                              onChange={(e) => setEditForm({ ...editForm, username_pembeli: e.target.value })}
                              className="w-24 px-2 py-1 border border-blue-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Username..."
                            />
                          ) : (
                            <p className="text-xs font-semibold text-[#3B82F6]">
                              {(!sale.username_pembeli || sale.username_pembeli.toUpperCase() === 'UMUM') 
                                ? (sale.no_pesanan || 'UMUM') 
                                : sale.username_pembeli}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                         <input
                           type="checkbox"
                           checked={isChecked}
                           onChange={() => toggleCheck(sale.id)}
                           className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer"
                         />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {hrgJual.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formatNumber(editForm.harga_modal_manual)}
                            onChange={(e) => setEditForm({ ...editForm, harga_modal_manual: parseNumber(e.target.value) })}
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-xs outline-none text-right"
                          />
                        ) : (
                          <span className="text-muted-foreground">{hrgModal.toLocaleString('id-ID')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-bold ${labaBersih > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {labaBersih !== 0 ? labaBersih.toLocaleString('id-ID') : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-orange-600">
                        {amdMarket > 0 && masukDP > 0 ? amdMarket.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-3 py-2 text-right bg-blue-50/30">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formatNumber(editForm.masuk_dp)}
                            onChange={(e) => setEditForm({ ...editForm, masuk_dp: parseNumber(e.target.value) })}
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-xs outline-none text-right"
                          />
                        ) : (
                          <span className="font-semibold text-blue-600">{masukDP > 0 ? masukDP.toLocaleString('id-ID') : '-'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right bg-purple-50/30">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formatNumber(editForm.keluar_tf)}
                            onChange={(e) => setEditForm({ ...editForm, keluar_tf: parseNumber(e.target.value) })}
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-xs outline-none text-right"
                          />
                        ) : (
                          <span className="font-semibold text-purple-600">{keluarTF > 0 ? keluarTF.toLocaleString('id-ID') : '-'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-red-600 font-bold">
                        {sisa > 0 ? sisa.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          (masukDP > 0 && keluarTF >= masukDP) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {(masukDP > 0 && keluarTF >= masukDP) ? 'LUNAS' : 'PROSES'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => saveEdit(sale.id)} disabled={saving} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200">
                              <Save size={14} />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-accent text-muted-foreground rounded hover:bg-accent">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(sale)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                            <Edit2 size={14} />
                          </button>
                        )}
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
          ) : currentItems.map((sale, index) => {
            const totalQty = sale.items.reduce((s, i) => s + Number(i.qty), 0);
            const isEditing = editingId === sale.id;
            const isChecked = checkedItems.has(sale.id);

            const hrgJual = Number(sale.total_penjualan);
            const hrgModal = isEditing ? Number(editForm.harga_modal_manual) : Number(sale.harga_modal_manual || 0);
            const masukDP = isEditing ? Number(editForm.masuk_dp) : Number(sale.masuk_dp || 0);
            const keluarTF = isEditing ? Number(editForm.keluar_tf) : Number(sale.keluar_tf || 0);

            const amdMarket = hrgJual - masukDP;
            const labaBersih = masukDP > 0 ? (masukDP - hrgModal) : 0;
            const sisa = masukDP - keluarTF;

            return (
              <div key={sale.id} className={`p-2.5 space-y-2 hover:bg-muted transition-colors ${isChecked ? 'bg-blue-50/40' : ''}`}>
                {/* Row 1: Index, Invoice, Date, and Checkbox */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px] font-bold">#{index + 1 + (currentPage - 1) * itemsPerPage}</span>
                    <span className="font-bold text-foreground text-xs">{sale.invoice}</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase shrink-0">{sale.channel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {new Date(sale.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(sale.id)}
                      className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Row 2: Barang & Buyer */}
                <div className="text-[11px] space-y-1">
                  <div>
                    <span className="text-muted-foreground">Barang: </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.nama_barang_manual}
                        onChange={(e) => setEditForm({ ...editForm, nama_barang_manual: e.target.value })}
                        className="w-full mt-0.5 px-2 py-0.5 border border-blue-300 rounded text-xs outline-none"
                        placeholder="PC Rakitan..."
                      />
                    ) : (
                      <span className="font-semibold text-foreground">{sale.nama_barang_manual || '-'} <span className="text-[10px] text-muted-foreground font-normal">(Qty: {totalQty})</span></span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pelanggan: </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.username_pembeli}
                        onChange={(e) => setEditForm({ ...editForm, username_pembeli: e.target.value })}
                        className="w-full mt-0.5 px-2 py-0.5 border border-blue-300 rounded text-xs outline-none"
                        placeholder="Username..."
                      />
                    ) : (
                      <span className="font-semibold text-[#3B82F6]">
                        {(!sale.username_pembeli || sale.username_pembeli.toUpperCase() === 'UMUM') 
                          ? (sale.no_pesanan || 'UMUM') 
                          : sale.username_pembeli}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 3: Financial Details (Grid / Compact) */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 bg-muted p-2 rounded-lg text-[10px] text-foreground">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga Jual:</span>
                    <span className="font-semibold">{hrgJual.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga Modal:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formatNumber(editForm.harga_modal_manual)}
                        onChange={(e) => setEditForm({ ...editForm, harga_modal_manual: parseNumber(e.target.value) })}
                        className="w-20 px-1 border border-blue-300 rounded text-[10px] text-right"
                      />
                    ) : (
                      <span className="font-semibold">{hrgModal.toLocaleString('id-ID')}</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Laba Bersih:</span>
                    <span className={`font-bold ${labaBersih > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {labaBersih !== 0 ? labaBersih.toLocaleString('id-ID') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ADM Market:</span>
                    <span className="font-semibold text-orange-600">
                      {amdMarket > 0 && masukDP > 0 ? amdMarket.toLocaleString('id-ID') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between bg-blue-50/50 px-1 py-0.5 rounded">
                    <span className="text-muted-foreground">Masuk/DP:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formatNumber(editForm.masuk_dp)}
                        onChange={(e) => setEditForm({ ...editForm, masuk_dp: parseNumber(e.target.value) })}
                        className="w-20 px-1 border border-blue-300 rounded text-[10px] text-right"
                      />
                    ) : (
                      <span className="font-semibold text-blue-600">{masukDP > 0 ? masukDP.toLocaleString('id-ID') : '-'}</span>
                    )}
                  </div>
                  <div className="flex justify-between bg-purple-50/50 px-1 py-0.5 rounded">
                    <span className="text-muted-foreground">Keluar/TF:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formatNumber(editForm.keluar_tf)}
                        onChange={(e) => setEditForm({ ...editForm, keluar_tf: parseNumber(e.target.value) })}
                        className="w-20 px-1 border border-blue-300 rounded text-[10px] text-right"
                      />
                    ) : (
                      <span className="font-semibold text-purple-600">{keluarTF > 0 ? keluarTF.toLocaleString('id-ID') : '-'}</span>
                    )}
                  </div>
                  <div className="flex justify-between col-span-2 border-t border-gray-200/60 pt-1 mt-0.5">
                    <span className="text-muted-foreground font-bold">Sisa Hutang Market:</span>
                    <span className="font-black text-red-600">{sisa > 0 ? sisa.toLocaleString('id-ID') : '-'}</span>
                  </div>
                </div>

                {/* Row 4: Status and Action Buttons */}
                <div className="flex justify-between items-center pt-1.5 border-t border-border">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${
                    (masukDP > 0 && keluarTF >= masukDP) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {(masukDP > 0 && keluarTF >= masukDP) ? 'LUNAS' : 'PROSES'}
                  </span>

                  {isEditing ? (
                    <div className="flex gap-1.5">
                      <button onClick={() => saveEdit(sale.id)} disabled={saving} className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow">
                        <Save size={11} /> Simpan
                      </button>
                      <button onClick={cancelEdit} className="px-2 py-1 bg-accent hover:bg-accent text-muted-foreground rounded text-[10px] font-bold">
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(sale)} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-[10px] font-bold flex items-center gap-1">
                      <Edit2 size={11} /> Edit Info
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-border px-3 py-2 flex items-center justify-between bg-muted/50">
          <p className="text-[10px] text-muted-foreground font-medium">
            Menampilkan {currentItems.length} dari {filteredSales.length} riwayat pembukuan
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
                    className={`min-w-[24px] h-6 text-[11px] font-bold rounded transition-colors ${currentPage === p
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
    </div>
  );
}
