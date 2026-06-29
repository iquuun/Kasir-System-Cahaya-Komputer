import { useState, useEffect, useRef } from 'react';
import { Save, Upload, Store, MapPin, Database, DownloadCloud, UploadCloud, AlertTriangle, Trash2, Shield, X, RefreshCw, ChevronLeft } from 'lucide-react';
import api, { API_ASSET_URL } from '../api';
import { toast } from 'sonner';

export default function PengaturanPage() {
    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [storeNotes, setStoreNotes] = useState('');
    const [invoiceStartNumber, setInvoiceStartNumber] = useState('10000');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [stampPreview, setStampPreview] = useState<string | null>(null);
    const [stampFile, setStampFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [uploadingBackup, setUploadingBackup] = useState(false);
    const [syncingDb, setSyncingDb] = useState(false);
    const backupInputRef = useRef<HTMLInputElement>(null);

    // DANGER ZONE states
    const [showResetModal, setShowResetModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [resetCountdown, setResetCountdown] = useState(0);
    const [resetting, setResetting] = useState(false);
    const [countdownDone, setCountdownDone] = useState(false);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    // Countdown timer effect
    useEffect(() => {
        if (resetCountdown > 0) {
            countdownRef.current = setInterval(() => {
                setResetCountdown(prev => {
                    if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        setCountdownDone(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => {
                if (countdownRef.current) clearInterval(countdownRef.current);
            };
        }
    }, [resetCountdown > 0]); // eslint-disable-line

    const startResetCountdown = () => {
        if (resetConfirmText !== 'HAPUS SEMUA DATA') {
            toast.error('Ketik persis: HAPUS SEMUA DATA');
            return;
        }
        setCountdownDone(false);
        setResetCountdown(5);
    };

    const handleResetAllData = async () => {
        try {
            setResetting(true);
            const res = await api.post('/system/reset-all-data', {
                confirmation: 'HAPUS SEMUA DATA'
            });
            toast.success(res.data.message || 'Semua data berhasil dihapus!');
            setShowResetModal(false);
            setResetConfirmText('');
            setResetCountdown(0);
            setCountdownDone(false);
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus data.');
        } finally {
            setResetting(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            setStoreName(res.data.store_name || '');
            setStoreAddress(res.data.store_address || '');
            setStorePhone(res.data.store_phone || '');
            setStoreNotes(res.data.store_notes || '');
            setInvoiceStartNumber(res.data.invoice_start_number || '10000');
            if (res.data.store_logo) {
                setLogoPreview(`${API_ASSET_URL}/storage/${res.data.store_logo}?t=${Date.now()}`);
            }
            if (res.data.store_stamp) {
                setStampPreview(`${API_ASSET_URL}/storage/${res.data.store_stamp}?t=${Date.now()}`);
            }
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setStampFile(file);
            setStampPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const formData = new FormData();
            formData.append('store_name', storeName);
            formData.append('store_address', storeAddress);
            formData.append('store_phone', storePhone);
            formData.append('store_notes', storeNotes);
            formData.append('invoice_start_number', invoiceStartNumber);
            if (logoFile) {
                formData.append('store_logo', logoFile);
            }
            if (stampFile) {
                formData.append('store_stamp', stampFile);
            }

            await api.post('/settings', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Pengaturan berhasil disimpan!');
            fetchSettings(); // Refresh to get the new logo path or confirm save
        } catch (err) {
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        console.log("File selected:", file.name);

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.sqlite') && !fileName.endsWith('.db')) {
            toast.error('Format tidak didukung. Harap upload file .sqlite atau .db');
            if (backupInputRef.current) backupInputRef.current.value = '';
            return;
        }

        setPendingRestoreFile(file);
        setShowRestoreModal(true);
        
        // Reset input immediately so same file can be re-selected if needed
        if (e.target) e.target.value = '';
    };

    const confirmRestoreBackup = async () => {
        if (!pendingRestoreFile) return;

        try {
            console.log("Starting restore process...");
            setShowRestoreModal(false);
            setUploadingBackup(true);
            const formData = new FormData();
            formData.append('backup_file', pendingRestoreFile);

            const res = await api.post('/settings/restore', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log("Restore response:", res.data);
            toast.success('Database berhasil dipulihkan! Halaman akan dimuat ulang...');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err: any) {
            console.error("Restore error:", err);
            toast.error(err.response?.data?.message || 'Gagal memulihkan database. Pastikan file valid.');
        } finally {
            setUploadingBackup(false);
            setPendingRestoreFile(null);
        }
    };

    const handleBackup = async () => {
        try {
            setDownloading(true);
            const res = await api.get('/settings/backup', { responseType: 'blob' });
            
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const contentDisposition = res.headers['content-disposition'];
            let filename = `Backup-CahayaKomputer-${new Date().toISOString().split('T')[0]}.sqlite`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch.length === 2)
                    filename = filenameMatch[1];
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            window.URL.revokeObjectURL(url);
            toast.success('Backup berhasil diunduh! Silakan simpan ke Google Drive Anda.');
        } catch (err) {
            console.error(err);
            toast.error('Gagal men-download backup.');
        } finally {
            setDownloading(false);
        }
    };

    const handleSyncDatabase = async () => {
        try {
            setSyncingDb(true);
            const res = await api.post('/settings/fix-database');
            toast.success(res.data.message || 'Database berhasil disinkronisasi (Auto Migrate).');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal sinkronisasi data.');
        } finally {
            setSyncingDb(false);
        }
    };

    if (loading) return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="bg-card rounded-xl shadow-sm border border-border p-5">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-accent rounded-lg" />
            <div><div className="h-5 bg-accent rounded w-24 mb-2" /><div className="h-3 bg-accent rounded w-48" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="h-40 bg-accent rounded-2xl border-2 border-dashed border-border" />
            <div className="md:col-span-2 space-y-4">{[...Array(4)].map((_, i) => (<div key={i}><div className="h-3 bg-accent rounded w-24 mb-2" /><div className="h-10 bg-accent rounded-lg w-full" /></div>))}</div>
          </div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-accent rounded-lg" />
            <div><div className="h-5 bg-accent rounded w-36 mb-2" /><div className="h-3 bg-accent rounded w-56" /></div>
          </div>
          <div className="h-20 bg-accent rounded-lg" />
        </div>
      </div>
    );

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
                <div className="bg-card rounded-xl shadow-sm border border-border p-4 h-full">
                <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
                    <div className="p-2.5 bg-[#3B82F6]/10 rounded-lg text-[#3B82F6]">
                        <Store size={14} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground">Profil Toko</h2>
                        <p className="text-[10px] text-muted-foreground">Atur logo, nama, dan alamat toko Anda untuk nota/faktur.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-foreground">Logo Toko</label>
                        <div className="relative group">
                            <div className="w-full aspect-square bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-3" />
                                ) : (
                                    <div className="text-center p-3">
                                        <Upload className="mx-auto text-gray-300 mb-2" size={16} />
                                        <p className="text-[11px] text-muted-foreground">Klik untuk upload logo toko</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Stamp Upload */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-foreground">Cap / Tanda Tangan (PNG Transparan)</label>
                        <div className="relative group">
                            <div className="w-full aspect-square bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden">
                                {stampPreview ? (
                                    <img src={stampPreview} alt="Stamp Preview" className="w-full h-full object-contain p-3 opacity-80" />
                                ) : (
                                    <div className="text-center p-3">
                                        <Upload className="mx-auto text-gray-300 mb-2" size={16} />
                                        <p className="text-[11px] text-muted-foreground">Klik untuk upload cap toko</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleStampChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>


                    {/* Store Info */}
                    <div className="md:col-span-2 space-y-3">
                        <div className="space-y-1">
                            <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                                <Store size={16} className="text-muted-foreground" /> Nama Toko
                            </label>
                            <input
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Contoh: CAHAYA KOMPUTER"
                                className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-foreground">
                                Telepon / WhatsApp
                            </label>
                            <input
                                type="text"
                                value={storePhone}
                                onChange={(e) => setStorePhone(e.target.value)}
                                placeholder="08xxxx..."
                                className="w-full px-2.5 py-1.5 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-xs outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-foreground">
                                Mulai Nomor Faktur
                            </label>
                            <input
                                type="number"
                                value={invoiceStartNumber}
                                onChange={(e) => setInvoiceStartNumber(e.target.value)}
                                placeholder="Contoh: 10000"
                                className="w-full px-2.5 py-1.5 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-xs"
                            />
                            <p className="text-[9px] text-muted-foreground leading-tight">
                                Faktur selanjutnya akan dimulai dari angka ini (misal: INV-10000) dan terus berlanjut tanpa reset harian.
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-foreground">
                                <MapPin size={12} className="text-muted-foreground" /> Alamat Lengkap
                            </label>
                            <textarea
                                value={storeAddress}
                                onChange={(e) => setStoreAddress(e.target.value)}
                                placeholder="Jl. Gajah Mada No. 123..."
                                rows={2}
                                className="w-full px-2.5 py-1.5 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all resize-none text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-foreground">
                                Keterangan Faktur (Notes)
                            </label>
                            <textarea
                                value={storeNotes}
                                onChange={(e) => setStoreNotes(e.target.value)}
                                placeholder="Keterangan yang akan muncul di bawah faktur..."
                                rows={4}
                                className="w-full px-2.5 py-1.5 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all resize-none text-xs"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg text-xs font-bold shadow-lg shadow-[#3B82F6]/30 hover:bg-[#2563EB] disabled:bg-gray-300 transition-all active:scale-95"
                    >
                        <Save size={16} />
                        {saving ? 'Menyimpan...' : 'SIMPAN PENGATURAN'}
                    </button>
                </div>
            </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
            {/* BACKUP SECTION */}
            <div className="bg-card rounded-xl shadow-sm border border-emerald-100 p-4 text-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-emerald-50 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                            <Database size={14} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-foreground">Backup & Keamanan</h2>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Amankan data toko Anda (Produk, Faktur, Stok) menjadi 1 file.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label
                            className={`flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg font-bold shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all active:scale-95 text-xs cursor-pointer ${uploadingBackup || downloading ? 'opacity-75 cursor-wait' : ''}`}
                        >
                            <input 
                                type="file" 
                                accept=".sqlite,.db" 
                                style={{ display: 'none' }}
                                onChange={handleFileSelection}
                                disabled={uploadingBackup || downloading}
                            />
                            <UploadCloud size={16} />
                            {uploadingBackup ? 'Memulihkan...' : 'Upload Backup (.sqlite)'}
                        </label>
                        <button
                            onClick={handleBackup}
                            disabled={downloading || uploadingBackup}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-75 disabled:cursor-wait transition-all active:scale-95 text-xs"
                        >
                            <DownloadCloud size={16} />
                            {downloading ? 'Memproses...' : 'Download Database (.sqlite)'}
                        </button>
                    </div>
                </div>
                
                <div className="text-xs bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200">
                    <strong>💡 Tips:</strong> Rutin Download Database dan simpan di <strong>Google Drive / Flashdisk</strong> minimal 1 minggu sekali untuk keamanan data.
                </div>
            </div>

            {/* SYNC DB SECTION */}
            <div className="bg-card rounded-xl shadow-sm border border-blue-100 p-4 border-l-4 border-l-blue-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                            <RefreshCw size={14} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-foreground">Perbarui Struktur Database</h2>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Gunakan tombol ini untuk menyesuaikan database setelah aplikasi mendapat pembaruan (update) fitur baru.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSyncDatabase}
                        disabled={syncingDb}
                        className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-75 disabled:cursor-wait transition-all flex-[0_0_auto] active:scale-95 text-xs"
                    >
                        <RefreshCw size={14} className={syncingDb ? "animate-spin" : ""} />
                        {syncingDb ? 'Memproses...' : 'Perbarui Struktur Database'}
                    </button>
                </div>
            </div>
            </div>


            {/* ============================== */}
            {/* RESTORE CONFIRMATION MODAL */}
            {/* ============================== */}
            {showRestoreModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 md:p-4">
                    <div className="bg-card md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 h-full md:h-auto flex flex-col">
                        <div className="bg-amber-600 px-4 md:px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setShowRestoreModal(false); setPendingRestoreFile(null); }} className="md:hidden p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white">
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="hidden md:block p-2 bg-white/20 rounded-lg">
                                    <Database size={20} className="text-white" />
                                </div>
                                <h3 className="text-sm md:text-base font-bold text-white">Konfirmasi Pemulihan</h3>
                            </div>
                            <button onClick={() => { setShowRestoreModal(false); setPendingRestoreFile(null); }} className="hidden md:block text-white/70 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 text-center">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <AlertTriangle className="text-red-600" size={24} />
                                </div>
                                <h4 className="text-sm font-bold text-red-800 mb-1">PERINGATAN KRITIS!</h4>
                                <p className="text-[11px] text-red-600 leading-relaxed uppercase font-black">
                                    SELURUH DATA SAAT INI AKAN DIHAPUS DAN DIGANTIKAN OLEH DATA DARI FILE BACKUP BERIKUT:
                                </p>
                            </div>

                            <div className="bg-muted border border-border rounded-lg p-3 mb-6">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">File Terpilih:</p>
                                <p className="text-xs font-mono text-foreground bg-card px-2 py-1.5 border border-border rounded truncate">
                                    {pendingRestoreFile?.name}
                                </p>
                            </div>

                            <div className="flex gap-3 mt-auto md:mt-0 pt-4 md:pt-0 sticky bottom-0 bg-card border-t border-border md:border-none">
                                <button
                                    onClick={() => { setShowRestoreModal(false); setPendingRestoreFile(null); }}
                                    className="hidden md:block flex-1 py-2.5 bg-accent text-foreground rounded-lg font-bold text-sm hover:bg-accent transition-all active:scale-95"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmRestoreBackup}
                                    className="flex-1 md:flex-none w-full py-3 md:py-2.5 bg-red-600 text-white rounded-xl md:rounded-lg font-bold text-sm hover:bg-red-700 transition-all active:scale-[0.98] shadow-lg shadow-red-600/30"
                                >
                                    Ya, Pulihkan Sekarang
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
