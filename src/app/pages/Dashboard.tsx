import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  Package,
  ShoppingCart,
  PlusCircle,
  ClipboardCheck,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import api from '../api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
interface DashboardData {
  stats: {
    total_penjualan: number;
    trend_penjualan: number;
    laba_kotor: number;
    trend_laba: number;
    saldo_kas: number;
    hutang_distributor: number;
    nilai_aset: number;
    total_transaksi: number;
    trend_transaksi: number;
  };
  chart_data: { name: string; value: number }[];
  recent_transactions: { id: string; customer: string; total: number; date: string, time: string }[];
  low_stock: { id: number; name: string; stok: number; min: number }[];
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  trend?: number;
  colorTheme?: 'blue' | 'emerald' | 'indigo' | 'rose' | 'amber' | 'cyan';
}

const cardThemes = {
  blue: {
    bg: 'bg-blue-50/50 hover:bg-blue-50/80 dark:bg-blue-950/10 dark:hover:bg-blue-950/20',
    border: 'border-blue-100/60 dark:border-blue-900/30',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    iconHoverBg: 'group-hover:bg-blue-600 group-hover:text-white',
    topBar: 'bg-gradient-to-r from-blue-500 to-blue-300',
    textColor: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
  },
  emerald: {
    bg: 'bg-emerald-50/50 hover:bg-emerald-50/80 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20',
    border: 'border-emerald-100/60 dark:border-emerald-900/30',
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    iconHoverBg: 'group-hover:bg-emerald-600 group-hover:text-white',
    topBar: 'bg-gradient-to-r from-emerald-500 to-emerald-300',
    textColor: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
  },
  indigo: {
    bg: 'bg-indigo-50/50 hover:bg-indigo-50/80 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20',
    border: 'border-indigo-100/60 dark:border-indigo-900/30',
    iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
    iconHoverBg: 'group-hover:bg-indigo-600 group-hover:text-white',
    topBar: 'bg-gradient-to-r from-indigo-500 to-indigo-300',
    textColor: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
  },
  rose: {
    bg: 'bg-rose-50/50 hover:bg-rose-50/80 dark:bg-rose-950/10 dark:hover:bg-rose-950/20',
    border: 'border-rose-100/60 dark:border-rose-900/30',
    iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
    iconHoverBg: 'group-hover:bg-rose-600 group-hover:text-white',
    topBar: 'bg-gradient-to-r from-rose-500 to-rose-300',
    textColor: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
  },
  amber: {
    bg: 'bg-amber-50/50 hover:bg-amber-50/80 dark:bg-amber-950/10 dark:hover:bg-amber-950/20',
    border: 'border-amber-100/60 dark:border-amber-900/30',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    iconHoverBg: 'group-hover:bg-amber-600 group-hover:text-white',
    topBar: 'bg-gradient-to-r from-amber-500 to-amber-300',
    textColor: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
  },
  cyan: {
    bg: 'bg-cyan-50/50 hover:bg-cyan-50/80 dark:bg-cyan-950/10 dark:hover:bg-cyan-950/20',
    border: 'border-cyan-100/60 dark:border-cyan-900/30',
    iconBg: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400',
    iconHoverBg: 'group-hover:bg-cyan-600 group-hover:text-white',
    topBar: 'bg-gradient-to-r from-cyan-500 to-cyan-300',
    textColor: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
  }
};

function StatCard({ title, value, subtitle, icon: Icon, trend, colorTheme = 'blue' }: StatCardProps) {
  const theme = cardThemes[colorTheme];
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl shadow-sm border p-2.5 md:p-3 hover:shadow-lg transition-all duration-300 group relative overflow-hidden flex flex-col justify-between ${theme.bg} ${theme.border}`}
    >
      <div className={`absolute top-0 left-0 w-full h-[3px] ${theme.topBar}`}></div>
      
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${theme.iconBg} ${theme.iconHoverBg} group-hover:rotate-3`}>
          <Icon className="transition-colors" size={16} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center gap-0.5 text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-full ${trend > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{title}</p>
        <p className={`text-sm md:text-lg font-black tracking-tight text-foreground mb-0.5 transition-colors line-clamp-1 ${theme.textColor}`}>{value}</p>
        <p className="text-[8px] md:text-[9px] text-muted-foreground font-medium line-clamp-1">{subtitle}</p>
      </div>
    </motion.div>
  );
}



