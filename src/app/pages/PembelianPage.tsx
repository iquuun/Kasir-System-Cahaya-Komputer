import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router';
import PembelianTab from './PembelianTab';
import DistributorPage from './DistributorPage';
import HutangDistributorPage from './HutangDistributorPage';
import CatatanBelanjaTab from './CatatanBelanjaTab';
import { ShoppingBag, Truck, CreditCard, FileText } from 'lucide-react';

export default function PembelianPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab') as 'pembelian' | 'distributor' | 'hutang' | 'catatan' | null;

    const [activeTab, setActiveTab] = useState<'pembelian' | 'distributor' | 'hutang' | 'catatan'>(tabFromUrl || 'pembelian');
    const { isOwner } = useAuth();

    useEffect(() => {
        if (tabFromUrl && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    const handleTabChange = (tab: 'pembelian' | 'distributor' | 'hutang' | 'catatan') => {
        setActiveTab(tab);
        navigate(`?tab=${tab}`, { replace: true });
    };

    return (
        <div className="space-y-3">
            {/* Tab Content */}
            <div>
                {activeTab === 'pembelian' && <PembelianTab />}
                {activeTab === 'distributor' && <DistributorPage />}
                {activeTab === 'hutang' && isOwner && <HutangDistributorPage />}
                {activeTab === 'catatan' && <CatatanBelanjaTab />}
            </div>
        </div>
    );
}
