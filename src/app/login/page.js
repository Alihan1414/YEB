'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Eye, EyeOff, User, Lock, Download, CheckCircle2, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Username → Firebase email mapping
const USERNAME_MAP = {
  'admin': 'admin@yeb.local',
  'yeb': 'yeb@2026',
  'yeb@2026': 'yeb@2026.com',
  'erenler': 'erenler@2026',
  'kilicaslan': 'kilicaslan@2026',
  'kilicarslan': 'kilicaslan@2026',
  'pty': 'pty@2026',
  'alihan': 'alihan@2026',
};

// Normalize Turkish characters to ASCII so mobile keyboards work correctly
// e.g. "kılıçaslan" → "kilicaslan"
function turkishToAscii(str) {
  return (str || '')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U');
}

function resolveEmail(input) {
  const trimmed = input.trim().toLowerCase();
  if (USERNAME_MAP[trimmed]) return USERNAME_MAP[trimmed];
  if (trimmed.includes('@')) return trimmed;
  return trimmed;
}

export default function LoginPage() {
  const { user, role, loading: authLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      if (role === 'super_admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  }, [user, role, authLoading, router]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Dynamic teacher selection states
  const [resolvedTeachers, setResolvedTeachers] = useState([]);
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState('');
  const [userManuallySelected, setUserManuallySelected] = useState(false);
  const [resolvingTeachers, setResolvingTeachers] = useState(false);

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState('android');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }

      const handleBeforeInstall = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setGuidePlatform('ios');
      } else if (/android/.test(ua)) {
        setGuidePlatform('android');
      } else {
        setGuidePlatform('desktop');
      }
      setShowInstallGuide(true);
    }
  };

  // Debounced teacher list fetching
  useEffect(() => {
    const term = username.trim();
    if (term.length < 3) {
      Promise.resolve().then(() => {
        setResolvedTeachers([]);
        setSelectedTeacherEmail('');
        setUserManuallySelected(false);
      });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setResolvingTeachers(true);
      try {
        const resolvedMail = turkishToAscii(resolveEmail(term));
        const res = await fetch(`/api/users/list-teachers?emailOrInst=${encodeURIComponent(resolvedMail)}`);
        const data = await res.json();
        if (data.success && data.teachers && data.teachers.length > 0) {
          setResolvedTeachers(data.teachers);
        } else {
          setResolvedTeachers([]);
        }
      } catch (err) {
        console.warn("Failed to load teachers for selection:", err);
      } finally {
        setResolvingTeachers(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Priority: If user explicitly clicked the dropdown select box, use that.
    // Otherwise, ALWAYS use what the user typed in the username box so teacher inputs are never overridden.
    const rawEmail = (userManuallySelected && selectedTeacherEmail) ? selectedTeacherEmail : resolveEmail(username);
    const email = turkishToAscii(rawEmail);
    
    try {
      // 1. Try server-side authentication API first (handles seed super admin & local accounts)
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.profile) {
        // Clear any stale session before writing new one
        localStorage.clear();
        localStorage.setItem('localUser', JSON.stringify(data.profile));
        
        // Hard redirect to prevent stale context from previous session
        if (data.profile.role === 'super_admin') {
          window.location.href = '/admin';
        } else if (data.profile.role === 'cook') {
          window.location.href = '/menu';
        } else {
          window.location.href = '/';
        }
        return;
      }

      setError(data.error || 'Kullanıcı adı/E-posta veya şifre hatalı.');
      setLoading(false);
    } catch (err) {
      console.warn("Login attempt error:", err);
      setError(err.message || 'Giriş yapılamadı, lütfen bilgilerinizi kontrol edin.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-x-hidden px-4 py-8 w-full max-w-full"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #06429c 50%, #011c4d 100%)' }}>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white shadow-2xl shadow-blue-900/40 mb-3 sm:mb-5 p-2 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Kurumsal Raporlama Sistemi</h1>
          <p className="text-blue-200/70 text-xs sm:text-sm mt-1 sm:mt-2">Öğrenci Takip & Raporlama Portal Girişi</p>
        </div>

        {/* Card */}
        <div className="bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.4)]">
          <div className="mb-5 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold text-white">Giriş Yap</h2>
            <p className="text-blue-200/60 text-xs mt-0.5 sm:mt-1">Sisteme erişmek için bilgilerinizi girin.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-2 block">
                Kullanıcı Adı veya E-posta
              </label>
              <div className="relative">
                <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Kullanıcı adı veya e-posta"
                  className="w-full bg-white/6 border border-white/12 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Teacher Dropdown Selection */}
            {resolvedTeachers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-xs font-bold text-emerald-300 uppercase tracking-widest block">
                  Giriş Yapacak Kişiyi Seçin
                </label>
                <select
                  value={selectedTeacherEmail}
                  onChange={e => {
                    setSelectedTeacherEmail(e.target.value);
                    setUserManuallySelected(true);
                  }}
                  className="w-full bg-[#0a1c3c] border border-emerald-400/40 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all text-sm font-semibold cursor-pointer"
                >
                  <option value="" className="bg-[#0c1933] text-slate-300">
                    -- Yazdığım e-posta ile giriş yap --
                  </option>
                  {resolvedTeachers.map(t => (
                    <option key={t.email} value={t.email} className="bg-[#0c1933] text-white font-medium">
                      {t.name || t.email} ({t.role === 'admin' || t.role === 'super_admin' ? 'Kurum Yöneticisi' : t.role === 'cook' ? 'Aşçı' : 'Öğretmen'})
                    </option>
                  ))}
                </select>
              </motion.div>
            )}

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-2 block">
                Şifre
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/6 border border-white/12 rounded-2xl pl-11 pr-12 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-3 text-center font-medium"
              >
                ⚠ {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1b63d6] to-[#06429c] text-white font-extrabold text-sm hover:from-[#2170e8] hover:to-[#0a51b8] transition-all duration-300 shadow-lg hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Giriş Yap'}
            </button>

            {/* Install App Button */}
            <button
              id="pwa-install-btn"
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-98 text-white font-bold text-sm border border-white/20 hover:border-cyan-300/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
            >
              {isInstalled ? (
                <>
                  <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />
                  <span>Uygulama Yüklendi</span>
                </>
              ) : (
                <>
                  <Download size={17} className="text-cyan-300 group-hover:translate-y-0.5 transition-transform shrink-0" />
                  <span>Yükle (Uygulama)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* PWA Install Guide Modal */}
        <AnimatePresence>
          {showInstallGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowInstallGuide(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-sm bg-[#0c1e3f] border border-blue-400/30 rounded-3xl p-5 text-white shadow-2xl z-10 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-300">
                      <Download size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">Uygulamayı Cihaza Yükle</h3>
                      <p className="text-[11px] text-blue-200/70">Ana ekrandan tek tıkla erişin</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInstallGuide(false)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Platform selector tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl border border-white/10 text-xs font-bold text-center">
                  <button
                    type="button"
                    onClick={() => setGuidePlatform('android')}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      guidePlatform === 'android'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Android
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuidePlatform('ios')}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      guidePlatform === 'ios'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    iPhone
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuidePlatform('desktop')}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      guidePlatform === 'desktop'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    PC / Mac
                  </button>
                </div>

                {/* Guide Content */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2.5 text-xs leading-relaxed text-blue-100">
                  {guidePlatform === 'ios' && (
                    <>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-cyan-300 font-black flex items-center justify-center shrink-0 text-[10px]">1</span>
                        <p>Safari'nin altındaki <strong>Paylaş (📤)</strong> butonuna dokunun.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-cyan-300 font-black flex items-center justify-center shrink-0 text-[10px]">2</span>
                        <p>Aşağı kaydırıp <strong>"Ana Ekrana Ekle" (➕)</strong> seçeneğini seçin.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-cyan-300 font-black flex items-center justify-center shrink-0 text-[10px]">3</span>
                        <p>Sağ üstteki <strong>"Ekle"</strong> butonuna basarak kurulumu tamamlayın.</p>
                      </div>
                    </>
                  )}

                  {guidePlatform === 'android' && (
                    <>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-cyan-300 font-black flex items-center justify-center shrink-0 text-[10px]">1</span>
                        <p>Chrome'un sağ üstündeki <strong>üç nokta (⋮)</strong> simgesine dokunun.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-cyan-300 font-black flex items-center justify-center shrink-0 text-[10px]">2</span>
                        <p><strong>"Uygulamayı Yükle"</strong> veya <strong>"Ana Ekrana Ekle"</strong> seçin.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-cyan-300 font-black flex items-center justify-center shrink-0 text-[10px]">3</span>
                        <p>Açılan pencerede <strong>"Yükle"</strong> butonuna basın.</p>
                      </div>
                    </>
                  )}

                  {guidePlatform === 'desktop' && (
                    <>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-cyan-300 font-black flex items-center justify-center shrink-0 text-[10px]">1</span>
                        <p>Adres çubuğunun sağındaki <strong>Yükle (⬇)</strong> simgesine tıklayın.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-cyan-300 font-black flex items-center justify-center shrink-0 text-[10px]">2</span>
                        <p>Veya tarayıcı menüsünden <strong>"Uygulamayı Yükle..."</strong> seçin.</p>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Tamam
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <p className="text-center text-blue-200/40 text-xs mt-6">
          Hesabınız yoksa kurum yöneticinizle iletişime geçin.
        </p>
      </motion.div>
    </div>
  );
}
