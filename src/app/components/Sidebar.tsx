import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Box,
  Users,
  ClipboardList,
  Wrench,
  Calculator,
  DollarSign,
  TrendingUp,
  Wallet,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  X,
  ChevronDown,
  ChevronRight,
  History,
  Store,
  Tags,
  List,
  MonitorPlay,
  ShoppingBag,
  Truck,
  CreditCard,
  FileText,
  Monitor,
  LayoutList,
  UserCircle
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
  subItems?: { path: string; label: string; icon: React.ElementType; ownerOnly?: boolean }[];
}

export const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/penjualan', label: 'Penjualan', icon: ShoppingCart, subItems: [
    { path: '/penjualan?tab=pos', label: 'Kasir POS', icon: MonitorPlay },
    { path: '/penjualan?tab=history', label: 'Riwayat', icon: History }
  ] },
  { path: '/pembelian', label: 'Pembelian', icon: Package, subItems: [
    { path: '/pembelian?tab=pembelian', label: 'Barang', icon: ShoppingBag },
    { path: '/pembelian?tab=distributor', label: 'Distributor', icon: Truck },
    { path: '/pembelian?tab=hutang', label: 'Hutang', icon: CreditCard, ownerOnly: true },
    { path: '/pembelian?tab=catatan', label: 'Catatan', icon: FileText }
  ] },
  { path: '/produk', label: 'Produk', icon: Box, subItems: [
    { path: '/produk?tab=produk', label: 'Data', icon: List },
    { path: '/produk?tab=kategori', label: 'Kategori', icon: Tags }
  ] },
  { path: '/stok-opname', label: 'Stok Opname', icon: ClipboardList, subItems: [
    { path: '/stok-opname?tab=opname', label: 'Input Stok Opname', icon: ClipboardList },
    { path: '/stok-opname?tab=history', label: 'Riwayat', icon: History }
  ] },
  { path: '/garansi', label: 'Garansi', icon: Wrench },
  { path: '/kalkulator', label: 'Kalkulator', icon: Calculator, subItems: [
    { path: '/kalkulator?tab=rakitan', label: 'Rakitan', icon: Monitor },
    { path: '/kalkulator?tab=satuan', label: 'E-commerce', icon: ShoppingBag },
    { path: '/kalkulator?tab=pengaturan', label: 'Pengaturan', icon: Settings }
  ] },
  { path: '/cash-flow', label: 'Cash Flow', icon: DollarSign, ownerOnly: true, subItems: [
    { path: '/cash-flow?tab=laba_rugi', label: 'Laba Rugi', icon: TrendingUp },
    { path: '/cash-flow?tab=pembukuan', label: 'Pembukuan', icon: LayoutList },
    { path: '/cash-flow?tab=mutasi', label: 'Buku Kas', icon: Wallet },
    { path: '/cash-flow?tab=gaji', label: 'Penggajian', icon: UserCircle }
  ] },
  { path: '/nilai-aset', label: 'Nilai Aset', icon: Wallet, ownerOnly: true },
  { path: '/pengaturan', label: 'Pengaturan Toko', icon: Settings, ownerOnly: true },
  { path: '/users', label: 'Manajemen Akun', icon: Users, ownerOnly: true },
];

