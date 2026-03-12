import { NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Box,
  Folder,
  Users,
  ClipboardList,
  Wrench,
  Calculator,
  DollarSign,
  TrendingUp,
  Wallet,
  Settings,
  LogOut,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/penjualan', label: 'Penjualan', icon: ShoppingCart },
  { path: '/pembelian', label: 'Pembelian', icon: Package },
  { path: '/produk', label: 'Produk', icon: Box },
  { path: '/stok-opname', label: 'Stok Opname', icon: ClipboardList },
  { path: '/garansi', label: 'Garansi', icon: Wrench },
  { path: '/kalkulator', label: 'Kalkulator Rakitan', icon: Calculator },
  { path: '/cash-flow', label: 'Cash Flow', icon: DollarSign, ownerOnly: true },
  { path: '/laporan-laba', label: 'Laporan Laba', icon: TrendingUp, ownerOnly: true },
  { path: '/nilai-aset', label: 'Nilai Aset', icon: Wallet, ownerOnly: true },
  { path: '/pengaturan', label: 'Pengaturan Toko', icon: Settings, ownerOnly: true },
];

export default function Sidebar() {
  const { isOwner, logout, user } = useAuth();

  return (
    <div className="w-56 bg-[#3B82F6] text-white flex flex-col shrink-0">
      <div className="p-4 border-b border-white/10 shrink-0">
        <h1 className="text-base font-bold tracking-wide">CAHAYA KOMPUTER</h1>
        <p className="text-xs text-white/80 mt-0.5">{user?.name}</p>
        <p className="text-[10px] uppercase tracking-wider text-white/50">{user?.role}</p>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {navItems.map((item) => {
          if (item.ownerOnly && !isOwner) return null;

          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md mb-0.5 transition-all text-xs ${isActive
                  ? 'bg-white text-[#3B82F6] font-bold shadow-sm'
                  : 'text-white/80 hover:bg-white/10 font-medium'
                }`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md w-full text-white/80 hover:bg-white/10 transition-all text-xs font-medium"
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
