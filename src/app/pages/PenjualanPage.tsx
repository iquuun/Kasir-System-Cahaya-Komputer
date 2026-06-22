import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Plus, Trash2, Printer, History, ShoppingCart, Ban, ChevronLeft, ChevronRight, Calendar, Download, GripVertical, Edit2, Save, Settings, RotateCcw, Camera, X as XIcon, ArrowUpDown, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useLocation, useNavigate } from 'react-router';
import StoreProfileModal from '../components/StoreProfileModal';
import * as XLSX from 'xlsx';
import api, { API_ASSET_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Helper to convert number to Indonesian words (Terbilang)
 */
const terbilang = (n: number): string => {
  const units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (n === 0) return "";
  if (n < 12) return units[n];
  if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) return (Math.floor(n / 10) === 1 ? "sepuluh" : units[Math.floor(n / 10)] + " puluh") + " " + terbilang(n % 10);
  if (n < 200) return "seratus " + terbilang(n - 100);
  if (n < 1000) return (Math.floor(n / 100) === 1 ? "seratus" : units[Math.floor(n / 100)] + " ratus") + " " + terbilang(n % 100);
  if (n < 2000) return "seribu " + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " ribu " + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " juta " + terbilang(n % 1000000);
  if (n < 1000000000000) return terbilang(Math.floor(n / 1000000000)) + " milyar " + terbilang(n % 1000000000);
  return "";
};

const formatTerbilang = (n: number): string => {
  if (n === 0) return "nolrupiah";
  const result = terbilang(Math.floor(n));
  return (result + "rupiah").replace(/\s+/g, '').trim();
};

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  kode?: string;
  name: string;
  harga_jual: number;
  stok_saat_ini: number;
  category_id: number;
  category?: Category;
}

interface SaleItem {
  id?: number;
  product: Product;
  qty: number;
  harga_jual_saat_itu: number;
  is_sub?: boolean;
  parent_id?: number;
  satuan?: string;
  manual_name?: string;
}

interface Sale {
  id: number;
  invoice: string;
  channel: string;
  tanggal: string;
  total_penjualan: number;
  pembayaran: number;
  kembalian: number;
  status_bayar?: string;
  sisa_bayar?: number;
  items: SaleItem[];
  user?: { name: string };
  tax_percent: number;
  tax_amount: number;
  username_pembeli?: string;
  alamat_pembeli?: string;
  telepon_pembeli?: string;
  no_pesanan?: string;
  no_resi?: string;
}
const formatNumber = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '';
  if (value === 0 || value === '0' || value === '') return '';
  const num = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ''), 10) : value;
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('id-ID');
};

