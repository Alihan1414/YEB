'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Eye, EyeOff, User, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

// Username → Firebase email mapping
const USERNAME_MAP = {
  'admin': 'admin@yeb.local',
  'yeb': 'yeb@2026',
  'yeb@2026': 'yeb@2026.com',
  'erenler': 'erenler@2026',
  'kilicaslan': 'kilicaslan@2026',
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-2xl shadow-blue-900/40 mb-5 p-2 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Kurumsal Raporlama Sistemi</h1>
          <p className="text-blue-200/70 text-sm mt-2">Öğrenci Takip & Raporlama Portal Girişi</p>
        </div>

        {/* Card */}
        <div className="bg-white/8 backdrop-blur-2xl border border-white/12 rounded-3xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.4)]">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Giriş Yap</h2>
            <p className="text-blue-200/60 text-xs mt-1">Sisteme erişmek için bilgilerinizi girin.</p>
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
                      {t.name || t.email} ({t.role === 'admin' || t.role === 'super_admin' ? 'Kurum Yöneticisi' : 'Öğretmen'})
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
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1b63d6] to-[#06429c] text-white font-extrabold text-sm hover:from-[#2170e8] hover:to-[#0a51b8] transition-all duration-300 shadow-lg hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Giriş Yap'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200/40 text-xs mt-6">
          Hesabınız yoksa kurum yöneticinizle iletişime geçin.
        </p>
      </motion.div>
    </div>
  );
}
