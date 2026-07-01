import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, User, DollarSign, History, Gift, MinusCircle, FileText, ChevronLeft, X } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

interface Employee {
  id: number;
  name: string;
  position: string;
  base_salary: number;
}

interface Salary {
  id: number;
  employee_id: number;
  tanggal: string;
  gaji_pokok: number;
  bonus: number;
  potongan: number;
  total: number;
  keterangan: string | null;
  employee?: Employee;
}
export default function EmployeeSalaryTab() {
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

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [promptModal, setPromptModal] = useState<{isOpen: boolean, id: number | null, name: string, base_salary: string}>({isOpen: false, id: null, name: '', base_salary: ''});
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, id: number | null}>({isOpen: false, id: null});

  const getCurrentLocalDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Form State
  const [form, setForm] = useState({
    employee_id: '',
    tanggal: getCurrentLocalDateTime(),
    gaji_pokok: '',
    bonus: '',
    potongan: '',
    keterangan: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchSalaries();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      toast.error('Gagal memuat data karyawan');
    }
  };

  const fetchSalaries = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get('/salaries', { params: { page, limit: 100 } });
      setSalaries(res.data.data);
    } catch (err) {
      toast.error('Gagal memuat riwayat gaji');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) return toast.error('Pilih karyawan terlebih dahulu');

    const pokok = Number(form.gaji_pokok) || 0;
    const bonus = Number(form.bonus) || 0;
    const potongan = Number(form.potongan) || 0;
    const total = pokok + bonus - potongan;

    setSaving(true);
    try {
      await api.post('/salaries', {
        ...form,
        gaji_pokok: pokok,
        bonus,
        potongan,
        total
      });
      toast.success('Gaji berhasil dicatat dan memotong kas');
      setShowModal(false);
      setForm({
        employee_id: '',
        tanggal: getCurrentLocalDateTime(),
        gaji_pokok: '',
        bonus: '',
        potongan: '',
        keterangan: ''
      });
      fetchSalaries();
    } catch (err) {
      toast.error('Gagal mencatat gaji');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (!confirmDialog.id) return;
    try {
      await api.delete(`/salaries/${confirmDialog.id}`);
      toast.success('Riwayat gaji dihapus');
      fetchSalaries();
    } catch (err) {
      toast.error('Gagal menghapus data');
    }
    setConfirmDialog({ isOpen: false, id: null });
  };

  const handleAddEmployee = () => {
    setPromptModal({ isOpen: true, id: null, name: '', base_salary: '' });
  };

  const handleEditEmployee = (emp: Employee) => {
    setPromptModal({ isOpen: true, id: emp.id, name: emp.name, base_salary: emp.base_salary.toString() });
  };

  const submitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = promptModal.name.trim();
    const base_salary = Number(promptModal.base_salary) || 0;
    if (!name) return;

    try {
      if (promptModal.id) {
        await api.put(`/employees/${promptModal.id}`, { name, base_salary });
        toast.success('Data staf diperbarui');
      } else {
        await api.post('/employees', { name, base_salary });
        toast.success('Staf baru ditambahkan');
      }
      fetchEmployees();
      setPromptModal({ isOpen: false, id: null, name: '', base_salary: '' });
    } catch (err: any) {
      toast.error('Gagal menyimpan data staf');
    }
  };

  const getStaffMonthlyStats = (employeeId: number) => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthlyPayments = salaries.filter(s => {
      const d = new Date(s.tanggal);
      return s.employee_id === employeeId && d.getMonth() === month && d.getFullYear() === year;
    });

    const totalTaken = monthlyPayments.reduce((sum, s) => sum + Math.abs(Number(s.total)), 0);
    return { monthlyPayments, totalTaken };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <button
            onClick={handleAddEmployee}
            className="flex items-center gap-2 bg-card text-foreground px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors font-bold text-xs shadow-sm"
          >
            <User size={14} />
            + Staf Baru
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-bold text-xs shadow-md shadow-purple-200"
          >
            <Plus size={14} />
            Input Gaji / Pinjaman
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-card rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-fit">
          <div className="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={16} className="text-purple-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Riwayat Pengeluaran (100 Terakhir)</h3>
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-card z-10 shadow-sm">
                <tr className="bg-muted/50">
                  <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">TGL</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">Karyawan</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase">Total</th>
                  <th className="px-4 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                   <tr><td colSpan={4} className="p-4 text-center text-xs text-muted-foreground">Loading...</td></tr>
                ) : salaries.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-xs text-muted-foreground italic">Belum ada riwayat gaji</td></tr>
                ) : (
                  salaries.map((s) => (
                    <tr key={s.id} className="hover:bg-muted transition-colors">
                      <td className="px-4 py-1.5 text-[11px] font-bold text-muted-foreground">
                        {new Date(s.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-4 py-1.5">
                        <p className="text-xs font-bold text-foreground">{s.employee?.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{s.keterangan || '-'}</p>
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        <p className="text-xs font-black text-purple-600">Rp {Number(s.total).toLocaleString('id-ID')}</p>
                      </td>
                      <td className="px-4 py-1.5 text-center">
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List for Salaries */}
          <div className="md:hidden divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar px-3 bg-card">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
            ) : salaries.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">Belum ada riwayat gaji</div>
            ) : (
              salaries.map((s) => (
                <div key={s.id} className="py-1.5 flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {new Date(s.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </span>
                      <h4 className="font-bold text-xs text-foreground truncate">{s.employee?.name}</h4>
                    </div>
                    {s.keterangan && <p className="text-[9px] text-muted-foreground truncate mt-0.5">{s.keterangan}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black text-purple-600">Rp {Number(s.total).toLocaleString('id-ID')}</span>
                    <button 
                      onClick={() => handleDelete(s.id)} 
                      className="p-1.5 text-red-400 hover:text-red-600 bg-red-50/50 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
           <div className="flex items-center gap-2 mb-1 px-1">
             <User size={16} className="text-purple-600" />
             <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground font-bold">Status Gaji Bulan Ini: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              {employees.length === 0 ? (
                <div className="bg-card dark:bg-slate-800 border border-dashed border-border dark:border-slate-600 rounded-xl p-8 text-center text-muted-foreground dark:text-slate-400 text-xs italic">
                  Belum ada data staf. Tambahkan staf baru di atas.
                </div>
              ) : (
                employees.map((emp, empIdx) => {
                  const { monthlyPayments, totalTaken } = getStaffMonthlyStats(emp.id);
                  const remaining = (Number(emp.base_salary) || 0) - totalTaken;
                  
                  const STAFF_COLORS = [
                    { grad: 'from-blue-600 to-indigo-700', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-blue-300' },
                    { grad: 'from-emerald-500 to-teal-600', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-emerald-300' },
                    { grad: 'from-rose-500 to-pink-600', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-rose-300' },
                    { grad: 'from-amber-500 to-orange-600', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-amber-300' },
                    { grad: 'from-cyan-500 to-blue-600', accent: 'bg-white/20 text-white', light: 'bg-white/10 border-white/20', historyLine: 'bg-cyan-300' },
                  ];
                  const c = STAFF_COLORS[empIdx % STAFF_COLORS.length];

                  return (
                    <div key={emp.id} className={`bg-gradient-to-br ${c.grad} rounded-xl shadow-md overflow-hidden transition-all duration-300 group relative border-t border-white/20`}>
                      {/* Decorative Background Icon */}
                      <div className="absolute top-0 right-0 p-4 opacity-10 -mr-4 -mt-4 text-white pointer-events-none">
                         <User size={80} strokeWidth={1} />
                      </div>

                      <div className="p-4 relative z-10 flex flex-col md:flex-row gap-4">
                        {/* Left Side: Summary */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-base text-white shadow-inner border border-white/30 shrink-0">
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-base font-black text-white tracking-tight leading-tight">{emp.name}</h4>
                                <p className="text-[9px] text-white/70 uppercase font-bold tracking-[0.1em]">{emp.position || 'Staf Operasional'}</p>
                              </div>
                            </div>
                            <button onClick={() => handleEditEmployee(emp)} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 group-hover:scale-105 shrink-0">
                              <FileText size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                             <div className="bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                                <p className="text-[8px] font-bold text-white/70 uppercase mb-1 leading-none">Gaji Pokok</p>
                                <p className="text-xs font-black text-white truncate">Rp {Number(emp.base_salary).toLocaleString('id-ID')}</p>
                             </div>
                             <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl border border-white/20 shadow-sm">
                                <p className="text-[8px] font-bold text-white/90 uppercase mb-1 leading-none">Diambil</p>
                                <p className="text-xs font-black text-white truncate">Rp {totalTaken.toLocaleString('id-ID')}</p>
                             </div>
                             <div className={`backdrop-blur-sm p-2 rounded-xl border transition-colors ${remaining < 0 ? 'bg-red-500/40 border-red-400' : 'bg-white/10 border-white/10'}`}>
                                <p className={`text-[8px] font-bold uppercase mb-1 leading-none ${remaining < 0 ? 'text-white' : 'text-white/70'}`}>Sisa Gaji</p>
                                <p className="text-xs font-black text-white truncate">Rp {remaining.toLocaleString('id-ID')}</p>
                             </div>
                          </div>
                        </div>

                        {/* Right Side: History Mini List */}
                        <div className="w-full md:w-48 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-3 flex flex-col h-full">
                           <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1.5">
                             <p className="text-[9px] font-bold text-white/90 uppercase flex items-center gap-1.5">
                               <History size={10} className="text-white" /> Aktivitas
                             </p>
                             <div className="w-1.5 h-1.5 rounded-full bg-card opacity-50 animate-pulse"></div>
                           </div>
                           
                           <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-[50px] max-h-[70px]">
                              {monthlyPayments.length === 0 ? (
                                <p className="text-[9px] text-white/50 italic py-2 text-center">Belum ada pengambilan</p>
                              ) : (
                                monthlyPayments.map(p => (
                                  <div key={p.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-1 h-1 rounded-full ${c.historyLine}`}></div>
                                      <p className="text-[9px] font-bold text-white/90">
                                        {new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                      </p>
                                    </div>
                                    <p className="text-[9px] font-black text-white">Rp {Number(p.total).toLocaleString('id-ID')}</p>
                                  </div>
                                ))
                              )}
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
           </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end md:items-center justify-center md:p-4 animate-in fade-in duration-300">
           <div className="bg-card md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 h-full md:h-auto flex flex-col">
              <div className="bg-purple-600 px-4 py-2.5 text-white flex items-center justify-between shrink-0 sticky top-0 z-20">
                 <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowModal(false)} className="md:hidden p-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border-0">
                      <ChevronLeft size={16} />
                    </button>
                    <div>
                       <h3 className="text-xs font-black tracking-tight">Input Pembayaran Gaji / Kasbon</h3>
                       <p className="text-purple-100 text-[9px] opacity-80">Dana akan otomatis memotong Kas Toko secara real-time</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowModal(false)} className="hidden md:block bg-white/10 p-1 rounded-lg hover:bg-white/20 transition-colors border-0">
                    <X size={16} />
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-3 space-y-2.5 flex-1 overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                        <label className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Pilih Karyawan</label>
                        <select
                          required
                          value={form.employee_id}
                          onChange={(e) => setForm({...form, employee_id: e.target.value})}
                          className="w-full px-2.5 py-1 border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-purple-500 bg-muted dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                        >
                          <option value="">-- Pilih Staf --</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Calendar size={9} /> Tanggal Transaksi
                        </label>
                        <input
                          type="datetime-local"
                          value={form.tanggal}
                          onChange={(e) => setForm({...form, tanggal: e.target.value})}
                          className="w-full px-2.5 py-1 border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-purple-500 bg-muted dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                        <label className="block text-[9px] font-black text-purple-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <DollarSign size={9} /> Gaji Pokok
                        </label>
                        <input
                          type="text"
                          value={formatNumber(form.gaji_pokok)}
                          onChange={(e) => setForm({...form, gaji_pokok: parseNumber(e.target.value).toString()})}
                          placeholder="Rp..."
                          className="w-full px-2.5 py-1 border border-purple-100 bg-purple-50/30 rounded-lg text-xs font-bold text-purple-700 outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Gift size={9} /> Bonus / Tambahan
                        </label>
                        <input
                          type="text"
                          value={formatNumber(form.bonus)}
                          onChange={(e) => setForm({...form, bonus: parseNumber(e.target.value).toString()})}
                          placeholder="Rp..."
                          className="w-full px-2.5 py-1 border border-emerald-100 bg-emerald-50/30 rounded-lg text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <MinusCircle size={9} /> Potongan / Pinjam
                        </label>
                        <input
                          type="text"
                          value={formatNumber(form.potongan)}
                          onChange={(e) => setForm({...form, potongan: parseNumber(e.target.value).toString()})}
                          placeholder="Rp..."
                          className="w-full px-2.5 py-1 border border-rose-100 bg-rose-50/30 rounded-lg text-xs font-bold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500"
                        />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Keterangan Tambahan</label>
                    <input
                      type="text"
                      value={form.keterangan}
                      onChange={(e) => setForm({...form, keterangan: e.target.value})}
                      placeholder="Contoh: Bonus target lebaran"
                      className="w-full px-2.5 py-1 border border-border rounded-lg text-xs font-medium text-foreground outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                    />
                 </div>

                  <div>
                    {(() => {
                      const total = (Number(form.gaji_pokok) || 0) + (Number(form.bonus) || 0) - (Number(form.potongan) || 0);
                      const isLoan = total < 0;
                      return (
                        <div className={`${isLoan ? 'bg-rose-600 shadow-rose-100' : 'bg-purple-600 shadow-purple-100'} px-3 py-2 rounded-lg text-white flex justify-between items-center shadow-md transition-all`}>
                           <div>
                              <p className="text-[9px] font-black uppercase opacity-70">{isLoan ? 'Pinjaman (Uang Keluar)' : 'Total Gaji Bersih'}</p>
                              <p className="text-lg font-black">
                                Rp {Math.abs(total).toLocaleString('id-ID')}
                              </p>
                           </div>
                           <div className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                              {isLoan ? 'Potong Kas Toko' : 'Transfer Kas Toko'}
                           </div>
                        </div>
                      );
                    })()}
                  </div>

                 <div className="flex gap-2 pt-2 sticky bottom-0 bg-card mt-auto md:mt-0 border-t border-border md:border-none md:pt-1">
                    <button type="button" onClick={() => setShowModal(false)} className="hidden md:block flex-1 py-1 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors border-0 bg-transparent">BATAL</button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 md:flex-none w-full bg-purple-600 py-1.5 text-[11px] font-black text-white rounded-lg hover:bg-purple-700 shadow-sm shadow-purple-200 disabled:bg-gray-300 transition-colors border-0 uppercase active:scale-[0.98]"
                    >
                       {saving ? 'Menyimpan...' : 'Simpan & Potong Kas'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end md:items-center justify-center md:p-4 animate-in fade-in duration-300">
           <div className="bg-card md:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-0 h-full md:h-auto flex flex-col">
              <div className="bg-gray-800 p-4 text-white flex items-center justify-between shrink-0 sticky top-0 z-20">
                 <div className="flex items-center gap-2">
                   <button type="button" onClick={() => setPromptModal({...promptModal, isOpen: false})} className="md:hidden p-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border-0">
                     <ChevronLeft size={18} />
                   </button>
                   <h3 className="text-sm font-bold tracking-tight">{promptModal.id ? 'Edit Data Staf' : 'Tambah Staf Baru'}</h3>
                 </div>
                 <button type="button" onClick={() => setPromptModal({...promptModal, isOpen: false})} className="hidden md:block bg-white/10 p-1.5 rounded-lg hover:bg-white/20 transition-colors border-0">
                    <X size={16} />
                 </button>
              </div>
              <form onSubmit={submitEmployee} className="p-4 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5 tracking-wider">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={promptModal.name}
                    onChange={(e) => setPromptModal({...promptModal, name: e.target.value})}
                    placeholder="Masukkan nama staf..."
                    className="w-full px-3 py-1.5 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 font-bold text-foreground dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5 tracking-wider">Gaji Bulanan (Acuan Dasar)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">Rp</span>
                    <input
                      type="text"
                      required
                      value={formatNumber(promptModal.base_salary)}
                      onChange={(e) => setPromptModal({...promptModal, base_salary: parseNumber(e.target.value).toString()})}
                      placeholder="Contoh: 2.500.000"
                      className="w-full pl-9 pr-3 py-1.5 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 font-bold text-foreground dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2 font-medium italic">Gaji ini digunakan sebagai acuan perhitungan "Sisa Gaji" setiap bulannya.</p>
                </div>
                
                <div className="flex gap-2 pt-4 sticky bottom-0 bg-card mt-auto md:mt-0 border-t border-border md:border-none md:pt-2">
                  <button type="button" onClick={() => setPromptModal({...promptModal, isOpen: false})} className="hidden md:block flex-1 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors border-0 bg-transparent">BATAL</button>
                  <button type="submit" className="flex-1 bg-gray-800 py-1.5 text-xs font-black text-white rounded-lg hover:bg-gray-900 shadow-sm transition-colors border-0 uppercase active:scale-[0.98]">
                    {promptModal.id ? 'Update Data' : 'Simpan Staf'}
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-3 animate-in fade-in duration-200">
           <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-4 animate-in zoom-in-95 border-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                 <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-sm font-black text-foreground mb-2 uppercase tracking-wide">Hapus Riwayat Gaji?</h3>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">Peringatan: Riwayat transaksi ini juga akan dihapus dari catatan Mutasi Kas Toko secara permanen.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDialog({isOpen: false, id: null})} className="px-4 py-1.5 text-[10px] font-black text-muted-foreground hover:bg-accent rounded-lg transition-colors uppercase border-0 bg-transparent">Batal</button>
                <button onClick={executeDelete} className="px-4 py-1.5 text-[10px] font-black text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-200 transition-colors uppercase border-0">Ya, Hapus</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
