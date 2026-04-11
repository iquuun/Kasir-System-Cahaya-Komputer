import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router';
import LaporanLabaPage from './LaporanLabaPage';
import MutasiRekeningTab from './MutasiRekeningTab';
import PembukuanPenjualanTab from './PembukuanPenjualanTab';
import EmployeeSalaryTab from './EmployeeSalaryTab';
import { TrendingUp, LayoutList, Wallet, UserCircle } from 'lucide-react';

export default function CashFlowPage() {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'laba_rugi' | 'pembukuan' | 'mutasi' | 'gaji'>('laba_rugi');

  if (!isOwner) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-gray-100 p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('laba_rugi')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'laba_rugi'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingUp size={16} />
          Laporan Keuangan Toko
        </button>
        <button
          onClick={() => setActiveTab('pembukuan')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'pembukuan'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <LayoutList size={16} />
          Pembukuan Penjualan
        </button>
        <button
          onClick={() => setActiveTab('mutasi')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'mutasi'
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Wallet size={16} />
          Mutasi Rekening Cash
        </button>
        <button
          onClick={() => setActiveTab('gaji')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'gaji'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <UserCircle size={16} />
          Gaji Karyawan
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'laba_rugi' && <LaporanLabaPage isEmbedded />}
        {activeTab === 'pembukuan' && <PembukuanPenjualanTab />}
        {activeTab === 'mutasi' && <MutasiRekeningTab />}
        {activeTab === 'gaji' && <EmployeeSalaryTab />}
      </div>
    </div>
  );
}

