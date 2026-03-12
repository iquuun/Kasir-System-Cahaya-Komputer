import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import { CreditCard, DollarSign } from 'lucide-react';
import api from '../api';

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
}

export default function HutangDistributorPage() {
  const { isOwner } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  if (loading) return <div className="p-5 text-center text-gray-500">Memuat data hutang...</div>;
  if (error) return <div className="p-5 text-center text-red-500">{error}</div>;

  const hutangList = purchases.filter(p => p.status_pembayaran === 'hutang' || Number(p.total_pembelian) > Number(p.terbayar));

  const totalHutang = hutangList.reduce((sum, h) => sum + Number(h.total_pembelian), 0);
  const totalTerbayar = hutangList.reduce((sum, h) => sum + Number(h.terbayar), 0);
  const totalSisa = hutangList.reduce((sum, h) => sum + (Number(h.total_pembelian) - Number(h.terbayar)), 0);
  const hutangAktif = hutangList;

  // Group by distributor
  const hutangPerDistributor = hutangList.reduce((acc, hutang) => {
    const distributorName = hutang.distributor?.name || 'Unknown';
    if (!acc[distributorName]) {
      acc[distributorName] = 0;
    }
    acc[distributorName] += (Number(hutang.total_pembelian) - Number(hutang.terbayar));
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Hutang Distributor</h2>
        <p className="text-gray-600 mt-1">Kelola hutang pembelian dari distributor</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="text-[#3B82F6]" size={16} />
            </div>
            <p className="text-xs text-gray-600">Total Hutang</p>
          </div>
          <p className="text-xl font-semibold text-[#3B82F6]">
            Rp {totalHutang.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-green-600" size={16} />
            </div>
            <p className="text-xs text-gray-600">Terbayar</p>
          </div>
          <p className="text-xl font-semibold text-green-600">
            Rp {totalTerbayar.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <CreditCard className="text-red-600" size={16} />
            </div>
            <p className="text-xs text-gray-600">Sisa Hutang</p>
          </div>
          <p className="text-xl font-semibold text-red-600">
            Rp {totalSisa.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-600 mb-3">Hutang Aktif</p>
          <p className="text-xl font-semibold text-gray-800">{hutangAktif.length}</p>
          <p className="text-[11px] text-gray-500 mt-1">Pembelian Belum Lunas</p>
        </div>
      </div>

      {/* Hutang Per Distributor */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 className="text-base font-medium text-gray-800 mb-3">Hutang Per Distributor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(hutangPerDistributor)
            .filter(([_, sisa]) => sisa > 0)
            .map(([distributor, sisa]) => (
              <div key={distributor} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-gray-800 mb-1">{distributor}</p>
                <p className="text-lg font-semibold text-red-600">
                  Rp {sisa.toLocaleString('id-ID')}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-medium text-gray-800">Detail Hutang</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-700">Invoice</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-700">Distributor</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-700">Tanggal</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-700">Total</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-700">Terbayar</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-700">Sisa</th>
                <th className="text-center px-4 py-2 text-xs font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hutangAktif.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-5 text-center text-gray-500">
                    Tidak ada hutang aktif saat ini.
                  </td>
                </tr>
              ) : (
                hutangAktif.map((hutang) => {
                  const total = Number(hutang.total_pembelian);
                  const terbayar = Number(hutang.terbayar);
                  const sisa = total - terbayar;
                  const persentaseBayar = (terbayar / total) * 100;

                  return (
                    <tr key={hutang.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{hutang.invoice || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{hutang.distributor?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(hutang.tanggal).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        Rp {total.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        Rp {terbayar.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-red-600">
                          Rp {sisa.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 mb-1">
                            Belum Lunas
                          </span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-green-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(persentaseBayar, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] text-gray-500 mt-1">
                            {persentaseBayar.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