// Popover component for collapsed sidebar — shows label + clickable sub-items
function SidebarPopover({ children, item, show, isOwner }: { children: React.ReactNode; item: NavItem; show: boolean; isOwner: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  if (!show) return <>{children}</>;

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: rect.top,
        left: rect.right + 8,
      });
    }
    setHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setHovered(false), 100);
  };

  const filteredSubItems = item.subItems?.filter(sub => !(sub.ownerOnly && !isOwner)) || [];

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {hovered && (
        <div
          className="fixed z-[9999]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[160px]">
            {/* Header label */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <p className="text-xs font-bold">{item.label}</p>
            </div>
            {/* Sub items */}
            {filteredSubItems.length > 0 && (
              <div className="py-1">
                {filteredSubItems.map(sub => {
                  const SubIcon = sub.icon;
                  const isSubActive = (location.pathname + location.search) === sub.path || (location.search === '' && location.pathname === item.path && filteredSubItems[0].path === sub.path);
                  return (
                    <NavLink
                      key={sub.path}
                      to={sub.path}
                      className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        isSubActive
                          ? 'bg-blue-50 text-blue-600 font-bold dark:bg-blue-900/30'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <SubIcon size={13} className="shrink-0 opacity-80" />
                      <span>{sub.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
            {/* Arrow pointing left */}
            <div className="absolute left-0 top-3 -translate-x-full w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[6px] border-r-white dark:border-r-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}

const itemColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  '/pembelian': { bg: 'bg-purple-50', text: 'text-purple-600', darkBg: 'dark:bg-purple-950/30', darkText: 'dark:text-purple-400' },
  '/stok-opname': { bg: 'bg-amber-50', text: 'text-amber-600', darkBg: 'dark:bg-amber-950/30', darkText: 'dark:text-amber-400' },
  '/kalkulator': { bg: 'bg-teal-50', text: 'text-teal-600', darkBg: 'dark:bg-teal-950/30', darkText: 'dark:text-teal-400' },
  '/cash-flow': { bg: 'bg-emerald-50', text: 'text-emerald-600', darkBg: 'dark:bg-emerald-950/30', darkText: 'dark:text-emerald-400' },
  '/nilai-aset': { bg: 'bg-indigo-50', text: 'text-indigo-600', darkBg: 'dark:bg-indigo-950/30', darkText: 'dark:text-indigo-400' },
  '/pengaturan': { bg: 'bg-slate-100', text: 'text-slate-650', darkBg: 'dark:bg-slate-800/40', darkText: 'dark:text-slate-400' },
  '/users': { bg: 'bg-blue-50', text: 'text-blue-600', darkBg: 'dark:bg-blue-950/30', darkText: 'dark:text-blue-400' }
};

const getColorClasses = (path: string) => {
  return itemColors[path] || { bg: 'bg-blue-50', text: 'text-blue-600', darkBg: 'dark:bg-blue-950/30', darkText: 'dark:text-blue-400' };
};

export default function Sidebar() {
  const { isOwner, logout, user } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // DEFAULT: collapsed
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const toggleMenu = (path: string, e: React.MouseEvent, isMobile: boolean) => {
    e.preventDefault();
    if (isCollapsed && !isMobile) {
      setIsCollapsed(false);
    }
    setExpandedMenu(prev => prev === path ? null : path);
  };

  // Close mobile sidebar and auto-collapse on route change
  useEffect(() => {
    setIsMobileOpen(false);
    if (window.innerWidth > 768) {
      setIsCollapsed(true);
    }
  }, [location.pathname, location.search]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const sidebarContent = (isMobile: boolean) => (
    <>
      <div className={`border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center ${(isCollapsed && !isMobile) ? 'p-2 justify-center' : 'p-4 justify-between'}`}>
        {(!isCollapsed || isMobile) && (
          <div className="overflow-hidden bg-white rounded-lg p-1 mr-2 flex items-center justify-center shrink-0 w-12 h-12">
            <img src="/Cahaya Logo.png" alt="Store Logo" className="w-full h-full object-contain" />
          </div>
        )}
        {isMobile ? (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white shrink-0"
          >
            <X size={22} />
          </button>
        ) : (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 dark:text-slate-500 shrink-0"
            title={isCollapsed ? "Perbesar Menu" : "Perkecil Menu"}
          >
            {isCollapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
          </button>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent flex flex-col ${(isCollapsed && !isMobile) ? 'p-1.5' : 'p-3'}`}>
        {navItems.map((item) => {
          if (item.ownerOnly && !isOwner) return null;

          const Icon = item.icon;

          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedMenu === item.path;

          const link = (
            <div key={item.path} className="mb-0.5 w-full">
              {hasSubItems ? (
                <button
                  onClick={(e) => toggleMenu(item.path, e, isMobile)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md w-full transition-all text-xs ${
                    location.pathname.startsWith(item.path)
                      ? 'bg-blue-50 text-blue-600 font-bold dark:bg-blue-900/30 dark:text-blue-400'
                      : `text-slate-600 dark:text-slate-400 hover:bg-slate-50 hover:text-blue-600 dark:hover:bg-slate-800/50 font-medium ${(!isCollapsed || isMobile) ? 'hover:translate-x-1' : ''}`
                  } ${(isCollapsed && !isMobile) ? 'justify-center gap-0' : 'gap-2.5'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={18} className="shrink-0" />
                    {(!isCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
                  </div>
                  {(!isCollapsed || isMobile) && (
                    <div className="shrink-0 text-slate-400">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  )}
                </button>
              ) : (
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => {
                    setIsMobileOpen(false);
                    setIsCollapsed(true);
                  }}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-md transition-all text-xs w-full ${
                      isActive
                        ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-600/20'
                        : `text-slate-600 dark:text-slate-400 hover:bg-slate-50 hover:text-blue-600 dark:hover:bg-slate-800/50 font-medium ${(!isCollapsed || isMobile) ? 'hover:translate-x-1' : ''}`
                    } ${(isCollapsed && !isMobile) ? 'justify-center gap-0' : 'gap-2.5'}`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {(!isCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
                </NavLink>
              )}
              
              {hasSubItems && isExpanded && (!isCollapsed || isMobile) && (
                <div className="flex flex-col gap-0.5 mt-0.5 pl-6 pr-2 animate-in slide-in-from-top-1">
                  {item.subItems!.map(sub => {
                    if (sub.ownerOnly && !isOwner) return null;
                    const isSubActive = (location.pathname + location.search) === sub.path || (location.search === '' && location.pathname === item.path && item.subItems![0].path === sub.path);
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        onClick={() => {
                          setIsMobileOpen(false);
                          setIsCollapsed(true);
                        }}
                        className={`flex items-center gap-2 py-1.5 px-3 rounded-md text-[11px] font-medium transition-all ${
                            isSubActive
                              ? 'bg-blue-50 text-blue-700 font-bold shadow-sm dark:bg-blue-900/30 dark:text-blue-400' 
                              : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:translate-x-0.5'
                          }`
                        }
                      >
                        <SubIcon size={14} className="shrink-0 opacity-80" />
                        <span className="truncate">{sub.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
 
          if (isCollapsed && !isMobile) {
            return (
              <SidebarPopover key={item.path} item={item} show={true} isOwner={isOwner}>
                {link}
              </SidebarPopover>
            );
          }
 
          return link;
        })}
      </nav>
 
      <div className={`border-t border-slate-100 dark:border-slate-800 shrink-0 ${(isCollapsed && !isMobile) ? 'p-1.5' : 'p-3'}`}>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className={`flex items-center px-3 py-2 rounded-md w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:text-red-400 transition-all text-xs font-semibold ${(!isCollapsed || isMobile) ? 'hover:translate-x-1' : ''} ${(isCollapsed && !isMobile) ? 'justify-center gap-0' : 'gap-2.5'}`}
            title={isCollapsed && !isMobile ? "Keluar" : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {(!isCollapsed || isMobile) && <span className="truncate">Keluar</span>}
          </button>
      </div>
    </>
  );
 
  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex h-screen bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 print:hidden relative ${isCollapsed ? 'w-14' : 'w-44'}`}>
        {/* Subtle decorative glow at the top */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
        {sidebarContent(false)}
      </div>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Bottom Sheet Menu */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2.5rem] shadow-2xl border-t border-gray-100/70 flex flex-col transform transition-transform duration-300 ease-in-out print:hidden max-h-[85vh] overflow-hidden ${isMobileOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Drag Handle & Top Indicator */}
        <div className="flex justify-center py-3.5 shrink-0">
          <div className="w-16 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full cursor-pointer hover:bg-gray-400 transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-gray-150/40 sticky top-0 bg-white/85 backdrop-blur-md z-10 shrink-0">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-wider uppercase">Menu Utama</h3>
            <p className="text-[9px] text-gray-400 font-bold mt-0.5 uppercase tracking-wide">Kasir System Cahaya Komputer</p>
          </div>
          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
            title="Tutup Menu"
          >
            <X size={15} />
          </button>
        </div>

        {/* Profile Info */}
        <div className="mx-6 my-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100/30 dark:border-slate-700 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500 text-white flex items-center justify-center font-extrabold text-base shadow-sm shadow-blue-500/20">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-gray-900 leading-tight">{user?.name || 'User'}</h4>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">{isOwner ? 'Owner / Admin' : 'Staf Kasir'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-extrabold text-emerald-600 uppercase tracking-wider">Aktif</span>
          </div>
        </div>

        {/* Menu Items List */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[55vh] space-y-4">
          <div className="rounded-2xl border border-gray-150/50 bg-white shadow-sm overflow-hidden divide-y divide-gray-150/40">
            {navItems.map((item) => {
              if (item.ownerOnly && !isOwner) return null;
              // Skip items already in bottom nav
              if (['/', '/penjualan', '/produk', '/garansi'].includes(item.path)) return null;

              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedMenu === item.path;
              const colorClasses = getColorClasses(item.path);

              return (
                <div key={item.path}>
                  {hasSubItems ? (
                    <div>
                      <button
                        onClick={(e) => toggleMenu(item.path, e, true)}
                        className={`w-full flex items-center justify-between p-4 text-left text-xs font-bold transition-colors ${
                          isExpanded ? 'bg-slate-50/50' : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${colorClasses.bg} ${colorClasses.text} ${colorClasses.darkBg} ${colorClasses.darkText} shadow-sm shadow-blue-500/5`}>
                            <Icon size={16} />
                          </div>
                          <span className="text-gray-800">{item.label}</span>
                        </div>
                        <ChevronRight size={16} className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-blue-500' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="bg-slate-50/20 pb-3 pt-1 px-4 space-y-1 border-t border-gray-100/50 animate-in slide-in-from-top-2 duration-200">
                          <div className="pl-6 border-l-2 border-gray-200 space-y-1 mt-1">
                            {item.subItems!.map(sub => {
                              if (sub.ownerOnly && !isOwner) return null;
                              const SubIcon = sub.icon;
                              const isSubActive = (location.pathname + location.search) === sub.path || (location.search === '' && location.pathname === item.path && item.subItems![0].path === sub.path);
                              return (
                                <NavLink
                                  key={sub.path}
                                  to={sub.path}
                                  onClick={() => setIsMobileOpen(false)}
                                  className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all ${
                                    isSubActive 
                                      ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20' 
                                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                  }`}
                                >
                                  <SubIcon size={14} className="shrink-0" />
                                  <span>{sub.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <NavLink
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between p-4 text-xs font-bold transition-all w-full ${
                          isActive
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'hover:bg-gray-50/50 text-gray-800'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${location.pathname === item.path ? 'bg-white/20 text-white' : `${colorClasses.bg} ${colorClasses.text} ${colorClasses.darkBg} ${colorClasses.darkText}`} shadow-sm`}>
                          <Icon size={16} />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight size={16} className={`${location.pathname === item.path ? 'text-white' : 'text-gray-400'}`} />
                    </NavLink>
                  )}
                </div>
              );
            })}
          </div>

          {/* Logout button */}
          <div className="pt-2">
            <button
              onClick={() => {
                setIsMobileOpen(false);
                setIsLogoutModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2.5 p-3.5 border border-red-100 hover:bg-red-50 text-red-650 rounded-2xl text-xs font-bold transition-all shadow-sm"
            >
              <LogOut size={16} className="shrink-0" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar (Hamburger Trigger) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg border-t border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] pb-4 pt-2.5 px-3 print:hidden">
        <div className="flex items-center justify-around">
          <NavLink to="/" end className={({ isActive }) => `relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-300 ${isActive ? 'text-blue-500 scale-105 font-black' : 'text-gray-400 hover:text-gray-600'}`}>
            {({ isActive }) => (
              <>
                <LayoutDashboard size={20} className={`transition-transform duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                <span className="text-[10px] font-bold">Home</span>
                <div className={`absolute bottom-[-6px] w-1.5 h-1.5 rounded-full bg-blue-500 transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
              </>
            )}
          </NavLink>
          <NavLink to="/penjualan" className={({ isActive }) => `relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-300 ${isActive ? 'text-blue-500 scale-105 font-black' : 'text-gray-400 hover:text-gray-600'}`}>
            {({ isActive }) => (
              <>
                <ShoppingCart size={20} className={`transition-transform duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                <span className="text-[10px] font-bold">Kasir</span>
                <div className={`absolute bottom-[-6px] w-1.5 h-1.5 rounded-full bg-blue-500 transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
              </>
            )}
          </NavLink>
          <NavLink to="/pembelian" className={({ isActive }) => `relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-300 ${isActive ? 'text-blue-500 scale-105 font-black' : 'text-gray-400 hover:text-gray-600'}`}>
            {({ isActive }) => (
              <>
                <Package size={20} className={`transition-transform duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                <span className="text-[10px] font-bold">Pembelian</span>
                <div className={`absolute bottom-[-6px] w-1.5 h-1.5 rounded-full bg-blue-500 transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
              </>
            )}
          </NavLink>
          {isOwner ? (
            <NavLink to="/cash-flow" className={({ isActive }) => `relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-300 ${isActive ? 'text-blue-500 scale-105 font-black' : 'text-gray-400 hover:text-gray-600'}`}>
              {({ isActive }) => (
                <>
                  <DollarSign size={20} className={`transition-transform duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                  <span className="text-[10px] font-bold">Cash Flow</span>
                  <div className={`absolute bottom-[-6px] w-1.5 h-1.5 rounded-full bg-blue-500 transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </>
              )}
            </NavLink>
          ) : (
            <NavLink to="/garansi" className={({ isActive }) => `relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-300 ${isActive ? 'text-blue-500 scale-105 font-black' : 'text-gray-400 hover:text-gray-600'}`}>
              {({ isActive }) => (
                <>
                  <Wrench size={20} className={`transition-transform duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                  <span className="text-[10px] font-bold">Garansi</span>
                  <div className={`absolute bottom-[-6px] w-1.5 h-1.5 rounded-full bg-blue-500 transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </>
              )}
            </NavLink>
          )}
          <button
            onClick={() => setIsMobileOpen(true)}
            className={`relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-300 ${
              isMobileOpen 
                ? 'text-blue-500 scale-105 font-black' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Menu size={20} className={`transition-transform duration-300 ${isMobileOpen ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            <span className="text-[10px] font-bold">Menu</span>
            <div className={`absolute bottom-[-6px] w-1.5 h-1.5 rounded-full bg-blue-500 transition-all duration-300 ${isMobileOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center text-black">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <LogOut className="text-red-500 w-8 h-8 ml-1" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Keluar</h3>
              <p className="text-sm text-gray-500">
                Apakah Anda yakin ingin keluar dari sistem? Anda harus login kembali untuk mengakses data toko.
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 text-black">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-colors shadow-sm"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                }}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors shadow-sm"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
