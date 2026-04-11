import { useState, useEffect } from 'react';
import { ShoppingCart, ArrowDownLeft, ArrowUpRight, Filter, Calendar, Package, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface StockMovement {
  id: number;
  product_id: number;
  tipe: 'in' | 'out' | 'adjustment';
  sumber: 'purchase' | 'sale' | 'opname' | 'manual';
  reference_id: number | null;
  qty: number;
  keterangan: string | null;
  created_at: string;
  product?: {
    name: string;
    kode: string;
    satuan: string;
  };
}

export default function StockMovementPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipe, setTipe] = useState('all');
  const [bulan, setBulan] = useState(new Date().toISOString().slice(0, 7));
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stok-movements', {
        params: { tipe, bulan, page, limit: 20 }
      });
      setMovements(res.data.data);
      setLastPage(res.data.last_page);
      setTotal(res.data.total);
    } catch (err: any) {
      toast.error('Gagal mengambil data histori stok');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [tipe, bulan, page]);

  const getTipeBadge = (tipe: string) => {
    switch (tipe) {
      case 'in': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><ArrowDownLeft size={10}/> MASUK</span>;
      case 'out': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit"><ArrowUpRight size={10}/> KELUAR</span>;
      case 'adjustment': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1 w-fit"><RefreshCw size={10}/> PENYESUAIAN</span>;
      default: return null;
    }
  };

  const getSumberLabel = (sumber: string) => {
    switch (sumber) {
      case 'purchase': return 'Pembelian';
      case 'sale': return 'Penjualan';
      case 'opname': return 'Opname Stok';
      case 'manual': return 'Input Manual';
      default: return sumber;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Package className="text-primary" /> Riwayat Pergerakan Stok
          </h1>
          <p className="text-sm text-gray-500">Pantau semua barang yang masuk dan keluar dari gudang</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter Tipe</label>
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
              {['all', 'in', 'out', 'adjustment'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setTipe(t); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tipe === t ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {t === 'all' ? 'SEMUA' : t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Periode Bulan</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="month"
                value={bulan}
                onChange={(e) => { setBulan(e.target.value); setPage(1); }}
                className="bg-gray-50 border border-gray-100 pl-10 pr-4 py-2 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 ring-primary/20 transition-all cursor-pointer"
              />
            </div>
          </div>
          
          <div className="ml-auto text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Record</p>
            <p className="text-xl font-black text-gray-800">{total}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Waktu</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Barang</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipe</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Jumlah</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sumber</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                    ))}
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400 italic text-sm">Tidak ada riwayat pergerakan stok pada periode ini.</td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <p className="text-xs font-bold text-gray-700">{new Date(m.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <p className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-bold text-gray-800">{m.product?.name || 'Produk Dihapus'}</p>
                      <p className="text-[10px] text-gray-400 font-medium">KODE: {m.product?.kode || '-'}</p>
                    </td>
                    <td className="p-4">{getTipeBadge(m.tipe)}</td>
                    <td className="p-4 text-center">
                      <span className={`text-sm font-black ${m.qty < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {m.qty > 0 ? '+' : ''}{m.qty}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold ml-1 uppercase">{m.product?.satuan || 'PCS'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">{getSumberLabel(m.sumber)}</span>
                    </td>
                    <td className="p-4 text-xs text-gray-500 italic max-w-xs truncate" title={m.keterangan || ''}>{m.keterangan || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {lastPage > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Halaman {page} dari {lastPage}</p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-xl border border-gray-100 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <button
                disabled={page === lastPage}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-xl border border-gray-100 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
