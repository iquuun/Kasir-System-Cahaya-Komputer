import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, Package, 
  DollarSign, CircleDollarSign, Activity, Banknote, Edit2, Check, X,
  ArrowUpRight, ArrowDownRight, BarChart3, Calendar
} from 'lucide-react';
import { BarChart, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import api from '../api';
import { toast } from 'sonner';

interface DashboardKeuanganData {
  pemasukan: { hari_ini: number; bulan_ini: number; tahun_ini: number; seluruh: number };
  pengeluaran: { hari_ini: number; bulan_ini: number; tahun_ini: number; seluruh: number };
  chart_data: Array<{ bulan: string; pemasukan: number; pengeluaran: number; laba_bersih: number }>;
  uang_online: { bulan_ini: number; bulan_lalu: number };
  uang_rekening: number;
  hutang: { bulan_ini: number; bulan_lalu: number; total_aktif: number };
  hutang_per_distributor: Array<{ name: string; total_pembelian: number; sisa_hutang: number }>;
  uang_stok: number;
  pendapatan_harian: { hari_ini: number; hari_kemarin: number };
  uang_kas: number;
  uang_di_luar: number;
  margin_bulanan: { pendapatan: number; hpp: number; biaya_operasional: number; margin: number };
}

function StatCard({ title, value, subtitle, icon: Icon, colorClass = "from-blue-600 to-blue-700" }: { title: string; value: string; subtitle: React.ReactNode; icon: React.ElementType; colorClass?: string }) {
  return (
    <div className={`bg-gradient-to-br ${colorClass} rounded-2xl shadow-lg border-t border-white/20 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden text-white flex flex-col justify-between`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500">
        <Icon size={64} strokeWidth={1.5} />
      </div>
      <div className="relative z-10 mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">{title}</p>
        <p className="text-2xl font-black tracking-tight mb-2">{value}</p>
      </div>
      <div className="relative z-10 mt-auto">
        <div className="flex items-center gap-1.5 py-1.5 px-3 bg-white/10 rounded-lg w-fit backdrop-blur-sm border border-white/5">
           <Icon size={12} className="opacity-70 flex-shrink-0" />
           <p className="text-[10px] font-bold opacity-90">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}



const formatRp = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-100 text-xs">
        <p className="font-black text-gray-800 mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-0.5">
            <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: entry.color }}></div>
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-bold text-gray-800">{formatRp(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function LaporanLabaPage({ isEmbedded }: { isEmbedded?: boolean }) {
  const { isOwner } = useAuth();
  const [data, setData] = useState<DashboardKeuanganData | null>(null);
  const [loading, setLoading] = useState(true);

  // Piutang state
  const [isEditingPiutang, setIsEditingPiutang] = useState(false);
  const [piutangInput, setPiutangInput] = useState('');
  const [savingPiutang, setSavingPiutang] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [isOwner]);

  const fetchDashboardData = async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const res = await api.get('/laporan-laba');
      setData(res.data);
      setPiutangInput(res.data.uang_di_luar.toString());
    } catch (error) {
      console.error("Gagal memuat dashboard keuangan", error);
      toast.error('Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePiutang = async () => {
    setSavingPiutang(true);
    try {
      await api.post('/laporan-laba/piutang', { piutang_pembeli: Number(piutangInput) });
      toast.success('Uang di luar (Piutang) berhasil diperbarui');
      setIsEditingPiutang(false);
      fetchDashboardData();
    } catch (error) {
      toast.error('Gagal menyimpan piutang');
    } finally {
      setSavingPiutang(false);
    }
  };

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-2xl h-36" />
          ))}
        </div>
        <div className="bg-gray-200 rounded-2xl h-64" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <BarChart3 size={22} className="text-blue-500" />
              Laporan Keuangan Toko
            </h2>
            <p className="text-sm text-gray-500 mt-1">Ringkasan keseluruhan neraca, pemasukan, dan pengeluaran toko</p>
          </div>
        </div>
      )}



      {/* ═══ SECTION 1: NERACA KEUANGAN (8 stat cards) ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Posisi Neraca Keuangan</h3>
          <Wallet size={16} className="text-blue-500" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          
          {/* 1. Uang Online */}
          <StatCard
            title="Uang Online"
            value={formatRp(data.uang_online.bulan_ini)}
            subtitle={<span>Bulan lalu: {formatRp(data.uang_online.bulan_lalu)}</span>}
            icon={CircleDollarSign}
            colorClass="from-indigo-500 to-indigo-600"
          />

          {/* 2. Uang di Rekening */}
          <StatCard
            title="Uang di Rekening"
            value={formatRp(data.uang_rekening)}
            subtitle="Saldo bersih mutasi rekening"
            icon={Wallet}
            colorClass="from-blue-500 to-blue-600"
          />

          {/* 3. Jumlah Hutang */}
          <StatCard
            title="Jumlah Hutang"
            value={formatRp(data.hutang.total_aktif)}
            subtitle={<span>Bln ini: {formatRp(data.hutang.bulan_ini)} | Lalu: {formatRp(data.hutang.bulan_lalu)}</span>}
            icon={CreditCard}
            colorClass="from-rose-500 to-rose-600"
          />

          {/* 4. Uang Stok (Aset) */}
          <StatCard
            title="Uang Stok (Aset)"
            value={formatRp(data.uang_stok)}
            subtitle="Total nilai modal barang di toko"
            icon={Package}
            colorClass="from-amber-500 to-amber-600"
          />

          {/* 5. Pendapatan Harian */}
          <StatCard
            title="Pendapatan Harian"
            value={formatRp(data.pendapatan_harian.hari_ini)}
            subtitle={<span>Kemarin: {formatRp(data.pendapatan_harian.hari_kemarin)}</span>}
            icon={TrendingUp}
            colorClass="from-violet-500 to-violet-600"
          />

          {/* 6. Uang Kas Total */}
          <StatCard
            title="Uang Kas Keseluruhan"
            value={formatRp(data.uang_kas)}
            subtitle="Rekening + Online + Aset - Hutang"
            icon={Banknote}
            colorClass="from-emerald-500 to-emerald-600"
          />

          {/* 7. Margin 1 Bulan */}
          <StatCard
            title="Margin Oprasional 1 Bulan"
            value={formatRp(data.margin_bulanan.margin)}
            subtitle={
              <span>
                Margin: {data.margin_bulanan.pendapatan > 0 ? ((data.margin_bulanan.margin / data.margin_bulanan.pendapatan) * 100).toFixed(1) : 0}% (Netto)
              </span>
            }
            icon={Activity}
            colorClass="from-teal-500 to-teal-600"
          />

          {/* 8. Uang Piutang (Manual) */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-lg border-t border-white/20 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden text-white flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500">
              <DollarSign size={64} strokeWidth={1.5} />
            </div>
            <div className="relative z-10 mb-4">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Uang di Luar (Piutang)</p>
                {!isEditingPiutang ? (
                  <button onClick={() => setIsEditingPiutang(true)} className="p-1 hover:bg-white/20 rounded transition-colors text-white/70 hover:text-white">
                     <Edit2 size={12} />
                  </button>
                ) : null}
              </div>
              
              {isEditingPiutang ? (
                 <div className="flex items-center gap-2 mt-1">
                   <input 
                     type="number" 
                     value={piutangInput}
                     onChange={(e) => setPiutangInput(e.target.value)}
                     className="w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
                     placeholder="Nominal..."
                   />
                   <button onClick={handleSavePiutang} disabled={savingPiutang} className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded transition-colors disabled:opacity-50 text-white flex-shrink-0">
                      <Check size={14} />
                   </button>
                   <button onClick={() => { setIsEditingPiutang(false); setPiutangInput(data.uang_di_luar.toString()); }} className="p-1.5 bg-rose-500 hover:bg-rose-600 rounded transition-colors text-white flex-shrink-0">
                      <X size={14} />
                   </button>
                 </div>
              ) : (
                 <p className="text-2xl font-black tracking-tight mb-2">{formatRp(data.uang_di_luar)}</p>
              )}
            </div>
            <div className="relative z-10 mt-auto">
              <div className="flex items-center gap-1.5 py-1.5 px-3 bg-white/10 rounded-lg w-fit backdrop-blur-sm border border-white/5">
                <DollarSign size={12} className="opacity-70 flex-shrink-0" />
                <p className="text-[10px] font-bold opacity-90">Piutang Pembeli (Manual)</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ═══ SECTION 2: TABEL HUTANG PER DISTRIBUTOR ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-50 flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
               <CreditCard size={16} className="text-orange-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Detail Pembelian & Hutang Per Distributor</h3>
          </div>
          
          {data.hutang_per_distributor.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm flex-1 flex flex-col justify-center">
              Tidak ada hutang aktif pada distributor saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Nama Distributor</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Pembelian</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Sisa Hutang Berjalan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.hutang_per_distributor.map((dist) => (
                    <tr key={dist.name} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-gray-800">{dist.name}</td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-gray-600">
                        {formatRp(Number(dist.total_pembelian))}
                      </td>
                      <td className="px-4 py-3 text-xs text-right">
                        <span className="font-bold text-red-600">
                          {formatRp(Number(dist.sisa_hutang))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══ SECTION 3: GRAFIK PEMASUKAN VS PENGELUARAN ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <BarChart3 size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Grafik Posisi Keuangan</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Rekap Keseluruhan Aset & Kewajiban</p>
            </div>
          </div>
          <div className="flex-1">
            {data.chart_data.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart 
                  data={[
                    { name: 'Kas Total', nominal: data.uang_kas, fill: '#10b981' },
                    { name: 'Uang Online', nominal: data.uang_online.bulan_ini, fill: '#6366f1' },
                    { name: 'Rekening', nominal: data.uang_rekening, fill: '#3b82f6' },
                    { name: 'Stok', nominal: data.uang_stok, fill: '#f59e0b' },
                    { name: 'Margin', nominal: data.margin_bulanan.margin, fill: '#14b8a6' },
                    { name: 'Pendapatan', nominal: data.pendapatan_harian.hari_ini, fill: '#8b5cf6' },
                    { name: 'Piutang', nominal: data.uang_di_luar, fill: '#475569' },
                    { name: 'Hutang', nominal: data.hutang.total_aktif, fill: '#f43f5e' }
                  ].sort((a,b) => b.nominal - a.nominal)} 
                  layout="vertical" 
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} tick={{ fill: '#9ca3af' }} />
                  <YAxis type="category" dataKey="name" fontSize={10} fontWeight={700} width={75} tick={{ fill: '#6b7280' }} />
                  <Tooltip 
                    formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Nominal']}
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                  />
                  <Bar dataKey="nominal" radius={[0, 4, 4, 0]} barSize={20}>
                    {[
                      { name: 'Kas Total', nominal: data.uang_kas, fill: '#10b981' },
                      { name: 'Uang Online', nominal: data.uang_online.bulan_ini, fill: '#6366f1' },
                      { name: 'Rekening', nominal: data.uang_rekening, fill: '#3b82f6' },
                      { name: 'Stok', nominal: data.uang_stok, fill: '#f59e0b' },
                      { name: 'Margin', nominal: data.margin_bulanan.margin, fill: '#14b8a6' },
                      { name: 'Pendapatan', nominal: data.pendapatan_harian.hari_ini, fill: '#8b5cf6' },
                      { name: 'Piutang', nominal: data.uang_di_luar, fill: '#475569' },
                      { name: 'Hutang', nominal: data.hutang.total_aktif, fill: '#f43f5e' }
                    ].sort((a,b) => b.nominal - a.nominal).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                <Calendar size={20} className="mr-2" /> Belum ada data grafik tahun ini
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
