import { useState } from 'react';
import ProdukTab from './ProdukTab';
import KategoriTab from './KategoriTab';
import { Package, Tags } from 'lucide-react';

export default function ProdukPage() {
    const [activeTab, setActiveTab] = useState<'produk' | 'kategori'>('produk');

    const tabs = [
        { id: 'produk', label: 'Data Produk', icon: Package },
        { id: 'kategori', label: 'Kategori Produk', icon: Tags },
    ];

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 max-w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-medium text-xs ${activeTab === tab.id
                                ? 'bg-[#3B82F6] text-white shadow-sm shadow-[#3B82F6]/20'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'produk' ? <ProdukTab /> : <KategoriTab />}
            </div>
        </div>
    );
}
