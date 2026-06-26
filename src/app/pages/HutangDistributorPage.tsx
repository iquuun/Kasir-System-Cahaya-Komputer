import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import { CreditCard, CheckCircle, ChevronRight, ChevronLeft, ArrowDown, ArrowUp, Search } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Purchase {
  id: number;
  invoice: string;
  distributor_id: number;
  tanggal: string;
  total_pembelian: number;
  terbayar: number;
  status_pembayaran: 'lunas' | 'hutang';
  distributor?: {
    id: number;
    name: string;
  };
  jatuh_tempo?: string | null;
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

export default function HutangDistributorPage() {
  const { isOwner } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Sorting State
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'lunas' | 'hutang'>('all'); // all, lunas, hutang
  const [filterDistributor, setFilterDistributor] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
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

  // Modal Pay State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOwner) {
      fetchPurchases();
    }
  }, [isOwner]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchases');
      setPurchases(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data hutang');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (preset === 'today') {} 
    else if (preset === 'yesterday') {
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

  const handleOpenPayModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setPayAmount((Number(purchase.total_pembelian) - Number(purchase.terbayar)).toString());
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
      toast.success('Pelunasan berhasil disimpan!');
      fetchPurchases();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    let result = purchases.filter(p => {
        const pDateStr = p.tanggal.split(' ')[0];
        const pDate = new Date(pDateStr);
        pDate.setHours(0,0,0,0);
        
        if (dateRange.preset !== 'all') {
           const start = new Date(dateRange.start);
           start.setHours(0,0,0,0);
           const end = new Date(dateRange.end);
           end.setHours(23,59,59,999);
           if (pDate < start || pDate > end) return false;
        }

        if (filterStatus !== 'all') {
            if (filterStatus === 'hutang' && (p.status_pembayaran === 'lunas' && Number(p.total_pembelian) <= Number(p.terbayar))) return false;
            if (filterStatus === 'lunas' && (p.status_pembayaran === 'hutang' || Number(p.total_pembelian) > Number(p.terbayar))) return false;
        }

        if (filterDistributor !== 'all' && p.distributor?.name !== filterDistributor) {
            return false;
        }

        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const matchesSearch = 
            p.invoice?.toLowerCase().includes(searchLower) ||
            p.distributor?.name?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

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
  }, [purchases, dateRange, filterStatus, filterDistributor, sortOrder, searchQuery]);

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div><div className="h-5 bg-accent rounded w-48 mb-2" /><div className="h-3 bg-accent rounded w-64" /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[...Array(3)].map((_, i) => (<div key={i} className="bg-card rounded-xl shadow-sm border border-border p-4"><div className="h-3 bg-accent rounded w-20 mb-2" /><div className="h-6 bg-accent rounded w-28" /></div>))}</div>
    </div>
  );
  if (error) return <div className="p-5 text-center text-red-500">{error}</div>;

  const hutangList = purchases.filter(p => p.status_pembayaran === 'hutang' || Number(p.total_pembelian) > Number(p.terbayar));
  const totalHutang = hutangList.reduce((sum, h) => sum + Number(h.total_pembelian), 0);
  const totalTerbayar = hutangList.reduce((sum, h) => sum + Number(h.terbayar), 0);
  const totalSisa = hutangList.reduce((sum, h) => sum + (Number(h.total_pembelian) - Number(h.terbayar)), 0);

  const hutangPerDistributor = hutangList.reduce((acc, hutang) => {
    const distributorName = hutang.distributor?.name || 'Unknown';
    if (!acc[distributorName]) acc[distributorName] = 0;
    acc[distributorName] += (Number(hutang.total_pembelian) - Number(hutang.terbayar));
    return acc;
  }, {} as Record<string, number>);

  // Extracted unique distributors for the filter
  const uniqueDistributors = Array.from(new Set(purchases.map(p => p.distributor?.name).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3">
          <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Total Hutang Keseluruhan</p>
          <p className="text-base md:text-xl font-bold text-[#3B82F6]">Rp {totalHutang.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3">
          <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Total Terbayar</p>
          <p className="text-base md:text-xl font-bold text-green-600">Rp {totalTerbayar.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3">
          <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Total Sisa Hutang</p>
          <p className="text-base md:text-xl font-bold text-red-600">Rp {totalSisa.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3 flex flex-col justify-center">
          <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Jumlah Invoice Hutang</p>
          <p className="text-base md:text-xl font-bold text-foreground leading-tight">{hutangList.length}</p>
          <p className="text-[8px] md:text-[9px] text-muted-foreground font-medium">Belum lunas sepenuhnya</p>
        </div>
      </div>

      {/* Hutang Per Distributor */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-2">
        <h3 className="text-[11px] uppercase font-bold text-foreground mb-2">Hutang Aktif Per Distributor</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(hutangPerDistributor)
            .filter(([_, sisa]) => sisa > 0)
            .map(([distributor, sisa]) => (
              <div key={distributor} className="px-2 py-1.5 bg-red-50/50 border border-red-100 rounded">
                <p className="font-bold text-[10px] text-foreground truncate" title={distributor}>{distributor}</p>
                <p className="text-[11px] font-bold text-red-600">Rp {sisa.toLocaleString('id-ID')}</p>
              </div>
            ))}
            {Object.keys(hutangPerDistributor).length === 0 && (
                <p className="text-[10px] text-muted-foreground italic py-1">Tidak ada hutang aktif.</p>
            )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            placeholder="Cari invoice atau distributor..." 
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Date Filter */}
        <div className="relative z-20 w-full sm:w-auto">
          <button 
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-[11px] font-bold text-foreground hover:bg-muted focus:ring-2 focus:ring-blue-500 w-full sm:w-[265px] justify-between whitespace-nowrap shadow-sm"
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
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${dateRange.preset === p.id ? 'bg-[#3B82F6] text-white shadow-md' : 'text-muted-foreground hover:bg-white'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
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
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="w-full mt-2 py-2 bg-[#3B82F6] text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    Terapkan / Tutup
                  </button>
                </div>
              </div>
              <div 
                className="fixed inset-0 z-0 bg-transparent" 
                onClick={() => setShowDatePicker(false)}
                style={{zIndex: -1}}
              />
            </div>
          )}
        </div>
      </div>

      {/* Table with Inline Filters */}
      <div className="hidden md:block bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <h3 className="text-[11px] uppercase font-bold text-foreground">Detail Pembelian / Hutang</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Invoice</th>
                <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  <select
                    value={filterDistributor}
                    onChange={(e) => setFilterDistributor(e.target.value)}
                    className="bg-transparent border-none outline-none font-bold text-muted-foreground p-0 text-[10px] uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    <option value="all">DISTRIBUTOR (Semua)</option>
                    {uniqueDistributors.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </th>
                <th 
                  className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  <div className="flex items-center gap-1 w-fit">
                    TANGGAL
                    {sortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  </div>
                </th>
                <th className="text-right px-2 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Total</th>
                <th className="text-right px-2 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Terbayar</th>
                <th className="text-right px-2 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Sisa</th>
                <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="bg-transparent border-none outline-none font-bold text-muted-foreground p-0 text-[10px] uppercase tracking-wider cursor-pointer hover:text-gray-700 text-center"
                  >
                    <option value="all">STATUS (Semua)</option>
                    <option value="hutang">HUTANG</option>
                    <option value="lunas">LUNAS</option>
                  </select>
                </th>
                <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Pencarian data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const total = Number(purchase.total_pembelian);
                  const terbayar = Number(purchase.terbayar);
                  const sisa = total - terbayar;
                  const persentaseBayar = total > 0 ? (terbayar / total) * 100 : 100;
                  const isLunas = sisa <= 0;

                  return (
                    <tr key={purchase.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-2 py-2 text-[11px]">
                        <p className="font-bold text-foreground">{purchase.invoice || '-'}</p>
                      </td>
                      <td className="px-2 py-2 text-[11px] text-foreground truncate max-w-[120px]">{purchase.distributor?.name || '-'}</td>
                      <td className="px-2 py-2 text-[11px] text-muted-foreground">
                        {new Date(purchase.tanggal).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-right font-bold text-foreground">
                        {total.toLocaleString('id-ID')}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-right text-green-600 font-medium">
                        {terbayar.toLocaleString('id-ID')}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-right">
                        {sisa > 0 ? (
                            <span className="font-bold text-red-600">
                            {sisa.toLocaleString('id-ID')}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {isLunas ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-600">
                                LUNAS
                            </span>
                        ) : (
                            <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-600">
                                BLM LUNAS
                            </span>
                            <div className="w-12 bg-accent rounded-full h-1 mt-0.5">
                                <div
                                className="bg-green-500 h-1 rounded-full"
                                style={{ width: `${Math.min(persentaseBayar, 100)}%` }}
                                ></div>
                            </div>
                            </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {sisa > 0 ? (
                            <button
                                onClick={() => handleOpenPayModal(purchase)}
                                title="Bayar Cicilan / Pelunasan"
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors border border-green-200 bg-green-50 inline-flex items-center gap-1"
                            >
                                <CheckCircle size={14} />
                                <span className="text-[9px] font-bold">LUNASI</span>
                            </button>
                        ) : (
                            <span className="text-[10px] text-muted-foreground italic">Selesai</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="space-y-3 md:hidden">
        {filteredPurchases.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center text-muted-foreground text-xs">
            Pencarian data tidak ditemukan.
          </div>
        ) : (
          filteredPurchases.map((purchase) => {
            const total = Number(purchase.total_pembelian);
            const terbayar = Number(purchase.terbayar);
            const sisa = total - terbayar;
            const persentaseBayar = total > 0 ? (terbayar / total) * 100 : 100;
            const isLunas = sisa <= 0;

            return (
              <div key={purchase.id} className="bg-card rounded-xl shadow-sm border border-border p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{purchase.invoice || '-'}</h4>
                    <p className="text-xs text-muted-foreground">{purchase.distributor?.name || '-'}</p>
                  </div>
                  {isLunas ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-600">
                      LUNAS
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-600">
                      BLM LUNAS
                    </span>
                  )}
                </div>

                <div className="border-t border-border pt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tanggal:</span>
                    <span className="text-foreground font-medium">
                      {new Date(purchase.tanggal).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-foreground font-bold">Rp {total.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Terbayar:</span>
                    <span className="text-green-600 font-semibold">Rp {terbayar.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sisa:</span>
                    <span className={sisa > 0 ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                      {sisa > 0 ? `Rp ${sisa.toLocaleString('id-ID')}` : '-'}
                    </span>
                  </div>
                  {!isLunas && (
                    <div className="space-y-1 mt-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>Progress Pelunasan:</span>
                        <span>{Math.round(persentaseBayar)}%</span>
                      </div>
                      <div className="w-full bg-accent rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(persentaseBayar, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {sisa > 0 && (
                  <div className="flex justify-end border-t border-border pt-3">
                    <button
                      onClick={() => handleOpenPayModal(purchase)}
                      className="flex items-center gap-1.5 bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      <CheckCircle size={14} />
                      Bayar Cicilan / Lunasi
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

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
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg focus:ring-1 text-xs font-medium bg-muted focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-card mt-auto md:mt-0 border-t border-border md:border-none md:pt-4">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="hidden md:block px-3 py-2 text-muted-foreground hover:bg-accent rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 md:flex-none px-3 py-3 md:py-2 bg-[#3B82F6] text-white rounded-xl md:rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs font-bold active:scale-[0.98]"
                >
                  {isSubmitting ? 'Memproses...' : 'Proses Bayar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
