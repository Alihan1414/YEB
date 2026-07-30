'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Eye, EyeOff, User, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

// Username → Firebase email mapping
const USERNAME_MAP = {
  'admin': 'admin@yeb.local',
  'yeb@2026': 'yeb@2026.com',
};

function resolveEmail(input) {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes('@')) {
    // If it maps to a mapped username like yeb@2026 -> yeb@2026.com
    if (USERNAME_MAP[trimmed]) return USERNAME_MAP[trimmed];
    return trimmed;
  }
  if (USERNAME_MAP[trimmed]) return USERNAME_MAP[trimmed];
  return trimmed;
}

export default function LoginPage() {
  const { user, role, loading: authLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
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
  const [resolvingTeachers, setResolvingTeachers] = useState(false);

  // Debounced teacher list fetching
  useEffect(() => {
    const term = username.trim();
    if (term.length < 3) {
      setResolvedTeachers([]);
      setSelectedTeacherEmail('');
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setResolvingTeachers(true);
      try {
        const resolvedMail = resolveEmail(term);
        const res = await fetch(`/api/users/list-teachers?emailOrInst=${encodeURIComponent(resolvedMail)}`);
        const data = await res.json();
        if (data.success && data.teachers && data.teachers.length > 0) {
          setResolvedTeachers(data.teachers);
          setSelectedTeacherEmail(data.teachers[0].email);
        } else {
          setResolvedTeachers([]);
          setSelectedTeacherEmail('');
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
    
    // Log in as selected teacher or fall back to resolved email input
    const email = selectedTeacherEmail || resolveEmail(username);
    
    try {
      // 1. Try Firebase Auth first
      await login(email, password);
    } catch (fbErr) {
      console.warn("Firebase Auth login failed, trying server-side local DB fallback:", fbErr.message);
      try {
        // 2. Try server-side local authentication fallback
        const res = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          // Save mock user session to localStorage
          localStorage.setItem('localUser', JSON.stringify(data.profile));
          
          router.push('/');
          // Force page reload to sync AuthContext state
          window.location.reload();
          return;
        } else {
          setError(data.error || 'Kullanıcı adı/E-posta veya şifre hatalı.');
        }
      } catch (localErr) {
        setError('Giriş başarısız. Lütfen internet bağlantınızı ve bilgilerinizi kontrol edin.');
      }
    } finally {
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
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white shadow-2xl shadow-blue-900/40 mb-4 p-2 overflow-hidden border-2 border-blue-400/20">
            <img src="/cover.png" alt="Talebe Takip ve Raporlama Sistemi Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Talebe takip ve raporlama sistemi</h1>
          <p className="text-blue-200/80 text-xs md:text-sm mt-2 font-medium">Talebe Takip & Raporlama Portal Girişi</p>
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
                  onChange={e => setSelectedTeacherEmail(e.target.value)}
                  className="w-full bg-[#0a1c3c] border border-emerald-400/40 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all text-sm font-semibold cursor-pointer"
                >
                  {resolvedTeachers.map(t => (
                    <option key={t.email} value={t.email} className="bg-[#0c1933] text-white">
                      {t.name} ({t.role === 'admin' ? 'Yönetici' : 'Öğretmen'})
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
