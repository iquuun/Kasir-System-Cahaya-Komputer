import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router';
import LaporanLabaPage from './LaporanLabaPage';
import MutasiRekeningTab from './MutasiRekeningTab';
import PembukuanPenjualanTab from './PembukuanPenjualanTab';
import EmployeeSalaryTab from './EmployeeSalaryTab';
import { TrendingUp, LayoutList, Wallet, UserCircle } from 'lucide-react';

export default function CashFlowPage() {
  const { isOwner } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab') as 'laba_rugi' | 'pembukuan' | 'mutasi' | 'gaji' | null;

  const [activeTab, setActiveTab] = useState<'laba_rugi' | 'pembukuan' | 'mutasi' | 'gaji'>(tabFromUrl || 'laba_rugi');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: 'laba_rugi' | 'pembukuan' | 'mutasi' | 'gaji') => {
    setActiveTab(tab);
    navigate(`?tab=${tab}`, { replace: true });
  };

  if (!isOwner) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">


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

