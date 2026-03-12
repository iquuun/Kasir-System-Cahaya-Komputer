import { useState, useEffect } from 'react';
import { ClipboardList, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';

interface OpnameItem {
  product_id: number;
  product_name: string;
  stok_sistem: number;
  stok_fisik: number | '';
  selisih: number;
}

export default function StokOpnamePage() {
  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      const items = res.data.map((p: any) => ({
        product_id: p.id,
        product_name: p.name,
        stok_sistem: p.stok_saat_ini,
        stok_fisik: p.stok_saat_ini,
        selisih: 0,
      }));
      setOpnameItems(items);
    } catch (err) {
      toast.error('Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  const updateStokFisik = (productId: number, value: string) => {
    const numericValue = value === '' ? '' : parseInt(value) || 0;
    setOpnameItems(
      opnameItems.map((item) =>
        item.product_id === productId
          ? { 
              ...item, 
              stok_fisik: numericValue, 
              selisih: numericValue === '' ? 0 : (numericValue as number) - item.stok_sistem 
            }
          : item
      )
    );
  };

  const totalSelisih = opnameItems.reduce((sum, item) => sum + Math.abs(item.selisih), 0);
  const itemsWithDiff = opnameItems.filter((item) => item.selisih !== 0);

  const handleSave = async () => {
    if (itemsWithDiff.length === 0) {
      toast.info('Tidak ada selisih stok untuk disimpan.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: keterangan || 'Penyesuaian stok opname',
        items: opnameItems.filter(i => i.stok_fisik !== '').map(i => ({
          ...i,
          stok_fisik: i.stok_fisik as number
        }))
      };
      
      await api.post('/stok-opname', payload);
      toast.success('Stok opname berhasil disimpan!');
      setKeterangan('');
      fetchProducts();
    } catch (err) {
      toast.error('Gagal menyimpan hasil stok opname');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = opnameItems.filter((item) =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat data stok...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800 tracking-tight">Stok Opname</h2>
          <p className="text-xs text-gray-500 mt-0.5">Periksa dan sesuaikan stok fisik dengan sistem</p>
        </div>
        <div className="flex items-center gap-3">
          <ClipboardList className="text-[#3B82F6]" size={16} />
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Panduan:</strong> Masukkan jumlah stok fisik yang Anda hitung. Sistem akan otomatis menghitung selisih dan menyesuaikan stok.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Item Diperiksa</p>
          <p className="text-xl font-bold text-[#3B82F6]">{opnameItems.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Item dengan Selisih</p>
          <p className="text-xl font-bold text-red-600">
            {itemsWithDiff.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total Selisih</p>
          <p className="text-base font-bold text-gray-800 tracking-tight">{totalSelisih}</p>
        </div>
      </div>

      {/* Opname Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col min-h-0">
        <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Keterangan Opname
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Opname rutin akhir bulan"
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50 focus:ring-[#3B82F6] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Cari Produk
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3B82F6] outline-none text-xs bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Nama Produk</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Stok Sistem</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Stok Fisik</th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <tr key={item.product_id} className={`transition-colors border-b border-gray-50 last:border-0 ${item.selisih !== 0 ? 'bg-orange-50/30' : 'hover:bg-blue-50/50'}`}>
                  <td className="px-3 py-2 text-xs">
                    <p className="font-bold text-xs text-gray-800">{item.product_name}</p>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-bold">
                      {item.stok_sistem}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <input
                      type="number"
                      value={item.stok_fisik === '' ? '' : item.stok_fisik}
                      onChange={(e) => updateStokFisik(item.product_id, e.target.value)}
                      className="w-20 text-center px-1.5 py-0.5 border border-gray-200 rounded focus:ring-1 text-xs font-bold bg-white focus:ring-[#3B82F6] outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded font-bold ${
                        item.selisih > 0
                          ? 'bg-green-100 text-green-700'
                          : item.selisih < 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100/50 text-gray-400'
                      }`}
                    >
                      {item.selisih > 0 ? '+' : ''}
                      {item.selisih}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Save Button */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
          <p className="text-xs text-gray-500 font-medium">*Hanya item dengan selisih yang akan memengaruhi stok.</p>
          <button
            onClick={handleSave}
            disabled={isSubmitting || itemsWithDiff.length === 0}
            className="flex items-center gap-1.5 bg-[#3B82F6] text-white px-4 py-2 rounded-md text-xs font-bold shadow-sm hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {isSubmitting ? 'Memproses...' : 'Simpan Opname'}
          </button>
        </div>
      </div>
    </div>
  );
}
