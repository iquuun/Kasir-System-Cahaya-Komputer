import { useLocation } from 'react-router';
import { Bell } from 'lucide-react';

const pathNames: Record<string, string> = {
  '/': 'Dashboard',
  '/penjualan': 'Penjualan',
  '/pembelian': 'Pembelian',
  '/produk': 'Produk',
  '/stok-opname': 'Stok Opname',
  '/garansi': 'Garansi',
  '/kalkulator': 'Kalkulator Rakitan',
  '/cash-flow': 'Cash Flow',
  '/laporan-laba': 'Laporan Laba',
  '/nilai-aset': 'Nilai Aset',
};

export default function Topbar() {
  const location = useLocation();
  const pageName = pathNames[location.pathname] || 'Sistem Kasir';

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between shrink-0">
      <h2 className="text-sm font-bold text-gray-800 tracking-tight">{pageName}</h2>
      <div className="flex items-center gap-4">
        <div className="text-xs font-medium text-gray-500">
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
        <button className="p-1.5 rounded-md hover:bg-gray-100 relative transition-colors shadow-sm">
          <Bell size={16} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>
      </div>
    </div>
  );
}
