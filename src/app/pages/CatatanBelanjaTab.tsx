import { useState, useEffect } from 'react';
import { Save, FileText, CheckCircle2, Copy, Search, PlusCircle } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Product {
  id: number;
  name: string;
}

export default function CatatanBelanjaTab() {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Product picker states
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Bundling (Paket) states
  const [isBundling, setIsBundling] = useState(false);
  const [selectedBundledProducts, setSelectedBundledProducts] = useState<Product[]>([]);
  const [searchBundle, setSearchBundle] = useState('');

  // Load dari Server Settings
  useEffect(() => {
    fetchNoteAndProducts();
  }, []);

  const fetchNoteAndProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data && res.data.catatan_belanja) {
        setNote(res.data.catatan_belanja);
      }
      
      const prodRes = await api.get('/products');
      if (prodRes.data && Array.isArray(prodRes.data)) {
         setProducts(prodRes.data);
      } else if (prodRes.data && Array.isArray(prodRes.data.data)) {
         setProducts(prodRes.data.data);
      }
    } catch (err) {
      console.error('Gagal memuat catatan belanja:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post('/settings', { catatan_belanja: note });
      setLastSaved(new Date());
      toast.success('Catatan berhasil disimpan ke Database Utama.');
    } catch (err) {
      toast.error('Gagal menyimpan catatan');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto save tiap 5 detik jika ada perubahan dan tidak sedang ngetik (didiamkan 3 detik)
  useEffect(() => {
    if (isLoading) return; // Jangan autosave saat loading pertama
    
    const timeoutId = setTimeout(() => {
      // Kita langsung save tapi tanpa ngasih notifikasi biar ga berisik (silent save)
      api.post('/settings', { catatan_belanja: note }).then(() => {
         setLastSaved(new Date());
      }).catch(e => console.error(e));
    }, 5000); // 5 detik setelah berhenti ngetik
    
    return () => clearTimeout(timeoutId);
  }, [note]);

  const handleCopy = () => {
    if (!note.trim()) {
      toast.warning('Catatan masih kosong');
      return;
    }
    navigator.clipboard.writeText(note);
    toast.success('Disalin ke Clipboard! Tinggal Paste di WhatsApp.');
  };

  const appendToNote = (productName: string) => {
    const lines = note.split('\n').filter(l => l.trim() !== '');
    
    let found = false;
    // Regex matches: "1. Nama Barang - 1 pcs"
    const listItemRegex = /^(\d+)\.\s*(.+?)\s*-\s*(\d+)\s*pcs.*$/;

    const processedLines = lines.map(line => {
      const match = line.match(listItemRegex);
      if (match) {
        const existingName = match[2].trim();
        const existingQty = parseInt(match[3]);
        if (existingName === productName) {
          found = true;
          return `${existingName} - ${existingQty + 1} pcs`;
        }
        return `${existingName} - ${existingQty} pcs`;
      }
      return line; // Keep manual text lines as-is
    });

    if (!found) {
      processedLines.push(`${productName} - 1 pcs`);
    }

    // Re-index the lines that are part of the list
    let counter = 1;
    const finalizedLines = processedLines.map(line => {
      // If it matches our item format (with or without index)
      if (line.match(/ - \d+ pcs$/) || line.match(/^\d+\./)) {
        const content = line.replace(/^\d+\.\s*/, '');
        return `${counter++}. ${content}`;
      }
      return line;
    });

    setNote(finalizedLines.join('\n'));
    setShowProductDropdown(false);
    setSearchProduct('');
  };

  const createBundle = () => {
    if (selectedBundledProducts.length === 0) return;
    
    const bundleName = selectedBundledProducts.map(p => p.name).join(' + ');
    const bundleStr = `PAKET ${bundleName}`;
    
    // Use existing logic to append
    appendToNote(bundleStr);
    
    // Reset
    setSelectedBundledProducts([]);
    setIsBundling(false);
    setSearchBundle('');
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase())).slice(0, 50);
  const filteredBundleProducts = products.filter(p => p.name.toLowerCase().includes(searchBundle.toLowerCase())).slice(0, 20);

  return (
    <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">
      {/* HEADER */}
      <div className="bg-muted p-4 flex justify-between items-center border-b border-border shrink-0">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <FileText className="text-primary" size={20} />
            Catatan Belanja & Permintaan
          </h2>
          <p className="text-xs text-muted-foreground mt-1 hidden md:block">
            Terhubung langsung ke server database, semua komputer bisa saling melengkapi daftar.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button 
              onClick={handleCopy}
              className="bg-accent text-foreground hover:bg-muted px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border border-border transition active:scale-95"
            >
              <Copy size={14} /> Salin Teks
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : (
                <>
                  <Save size={14} /> Simpan
                </>
              )}
            </button>
          </div>
          {lastSaved && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
               <CheckCircle2 size={10} className="text-green-500" /> Tersimpan jam {lastSaved.toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>
      </div>

      {/* QUICK PRODUCT PICKER BAR */}
      <div className="bg-card border-b border-border p-3 flex items-center justify-between gap-3 relative z-10 shrink-0">
         <div className="flex items-center gap-3 w-full">
          <span className="text-xs font-bold whitespace-nowrap hidden sm:block">Sisipkan Dari Gudang:</span>
          <div className="relative w-full max-w-md">
              <div 
                className="flex items-center bg-input/20 border border-border rounded-lg p-1.5 focus-within:ring-2 ring-primary focus-within:bg-card transition-all cursor-text text-foreground"
                onClick={() => setShowProductDropdown(true)}
              >
                <Search size={16} className="text-muted-foreground ml-2 mr-2" />
                <input 
                  value={searchProduct}
                  onChange={e => { setSearchProduct(e.target.value); setShowProductDropdown(true); }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Cari & klik nama stok barang untuk ditambah ke catatan..."
                  className="bg-transparent outline-none text-sm w-full font-medium"
                />
              </div>
              
              {showProductDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProductDropdown(false)}></div>
                  <div className="absolute top-full mt-2 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Opps.. Barang tidak ditemukan.</div>
                    ) : (
                        <div className="p-1">
                          {filteredProducts.map(p => (
                            <div 
                              key={p.id} 
                              onClick={() => appendToNote(p.name)}
                              className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-accent cursor-pointer group border-b border-border last:border-b-0"
                            >
                              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                              <PlusCircle size={14} className="text-muted-foreground group-hover:text-primary" />
                            </div>
                          ))}
                        </div>
                    )}
                  </div>
                </>
              )}
          </div>
          <button 
            onClick={() => setIsBundling(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-200 shrink-0 shadow-sm"
          >
            <PlusCircle size={14} /> Buat Paket
          </button>
         </div>
      </div>

      {/* MODAL BUAT PAKET */}
      {isBundling && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-3 animate-in fade-in duration-200">
           <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-border bg-muted/50 flex justify-between items-center">
                 <div>
                    <h3 className="text-sm font-bold text-foreground font-black uppercase tracking-wider">📦 Buat Paket Barang</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Gabungkan beberapa barang jadi 1 baris catatan</p>
                 </div>
                 <button onClick={() => setIsBundling(false)} className="text-muted-foreground hover:text-foreground p-1 transition-colors">&times;</button>
              </div>

              <div className="p-4 flex flex-col gap-4 overflow-hidden">
                 {/* Preview */}
                 <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl min-h-[60px] flex flex-wrap gap-1.5 items-center">
                    {selectedBundledProducts.length === 0 ? (
                       <span className="text-xs text-muted-foreground italic">Belum ada barang dipilih...</span>
                    ) : (
                       <>
                         <span className="text-[10px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded leading-tight">PAKET</span>
                         {selectedBundledProducts.map((p, i) => (
                            <div key={p.id} className="flex items-center gap-1.5">
                               {i > 0 && <span className="text-blue-500 font-bold text-xs">+</span>}
                               <div className="flex items-center gap-1 bg-card border border-blue-200 dark:border-blue-900 px-2 py-1 rounded-lg shadow-sm">
                                  <span className="text-xs font-bold">{p.name}</span>
                                  <button onClick={() => setSelectedBundledProducts(prev => prev.filter(x => x.id !== p.id))} className="text-rose-500 hover:text-rose-700 transition-colors ml-1">&times;</button>
                               </div>
                            </div>
                         ))}
                       </>
                    )}
                 </div>

                 {/* Search */}
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input 
                       autoFocus
                       placeholder="Cari barang untuk dipaketkan..."
                       value={searchBundle}
                       onChange={e => setSearchBundle(e.target.value)}
                       className="w-full pl-9 pr-3 py-2.5 bg-muted/30 border border-border rounded-xl text-xs outline-none focus:ring-2 ring-primary/20 transition-all font-medium"
                    />
                 </div>

                 {/* List */}
                 <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar min-h-[200px]">
                    {filteredBundleProducts.map(p => {
                       const isSelected = selectedBundledProducts.some(x => x.id === p.id);
                       return (
                          <div 
                             key={p.id}
                             onClick={() => {
                                if (isSelected) setSelectedBundledProducts(prev => prev.filter(x => x.id !== p.id));
                                else setSelectedBundledProducts(prev => [...prev, p]);
                             }}
                             className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected 
                                ? 'bg-blue-500/10 border-blue-500 text-blue-600 shadow-sm' 
                                : 'bg-card border-border hover:bg-muted text-foreground'
                             }`}
                          >
                             <span className="text-xs font-bold">{p.name}</span>
                             {isSelected ? <CheckCircle2 size={16} /> : <PlusCircle size={16} className="text-muted-foreground opacity-50" />}
                          </div>
                       )
                    })}
                 </div>
              </div>

              <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/30">
                 <button onClick={() => setIsBundling(false)} className="px-5 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Batal</button>
                 <button 
                  disabled={selectedBundledProducts.length === 0}
                  onClick={createBundle}
                  className="px-6 py-2 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                 >
                    + Tambah ke Catatan
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* TEXT AREA */}
      <div className="p-4 flex-1 flex flex-col bg-sidebar-primary/5">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Memuat catatan...</div>
        ) : (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan daftar belajaan, permintaan khusus pelanggan, atau barang yang butuh digaransikan secepatnya ke distributor disini..."
            className="w-full flex-1 p-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-foreground text-sm font-medium leading-relaxed custom-scrollbar shadow-inner"
            style={{ fontFamily: "'Roboto Mono', 'Courier New', monospace" }}
          ></textarea>
        )}
      </div>
    </div>
  );
}
