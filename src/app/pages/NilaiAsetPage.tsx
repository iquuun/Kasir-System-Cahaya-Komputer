import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import { Package, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../api';

interface AsetKategori {
  kategori: string;
  total_stok: number;
  nilai_aset: number;
  persentase: number;
}

interface NilaiAsetData {
  total_nilai_aset: number;
  total_stok_keseluruhan: number;
  total_kategori_aktif: number;
  data_kategori: AsetKategori[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6', '#F43F5E', '#A855F7'];

export default function NilaiAsetPage() {
  const { isOwner } = useAuth();
  const [data, setData] = useState<NilaiAsetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNilaiAset = async () => {
      setLoading(true);
      try {
        const res = await api.get('/nilai-aset');
        setData(res.data);
      } catch (error) {
        console.error("Gagal memuat data nilai aset", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOwner) fetchNilaiAset();
  }, [isOwner]);

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div><div className="h-5 bg-accent rounded w-32 mb-2" /><div className="h-3 bg-accent rounded w-56" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#3B82F6]/20 rounded-lg p-4"><div className="h-4 bg-blue-200 rounded w-28 mb-3" /><div className="h-7 bg-blue-200 rounded w-40" /></div>
          {[...Array(2)].map((_, i) => (<div key={i} className="bg-card rounded-xl shadow-sm border border-border p-3"><div className="h-4 bg-accent rounded w-24 mb-3" /><div className="h-7 bg-accent rounded w-16" /></div>))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl shadow-sm border border-border p-3"><div className="h-4 bg-accent rounded w-40 mb-3" /><div className="h-[300px] bg-accent rounded-lg" /></div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-3"><div className="h-4 bg-accent rounded w-40 mb-3" /><div className="space-y-3">{[...Array(4)].map((_, i) => (<div key={i} className="p-3 bg-muted rounded-lg"><div className="h-4 bg-accent rounded w-24 mb-2" /><div className="h-5 bg-accent rounded w-32" /></div>))}</div></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-3">
        <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white rounded-xl shadow-sm p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1.5 md:mb-2">
            <TrendingUp size={14} className="md:w-4 md:h-4" />
            <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide">Total Nilai Aset</p>
          </div>
          <p className="text-xl md:text-2xl font-bold">Rp {data.total_nilai_aset.toLocaleString('id-ID')}</p>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1.5 md:mb-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-green-100 rounded-md flex items-center justify-center">
              <Package className="text-green-600 w-3.5 h-3.5 md:w-4 md:h-4" />
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Unit Stok</p>
          </div>
          <p className="text-lg md:text-xl font-bold text-foreground">{data.total_stok_keseluruhan}</p>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1.5 md:mb-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-purple-100 rounded-md flex items-center justify-center">
              <TrendingUp className="text-purple-600 w-3.5 h-3.5 md:w-4 md:h-4" />
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Kategori</p>
          </div>
          <p className="text-lg md:text-xl font-bold text-foreground">{data.total_kategori_aktif}</p>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Pie Chart */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Distribusi Nilai Aset</h3>
          {data.data_kategori.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-xs">Data aset tidak tersedia.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.data_kategori}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="nilai_aset"
                  nameKey="kategori"
                  stroke="none"
                >
                  {data.data_kategori.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [`Rp ${value.toLocaleString('id-ID')} (${props.payload.persentase}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Categories */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Nilai Aset Per Kategori</h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {data.data_kategori.length === 0 ? (
              <p className="text-muted-foreground text-xs">Tidak ada barang</p>
            ) : (
              data.data_kategori
                .map((item, index) => (
                  <div
                    key={item.kategori}
                    className="px-2.5 py-2 bg-muted rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="font-bold text-xs text-foreground">{item.kategori}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{item.total_stok} unit</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#3B82F6]">
                        Rp {item.nilai_aset.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{item.persentase}%</span>
                    </div>
                    <div className="w-full bg-accent rounded-full h-1 mt-1.5">
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${item.persentase}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="hidden md:block bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-3 py-2 border-b border-border">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Detail Nilai Aset</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Kategori</th>
                <th className="text-center px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Total Stok</th>
                <th className="text-right px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Nilai Aset</th>
                <th className="text-center px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.data_kategori.map((item, index) => (
                <tr key={item.kategori} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="font-bold text-foreground">{item.kategori}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">{item.total_stok} unit</td>
                  <td className="px-3 py-1.5 text-right text-xs font-bold text-[#3B82F6]">
                    Rp {item.nilai_aset.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {item.persentase}%
                    </span>
                  </td>
                </tr>
              ))}
              {data.data_kategori.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-xs">
                    Tidak ada data aset untuk ditampilkan.
                  </td>
                </tr>
              )}
              {data.data_kategori.length > 0 && (
                <tr className="bg-[#3B82F6]/10 font-bold">
                  <td className="px-3 py-2 text-xs text-foreground">TOTAL KESELURUHAN</td>
                  <td className="px-3 py-2 text-center text-xs text-foreground">{data.total_stok_keseluruhan} unit</td>
                  <td className="px-3 py-2 text-right text-xs text-[#3B82F6]">
                    Rp {data.total_nilai_aset.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-foreground">100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="space-y-3 md:hidden">
        {data.data_kategori.map((item, index) => (
          <div key={item.kategori} className="bg-card rounded-xl shadow-sm border border-border p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <h4 className="font-bold text-sm text-foreground">{item.kategori}</h4>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                {item.persentase}%
              </span>
            </div>
            
            <div className="border-t border-border pt-2 flex justify-between text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">Total Stok</span>
                <span className="text-foreground font-medium">{item.total_stok} unit</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">Nilai Aset</span>
                <span className="text-blue-600 font-bold">Rp {item.nilai_aset.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        ))}
        {data.data_kategori.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center text-muted-foreground text-xs">
            Tidak ada data aset untuk ditampilkan.
          </div>
        ) : (
          <div className="bg-[#3B82F6]/5 rounded-xl border border-[#3B82F6]/10 p-4 space-y-2 text-xs font-bold text-foreground">
            <div className="flex justify-between border-b border-blue-100/50 pb-1 text-[10px] text-muted-foreground uppercase font-black tracking-wider">
              <span>Ringkasan</span>
              <span>Total</span>
            </div>
            <div className="flex justify-between">
              <span>Total Stok Keseluruhan</span>
              <span>{data.total_stok_keseluruhan} unit</span>
            </div>
            <div className="flex justify-between">
              <span>Total Nilai Aset</span>
              <span className="text-[#3B82F6]">Rp {data.total_nilai_aset.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
