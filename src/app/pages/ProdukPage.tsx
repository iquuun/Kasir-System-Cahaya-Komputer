import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import ProdukTab from './ProdukTab';
import KategoriTab from './KategoriTab';
import { Package, Tags } from 'lucide-react';

export default function ProdukPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab') as 'produk' | 'kategori' | null;

    const [activeTab, setActiveTab] = useState<'produk' | 'kategori'>(tabFromUrl || 'produk');

    useEffect(() => {
        if (tabFromUrl && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    const handleTabChange = (tab: 'produk' | 'kategori') => {
        setActiveTab(tab);
        navigate(`?tab=${tab}`, { replace: true });
    };

    const tabs = [
        { id: 'produk', label: 'Data Produk', icon: Package },
        { id: 'kategori', label: 'Kategori Produk', icon: Tags },
    ];

    return (
        <div className="space-y-3">


            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'produk' ? <ProdukTab /> : <KategoriTab />}
            </div>
        </div>
    );
}
