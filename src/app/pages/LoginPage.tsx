import { useState, useEffect } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, Loader2, Monitor, WifiOff, RefreshCw, X, Info } from 'lucide-react';
import api from '../api';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingServer, setCheckingServer] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  
  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotRole, setForgotRole] = useState<'owner' | 'staf' | null>(null);
  const [forgotRecoveryKey, setForgotRecoveryKey] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    checkServer();
  }, []);

  const checkServer = async () => {
    try {
      setCheckingServer(true);
      await api.get('/ping');
      setServerOnline(true);
    } catch (err) {
      console.error('Server ping failed', err);
      setServerOnline(false);
    } finally {
      setCheckingServer(false);
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      let errorMsg = 'Gagal untuk masuk, silakan coba lagi.';
      const serverMsg = err.response?.data?.message || '';
      
      if (serverMsg.includes('SQLSTATE') || serverMsg.includes('Connection') || !err.response) {
        errorMsg = 'Gagal terhubung ke server. Pastikan server aktif dan coba lagi.';
      } else if (err.response?.status === 401 || err.response?.status === 404 || serverMsg.toLowerCase().includes('password') || serverMsg.toLowerCase().includes('email')) {
        errorMsg = 'Email atau password yang Anda masukkan salah!';
      } else {
        errorMsg = 'Kombinasi email dan password tidak ditemukan.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FORGOT PASSWORD HANDLERS
  // ==========================================
  const handleCheckEmailRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await api.post('/check-email-role', { email: forgotEmail });
      setForgotRole(res.data.role);
      if (res.data.role === 'owner') {
        setForgotStep(2);
      }
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Gagal mengecek email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await api.post('/reset-password-recovery', {
        email: forgotEmail,
        recovery_key: forgotRecoveryKey,
        new_password: forgotNewPassword
      });
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotRole(null);
    setForgotRecoveryKey('');
    setForgotNewPassword('');
    setForgotStep(1);
    setForgotError('');
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================
  if (checkingServer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center font-['Inter']">
        <div className="text-center">
          <div className="relative inline-flex mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
              <Monitor className="text-white" size={28} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-card rounded-full flex items-center justify-center shadow-md">
              <Loader2 className="text-[#3B82F6] animate-spin" size={14} />
            </div>
          </div>
          <p className="text-white/80 text-sm animate-pulse">Menghubungkan ke server...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // CONNECTION ERROR
  // ==========================================
  if (!serverOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center p-4 font-['Inter']">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4 border border-red-100">
            <WifiOff className="text-red-500" size={28} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Gagal Terhubung ke Server</h2>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Aplikasi tidak dapat menghubungi server utama. Silakan periksa koneksi internet Anda.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-left">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong className="block mb-1">💡 Tips:</strong>
              1. Pastikan Anda memiliki koneksi internet yang stabil.<br/>
              2. Jika Anda menggunakan VPN, coba matikan sementara.<br/>
              3. Server mungkin sedang dalam pemeliharaan (maintenance). Silakan coba lagi dalam beberapa saat.
            </p>
          </div>

          <button
            onClick={checkServer}
            className="w-full flex items-center justify-center gap-2 bg-[#3B82F6] text-white py-2.5 rounded-lg font-semibold hover:bg-[#2563EB] transition-colors shadow-lg shadow-[#3B82F6]/30 active:scale-[0.98]"
          >
            <RefreshCw size={16} />
            Hubungkan Ulang
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // NORMAL LOGIN FORM (ALWAYS SHOWN)
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center p-3 font-['Inter']">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-5">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-16 h-12 bg-[#3B82F6] rounded-full mb-3">
            <LogIn className="text-white" size={16} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">CAHAYA KOMPUTER</h1>
          <p className="text-muted-foreground mt-2 text-sm">Sistem Kasir & Manajemen Toko</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none text-sm" placeholder="email@cahaya.id" required />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-medium text-foreground">Password</label>
              <button 
                type="button" 
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotStep(1);
                  setForgotError('');
                }}
                className="text-xs text-[#3B82F6] hover:text-[#2563EB] font-medium"
              >
                Lupa Password?
              </button>
            </div>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-3 pr-10 py-2 border border-border rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none text-sm" placeholder="••••••••" required />
              <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-gray-600 focus:outline-none" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs text-center">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-[#3B82F6] text-white py-2 rounded-lg font-medium hover:bg-[#2563EB] transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>

      {/* Modal Lupa Password */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-blue-50 px-5 py-4 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                <Info size={18} />
                <h3 className="font-bold text-sm">Lupa Password?</h3>
              </div>
              <button 
                onClick={closeForgotModal}
                className="text-blue-400 hover:text-blue-700 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-sm text-foreground">
              {forgotStep === 1 && (
                <form onSubmit={handleCheckEmailRole} className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Masukkan alamat email Anda. Sistem akan memeriksa peran Anda (Owner atau Staf) dan memberikan instruksi selanjutnya.
                  </p>
                  <div>
                    <label className="block text-xs font-bold mb-1.5">Email Akun Anda</label>
                    <input 
                      type="email" 
                      value={forgotEmail} 
                      onChange={(e) => setForgotEmail(e.target.value)} 
                      placeholder="email@contoh.com" 
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {forgotRole === 'staf' && (
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex gap-2">
                      <span className="text-orange-600">⚠️</span>
                      <p className="text-xs text-orange-800 leading-relaxed">
                        Email ini terdeteksi sebagai <b>Staf Kasir</b>. Anda tidak dapat mereset password sendiri.<br/><br/>
                        Silakan hubungi <b>Pemilik Toko (Owner)</b>. Mereka dapat mereset password Anda melalui menu <b>Pengaturan &gt; Manajemen Akun</b>.
                      </p>
                    </div>
                  )}
                  {forgotError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{forgotError}</div>}
                  <button 
                    type="submit" 
                    disabled={forgotLoading || forgotRole === 'staf'} 
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? 'Memeriksa...' : 'Lanjutkan'}
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-2">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Akun <b>Owner</b> terdeteksi. Silakan masukkan <b>Kode Brankas Rahasia</b> yang Anda simpan sebelumnya untuk mereset password.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5">Kode Brankas Rahasia</label>
                    <input 
                      type="text" 
                      value={forgotRecoveryKey} 
                      onChange={(e) => setForgotRecoveryKey(e.target.value)} 
                      placeholder="Masukkan kode rahasia..." 
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5">Password Baru</label>
                    <input 
                      type="password" 
                      value={forgotNewPassword} 
                      onChange={(e) => setForgotNewPassword(e.target.value)} 
                      placeholder="Minimal 6 karakter" 
                      minLength={6}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {forgotError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{forgotError}</div>}
                  <button 
                    type="submit" 
                    disabled={forgotLoading} 
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? 'Memproses...' : 'Reset Password Sekarang'}
                  </button>
                </form>
              )}

              {forgotStep === 3 && (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                  <h4 className="font-bold text-foreground mb-2">Password Berhasil Direset!</h4>
                  <p className="text-xs text-muted-foreground">
                    Silakan tutup jendela ini dan login kembali menggunakan password baru Anda.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
