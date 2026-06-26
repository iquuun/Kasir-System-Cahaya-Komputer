import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Phone, MapPin, ChevronLeft } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Distributor {
  id: number;
  name: string;
  phone: string;
  address: string;
  purchases_count: number;
  purchases_sum_total_pembelian: number | null;
}

export default function DistributorPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentDistributor, setCurrentDistributor] = useState<Distributor | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/distributors');
      setDistributors(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat distributor');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit', distributor?: Distributor) => {
    setModalMode(mode);
    setCurrentDistributor(distributor || null);
    setFormData({
      name: distributor?.name || '',
      phone: distributor?.phone || '',
      address: distributor?.address || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDistributor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setIsSubmitting(true);
      if (modalMode === 'add') {
        await api.post('/distributors', formData);
      } else if (modalMode === 'edit' && currentDistributor) {
        await api.put(`/distributors/${currentDistributor.id}`, formData);
      }
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan distributor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus distributor "${name}"?`)) {
      try {
        await api.delete(`/distributors/${id}`);
        fetchData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Gagal menghapus distributor');
      }
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div><div className="h-5 bg-accent rounded w-40 mb-2" /><div className="h-3 bg-accent rounded w-56" /></div>
        <div className="h-9 bg-accent rounded-lg w-36" />
      </div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-3"><div className="h-9 bg-accent rounded-lg w-full" /></div>
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="h-10 bg-accent border-b border-border" />
        <div className="divide-y divide-gray-100">{[...Array(5)].map((_, i) => (<div key={i} className="px-4 py-3 flex gap-4"><div className="h-4 bg-accent rounded w-1/4" /><div className="h-4 bg-accent rounded w-1/6" /><div className="h-4 bg-accent rounded w-1/6 ml-auto" /></div>))}</div>
      </div>
    </div>
  );
  if (error) return <div className="p-5 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-1.5 bg-[#3B82F6] text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:bg-[#2563EB] transition-colors"
        >
          <Plus size={14} />
          Tambah Distributor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3">
          <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Total Distributor</p>
          <p className="text-base md:text-xl font-bold text-[#3B82F6]">{distributors.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3">
          <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Total Transaksi</p>
          <p className="text-base md:text-xl font-bold text-[#3B82F6]">
            {distributors.reduce((sum, d) => sum + (d.purchases_count || 0), 0)}
          </p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-2 md:p-3">
          <p className="text-[8px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5 line-clamp-1">Total Pembelian</p>
          <p className="text-base md:text-xl font-bold text-[#3B82F6]">
            Rp{' '}
            {distributors
              .reduce((sum, d) => sum + Number(d.purchases_sum_total_pembelian || 0), 0)
              .toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Distributor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {distributors.map((distributor) => (
          <div
            key={distributor.id}
            className="bg-card rounded-lg shadow-sm border border-border p-2 hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-foreground">{distributor.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal('edit', distributor)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(distributor.id, distributor.name)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Phone size={12} className="shrink-0" />
                  <span className="truncate">{distributor.phone || '-'}</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin size={12} className="mt-0.5 shrink-0" />
                  <span className="line-clamp-2 leading-tight">{distributor.address || '-'}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-2 mt-auto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider">Transaksi</p>
                  <p className="text-[11px] font-bold text-[#3B82F6]">
                    {distributor.purchases_count || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider">Pembelian</p>
                  <p className="text-[11px] font-bold text-[#3B82F6]">
                    Rp {(Number(distributor.purchases_sum_total_pembelian || 0) / 1000000).toFixed(1)} Jt
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {distributors.length === 0 && (
          <div className="col-span-full p-5 text-center text-muted-foreground bg-card rounded-lg border border-border">
            Belum ada distributor. Silakan tambah baru.
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-backdrop flex items-end md:items-center justify-center md:p-3 z-50">
          <div className="bg-card md:rounded-2xl shadow-2xl ring-1 ring-white/50 modal-content w-full max-w-md overflow-hidden h-full md:h-auto flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0 sticky top-0 bg-card z-20">
              <div className="flex items-center gap-2">
                <button onClick={handleCloseModal} className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:bg-accent rounded-lg">
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-lg font-semibold text-foreground">
                  {modalMode === 'add' ? 'Tambah Distributor' : 'Edit Distributor'}
                </h3>
              </div>
              <button onClick={handleCloseModal} className="hidden md:block text-muted-foreground hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Nama Distributor
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg focus:ring-1 text-xs font-medium bg-muted focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  placeholder="Contoh: PT. Tech Indonesia"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Kontak (No. HP / Telepon)
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg focus:ring-1 text-xs font-medium bg-muted focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  placeholder="Contoh: 08123456789"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Alamat
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg focus:ring-1 text-xs font-medium bg-muted focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  placeholder="Detail alamat..."
                  rows={3}
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-card mt-auto md:mt-0 border-t border-border md:border-none md:pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="hidden md:block px-3 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 md:flex-none px-3 py-3 md:py-2 bg-[#3B82F6] text-white rounded-xl md:rounded-lg hover:bg-[#2563EB] transition-colors disabled:opacity-50 font-bold active:scale-[0.98]"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