export default function Dashboard() {
  const { isOwner } = useAuth();
  useDocumentTitle('Dashboard');
  const [data, setData] = useState<DashboardData & { subtitle: string }> (null as any);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/dashboard?range=${range}`);
        setData(res.data);
      } catch (error) {
        console.error("Gagal memuat dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [range]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl shadow-sm border border-border p-3 md:p-4">
              <div className="flex flex-col gap-3">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-accent rounded-lg md:rounded-xl" />
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-accent rounded w-16" />
                  <div className="h-5 bg-accent rounded w-24" />
                  <div className="h-2 bg-accent rounded w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-card rounded-xl shadow-sm border border-border p-3">
            <div className="h-4 bg-accent rounded w-48 mb-3" />
            <div className="h-[220px] bg-accent rounded-lg" />
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-3">
            <div className="h-4 bg-accent rounded w-32 mb-3" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between p-2.5 bg-muted rounded-xl">
                  <div className="space-y-1.5">
                    <div className="h-4 bg-accent rounded w-24" />
                    <div className="h-3 bg-accent rounded w-16" />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="h-4 bg-accent rounded w-20 ml-auto" />
                    <div className="h-3 bg-accent rounded w-12 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Top Header with Filters */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex bg-card p-1 rounded-xl shadow-sm border border-border w-fit">
          <button
            onClick={() => setRange('weekly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${range === 'weekly' ? 'bg-[#3B82F6] text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}
          >
            MINGGUAN
          </button>
          <button
            onClick={() => setRange('monthly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${range === 'monthly' ? 'bg-[#3B82F6] text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}
          >
            BULANAN
          </button>
          <button
            onClick={() => setRange('yearly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${range === 'yearly' ? 'bg-[#3B82F6] text-white shadow-md' : 'text-muted-foreground hover:bg-muted'}`}
          >
            TAHUNAN
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            Data Real-Time {range === 'weekly' ? 'Mingguan' : range === 'monthly' ? 'Bulanan' : 'Tahunan'}
          </p>
        </div>
      </motion.div>



      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
        <StatCard
          title="Total Penjualan"
          value={`Rp ${data.stats.total_penjualan.toLocaleString('id-ID')}`}
          subtitle={data.subtitle}
          icon={ShoppingCart}
          trend={data.stats.trend_penjualan}
          colorTheme="blue"
        />
        {isOwner && (
          <StatCard
            title="Laba Bersih Transaksi"
            value={`Rp ${data.stats.laba_kotor.toLocaleString('id-ID')}`}
            subtitle={data.subtitle}
            icon={TrendingUp}
            trend={data.stats.trend_laba}
            colorTheme="emerald"
          />
        )}
        {isOwner && (
          <StatCard
            title="Saldo Kas"
            value={`Rp ${data.stats.saldo_kas.toLocaleString('id-ID')}`}
            subtitle="Saldo saat ini"
            icon={Wallet}
            colorTheme="indigo"
          />
        )}
        {isOwner && (
          <StatCard
            title="Hutang Distributor"
            value={`Rp ${data.stats.hutang_distributor.toLocaleString('id-ID')}`}
            subtitle="Belum dibayar"
            icon={CreditCard}
            colorTheme="rose"
          />
        )}
        {isOwner && (
          <StatCard
            title="Nilai Aset"
            value={`Rp ${data.stats.nilai_aset.toLocaleString('id-ID')}`}
            subtitle="Total nilai stok"
            icon={Package}
            colorTheme="amber"
          />
        )}
        <StatCard
          title="Total Transaksi"
          value={data.stats.total_transaksi.toLocaleString('id-ID')}
          subtitle={data.subtitle}
          icon={DollarSign}
          trend={data.stats.trend_transaksi}
          colorTheme="cyan"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Sales Chart */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-3 flex flex-col h-[330px]">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {range === 'weekly' 
              ? 'Grafik Kinerja Mingguan' 
              : range === 'monthly' 
                ? 'Grafik Kinerja Bulanan' 
                : 'Grafik Kinerja Tahunan'}
          </h3>
          <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chart_data.map(item => ({
              ...item,
              penjualan: item.penjualan !== undefined ? item.penjualan : (item as any).value || 0,
              pembelian: item.pembelian || 0,
              laba: item.laba || 0
            }))}>
              <defs>
                <linearGradient id="colorPenjualan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPembelian" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLaba" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={(v) => v.toLocaleString('id-ID')} width={85} />
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string) => [
                  `Rp ${value.toLocaleString('id-ID')}`,
                  name.charAt(0).toUpperCase() + name.slice(1),
                ]}
              />
              <Area
                type="monotone"
                dataKey="penjualan"
                name="Penjualan"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorPenjualan)"
              />
              <Area
                type="monotone"
                dataKey="pembelian"
                name="Pembelian"
                stroke="#F97316"
                strokeWidth={2}
                fill="url(#colorPembelian)"
              />
              {isOwner && (
                <Area
                  type="monotone"
                  dataKey="laba"
                  name="Laba Bersih"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorLaba)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-3 flex flex-col h-[330px]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transaksi Terbaru</h3>
          </div>
          {data.recent_transactions.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-3">Belum ada transaksi</p>
          ) : (
            <div className="space-y-1 overflow-y-auto pr-1 flex-1 min-h-0">
              {data.recent_transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-1 px-2.5 bg-muted rounded-xl hover:bg-white hover:shadow-[0_2px_8px_-2px_rgba(59,130,246,0.15)] hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-100 transition-all duration-300 group cursor-pointer"
                >
                  <div>
                    <p className="font-bold text-foreground text-sm group-hover:text-[#3B82F6] transition-colors">{transaction.id}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{transaction.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#3B82F6]">
                      Rp {transaction.total.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{transaction.date} | {transaction.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useDocumentTitle } from '../hooks/useDocumentTitle';