const parseNumber = (text: string): number => {
  if (!text) return 0;
  const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

export default function PenjualanPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab') as 'pos' | 'history' | null;
  useDocumentTitle('Kasir Penjualan');

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>(tabFromUrl || 'pos');

  // Sync state if URL changes externally (from sidebar)
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab && tabFromUrl !== 'profile') {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Listen for openProfileModal event from Topbar
  useEffect(() => {
    const handleOpenProfile = () => setIsProfileModalOpen(true);
    document.addEventListener('openProfileModal', handleOpenProfile);
    return () => document.removeEventListener('openProfileModal', handleOpenProfile);
  }, []);

  // Update URL when tab changes internally
  const handleTabChange = (tab: 'pos' | 'history') => {
    setActiveTab(tab);
    navigate(`?tab=${tab}`, { replace: true });
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const salesRef = useRef<Sale[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // F10 Shortcut Handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-f10') as HTMLButtonElement | null;
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    salesRef.current = sales;
  }, [sales]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const initDraft = () => {
    try {
      const saved = localStorage.getItem('draftKasir');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  };
  const draft = initDraft() || {};

  const [saleItems, setSaleItems] = useState<SaleItem[]>(draft.saleItems || []);
  const [loading, setLoading] = useState(true);
  const [visibleProducts, setVisibleProducts] = useState(30);

  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // Sale Options
  const [channel, setChannel] = useState(draft.channel || 'Offline');
  const [payment, setPayment] = useState(draft.payment || '0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [useStampForCurrentPrint, setUseStampForCurrentPrint] = useState(false);
  const [customerAddress, setCustomerAddress] = useState(draft.customerAddress || '');
  const [customerPhone, setCustomerPhone] = useState(draft.customerPhone || '');
  const [customerName, setCustomerName] = useState(draft.customerName || '');
  const [noPesanan, setNoPesanan] = useState(draft.noPesanan || '');
  const [noResi, setNoResi] = useState(draft.noResi || '');
  const [isCustomerInfoExpanded, setIsCustomerInfoExpanded] = useState(() => {
    return window.innerWidth > 768; // default expanded on desktop, collapsed on mobile
  });
  const [taxPercent, setTaxPercent] = useState(draft.taxPercent || 0);
  const [isManual, setIsManual] = useState(false);
  const [manualInvoice, setManualInvoice] = useState('');
  const [manualDate, setManualDate] = useState('');

  // Edit Invoice state
  const [editTarget, setEditTarget] = useState<Sale | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scanTarget, setScanTarget] = useState<'pos' | 'edit' | 'inline'>('pos');
  const [inlineScanTarget, setInlineScanTarget] = useState<number | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const originalResiVal = useRef<string>('');
  const scannerContainerId = 'barcode-scanner-container';

  // Template Management
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (activeTab === 'pos') {
      localStorage.setItem('draftKasir', JSON.stringify({
        saleItems, channel, payment, customerAddress, customerPhone, customerName, noPesanan, noResi, taxPercent
      }));
    }
  }, [saleItems, channel, payment, customerAddress, customerPhone, customerName, noPesanan, noResi, taxPercent, activeTab]);

  // Scanner open/close logic
  const openScanner = useCallback((target: 'pos' | 'edit' | 'inline') => {
    setScanTarget(target);
    setShowScanner(true);
  }, []);

  const closeScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error during scanner stop/clear:', e);
      }
      scannerRef.current = null;
    }
    setShowScanner(false);
  }, []);

  useEffect(() => {
    if (lastSale && shouldPrint) {
      const handlePrint = () => {
        const logoImg = document.querySelector('.faktur-print img') as HTMLImageElement;
        
        let isExecuted = false;
        const executePrint = () => {
          if (isExecuted) return;
          isExecuted = true;
          setTimeout(() => {
            window.print();
            setShouldPrint(false);
            toast.success('Transaksi Berhasil!');
          }, 500);
        };

        if (logoImg && !logoImg.complete) {
          logoImg.onload = executePrint;
          logoImg.onerror = executePrint; // fallback
          // Safety timeout in case load takes too long
          setTimeout(executePrint, 3000);
        } else {
          executePrint();
        }
      };
      
      handlePrint();
    }
  }, [lastSale, shouldPrint]);
  // History filters & pagination
  const [historySearch, setHistorySearch] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const toDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return {
      preset: 'all',
      start: toDateString(start),
      end: toDateString(end)
    };
  });

  const applyPreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (preset === 'today') {
      // default
    } else if (preset === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (preset === 'week') {
      start.setDate(today.getDate() - 7);
    } else if (preset === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (preset === '3month') {
      start.setMonth(today.getMonth() - 3);
    } else if (preset === 'all') {
      start = new Date('2020-01-01');
    }
    
    const toDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDateRange({
      preset,
      start: toDateString(start),
      end: toDateString(end)
    });
    setHistoryPage(1);
    if (preset !== 'custom') setShowDatePicker(false);
  };
  const [historyChannel, setHistoryChannel] = useState('Semua Channel');
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 50;

  // Dynamically extract unique channels
  const uniqueChannels = useMemo(() => {
    const channels = sales.map(s => s.channel).filter(Boolean);
    return ['Semua Channel', ...Array.from(new Set(channels))];
  }, [sales]);

  // Sorting state & functions
  const [sortField, setSortField] = useState<'invoice' | 'tanggal'>('tanggal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'invoice' | 'tanggal') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'tanggal' ? 'desc' : 'asc');
    }
    setHistoryPage(1);
  };

  const renderSortIndicator = (field: 'invoice' | 'tanggal') => {
    if (sortField !== field) return <ArrowUpDown size={10} className="text-gray-400 ml-1 inline-block" />;
    return sortDirection === 'asc' 
      ? <ChevronUp size={10} className="text-blue-500 ml-1 inline-block" /> 
      : <ChevronDown size={10} className="text-blue-500 ml-1 inline-block" />;
  };

  // Play scanner beep sound programmatically
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'triangle'; // triangle wave is sharper and louder
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz pitch
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Louder volume (0.5)

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // 150ms duration
    } catch (e) {
      console.warn('Browser AudioContext beep failed:', e);
    }
  };

  // Ref updates for scanner callback to prevent camera restarts on state change
  const inlineScanTargetRef = useRef(inlineScanTarget);
  const scanTargetRef = useRef(scanTarget);
  const editFormRef = useRef(editForm);

  useEffect(() => {
    inlineScanTargetRef.current = inlineScanTarget;
    scanTargetRef.current = scanTarget;
    editFormRef.current = editForm;
  }, [inlineScanTarget, scanTarget, editForm]);

  // List of scannable sales matching current filters & sorting
  const scannableSales = useMemo(() => {
    const filtered = sales.filter((s) => {
      const searchLower = historySearch.toLowerCase();
      const matchSearch = !historySearch || 
        s.invoice.toLowerCase().includes(searchLower) ||
        (s.username_pembeli || '').toLowerCase().includes(searchLower) ||
        (s.no_pesanan || '').toLowerCase().includes(searchLower) ||
        (s.no_resi || '').toLowerCase().includes(searchLower);
      const saleDateStr = s.tanggal ? s.tanggal.substring(0, 10) : '';
      const matchDateRange = dateRange.preset === 'all' || 
        (saleDateStr >= dateRange.start && saleDateStr <= dateRange.end);
      const matchChannel = historyChannel === 'Semua Channel' || s.channel === historyChannel;
      return matchSearch && matchDateRange && matchChannel;
    });

    const sorted = [...filtered].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'invoice') {
        valA = a.invoice.toLowerCase();
        valB = b.invoice.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      } else if (sortField === 'tanggal') {
        if (a.id < b.id) return sortDirection === 'asc' ? -1 : 1;
        if (a.id > b.id) return sortDirection === 'asc' ? 1 : -1;
      }

      if (sortField !== 'invoice') {
        const invA = a.invoice.toLowerCase();
        const invB = b.invoice.toLowerCase();
        if (invA < invB) return 1;
        if (invA > invB) return -1;
      }
      return 0;
    });

    return sorted;
  }, [sales, historySearch, dateRange, historyChannel, sortField, sortDirection]);

  // Navigate between scannable orders inside the barcode scanner modal
  const navigateScanner = (direction: 'prev' | 'next') => {
    if (scanTarget !== 'inline' || !inlineScanTarget) return;
    const currentIndex = scannableSales.findIndex(s => s.id === inlineScanTarget);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === 'prev') {
      targetIndex = currentIndex - 1;
    } else {
      targetIndex = currentIndex + 1;
    }

    if (targetIndex >= 0 && targetIndex < scannableSales.length) {
      setInlineScanTarget(scannableSales[targetIndex].id);
    }
  };

  // Scanner initialization and processing
  useEffect(() => {
    if (!showScanner) return;
    const timer = setTimeout(() => {
      const container = document.getElementById(scannerContainerId);
      if (!container) return;

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const currentScanTarget = scanTargetRef.current;
          const currentInlineScanTarget = inlineScanTargetRef.current;
          const currentEditForm = editFormRef.current;

          if (currentScanTarget === 'pos') {
            const isConfirmed = window.confirm(`Barcode terdeteksi:\n\n${decodedText}\n\nApakah ini sudah benar dan ingin disimpan?`);
            if (!isConfirmed) return;
            playBeep();
            setNoResi(decodedText);
            toast.success(`Barcode berhasil disimpan: ${decodedText}`);
            closeScanner();
          } else if (currentScanTarget === 'edit' && currentEditForm) {
            const isConfirmed = window.confirm(`Barcode terdeteksi:\n\n${decodedText}\n\nApakah ini sudah benar dan ingin disimpan?`);
            if (!isConfirmed) return;
            playBeep();
            setEditForm((prev: any) => ({ ...prev, no_resi: decodedText }));
            toast.success(`Barcode berhasil disimpan: ${decodedText}`);
            closeScanner();
          } else if (currentScanTarget === 'inline' && currentInlineScanTarget) {
            const currentSales = salesRef.current;
            const targetSale = currentSales.find(s => s.id === currentInlineScanTarget);
            
            if (targetSale) {
              // 1. Check if same barcode is already stored on this sale
              if (targetSale.no_resi === decodedText) {
                toast.info(`Info: Barcode ini sudah tersimpan pada transaksi ini.`);
                return;
              }

              // 2. Check if barcode is already used on another sale
              const otherSale = currentSales.find(s => s.id !== currentInlineScanTarget && (
                (s.no_pesanan && s.no_pesanan === decodedText) ||
                (s.no_resi && s.no_resi === decodedText)
              ));

              if (otherSale) {
                toast.error(`❌ TIDAK COCOK! Barcode ini terdeteksi milik ${otherSale.invoice} (${otherSale.username_pembeli || 'UMUM'}).`, { duration: 5000 });
                return;
              }

              // 3. Confirm overwrite if resi already exists, or regular confirm
              if (targetSale.no_resi) {
                const overwriteConfirm = window.confirm(`⚠️ Transaksi ini sudah memiliki No. Resi: "${targetSale.no_resi}".\nApakah Anda yakin ingin menimpa dengan No. Resi yang baru?`);
                if (!overwriteConfirm) return;
              } else {
                const isConfirmed = window.confirm(`Barcode terdeteksi:\n\n${decodedText}\n\nApakah ini sudah benar dan ingin disimpan?`);
                if (!isConfirmed) return;
              }

              playBeep();

              // 4. Match check and save
              if (targetSale.no_pesanan && targetSale.no_pesanan === decodedText) {
                toast.success(`✓ COCOK! Barcode sesuai dengan No. Pesanan pada Invoice ${targetSale.invoice}!`, { duration: 4000 });
              } else {
                toast.success(`✓ COCOK! Resi berhasil di-scan & disimpan untuk Invoice ${targetSale.invoice}!`, { duration: 4000 });
              }

              setSales((prevSales: any[]) => prevSales.map(s => s.id === currentInlineScanTarget ? { ...s, no_resi: decodedText } : s));
              api.put(`/sales/${currentInlineScanTarget}`, { no_resi: decodedText })
                .catch(() => toast.error('Gagal menyimpan No. Resi ke server.'));
            }
          }
        },
        () => {}
      ).catch((err: any) => {
        console.error('Scanner error', err);
        toast.error('Gagal membuka kamera. Pastikan izin kamera telah diberikan.');
        closeScanner();
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch (e) {
          console.warn('Error during scanner cleanup:', e);
        }
        scannerRef.current = null;
      }
    };
  }, [showScanner, scanTarget]);

  // Void modal state
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const confirmVoid = async () => {
    if (!voidTarget) return;
    try {
      setIsVoiding(true);
      await api.delete(`/sales/${voidTarget.id}`);
      toast.success(`Transaksi ${voidTarget.invoice} berhasil di-void. Stok telah dikembalikan.`);
      setVoidTarget(null);
      const [salesRes, prodRes] = await Promise.all([
        api.get('/sales'),
        api.get('/products'),
      ]);
      setSales(salesRes.data);
      setProducts(prodRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membatalkan transaksi');
    } finally {
      setIsVoiding(false);
    }
  };

  const openEditModal = (sale: Sale) => {
    setEditTarget(sale);
    
    // Format date for datetime-local input safely
    let formattedDate = '';
    if (sale.tanggal) {
      const d = new Date(sale.tanggal);
      const pad = (n: number) => n.toString().padStart(2, '0');
      formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    setEditForm({
      items: sale.items.map(item => ({
        id: item.id,
        harga_jual_saat_itu: item.harga_jual_saat_itu,
        manual_name: item.manual_name || item.product?.name || ''
      })),
      username_pembeli: sale.username_pembeli || '',
      alamat_pembeli: sale.alamat_pembeli || '',
      telepon_pembeli: sale.telepon_pembeli || '',
      no_pesanan: sale.no_pesanan || '',
      no_resi: sale.no_resi || '',
      channel: sale.channel || 'Offline',
      pembayaran: sale.pembayaran || 0,
      tanggal: formattedDate,
    });
  };

  const submitEditInvoice = async () => {
    if (!editTarget || !editForm) return;
    try {
      setIsEditing(true);

      // Recalculate total
      let newTotal = 0;
      editTarget.items.forEach((origItem, idx) => {
        const editedItem = editForm.items[idx];
        newTotal += (Number(editedItem.harga_jual_saat_itu) * origItem.qty);
      });
      // add tax
      const taxAmount = (newTotal * (editTarget.tax_percent || 0)) / 100;
      const finalTotal = newTotal + taxAmount;

      const payload = {
        ...editForm,
        total_penjualan: finalTotal,
        tax_percent: editTarget.tax_percent || 0,
      };

      const res = await api.put(`/sales/${editTarget.id}/invoice-details`, payload);
      toast.success('Faktur berhasil diupdate!');
      
      // Update local state
      setSales(sales.map(s => s.id === editTarget.id ? res.data : s));
      setEditTarget(null);
      
      // Optionally print the updated invoice
      setLastSale(res.data);
      setShowPrintConfirmModal(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal update faktur');
    } finally {
      setIsEditing(false);
    }
  };


  // Pelunasan DP modal state
  const [pelunasanTarget, setPelunasanTarget] = useState<Sale | null>(null);
  const [pelunasanInput, setPelunasanInput] = useState('');
  const [isPelunasanSubmitting, setIsPelunasanSubmitting] = useState(false);

  const handlePelunasanSubmit = async () => {
    if (!pelunasanTarget || !pelunasanInput || Number(pelunasanInput) < 1) return;
    try {
      setIsPelunasanSubmitting(true);
      const res = await api.post(`/sales/${pelunasanTarget.id}/pelunasan`, {
        jumlah_bayar: Number(pelunasanInput)
      });
      toast.success('Pelunasan berhasil diproses!');
      setPelunasanTarget(null);
      setPelunasanInput('');
      const salesRes = await api.get('/sales');
      setSales(salesRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memproses pelunasan');
    } finally {
      setIsPelunasanSubmitting(false);
    }
  };

  const channels = ['Offline', 'Cahaya Komputer ID', 'Cahaya Tech', 'Lazada', 'Tiktokshop'];

  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const posTemplates = useMemo(() => {
    try {
      return settings.pos_templates ? JSON.parse(settings.pos_templates) : [];
    } catch (e) {
      return [];
    }
  }, [settings.pos_templates]);

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Masukkan nama template!');
      return;
    }
    if (saleItems.length === 0) {
      toast.error('Keranjang kosong!');
      return;
    }
    try {
      setIsSubmitting(true);
      const newTemplate = {
        id: Date.now(),
        name: templateName,
        items: saleItems.map(it => ({
          product_id: it.product.id,
          qty: it.qty,
          harga_jual_saat_itu: it.harga_jual_saat_itu,
          satuan: it.satuan,
          is_sub: it.is_sub,
          manual_name: it.product.id < 0 ? it.product.name : undefined
        }))
      };

      const updatedTemplates = [...posTemplates, newTemplate];
      await api.post('/settings', { pos_templates: JSON.stringify(updatedTemplates) });
      await fetchSettings();
      setIsSaveTemplateModalOpen(false);
      setTemplateName('');
      toast.success('Template berhasil disimpan.');
    } catch (e) {
      toast.error('Gagal menyimpan template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTemplate = (templateItems: any[]) => {
    const itemsToAdd = templateItems.map(it => {
      let productObj: Product | undefined;
      if (it.product_id >= 0) {
        productObj = products.find(p => p.id === it.product_id);
      }

      const product = productObj || {
        id: it.product_id < 0 ? it.product_id : (-Date.now() - Math.random()),
        name: it.manual_name || 'Produk tidak ditemukan',
        harga_jual: it.harga_jual_saat_itu,
        stok_saat_ini: 999,
        category_id: 0
      };

      return {
        product,
        qty: it.qty,
        harga_jual_saat_itu: it.harga_jual_saat_itu,
        satuan: it.satuan || 'PCS',
        is_sub: !!it.is_sub
      };
    });

    setSaleItems([...saleItems, ...itemsToAdd]);
    setIsTemplateModalOpen(false);
    toast.success('Template berhasil ditambahkan ke keranjang.');
  };

  const handleBeliLagi = (sale: Sale) => {
    const itemsToAdd: SaleItem[] = sale.items.map(item => {
      // Try to find the product in current product list
      const existingProduct = item.product?.id ? products.find(p => p.id === item.product.id) : null;

      const product: Product = existingProduct || {
        id: item.product?.id || -Date.now() - Math.random(),
        kode: item.product?.kode || '',
        name: item.manual_name || item.product?.name || 'Produk tidak ditemukan',
        harga_jual: item.harga_jual_saat_itu,
        stok_saat_ini: 999,
        category_id: item.product?.category_id || 0,
        category: item.product?.category,
      };

      return {
        product,
        qty: item.qty,
        harga_jual_saat_itu: item.harga_jual_saat_itu,
        is_sub: !!item.is_sub,
        satuan: item.satuan || 'PCS',
      };
    });

    setSaleItems(itemsToAdd);
    setChannel(sale.channel || 'Offline');
    setCustomerName(sale.username_pembeli || '');
    setCustomerAddress(sale.alamat_pembeli || '');
    setCustomerPhone(sale.telepon_pembeli || '');
    setNoPesanan(sale.no_pesanan || '');
    setNoResi(sale.no_resi || '');
    setTaxPercent(sale.tax_percent || 0);
    setPayment('0');
    handleTabChange('pos');
    toast.success(`Barang dari ${sale.invoice} berhasil dimuat ke kasir!`);
  };

  const deleteTemplate = async (id: number) => {
    if (!window.confirm('Hapus template ini?')) return;
    try {
      const updatedTemplates = posTemplates.filter((t: any) => t.id !== id);
      await api.post('/settings', { pos_templates: JSON.stringify(updatedTemplates) });
      await fetchSettings();
      toast.success('Template berhasil dihapus.');
    } catch (e) {
      toast.error('Gagal menghapus template');
    }
  };

  const fetchData = async () => {
    // ... existing fetch logic
    try {
      setLoading(true);
      const [prodRes, catRes, saleRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/sales')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setSales(saleRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const exportSalesCSV = () => {
    const worksheetData: any[][] = [
      ["LAPORAN SELURUH DATA PENJUALAN"],
      [],
      ["Invoice", "Tanggal", "Kasir", "Pemesanan", "Pelanggan", "Total Penjualan", "Pembayaran", "Kembalian"]
    ];

    const filtered = sales.filter((s) => {
      const matchSearch = !historySearch || s.invoice.toLowerCase().includes(historySearch.toLowerCase());
      const saleDateStr = s.tanggal ? s.tanggal.substring(0, 10) : '';
      const matchDateRange = dateRange.preset === 'all' || 
        (saleDateStr >= dateRange.start && saleDateStr <= dateRange.end);
      return matchSearch && matchDateRange;
    });

    filtered.forEach(sale => {
      worksheetData.push([
        sale.invoice,
        sale.tanggal,
        sale.user?.name || 'ADMIN',
        sale.channel,
        (sale as any).customer_name || 'UMUM',
        sale.total_penjualan,
        sale.pembayaran,
        sale.kembalian
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 20 }, // Invoice
      { wch: 15 }, // Tanggal
      { wch: 15 }, // Kasir
      { wch: 15 }, // Pemesanan
      { wch: 25 }, // Pelanggan
      { wch: 15 }, // Total Penjualan
      { wch: 15 }, // Pembayaran
      { wch: 15 }  // Kembalian
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Penjualan");
    
    let dateRangeSuffix = 'Semua';
    if (dateRange.preset !== 'all') {
      dateRangeSuffix = `${dateRange.start}_ke_${dateRange.end}`;
    }
    XLSX.writeFile(workbook, `Riwayat_Penjualan_${dateRangeSuffix}.xlsx`);
  };

  const filteredProducts = products.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchLower) || (p.kode && p.kode.toLowerCase().includes(searchLower));
    const matchesCategory = selectedCategory === 'all' || p.category_id.toString() === selectedCategory;
    return matchesSearch && matchesCategory && p.stok_saat_ini > 0;
  });

  const addItem = (product: Product) => {
    // Cari apakah produk sudah ada di keranjang, tidak disub, dan namanya belum diedit
    const existingIndex = saleItems.findIndex((item) => item.product.id === product.id && !item.is_sub && item.product.name === product.name);
    if (existingIndex >= 0) {
      updateQty(existingIndex, saleItems[existingIndex].qty + 1);
    } else {
      setSaleItems([...saleItems, { product: { ...product }, qty: 1, harga_jual_saat_itu: product.harga_jual, is_sub: false, satuan: 'PCS', manual_name: product.name }]);
    }
  };

  const addManualItem = () => {
    const manualProduct: Product = {
      id: -Date.now(),
      kode: '',
      name: 'NAMA PAKET / JASA',
      harga_jual: 0,
      stok_saat_ini: 999,
      category_id: 0
    };
    setSaleItems([...saleItems, { product: manualProduct, qty: 1, harga_jual_saat_itu: 0, is_sub: false, satuan: 'SET', manual_name: 'NAMA PAKET / JASA' }]);
  };

  const removeItem = (idx: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== idx));
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    const item = saleItems[idx];
    if (item.product.stok_saat_ini < qty) {
      toast.error('Stok tidak cukup');
      return;
    }
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, qty } : item
      )
    );
  };

  const updateQtyByProduct = (productId: number, qty: number) => {
    setSaleItems(
      saleItems.map((item) =>
        item.product.id === productId && !item.is_sub ? { ...item, qty } : item
      )
    );
  };

  const updateItemPrice = (idx: number, newPrice: number) => {
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, harga_jual_saat_itu: newPrice } : item
      )
    );
  };

  const updateItemName = (idx: number, newName: string) => {
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, product: { ...item.product, name: newName }, manual_name: newName } : item
      )
    );
  };

  const updateItemSatuan = (idx: number, newSatuan: string) => {
    setSaleItems(
      saleItems.map((item, i) =>
        i === idx ? { ...item, satuan: newSatuan } : item
      )
    );
  };

  const paketkanSemua = () => {
    if (saleItems.length < 2) {
      toast.error('Minimal harus ada 2 barang untuk dipaketkan');
      return;
    }
    
    // Calculate total price of everything
    const total = saleItems.reduce((sum, item) => sum + (item.harga_jual_saat_itu * item.qty), 0);
    
    const newItems = saleItems.map((item, idx) => {
      if (idx === 0) {
        return { 
          ...item, 
          is_sub: false, 
          harga_jual_saat_itu: total,
          qty: 1 // If it's a package, header is usually 1 set
        };
      }
      return { 
        ...item, 
        is_sub: true, 
        harga_jual_saat_itu: 0 
      };
    });
    
    setSaleItems(newItems);
    toast.success('Seluruh barang berhasil dipaketkan ke baris pertama');
  };

  const toggleSubItem = (idx: number) => {
    setSaleItems(saleItems.map((item, i) => {
      if (i === idx) {
        const isNowSub = !item.is_sub;
        return {
          ...item,
          is_sub: isNowSub,
          harga_jual_saat_itu: isNowSub ? 0 : item.product.harga_jual
        };
      }
      return item;
    }));
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    if (saleItems[idx].is_sub) {
      e.preventDefault(); 
      return;
    }
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setDropTargetIdx(targetIdx);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDropTargetIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null) {
      handleDragEnd();
      return;
    }

    let actualTargetIdx = targetIdx;
    while (actualTargetIdx > 0 && saleItems[actualTargetIdx].is_sub) {
      actualTargetIdx--;
    }

    if (draggedIdx === actualTargetIdx) {
      handleDragEnd();
      return;
    }

    let dragEndIdx = draggedIdx;
    while (dragEndIdx + 1 < saleItems.length && saleItems[dragEndIdx + 1].is_sub) {
      dragEndIdx++;
    }
    const blockLength = dragEndIdx - draggedIdx + 1;
    const blockToMove = saleItems.slice(draggedIdx, draggedIdx + blockLength);

    const isDraggingDown = draggedIdx < actualTargetIdx;
    let insertAtIdx = actualTargetIdx;
    
    if (isDraggingDown) {
      while (insertAtIdx + 1 < saleItems.length && saleItems[insertAtIdx + 1].is_sub) {
        insertAtIdx++;
      }
      insertAtIdx++; 
    }

    const newItems = [...saleItems];
    newItems.splice(draggedIdx, blockLength);

    if (draggedIdx < insertAtIdx) {
      insertAtIdx -= blockLength;
    }

    newItems.splice(insertAtIdx, 0, ...blockToMove);
    setSaleItems(newItems);
    handleDragEnd();
  };

  const isTargetBlock = (idx: number) => {
    if (dropTargetIdx === null || draggedIdx === null) return false;
    let tParent = dropTargetIdx;
    while(tParent > 0 && saleItems[tParent].is_sub) tParent--;
    
    // Prevent highlighting if dragging over self
    if (tParent === draggedIdx) return false;

    let tEnd = tParent;
    while(tEnd + 1 < saleItems.length && saleItems[tEnd + 1].is_sub) tEnd++;

    return idx >= tParent && idx <= tEnd;
  };
  // ------------------------------

  const calculatedTotal = saleItems.reduce(
    (sum, item) => sum + item.harga_jual_saat_itu * item.qty,
    0
  );

  const [customTotal, setCustomTotal] = useState(0);

  useEffect(() => {
    setCustomTotal(calculatedTotal);
  }, [saleItems]);

  const handleNumpadInput = (val: string) => {
    if (val === 'C') {
      setPayment('0');
    } else if (val === 'PAS') {
      setPayment(customTotal.toString());
    } else if (payment === '0') {
      setPayment(val);
    } else {
      setPayment((prev: string) => prev + val);
    }
  };

  const handleSubmit = async () => {
    if (payment === '' || parseFloat(payment) < 0) {
      toast.error('Masukkan jumlah pembayaran yang valid!');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        channel,
        total_penjualan: customTotal,
        tax_percent: taxPercent,
        pembayaran: parseFloat(payment),
        kembalian: parseFloat(payment) - customTotal,
        invoice: isManual ? manualInvoice : null,
        tanggal: isManual ? manualDate : null,
        username_pembeli: customerName || 'UMUM',
        alamat_pembeli: customerAddress || '-',
        telepon_pembeli: customerPhone || '-',
        no_pesanan: noPesanan || null,
        no_resi: noResi || null,
        items: saleItems.map((item, idx) => {
          let parent_idx = null;
          if (item.is_sub) {
            // Find the nearest previous item that is NOT a sub
            for (let i = idx - 1; i >= 0; i--) {
              if (!saleItems[i].is_sub) {
                parent_idx = i;
                break;
              }
            }
          }
          return {
            product_id: item.product.id < 0 ? null : item.product.id, // Manual items don't have real product_id
            manual_name: item.manual_name || item.product.name,
            qty: item.qty,
            harga_jual: item.harga_jual_saat_itu,
            satuan: item.satuan,
            is_sub: item.is_sub,
            parent_idx: parent_idx
          };
        })
      };

      const res = await api.post('/sales', payload);
      setLastSale(res.data);
      setShowPrintConfirmModal(true);
      setSaleItems([]);
      setPayment('0');
      setTaxPercent(0);
      setCustomerName('');
      setCustomerAddress('');
      setCustomerPhone('');
      setNoPesanan('');
      setNoResi('');
      setIsManual(false);
      setManualInvoice('');
      setManualDate('');
      localStorage.removeItem('draftKasir');
      fetchData(); // Refresh products and history

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPrint = (withStamp: boolean) => {
    setUseStampForCurrentPrint(withStamp);
    setShowPrintConfirmModal(false);
    setTimeout(() => setShouldPrint(true), 100);
  };

  return (
    <>
      <AnimatePresence>
        {showPrintConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl shadow-2xl max-w-xs w-full overflow-hidden border border-gray-100"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-white">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Printer size={16} />
                  Cetak Faktur
                </h3>
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-xs mb-3">Sertakan Cap Digital?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmPrint(true)}
                    className="flex-1 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition-colors border border-blue-200"
                  >
                    <Check size={14} /> Dengan Cap
                  </button>
                  <button
                    onClick={() => handleConfirmPrint(false)}
                    className="flex-1 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition-colors border border-gray-200"
                  >
                    <XIcon size={14} /> Polos
                  </button>
                </div>
                <button
                  onClick={() => setShowPrintConfirmModal(false)}
                  className="mt-2 w-full py-1.5 text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {loading ? (
        <div className="space-y-6 animate-pulse no-print">
          <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 max-w-fit">
            <div className="h-8 bg-gray-200 rounded-md w-20" /><div className="h-8 bg-gray-200 rounded-md w-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-36 mb-3" /><div className="grid grid-cols-3 gap-2">{[...Array(3)].map((_, i) => (<div key={i}><div className="h-3 bg-gray-200 rounded w-20 mb-1" /><div className="h-8 bg-gray-100 rounded-md" /></div>))}</div></div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-28 mb-3" /><div className="h-[200px] bg-gray-50 rounded-lg flex items-center justify-center"><div className="h-12 w-12 bg-gray-200 rounded-lg" /></div></div>
            </div>
            <div className="space-y-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="h-4 bg-gray-200 rounded w-24 mb-2" /><div className="h-8 bg-gray-200 rounded-lg mb-2" /><div className="space-y-2">{[...Array(4)].map((_, i) => (<div key={i} className="h-16 bg-gray-50 rounded-lg border border-gray-100" />))}</div></div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"><div className="grid grid-cols-3 gap-1.5">{[...Array(12)].map((_, i) => (<div key={i} className="h-9 bg-gray-100 rounded-md" />))}</div></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">


          {activeTab === 'pos' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 no-print items-start">

              {/* Left: Customer Info & Review E-Faktur */}
              <div className="lg:col-span-2 flex flex-col gap-2.5 h-auto lg:h-[calc(100vh-110px)]">
                {/* Customer Info Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 shrink-0">
                  <div 
                    className="flex justify-between items-center cursor-pointer md:cursor-default" 
                    onClick={() => {
                      if (window.innerWidth <= 768) {
                        setIsCustomerInfoExpanded(!isCustomerInfoExpanded);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-800">Informasi Pelanggan</h3>
                      {!isCustomerInfoExpanded && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                          {customerName || 'UMUM'} {noResi ? `| Resi: ${noResi}` : ''}
                        </span>
                      )}
                    </div>
                    <button 
                      type="button" 
                      className="text-gray-400 hover:text-gray-600 md:hidden"
                    >
                      {isCustomerInfoExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  <div className={`${isCustomerInfoExpanded ? 'block' : 'hidden md:block'} mt-2.5`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Nama Pelanggan</label>
                        <input
                          type="text"
                          placeholder="Nama Pelanggan / UMUM..."
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Input Alamat</label>
                        <input
                          type="text"
                          placeholder="Alamat..."
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Input No. HP/WA</label>
                        <input
                          type="text"
                          placeholder="No. HP/WA..."
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">No. Pesanan</label>
                        <input
                          type="text"
                          placeholder="No pesanan marketplace..."
                          value={noPesanan}
                          onChange={(e) => setNoPesanan(e.target.value)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">No. Resi</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Scan atau ketik no resi..."
                            value={noResi}
                            onChange={(e) => setNoResi(e.target.value)}
                            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3B82F6] transition-colors flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => openScanner('pos')}
                            className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center gap-1 text-[10px] font-bold shrink-0"
                            title="Scan Barcode dengan Kamera"
                          >
                            <Camera size={14} />
                            Scan
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Manual Input Toggle & Fields */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                         <button 
                          type="button"
                          onClick={() => setIsManual(!isManual)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${isManual ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >
                          <Edit2 size={12} />
                          {isManual ? 'MODE MANUAL AKTIF' : 'AKTIFKAN INPUT MANUAL (Data Lama)'}
                         </button>
                         {isManual && <p className="text-[10px] text-orange-600 font-bold animate-pulse">⚠️ Perhatikan No. Invoice agar tidak duplikat</p>}
                      </div>

                      {isManual && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-orange-600 uppercase">No. Invoice Manual</label>
                            <input
                              type="text"
                              placeholder="Contoh: INV-LAMA-001"
                              value={manualInvoice}
                              onChange={(e) => setManualInvoice(e.target.value)}
                              className="text-xs bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1.5 outline-none focus:border-orange-500 transition-colors font-bold"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-orange-600 uppercase">Tanggal Transaksi</label>
                            <input
                              type="datetime-local"
                              value={manualDate}
                              onChange={(e) => setManualDate(e.target.value)}
                              className="text-xs bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1.5 outline-none focus:border-orange-500 transition-colors font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* E-FAKTUR REVIEW (Keranjang) */}
                <div className="bg-white rounded-xl shadow-lg border-t-[3px] border-[#3B82F6] p-3 flex flex-col flex-1 min-h-0">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 shrink-0">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight">REVIEW E-FAKTUR</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                       <button 
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-2.5 rounded-md font-bold shadow-sm transition-all flex items-center gap-1"
                       >
                        <ShoppingCart size={12} />
                        TEMPLATE
                       </button>
                       <button 
                        onClick={() => setIsSaveTemplateModalOpen(true)}
                        className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white py-1.5 px-2.5 rounded-md font-bold shadow-sm transition-all flex items-center gap-1"
                       >
                        <Save size={12} />
                        SIMPAN
                       </button>
                       <button 
                        onClick={paketkanSemua} 
                        title="Gabungkan semua barang ke paket di baris pertama"
                        className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-2.5 rounded-md font-bold shadow-sm transition-all flex items-center gap-1"
                       >
                        <ShoppingCart size={12} />
                        PAKETKAN
                       </button>
                      <button onClick={addManualItem} className="text-[10px] bg-gray-100 border border-gray-200 hover:bg-gray-200 py-1.5 px-2.5 rounded-md font-bold text-gray-700">+ BARIS MANUAL</button>
                      <select value={channel} onChange={(e) => setChannel(e.target.value)} className="text-[10px] bg-gray-100 border-none rounded-md px-2 py-1.5 outline-none font-bold text-gray-700">
                        {channels.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Cart Table */}
                  <div 
                    className="flex-1 overflow-y-auto pr-1 mb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent min-h-[300px]"
                    onDragOver={(e) => {
                      e.preventDefault();
                      const container = e.currentTarget;
                      const rect = container.getBoundingClientRect();
                      const y = e.clientY;
                      const topThreshold = rect.top + 50;
                      const bottomThreshold = rect.bottom - 50;

                      if (y < topThreshold) {
                        container.scrollTop -= 15;
                      } else if (y > bottomThreshold) {
                        container.scrollTop += 15;
                      }
                    }}
                  >
                    {saleItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-50">
                        <ShoppingCart size={48} strokeWidth={1} />
                        <p className="text-sm font-medium italic">Keranjang Masih Kosong</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                          <tr>
                            <th className="py-2 px-0 text-[11px] font-bold text-gray-500 uppercase text-center w-5">No.</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase w-full">Produk</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-center whitespace-nowrap">Qty</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-right">Harga</th>
                            <th className="py-2 px-1.5 text-[11px] font-bold text-gray-500 uppercase text-right">Subtotal</th>
                            <th className="py-2 px-1 text-[11px] font-bold text-gray-500 uppercase text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {saleItems.map((item, idx) => {
                            const subtotal = item.harga_jual_saat_itu * item.qty;
                            const displayNum = item.is_sub ? '' : (saleItems.slice(0, idx).filter(it => !it.is_sub).length + 1) + '.';
                            return (
                              <tr 
                                key={idx} 
                                draggable={!item.is_sub}
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={(e) => handleDrop(e, idx)}
                                onDragEnd={handleDragEnd}
                                className={`group hover:bg-gray-50/80 transition-all 
                                  ${item.is_sub ? 'bg-gray-50/30' : ''} 
                                  ${draggedIdx === idx ? 'opacity-40 bg-gray-100' : ''} 
                                  ${isTargetBlock(idx) ? 'bg-blue-100/70 border-y-2 border-blue-400' : ''}
                                `}
                              >
                                <td className="py-2 px-0 text-center text-xs font-bold text-gray-400 w-5">
                                  {displayNum}
                                </td>
                                <td className="py-2 px-1.5 w-full">
                                  <div className="flex items-center gap-0.5">
                                    {!item.is_sub ? (
                                      <div className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-gray-200 rounded text-gray-400 shrink-0" title="Tarik untuk memindahkan">
                                        <GripVertical size={13} strokeWidth={2.5} />
                                      </div>
                                    ) : (
                                      <div className="w-[17px] shrink-0" />
                                    )}
                                    {item.is_sub && <div className="w-2 h-3.5 border-l-2 border-b-2 border-gray-300 rounded-bl ml-0.5" />}
                                    <input
                                      type="text"
                                      value={item.product.name}
                                      onChange={(e) => updateItemName(idx, e.target.value)}
                                      className={`font-semibold text-xs bg-transparent hover:bg-blue-50 focus:bg-blue-50 border-b border-transparent focus:border-blue-200 outline-none w-full py-0.5 rounded transition-colors ${item.is_sub ? 'ml-0.5' : ''} ${item.product.id < 0 ? 'bg-blue-50 border-blue-200 px-1.5' : 'text-gray-800'}`}
                                      placeholder="Nama Produk / Catatan (SN)..."
                                      title="Klik untuk mengedit nama barang atau menambah catatan SN"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-1.5">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button onClick={() => updateQty(idx, item.qty - 1)} className="w-5 h-5 flex justify-center items-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition-colors">-</button>
                                    <span className="w-6 text-center text-xs font-bold text-gray-800">{item.qty}</span>
                                    <button onClick={() => updateQty(idx, item.qty + 1)} className="w-5 h-5 flex justify-center items-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition-colors">+</button>
                                    <select value={item.satuan} onChange={(e) => updateItemSatuan(idx, e.target.value)} className="bg-gray-100 border-none rounded text-[10px] px-0.5 py-0.5 outline-none ml-1">
                                      <option value="PCS">PCS</option>
                                      <option value="SET">SET</option>
                                      <option value="Unit">Unit</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="py-2 px-1.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-[10px] text-gray-400">Rp</span>
                                    <input
                                        type="text"
                                        value={formatNumber(item.harga_jual_saat_itu)}
                                        onChange={(e) => updateItemPrice(idx, parseNumber(e.target.value))}
                                        className="w-28 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-xs font-bold text-gray-800 text-right outline-none focus:ring-1 focus:ring-[#3B82F6]"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-1.5 text-right whitespace-nowrap">
                                  <p className="font-bold text-[#3B82F6] text-xs leading-tight">Rp {subtotal.toLocaleString('id-ID')}</p>
                                </td>
                                <td className="py-2 px-1.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => toggleSubItem(idx)} className={`p-1 rounded transition-colors shadow-sm ${item.is_sub ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-400 hover:text-[#3B82F6]'}`} title="Jadikan Komponen Rakitan">
                                      <Plus size={12} />
                                    </button>
                                    <button onClick={() => removeItem(idx)} className="p-1 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors shadow-sm">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Cart Totals Summary */}
                  <div className="border-t border-gray-100 pt-4 mt-auto shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                      {/* Left side: Tax / Additional fee */}
                      <div className="w-full md:w-1/3">
                        <div className="flex items-center justify-between text-xs bg-gray-50 border border-gray-100 text-gray-600 px-3 py-2 rounded-lg">
                          <span className="font-semibold">Pajak / Fee (%) :</span>
                          <input
                            type="text"
                            value={formatNumber(taxPercent)}
                            onChange={(e) => setTaxPercent(parseNumber(e.target.value))}
                            className="w-12 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-right outline-none focus:border-[#3B82F6] font-bold"
                          />
                        </div>
                      </div>

                      {/* Right side: Grand Total */}
                      <div className="w-full md:w-1/2 flex flex-col items-end">
                        <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-0.5">TOTAL KESELURUHAN</p>
                        <div className="flex items-center gap-2 bg-[#3B82F6]/5 rounded-lg px-4 py-2 border border-[#3B82F6]/20">
                          <span className="text-base font-bold text-[#3B82F6]">Rp</span>
                          <input
                            type="text"
                            value={formatNumber(customTotal)}
                            onChange={(e) => setCustomTotal(parseNumber(e.target.value))}
                            className="text-right font-black text-2xl text-[#3B82F6] w-36 bg-transparent outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Pilih Produk & Numpad */}
              <div className="lg:col-span-1 flex flex-col gap-2.5 h-[calc(100vh-110px)]">

                {/* Product Search & List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col flex-1 min-h-0">
                  <div className="shrink-0 mb-2">
                    <h3 className="text-sm font-bold text-gray-800 mb-2">Pilih Produk</h3>
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="text"
                          placeholder="Cari Produk..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setVisibleProducts(30);
                          }}
                          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs"
                        />
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setVisibleProducts(30);
                        }}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50 font-medium"
                      >
                        <option value="all">Semua Kategori</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {filteredProducts.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 mt-6">Produk tidak ditemukan</p>
                    ) : (
                      <>
                        {filteredProducts.slice(0, visibleProducts).map(product => (
                          <div key={product.id} className="p-2.5 bg-white border border-gray-100 rounded-lg flex justify-between items-center hover:shadow-sm hover:border-[#3B82F6] transition-all group">
                            <div className="flex-1 pr-2">
                              <p className="font-bold text-xs text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                              <p className="text-[11px] font-black text-[#3B82F6] mt-0.5">Rp {product.harga_jual.toLocaleString('id-ID')}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded font-bold">Stok: {product.stok_saat_ini}</span>
                                <span className="text-[9px] text-gray-400 uppercase">{product.category?.name || 'UMUM'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => addItem(product)}
                              className="w-8 h-8 bg-[#3B82F6] text-white rounded-md flex items-center justify-center hover:bg-[#2563EB] shadow-sm transform active:scale-95 transition-all"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ))}
                        {visibleProducts < filteredProducts.length && (
                          <button
                            onClick={() => setVisibleProducts(prev => prev + 50)}
                            className="w-full py-2 mt-2 text-xs font-bold text-[#3B82F6] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                          >
                            Tampilkan Lebih Banyak ({filteredProducts.length - visibleProducts} lagi)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Numpad & Payment */}
                <div className="bg-white rounded-xl shadow-lg border-t-[3px] border-green-500 p-3 mt-auto shrink-0">
                  <div className="mb-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">Tunai Dibayar</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-black text-green-600">Rp</span>
                        <input
                          type="text"
                          value={payment === '0' ? '' : formatNumber(payment)}
                          onChange={(e) => {
                            const val = parseNumber(e.target.value);
                            setPayment(val.toString());
                          }}
                          placeholder="0"
                          className="w-40 px-2.5 py-1.5 border border-green-200 rounded-lg text-xl font-black text-green-600 outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-green-50/50 text-right transition-all"
                        />
                      </div>
                    </div>

                    {parseFloat(payment) >= customTotal && customTotal > 0 && (
                      <div className="flex items-center justify-between bg-green-50 text-green-700 px-3 py-2 rounded-md border border-green-100 mt-1.5">
                        <span className="font-bold text-xs">KEMBALIAN</span>
                        <span className="font-black text-sm">Rp {(parseFloat(payment) - customTotal).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {parseFloat(payment) < customTotal && parseFloat(payment) > 0 && (
                      <div className="flex items-center justify-between bg-amber-50 text-amber-700 px-3 py-2 rounded-md border border-amber-200 mt-1.5 shadow-inner">
                        <span className="font-bold text-xs uppercase tracking-wider">SISA (DP)</span>
                        <span className="font-black text-sm">Rp {(customTotal - parseFloat(payment)).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
                      <button key={key} onClick={() => handleNumpadInput(key)} className="h-9 rounded-md text-sm font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors">{key}</button>
                    ))}
                    <button onClick={() => handleNumpadInput('C')} className="h-9 rounded-md text-sm font-black bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors">C</button>
                    <button onClick={() => handleNumpadInput('0')} className="h-9 rounded-md text-sm font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors">0</button>
                    <button onClick={() => handleNumpadInput('00')} className="h-9 rounded-md text-sm font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors">00</button>

                    <button onClick={() => handleNumpadInput('PAS')} className="col-span-3 h-10 mt-1 rounded-md text-[11px] bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 active:bg-green-300 transition-colors font-black tracking-widest uppercase">Uang Pas / Transfer</button>

                    <button
                      id="btn-submit-f10"
                      onClick={handleSubmit}
                      disabled={saleItems.length === 0 || isSubmitting || payment === ''}
                      className={`col-span-3 h-10 mt-1 text-white rounded-lg font-black text-[13px] tracking-widest shadow-md transition-all active:scale-[0.98] uppercase disabled:bg-gray-300 disabled:shadow-none 
                        ${parseFloat(payment) < customTotal ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}`}
                    >
                      {isSubmitting ? 'Memproses...' : (parseFloat(payment) < customTotal ? 'BAYAR DP (F10)' : 'Submit (F10)')}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Sales History Tab */
            <div className="space-y-3 no-print">
              {/* Filter Bar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                <div className="flex flex-wrap items-end gap-3">
                  {/* Search */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Cari Transaksi</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                      <input
                        type="text"
                        placeholder="Invoice, nama, no pesanan, no resi..."
                        value={historySearch}
                        onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
                      />
                    </div>
                  </div>
                  {/* Date Range Filter */}
                  <div className="relative min-w-[170px] z-30">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Filter Rentang Waktu</label>
                    <button 
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 outline-none focus:ring-1 focus:ring-[#3B82F6] w-full justify-between whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-gray-400" />
                        {dateRange.preset === 'all' ? 'Semua Waktu' : 
                         `${dateRange.start} s/d ${dateRange.end}`}
                      </div>
                      <ChevronRight size={13} className={`text-gray-400 transition-transform ${showDatePicker ? 'rotate-90' : ''}`} />
                    </button>

                    {showDatePicker && (
                      <div className="absolute top-11 left-0 md:left-auto md:right-0 w-[280px] md:w-[380px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-200 z-50">
                        {/* Presets Sidebar */}
                        <div className="w-full md:w-36 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col p-1.5 gap-0.5 relative z-10">
                          {[
                            { id: 'today', label: 'Hari Ini' },
                            { id: 'yesterday', label: 'Kemarin' },
                            { id: 'week', label: '1 Minggu Terakhir' },
                            { id: 'month', label: 'Bulan Ini' },
                            { id: '3month', label: '3 Bulan Terakhir' },
                            { id: 'all', label: 'Semua Waktu' },
                            { id: 'custom', label: 'Pilih Sendiri' },
                          ].map(p => (
                            <button
                              key={p.id}
                              onClick={() => applyPreset(p.id)}
                              className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${dateRange.preset === p.id ? 'bg-[#1D4ED8] text-white shadow-md' : 'text-gray-600 hover:bg-white'}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        
                        {/* Custom Date Picker Inputs */}
                        <div className="p-3 flex-1 bg-white relative z-10">
                          <h4 className="text-[9px] font-black uppercase text-gray-400 mb-2 tracking-wider">Rentang Waktu</h4>
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Mulai Tanggal</label>
                              <input 
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value, preset: 'custom' })}
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Sampai Tanggal</label>
                              <input 
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value, preset: 'custom' })}
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <button 
                              onClick={() => setShowDatePicker(false)}
                              className="w-full mt-1.5 py-1.5 bg-[#1D4ED8] text-white rounded-lg text-[11px] font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                            >
                              Terapkan / Tutup
                            </button>
                          </div>
                        </div>
                        
                        {/* Click outside Overlay (Invisible) */}
                        <div 
                          className="fixed inset-0 z-0 bg-transparent" 
                          onClick={() => setShowDatePicker(false)}
                          style={{zIndex: -1}}
                        />
                      </div>
                    )}
                  </div>
                  {/* Filter Channel */}
                  <div className="min-w-[140px] md:hidden">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Filter Channel</label>
                    <select
                      value={historyChannel}
                      onChange={(e) => { setHistoryChannel(e.target.value); setHistoryPage(1); }}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50 font-medium"
                    >
                      {uniqueChannels.map(ch => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  </div>

                  {/* Urutkan (Sorting) Filter */}
                  <div className="min-w-[140px] md:hidden">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Urutkan</label>
                    <select
                      value={`${sortField}-${sortDirection}`}
                      onChange={(e) => {
                        const [field, dir] = e.target.value.split('-') as [any, any];
                        setSortField(field);
                        setSortDirection(dir);
                        setHistoryPage(1);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50 font-medium"
                    >
                      <option value="tanggal-desc">Tanggal Terbaru</option>
                      <option value="tanggal-asc">Tanggal Terlama</option>
                      <option value="invoice-desc">Invoice Terbaru</option>
                      <option value="invoice-asc">Invoice Terlama</option>
                    </select>
                  </div>
                  {/* Reset */}
                  <div className="flex items-center gap-2">
                    {(historySearch || dateRange.preset !== 'all' || historyChannel !== 'Semua Channel') && (
                      <button
                        onClick={() => { setHistorySearch(''); applyPreset('all'); setHistoryChannel('Semua Channel'); setHistoryPage(1); }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Reset Filter
                      </button>
                    )}
                    <button
                      onClick={exportSalesCSV}
                      className="px-4 py-1.5 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Download size={13} />
                      Export Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              {(() => {
                // Filter logic
                const filtered = sales.filter((s) => {
                  const searchLower = historySearch.toLowerCase();
                  const matchSearch = !historySearch || 
                    s.invoice.toLowerCase().includes(searchLower) ||
                    (s.username_pembeli || '').toLowerCase().includes(searchLower) ||
                    (s.no_pesanan || '').toLowerCase().includes(searchLower) ||
                    (s.no_resi || '').toLowerCase().includes(searchLower);
                  const saleDateStr = s.tanggal ? s.tanggal.substring(0, 10) : '';
                  const matchDateRange = dateRange.preset === 'all' || 
                    (saleDateStr >= dateRange.start && saleDateStr <= dateRange.end);
                  const matchChannel = historyChannel === 'Semua Channel' || s.channel === historyChannel;
                  return matchSearch && matchDateRange && matchChannel;
                });

                // Sorting logic
                const sorted = [...filtered].sort((a, b) => {
                  let valA = '';
                  let valB = '';

                  if (sortField === 'invoice') {
                    valA = a.invoice.toLowerCase();
                    valB = b.invoice.toLowerCase();
                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                  } else if (sortField === 'tanggal') {
                    // Use ID for reliable chronological sorting instead of localized string
                    if (a.id < b.id) return sortDirection === 'asc' ? -1 : 1;
                    if (a.id > b.id) return sortDirection === 'asc' ? 1 : -1;
                  }
                  
                  // Secondary fallback sorting: sort by invoice desc if same tanggal
                  if (sortField !== 'invoice') {
                    const invA = a.invoice.toLowerCase();
                    const invB = b.invoice.toLowerCase();
                    if (invA < invB) return 1;
                    if (invA > invB) return -1;
                  }
                  return 0;
                });

                const totalPages = Math.max(1, Math.ceil(sorted.length / historyPerPage));
                const paginated = sorted.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);

                return (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th 
                              onClick={() => handleSort('invoice')}
                              className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                            >
                              <div className="flex items-center gap-1">
                                Invoice
                                {renderSortIndicator('invoice')}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSort('tanggal')}
                              className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                            >
                              <div className="flex items-center gap-1">
                                Tanggal
                                {renderSortIndicator('tanggal')}
                              </div>
                            </th>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500 select-none">
                              <div className="flex items-center gap-1">
                                <span className="shrink-0 text-gray-500">Channel</span>
                                <select
                                  value={historyChannel}
                                  onChange={(e) => { setHistoryChannel(e.target.value); setHistoryPage(1); }}
                                  className="bg-transparent text-[#3B82F6] border-none outline-none font-bold text-[10px] cursor-pointer max-w-[120px] py-0 px-1"
                                >
                                  {uniqueChannels.map(ch => (
                                    <option key={ch} value={ch} className="text-gray-700 bg-white font-normal text-xs">{ch}</option>
                                  ))}
                                </select>
                              </div>
                            </th>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">No. Pesanan</th>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">No. Resi</th>
                            <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Total</th>
                            <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginated.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-xs">Tidak ada transaksi ditemukan.</td>
                            </tr>
                          ) : paginated.map((sale) => (
                            <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2">
                                <div className="font-bold text-gray-800 text-xs">{sale.invoice}</div>
                                <div className="text-[10px] text-[#3B82F6] font-semibold mt-0.5">
                                  {sale.username_pembeli || 'UMUM'}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 max-w-[200px]" title={sale.items?.[0]?.manual_name || sale.items?.[0]?.product?.name || ''}>
                                  {sale.items?.[0]?.manual_name || sale.items?.[0]?.product?.name || '-'} {sale.items?.length > 1 ? `(+${sale.items.length - 1})` : ''}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-gray-600 text-xs align-top pt-2.5">{new Date(sale.tanggal).toLocaleString('id-ID')}</td>
                              <td className="px-3 py-2 align-top pt-2.5"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">{sale.channel}</span></td>
                              <td className="px-3 py-2 text-xs text-gray-700 align-top pt-2.5 max-w-[150px] break-all font-mono font-medium">
                                {sale.no_pesanan || '-'}
                              </td>
                              <td className="px-3 py-2 text-[10px] text-gray-600 align-top pt-1.5 max-w-[180px]">
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-start">
                                    {sale.no_resi ? (
                                      <span className="text-[9px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                        <Check size={10} /> Disimpan
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                        ⚠️ Butuh Resi
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-1 items-center">
                                    <input
                                      type="text"
                                      placeholder="Ketik No. Resi..."
                                      value={sale.no_resi || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSales(sales.map(s => s.id === sale.id ? { ...s, no_resi: val } : s));
                                      }}
                                      onBlur={async (e) => {
                                        try {
                                          await api.put(`/sales/${sale.id}`, { no_resi: sale.no_resi });
                                          // remove success toast so it's not annoying
                                        } catch (err) {
                                          toast.error('Gagal menyimpan No. Resi');
                                        }
                                      }}
                                      onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                          toast.success('No. Resi disimpan');
                                        }
                                      }}
                                      className="w-full text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50 focus:bg-white outline-none focus:border-blue-400 flex-1"
                                    />
                                    <button
                                      onClick={() => {
                                        setInlineScanTarget(sale.id);
                                        openScanner('inline');
                                      }}
                                      className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors shrink-0"
                                      title="Scan Barcode Resi"
                                    >
                                      <Camera size={11} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-gray-800 text-xs align-top pt-2.5">
                                Rp {Number(sale.total_penjualan).toLocaleString('id-ID')}
                                {sale.status_bayar === 'dp' && (
                                  <div className="text-[10px] text-amber-600 mt-0.5 whitespace-nowrap">Sisa: Rp {Number(sale.sisa_bayar).toLocaleString('id-ID')}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center align-top pt-2.5">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => { setLastSale(sale); setShowPrintConfirmModal(true); }} className="p-1.5 text-gray-400 hover:text-[#3B82F6] hover:bg-blue-50 rounded-md transition-colors" title="Cetak Faktur">
                                    <Printer size={15} />
                                  </button>
                                  <button onClick={() => openEditModal(sale)} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors" title="Edit Harga / Info Faktur">
                                    <Edit2 size={15} />
                                  </button>
                                  <button onClick={() => handleBeliLagi(sale)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Beli Lagi - Muat ke Kasir">
                                    <RotateCcw size={15} />
                                  </button>
                                  <button onClick={() => setVoidTarget(sale)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Void / Batalkan Transaksi">
                                    <Ban size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block md:hidden bg-gray-50/60 p-2 space-y-2.5">
                      {paginated.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-400 text-xs bg-white rounded-lg border border-gray-100">Tidak ada transaksi ditemukan.</div>
                      ) : paginated.map((sale) => (
                        <div key={sale.id} className="bg-white border border-gray-200/70 rounded-xl p-3 shadow-sm space-y-2 hover:shadow transition-shadow">
                          {/* Row 1: Invoice, Channel, and Date */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-800 text-xs">{sale.invoice}</span>
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase shrink-0">{sale.channel}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">{new Date(sale.tanggal).toLocaleString('id-ID')}</span>
                          </div>

                          {/* Row 2: Buyer (Pelanggan) & Total Amount */}
                          <div className="text-[11px] flex justify-between items-start gap-1">
                            <div>
                              <span className="text-gray-400">Pelanggan: </span>
                              <span className="text-[#3B82F6] font-semibold">{sale.username_pembeli || 'UMUM'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-500 font-semibold">Rp {Number(sale.total_penjualan).toLocaleString('id-ID')}</span>
                              {sale.status_bayar === 'dp' && (
                                <span className="text-[9px] text-amber-600 block font-medium">Sisa: Rp {Number(sale.sisa_bayar).toLocaleString('id-ID')}</span>
                              )}
                            </div>
                          </div>

                          {/* Row 3: Items (Barang) List */}
                          <div className="text-[11px] text-gray-700 line-clamp-1">
                            <span className="text-gray-400">Barang: </span>
                            {sale.items?.[0]?.manual_name || sale.items?.[0]?.product?.name || '-'} {sale.items?.length > 1 ? `(+${sale.items.length - 1})` : ''}
                          </div>

                          {/* Row 4: Inputs container (Compact & Gray background if order info exists or resi needs input) */}
                          <div className="flex flex-col gap-1 bg-gray-50 p-1.5 rounded-md">
                            {sale.no_pesanan && (
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-700">
                                <span className="text-gray-400">No. Pesanan:</span>
                                <span className="font-mono font-semibold break-all">{sale.no_pesanan}</span>
                              </div>
                            )}
                            <div className="flex flex-col gap-1.5 w-full">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-500 font-semibold">No. Resi:</span>
                                {sale.no_resi ? (
                                  <span className="text-[9px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    <Check size={10} /> Disimpan
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    ⚠️ Butuh Resi
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1 items-center flex-1 w-full">
                                <input
                                  type="text"
                                  placeholder="Ketik No. Resi..."
                                  value={sale.no_resi || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSales(sales.map(s => s.id === sale.id ? { ...s, no_resi: val } : s));
                                  }}
                                  onBlur={async () => {
                                    try {
                                      await api.put(`/sales/${sale.id}`, { no_resi: sale.no_resi });
                                      // silently save
                                    } catch (e) {
                                      toast.error('Gagal menyimpan No. Resi');
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                      toast.success('No. Resi disimpan');
                                    }
                                  }}
                                  className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white outline-none focus:border-blue-400 flex-1 font-mono"
                                />
                                <button
                                  onClick={() => {
                                    setInlineScanTarget(sale.id);
                                    openScanner('inline');
                                  }}
                                  className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors shrink-0"
                                  title="Scan Barcode Resi"
                                >
                                  <Camera size={16} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Row 5: Cashier & Action Buttons */}
                          <div className="flex justify-between items-center border-t border-gray-100 pt-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-medium">
                              Kasir: {sale.user?.name || 'ADMIN'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setLastSale(sale); setShowPrintConfirmModal(true); }} className="p-2 text-gray-400 hover:text-[#3B82F6] hover:bg-blue-50 rounded-lg transition-colors" title="Cetak Faktur">
                                <Printer size={18} />
                              </button>
                              <button onClick={() => openEditModal(sale)} className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Edit Harga / Info Faktur">
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => handleBeliLagi(sale)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Beli Lagi - Muat ke Kasir">
                                <RotateCcw size={18} />
                              </button>
                              <button onClick={() => setVoidTarget(sale)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Void / Batalkan Transaksi">
                                <Ban size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Footer */}
                    <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50/50">
                      <p className="text-[10px] text-gray-500 font-medium">
                        Menampilkan {paginated.length} dari {filtered.length} transaksi
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                          disabled={historyPage <= 1}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={14} className="text-gray-600" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalPages || Math.abs(p - historyPage) <= 1)
                          .map((p, idx, arr) => (
                            <span key={p}>
                              {idx > 0 && arr[idx - 1] !== p - 1 && (
                                <span className="text-gray-400 text-[10px] px-0.5">...</span>
                              )}
                              <button
                                onClick={() => setHistoryPage(p)}
                                className={`min-w-[24px] h-6 text-[11px] font-bold rounded transition-colors ${historyPage === p
                                    ? 'bg-[#3B82F6] text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                {p}
                              </button>
                            </span>
                          ))
                        }
                        <button
                          onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                          disabled={historyPage >= totalPages}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight size={14} className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ====== VOID CONFIRMATION MODAL ====== */}
      {voidTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-50">
          <div className="bg-white md:rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm h-full md:h-auto overflow-hidden flex flex-col animate-in">
            {/* Red header strip */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-center shrink-0 sticky top-0 z-20 flex justify-between items-center md:block">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="md:hidden p-1.5 -ml-1 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1">
                <div className="hidden md:flex mx-auto w-12 h-12 bg-white/20 rounded-full items-center justify-center mb-2">
                  <Ban size={24} className="text-white" />
                </div>
                <h3 className="text-white font-bold text-sm">Void Transaksi</h3>
                <p className="text-red-100 text-[11px] mt-0.5">Aksi ini tidak bisa dibatalkan</p>
              </div>
              <div className="w-8 md:hidden"></div> {/* Balancer for mobile header */}
            </div>

            {/* Content */}
            <div className="p-4 md:p-5 flex-1 overflow-y-auto">
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-4">
                  <div className="flex flex-col">
                    <div className="flex gap-2">
                       <span className="w-20 text-gray-500">Kepada Yth.</span>
                       <span className="font-bold">: {voidTarget.username_pembeli || 'UMUM'}</span>
                    </div>
                    <div className="flex gap-2">
                       <span className="w-20 text-gray-500">Alamat</span>
                       <span>: {voidTarget.alamat_pembeli || '-'}</span>
                    </div>
                    <div className="flex gap-2">
                       <span className="w-20 text-gray-500">No. HP</span>
                       <span>: {voidTarget.telepon_pembeli || '-'}</span>
                    </div>
                  </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Tanggal</span>
                  <span className="text-gray-700">{new Date(voidTarget.tanggal).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Channel</span>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">{voidTarget.channel}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-xs">
                  <span className="text-gray-500 font-bold">Total</span>
                  <span className="font-black text-red-600 text-sm">Rp {Number(voidTarget.total_penjualan).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-4">
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>⚠️ Perhatian:</strong> Stok barang yang terjual pada transaksi ini akan <strong>otomatis dikembalikan</strong> ke inventaris.
                </p>
              </div>

              <div className="flex gap-2 sticky bottom-0 bg-white pt-2 border-t border-gray-100 mt-auto md:mt-0 md:border-none md:pt-0">
                <button
                  onClick={() => setVoidTarget(null)}
                  disabled={isVoiding}
                  className="hidden md:block flex-1 px-3 py-2.5 md:py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={confirmVoid}
                  disabled={isVoiding}
                  className="flex-1 px-3 py-3 md:py-2 bg-red-600 text-white rounded-xl md:rounded-lg text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Ban size={14} className="md:w-[13px] md:h-[13px]" />
                  {isVoiding ? 'Memproses...' : 'Ya, Void Transaksi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== EDIT INVOICE MODAL ====== */}
      {editTarget && editForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-50">
          <div className="bg-white md:rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col animate-in">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 md:py-2 flex items-center justify-between text-center shrink-0 sticky top-0 z-20">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="md:hidden p-1.5 -ml-1 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1 text-center md:text-center ml-2 md:ml-0 text-left">
                <h3 className="text-white font-bold text-sm">Edit Faktur: {editTarget.invoice}</h3>
                <p className="text-blue-100 text-[10px] mt-0.5">Ubah harga atau data pelanggan tanpa membatalkan transaksi</p>
              </div>
              <div className="w-8 md:hidden"></div> {/* Balancer */}
            </div>
            <div className="p-4 md:p-4 overflow-y-auto flex-1 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Data Pelanggan</h4>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Nama Pembeli</label>
                    <input type="text" value={editForm.username_pembeli} onChange={e => setEditForm({...editForm, username_pembeli: e.target.value})} className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Alamat</label>
                    <input type="text" value={editForm.alamat_pembeli} onChange={e => setEditForm({...editForm, alamat_pembeli: e.target.value})} className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">No HP</label>
                    <input type="text" value={editForm.telepon_pembeli} onChange={e => setEditForm({...editForm, telepon_pembeli: e.target.value})} className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400" />
                  </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">No. Pesanan</label>
                      <input type="text" placeholder="No pesanan marketplace..." value={editForm.no_pesanan} onChange={e => setEditForm({...editForm, no_pesanan: e.target.value})} className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">No. Resi</label>
                      <div className="flex gap-1">
                        <input type="text" placeholder="Scan atau ketik no resi..." value={editForm.no_resi} onChange={e => setEditForm({...editForm, no_resi: e.target.value})} className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400 flex-1" />
                        <button type="button" onClick={() => openScanner('edit')} className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors flex items-center gap-1 text-[10px] font-bold shrink-0" title="Scan Barcode">
                          <Camera size={12} /> Scan
                        </button>
                      </div>
                    </div>
                  </div>

                <div className="flex flex-col gap-1.5">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pembayaran & Waktu</h4>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Tanggal & Jam Transaksi</label>
                    <input type="datetime-local" value={editForm.tanggal} onChange={e => setEditForm({...editForm, tanggal: e.target.value})} className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Channel Penjualan</label>
                    <select value={editForm.channel} onChange={e => setEditForm({...editForm, channel: e.target.value})} className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400">
                      {channels.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Terima Pembayaran (Tunai/Transfer)</label>
                    <input type="text" value={formatNumber(editForm.pembayaran)} onChange={e => setEditForm({...editForm, pembayaran: parseNumber(e.target.value)})} className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400 font-bold text-green-600" />
                    <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">Ubah jika ada selisih total & uang pas disesuaikan.</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Daftar Barang (Hanya ubah harga)</h4>
                <div className="border border-gray-100 rounded-lg overflow-x-auto">
                  <div className="min-w-[500px]">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-1.5 px-2 text-[10px] font-bold text-gray-500 uppercase">Barang</th>
                          <th className="py-1.5 px-2 text-[10px] font-bold text-gray-500 uppercase text-center w-16">Qty</th>
                          <th className="py-1.5 px-2 text-[10px] font-bold text-gray-500 uppercase text-right w-28">Harga Baru</th>
                          <th className="py-1.5 px-2 text-[10px] font-bold text-gray-500 uppercase text-right w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editTarget.items.map((origItem, idx) => {
                          const formItem = editForm.items[idx];
                          const subtotal = origItem.qty * Number(formItem.harga_jual_saat_itu);
                          return (
                            <tr key={origItem.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-1 px-2 text-[11px]">
                                <p className="font-bold text-gray-700 leading-tight">{formItem.manual_name}</p>
                              </td>
                              <td className="py-1 px-2 text-[11px] text-center text-gray-500 whitespace-nowrap">{origItem.qty} {origItem.satuan}</td>
                              <td className="py-1 px-2 text-right">
                                <input 
                                  type="text" 
                                  value={formatNumber(formItem.harga_jual_saat_itu)} 
                                  onChange={(e) => {
                                    const val = parseNumber(e.target.value);
                                    const newItems = [...editForm.items];
                                    newItems[idx].harga_jual_saat_itu = val;
                                    setEditForm({...editForm, items: newItems});
                                  }}
                                  className="w-[110px] text-right text-[11px] border border-gray-200 rounded px-1.5 py-0.5 outline-none focus:border-blue-400"
                                />
                              </td>
                              <td className="py-1 px-2 text-[11px] text-right font-bold text-blue-600 whitespace-nowrap">Rp {subtotal.toLocaleString('id-ID')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center">
                  <span className="text-[11px] font-bold text-blue-800">Total Keseluruhan (Termasuk Pajak {editTarget.tax_percent || 0}%):</span>
                  <span className="text-[15px] font-black text-blue-600">
                    Rp {
                      (() => {
                        let t = 0;
                        editForm.items.forEach((fi: any, i: number) => {
                          t += (Number(fi.harga_jual_saat_itu) * editTarget.items[i].qty);
                        });
                        return (t + (t * (editTarget.tax_percent || 0)/100)).toLocaleString('id-ID');
                      })()
                    }
                  </span>
                </div>
              </div>

            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2 shrink-0 sticky bottom-0 z-20">
              <button onClick={() => setEditTarget(null)} disabled={isEditing} className="hidden md:block flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-[11px] font-bold hover:bg-gray-100 transition-colors">Batal</button>
              <button onClick={submitEditInvoice} disabled={isEditing} className="flex-1 px-4 py-3 md:py-2 bg-[#3B82F6] text-white rounded-xl md:rounded-lg text-xs md:text-[11px] font-bold hover:bg-blue-600 shadow-md transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]">
                <Save size={14} className="md:w-[13px] md:h-[13px]" /> {isEditing ? 'Menyimpan...' : 'Simpan & Cetak Ulang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== PELUNASAN DP MODAL ====== */}
      {pelunasanTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-50">
          <div className="bg-white md:rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm h-full md:h-auto overflow-hidden flex flex-col animate-in">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 md:py-4 text-center shrink-0 sticky top-0 z-20 flex justify-between items-center md:block">
              <button
                type="button"
                onClick={() => { setPelunasanTarget(null); setPelunasanInput(''); }}
                className="md:hidden p-1.5 -ml-1 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-white font-bold text-sm flex-1 text-left md:text-center ml-2 md:ml-0">Pelunasan Tagihan (DP)</h3>
              <div className="w-8 md:hidden"></div> {/* Balancer */}
            </div>
            <div className="p-4 md:p-5 flex-1 overflow-y-auto">
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-4 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Invoice</span><span className="font-bold text-gray-800">{pelunasanTarget.invoice}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Tagihan</span><span className="font-bold text-gray-800">Rp {Number(pelunasanTarget.total_penjualan).toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sudah Dibayar</span><span className="font-bold text-gray-800">Rp {Number(pelunasanTarget.pembayaran).toLocaleString('id-ID')}</span></div>
                <div className="border-t border-gray-200 pt-2 flex justify-between"><span className="text-gray-500 font-bold">Sisa Tagihan</span><span className="font-black text-amber-600 text-sm">Rp {Number(pelunasanTarget.sisa_bayar).toLocaleString('id-ID')}</span></div>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nominal Pembayaran</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">Rp</span>
                  <input
                    type="number"
                    value={pelunasanInput}
                    onChange={(e) => setPelunasanInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                   <button onClick={() => setPelunasanInput(pelunasanTarget.sisa_bayar?.toString() || '0')} className="flex-1 py-1.5 bg-amber-50 text-amber-600 font-bold text-[10px] rounded uppercase hover:bg-amber-100 transition-colors">Lunasi Semua (Uang Pas)</button>
                </div>
              </div>
              <div className="flex gap-2 sticky bottom-0 bg-white pt-2 border-t border-gray-100 mt-auto md:mt-0 md:border-none md:pt-0">
                <button onClick={() => { setPelunasanTarget(null); setPelunasanInput(''); }} disabled={isPelunasanSubmitting} className="hidden md:block flex-1 px-3 py-2.5 md:py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">Batal</button>
                <button onClick={handlePelunasanSubmit} disabled={isPelunasanSubmitting} className="flex-1 px-3 py-3 md:py-2 bg-amber-500 text-white rounded-xl md:rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 active:scale-[0.98]">
                  {isPelunasanSubmitting ? 'Memproses...' : 'Proses Bayar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAKTUR TEMPLATE - Continuous Form 21cm x 14.5cm */}
      <div id="print-area" className="faktur-print bg-white text-black font-sans" style={{ width: '100%', margin: '0' }}>
        {lastSale && (
          <div className="bg-white" style={{ fontSize: '14px', fontWeight: 'normal', lineHeight: '1.2' }}>
            {/* ===== HEADER ===== */}
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td style={{ width: '60%', verticalAlign: 'top', padding: '0' }}>
                    <div className="flex items-start gap-3">
                      {settings.store_logo && (
                        <img
                          src={`${API_ASSET_URL}/storage/${settings.store_logo}`}
                          alt="Logo"
                          style={{ height: '70px', width: '70px', objectFit: 'contain' }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: '19px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.1' }}>{settings.store_name || 'CAHAYA KOMPUTER ID'}</div>
                        <div style={{ fontSize: '13px', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>{settings.store_address || 'Alamat Toko Belum Diatur'}</div>
                        <div style={{ fontSize: '13px', fontWeight: 'normal' }}>Telepon/HP : {settings.store_phone || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ width: '40%', verticalAlign: 'top', textAlign: 'right', padding: '0', paddingBottom: '2px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.1', display: 'inline-block', whiteSpace: 'nowrap' }}>FAKTUR PENJUALAN</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      {new Date(lastSale.tanggal).toLocaleDateString('id-ID')} {new Date(lastSale.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Customer & Transaction Info */}
            <table className="w-full border-collapse" style={{ fontSize: '13px', marginTop: '4px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '60%', verticalAlign: 'top', padding: '0' }}>
                    <table className="w-full border-collapse" style={{ fontSize: '13px', textAlign: 'left', lineHeight: '1.2' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '85px', verticalAlign: 'top' }}>Kepada Yth.</td>
                          <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                          <td style={{ textTransform: 'uppercase', fontWeight: 'normal', verticalAlign: 'top' }}>
                            {lastSale.username_pembeli || 'UMUM'}
                            {lastSale.telepon_pembeli && lastSale.telepon_pembeli !== '-' ? ` (${lastSale.telepon_pembeli})` : ''}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ verticalAlign: 'top' }}>Alamat</td>
                          <td style={{ verticalAlign: 'top' }}>:</td>
                          <td style={{ verticalAlign: 'top' }}>{lastSale.alamat_pembeli || '-'}</td>
                        </tr>
                        {lastSale.no_pesanan && lastSale.no_pesanan !== '-' && (
                          <tr>
                            <td style={{ verticalAlign: 'top' }}>No. Pesanan</td>
                            <td style={{ verticalAlign: 'top' }}>:</td>
                            <td style={{ verticalAlign: 'top', fontWeight: 'normal' }}>{lastSale.no_pesanan}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </td>
                  <td style={{ width: '40%', verticalAlign: 'top', padding: '0' }}>
                    <table className="w-full border-collapse" style={{ fontSize: '13px', textAlign: 'left', lineHeight: '1.2' }}>
                      <tbody>
                        <tr><td style={{ width: '85px', verticalAlign: 'top' }}>No. Faktur</td><td style={{ width: '10px', verticalAlign: 'top' }}>:</td><td className="uppercase" style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{lastSale.invoice}</td></tr>
                        <tr><td style={{ verticalAlign: 'top' }}>Kasir</td><td style={{ verticalAlign: 'top' }}>:</td><td className="uppercase" style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{lastSale.user?.name || user?.name || 'ADMIN'}</td></tr>
                        <tr><td style={{ verticalAlign: 'top' }}>Pemesanan</td><td style={{ verticalAlign: 'top' }}>:</td><td className="uppercase" style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{lastSale.channel}</td></tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Items Table */}
            <table className="w-full border-collapse" style={{ fontSize: '12px', tableLayout: 'fixed', marginTop: '4px' }}>
              <thead>
                <tr style={{ borderTop: '1.5px solid black', borderBottom: '1.5px solid black' }}>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '30px' }}>No.</th>
                  <th style={{ padding: '3px 2px', textAlign: 'left', width: 'auto' }}>Nama Produk</th>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '40px' }}>Qty</th>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '60px' }}>Satuan</th>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '110px' }}>Harga Satuan</th>
                  <th style={{ padding: '3px 2px', textAlign: 'center', width: '110px' }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let printCounter = 1;
                  return [...lastSale.items].map((item, idx) => {
                    const isSubItem = !!item.parent_id;
                    const rowNum = isSubItem ? '' : `${printCounter++}.`;
                    return (
                      <tr key={idx} style={{ lineHeight: '1.15' }}>
                        <td style={{ padding: '1px 2px', textAlign: 'center' }}>{rowNum}</td>
                        <td style={{ padding: '1px 2px', paddingLeft: isSubItem ? '16px' : '2px' }}>
                          {item.product?.name || item.manual_name || 'Unit'}
                        </td>
                        <td style={{ padding: '1px 2px', textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ padding: '1px 2px', textAlign: 'center' }}>{item.satuan || 'PCS'}</td>
                        <td style={{ padding: '1px 2px', textAlign: 'right' }}>
                          {isSubItem ? '' : Number(item.harga_jual_saat_itu).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '1px 2px', textAlign: 'right' }}>
                          {isSubItem ? '' : (item.qty * Number(item.harga_jual_saat_itu)).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>

            {/* Line */}
            <div style={{ borderBottom: '1.5px solid black', margin: '3px 0' }}></div>

            {/* Info Pembayaran */}
            {settings.store_bank_accounts && (
              <div style={{ fontSize: '11px', marginTop: '2px', marginBottom: '2px', color: '#000' }}>
                 PEMBAYARAN: {settings.store_bank_accounts}
                 {settings.store_bank_account_name && (
                    (settings.store_bank_accounts.includes(',') || settings.store_bank_accounts.includes('|'))
                      ? <div style={{ marginTop: '1px' }}>a.n {settings.store_bank_account_name}</div>
                      : <span> a.n {settings.store_bank_account_name}</span>
                 )}
              </div>
            )}

            {/* Totals & Signature */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', marginTop: '2px' }}>
              <div style={{ width: '55%', fontSize: '13px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                
                {/* Signature Section - Placed on the bottom left aligned with the totals end */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <div style={{ textAlign: 'center', width: '48%', position: 'relative' }}>
                    <p>Hormat Kami,</p>
                    {useStampForCurrentPrint && settings.store_stamp && (
                      <img 
                        src={`${API_ASSET_URL}/storage/${settings.store_stamp}`}
                        style={{
                          position: 'absolute',
                          top: '-60px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          height: '160px',
                          objectFit: 'contain',
                          zIndex: -1,
                          opacity: 0.9
                        }}
                        alt="Stamp"
                      />
                    )}
                    <div style={{ marginTop: '25px', textDecoration: 'underline', textTransform: 'uppercase' }}>{settings.store_name || 'Cahaya Komputer'}</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '48%' }}>
                    <p>Diterima Oleh,</p>
                    <div style={{ marginTop: '25px' }}>___________________</div>
                  </div>
                </div>
              </div>

              <div style={{ width: '40%', fontSize: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <table className="w-full border-collapse" style={{ lineHeight: '1.15' }}>
                  <tbody>
                    <tr><td style={{ padding: '0', textAlign: 'left' }}>Subtotal :</td><td style={{ textAlign: 'right' }}>{Number(lastSale?.total_penjualan || 0).toLocaleString('id-ID')}</td></tr>
                    <tr><td style={{ padding: '0 0 3px 0', textAlign: 'left' }}>Pajak ({lastSale?.tax_percent || 0}%) :</td><td style={{ padding: '0 0 3px 0', textAlign: 'right' }}>{Number(lastSale?.tax_amount || 0).toLocaleString('id-ID')}</td></tr>
                    <tr style={{ borderTop: '1.5px solid black' }}>
                      <td style={{ padding: '4px 0 0 0', textAlign: 'left', fontSize: '15px', fontWeight: 'bold' }}>Total :</td>
                      <td style={{ padding: '4px 0 0 0', textAlign: 'right', fontSize: '15px', fontWeight: 'bold' }}>{Number(lastSale?.total_penjualan || 0).toLocaleString('id-ID')}</td>
                    </tr>
                    <tr><td style={{ padding: '1px 0 0 0', textAlign: 'left' }}>Tunai :</td><td style={{ padding: '1px 0 0 0', textAlign: 'right' }}>{Number(lastSale?.pembayaran || 0).toLocaleString('id-ID')}</td></tr>
                    {lastSale?.status_bayar === 'dp' && (
                      <tr><td style={{ padding: '2px 0 0 0', textAlign: 'left', fontWeight: 'bold' }}>Sisa (DP) :</td><td style={{ padding: '2px 0 0 0', textAlign: 'right', fontWeight: 'bold', borderTop: '1px solid black' }}>{Number(lastSale?.sisa_bayar || 0).toLocaleString('id-ID')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .faktur-print { display: none; }

        @media print {
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');

          html, body { 
            visibility: hidden !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #print-area {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 21cm !important;
            margin: 0 !important;
            padding: 7mm 5mm 2mm 4mm !important;
            height: auto !important;
            background: white !important;
            box-sizing: border-box !important;
          }

          #print-area, #print-area * {
            visibility: visible !important;
            color: #000 !important;
            border-color: #000 !important;
            background: transparent !important;
            font-family: 'Tahoma', 'Verdana', 'Segoe UI', sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
            text-rendering: optimizeLegibility !important;
          }

          @page {
            size: auto;
            margin: 0;
          }
        }
      `}</style>
      {/* Template Modals */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white md:rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200 h-full md:h-auto flex flex-col">
             <div className="p-3 md:p-4 bg-emerald-600 text-white flex justify-between items-center shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsTemplateModalOpen(false)} className="md:hidden hover:bg-white/10 p-1 -ml-1 rounded transition-colors"><ChevronLeft size={20}/></button>
                  <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={18}/> Pilih Template</h3>
                </div>
                <button onClick={() => setIsTemplateModalOpen(false)} className="hidden md:block hover:bg-white/10 p-1 rounded transition-colors">&times;</button>
             </div>
             <div className="p-4 flex-1 md:max-h-[60vh] overflow-y-auto no-scrollbar space-y-2 bg-gray-50/50">
                {posTemplates.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 italic text-sm">Belum ada template yang disimpan.</div>
                ) : (
                  posTemplates.map((t: any) => (
                    <div key={t.id} className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:border-emerald-300 transition-all flex justify-between items-center group">
                       <div className="flex-1 cursor-pointer" onClick={() => loadTemplate(t.items)}>
                          <p className="font-bold text-gray-800 text-sm">{t.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-medium">{t.items.length} Barang • Dibuat {new Date(t.id).toLocaleDateString('id-ID')}</p>
                       </div>
                       <button onClick={() => deleteTemplate(t.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100">
                          <Trash2 size={16} className="md:w-3.5 md:h-3.5" />
                       </button>
                    </div>
                  ))
                )}
             </div>
             <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-end shrink-0 sticky bottom-0 z-20">
                <button onClick={() => setIsTemplateModalOpen(false)} className="w-full md:w-auto px-5 py-2.5 md:py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">TUTUP</button>
             </div>
          </div>
        </div>
      )}

      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white md:rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200 h-full md:h-auto flex flex-col">
             <div className="p-3 md:p-4 bg-amber-500 text-white flex justify-between items-center shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsSaveTemplateModalOpen(false)} className="md:hidden hover:bg-white/10 p-1 -ml-1 rounded transition-colors"><ChevronLeft size={20}/></button>
                  <h3 className="font-bold flex items-center gap-2"><Save size={18}/> Simpan sbg Template</h3>
                </div>
                <button onClick={() => setIsSaveTemplateModalOpen(false)} className="hidden md:block hover:bg-white/10 p-1 rounded transition-colors">&times;</button>
             </div>
             <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nama Template</label>
                   <input 
                    type="text" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Contoh: Paket Service A atau Paket PC Gaming..."
                    className="w-full text-sm font-bold bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl outline-none focus:ring-2 ring-amber-400/50 transition-all"
                    autoFocus
                   />
                </div>
                <p className="text-[10px] text-gray-500 italic bg-amber-50 p-2 rounded-lg border border-amber-100">
                   Seluruh barang yang ada di keranjang ({saleItems.length} item) akan disimpan ke dalam template ini.
                </p>
             </div>
             <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-end gap-2 shrink-0 sticky bottom-0 z-20">
                <button onClick={() => setIsSaveTemplateModalOpen(false)} className="hidden md:block px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 transition-colors">BATAL</button>
                <button 
                  onClick={saveTemplate} 
                  disabled={isSubmitting}
                  className="flex-1 md:flex-none px-6 py-3 md:py-2 bg-amber-500 text-white rounded-xl md:rounded-lg text-xs font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                >
                  SIMPAN SEKARANG
                </button>
             </div>
          </div>
        </div>
      )}
      <StoreProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => {
          setIsProfileModalOpen(false);
          fetchSettings(); 
        }} 
      />

      {/* ====== BARCODE SCANNER MODAL ====== */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-[70] no-print">
          <div className="bg-white md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 h-full md:h-auto flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-3 md:px-4 py-3 flex justify-between items-center shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <button 
                  onClick={closeScanner} 
                  className="md:hidden text-white hover:bg-white/20 p-1.5 -ml-1 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Camera size={16} /> Scan Barcode
                </h3>
              </div>
              <button 
                onClick={closeScanner} 
                className="hidden md:block text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-[11px] text-gray-500 mb-3 text-center">Arahkan kamera ke barcode resi pengiriman</p>
              <div 
                id={scannerContainerId} 
                className="w-full rounded-lg overflow-hidden border-2 border-blue-200"
                style={{ minHeight: '280px' }}
              />

              {/* Order Info & Navigation - Show when scanning inline for a specific sale */}
              {scanTarget === 'inline' && inlineScanTarget && (() => {
                const targetSale = sales.find(s => s.id === inlineScanTarget);
                if (!targetSale) return null;
                
                const currentIndex = scannableSales.findIndex(s => s.id === inlineScanTarget);
                const hasPrev = currentIndex > 0;
                const hasNext = currentIndex < scannableSales.length - 1;

                return (
                  <div className="mt-3 space-y-3">
                    {/* Navigation buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={() => navigateScanner('prev')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-100 border border-gray-200 text-gray-750 disabled:opacity-40 rounded-xl text-xs font-bold transition-all hover:bg-gray-205 active:scale-95"
                      >
                        <ChevronLeft size={16} /> Sebelumnya
                      </button>
                      <button
                        type="button"
                        disabled={!hasNext}
                        onClick={() => navigateScanner('next')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 disabled:opacity-40 rounded-xl text-xs font-bold transition-all hover:bg-blue-100/80 active:scale-95"
                      >
                        Selanjutnya <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Order Details Card */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center border-b border-blue-100 pb-1.5">
                        <p className="text-[11px] font-black uppercase text-blue-700 tracking-wide">📋 Data Pesanan ({currentIndex + 1} / {scannableSales.length})</p>
                        {targetSale.no_resi ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-bold">
                            ✓ Ter-scan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[9px] font-bold">
                            ⚠️ Belum Ter-scan
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                        <span className="text-gray-500">Pelanggan</span>
                        <span className="font-semibold text-gray-800">{targetSale.username_pembeli || 'UMUM'}</span>
                        <span className="text-gray-500">No. Faktur</span>
                        <span className="font-semibold text-gray-800">{targetSale.invoice}</span>
                        {targetSale.no_pesanan && (
                          <>
                            <span className="text-gray-500">No. Pesanan</span>
                            <span className="font-mono font-semibold text-gray-800 text-[10px] break-all">{targetSale.no_pesanan}</span>
                          </>
                        )}
                        <span className="text-gray-500">Channel</span>
                        <span className="font-bold text-blue-600 uppercase">{targetSale.channel}</span>
                        
                        <span className="text-gray-500">No. Resi</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-[10px] break-all ${targetSale.no_resi ? 'text-green-600' : 'text-gray-400 italic'}`}>
                            {targetSale.no_resi || 'Belum di-scan'}
                          </span>
                          {targetSale.no_resi && (
                            <button
                              type="button"
                              onClick={async () => {
                                const confirmDelete = window.confirm("Apakah Anda yakin ingin menghapus nomor resi ini?");
                                if (!confirmDelete) return;
                                try {
                                  setSales((prevSales: any[]) => prevSales.map(s => s.id === targetSale.id ? { ...s, no_resi: null } : s));
                                  await api.put(`/sales/${targetSale.id}`, { no_resi: null });
                                  toast.success("No. Resi berhasil dihapus");
                                } catch (err) {
                                  toast.error("Gagal menghapus No. Resi");
                                }
                              }}
                              className="text-[9px] font-bold text-red-500 bg-red-100 hover:bg-red-200 px-1.5 py-0.5 rounded transition-all"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 flex justify-center sticky bottom-0 bg-white pt-2">
                <button 
                  onClick={closeScanner} 
                  className="w-full md:w-auto px-6 py-2.5 md:py-2 bg-gray-100 text-gray-700 rounded-xl md:rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                >
                  Tutup Scanner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
