'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, ToggleLeft, ToggleRight, Calendar, User, Trophy, Tv,
  LogOut, ShieldCheck, AlertCircle, Loader2, Copy, Check, Link2,
  Bell, BellOff, Target, Building2, ChevronRight, ExternalLink,
  Info, RefreshCw, Lock
} from 'lucide-react';

export default function AyarlarPage() {
  const { user, role, institutionId, institutionName, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // ── Leave Settings ──────────────────────────────────────────────────────────
  const [leaveSettings, setLeaveSettings] = useState({ enabled: false, assignedTeacherId: '' });
  const [loadingLeave, setLoadingLeave] = useState(true);
  const [savingLeave, setSavingLeave] = useState(false);
  const [teachers, setTeachers] = useState([]);

  // ── General Settings ────────────────────────────────────────────────────────
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // ── Fetch leave settings ────────────────────────────────────────────────────
  const fetchLeaveSettings = useCallback(async () => {
    setLoadingLeave(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) setLeaveSettings(data.settings);
    } catch (err) {
      console.error('fetchLeaveSettings error:', err);
    } finally {
      setLoadingLeave(false);
    }
  }, [institutionId]);

  // ── Fetch teachers ──────────────────────────────────────────────────────────
  const fetchTeachers = useCallback(async () => {
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/admin/teachers?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.teachers) setTeachers(data.teachers);
    } catch (err) {
      console.error('fetchTeachers error:', err);
    }
  }, [institutionId]);

  useEffect(() => {
    if (user) {
      fetchLeaveSettings();
      if (role === 'admin') fetchTeachers();
    }
  }, [user, role, fetchLeaveSettings, fetchTeachers]);

  // ── Save leave settings ─────────────────────────────────────────────────────
  const handleSaveLeave = async (e) => {
    e.preventDefault();
    if (role !== 'admin') return;
    setSavingLeave(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch('/api/admin/leave-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: instId, enabled: leaveSettings.enabled, assignedTeacherId: leaveSettings.assignedTeacherId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('İzin ayarları kaydedildi.');
        fetchLeaveSettings();
      } else throw new Error(data.error || 'Kayıt başarısız.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingLeave(false);
    }
  };

  // ── Save general settings (weeklyGoal, notifications) ──────────────────────
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setSavingGeneral(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: instId,
          weeklyGoal,
          notificationsEnabled
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Genel ayarlar kaydedildi.');
      } else {
        throw new Error(data.error || 'Ayarlar kaydedilemedi.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingGeneral(false);
    }
  };

  // ── Load general settings ───────────────────────────────────────────────────
  const fetchGeneralSettings = useCallback(async () => {
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/admin/settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) {
        setWeeklyGoal(data.settings.weeklyGoal || 3);
        setNotificationsEnabled(!!data.settings.notificationsEnabled);
      }
    } catch (err) {
      console.error('fetchGeneralSettings error:', err);
    }
  }, [institutionId]);

  useEffect(() => {
    if (user) {
      fetchGeneralSettings();
    }
  }, [user, fetchGeneralSettings]);

  // ── Copy link ───────────────────────────────────────────────────────────────
  const studentFormLink = typeof window !== 'undefined'
    ? `${window.location.origin}/izin/${institutionId || 'yamanevler'}`
    : `/izin/${institutionId || 'yamanevler'}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(studentFormLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showToast('Link kopyalanamadı, tarayıcı izinlerini kontrol edin.', 'error');
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#eef5fc] flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-[#06429c] via-[#053787] to-[#011c4d] text-white flex-col justify-between p-6 shrink-0 shadow-2xl">
        <div>
          {/* Logo */}
          <div className="flex flex-col items-center text-center space-y-3 pt-4 pb-8 border-b border-white/10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-lg">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#06429c]" fill="currentColor">
                <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-black tracking-widest text-blue-200 uppercase">{institutionName || 'Kurumsal Rapor'}</h2>
              <p className="text-sm font-extrabold tracking-wider text-white">YÖNETİCİ PANELİ</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            <a href="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all">
              <User size={18} /> Öğrenciler
            </a>
            <a href="/haftalik" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all">
              <Trophy size={18} /> Haftalık Özet
            </a>
            <a href="/tv" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all">
              <Tv size={18} /> TV Ekranı
            </a>
            {leaveSettings.enabled && (
              <a href="/izinler" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all">
                <Calendar size={18} /> İzin Yönetimi
              </a>
            )}
            <a href="/ayarlar" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600/90 text-white font-bold text-sm shadow-md transition-all border border-blue-400/30">
              <Settings size={18} /> Ayarlar
            </a>
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-red-300 hover:bg-red-500/10 font-semibold text-sm transition-all">
              <LogOut size={18} /> Çıkış
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center p-2 text-white">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
              <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
            </svg>
          </div>
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-white">{institutionName || 'Yamanevler Enderun'}</div>
            <div className="text-blue-200 text-[10px]">Aktif Kurum</div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="md:hidden bg-white px-5 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#06429c] rounded-xl flex items-center justify-center p-1.5 text-white">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
              <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-[9px] font-bold text-blue-900 leading-none">{institutionId?.toUpperCase() || 'YAMANEVLER'}</div>
            <div className="text-[11px] font-extrabold text-blue-800 leading-none">{institutionName || 'ENDERUN BİLİŞİM'}</div>
          </div>
        </div>
        <button onClick={logout} className="p-2 bg-red-50 text-red-600 rounded-xl">
          <LogOut size={18} />
        </button>
      </header>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-3 border ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <main className="flex-1 pb-28 md:pb-10 overflow-y-auto">
        {/* Page header */}
        <div className="bg-white border-b border-slate-100 px-4 md:px-10 py-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="text-blue-600" size={24} /> Ayarlar
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Kurum ayarlarını, izin modülünü ve başvuru linkini buradan yönetebilirsiniz.
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 md:px-10 py-8 space-y-6">

          {/* ── Section: Kurum Bilgisi (read-only) ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="text-slate-400" size={16} />
              <h2 className="font-extrabold text-slate-800 text-sm">Kurum Bilgisi</h2>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kurum Adı</p>
                <p className="font-extrabold text-slate-800 text-sm">{institutionName || '—'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kurum ID</p>
                <p className="font-extrabold text-slate-800 text-sm font-mono">{institutionId || '—'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rol</p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                  role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  <ShieldCheck size={12} />
                  {role === 'admin' ? 'Yönetici' : 'Öğretmen'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">E-posta</p>
                <p className="font-semibold text-slate-700 text-xs truncate">{user?.email || '—'}</p>
              </div>
            </div>
          </motion.section>

          {/* ── Section: Öğrenci İzin Başvuru Linki ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Link2 className="text-blue-500" size={16} />
              <h2 className="font-extrabold text-slate-800 text-sm">Öğrenci İzin Başvuru Linki</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-slate-500 text-xs leading-relaxed">
                Bu linki öğrencilere ve velilere gönderin. Linke giren kişi doğrudan izin talep formuna yönlendirilir ve form doldurulduktan sonra talep sisteme otomatik olarak işlenir.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Başvuru Formu Linki</p>
                  <p className="text-blue-800 font-bold text-xs font-mono truncate">{studentFormLink}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                      linkCopied
                        ? 'bg-emerald-500 text-white shadow-emerald-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                    }`}
                  >
                    {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                    {linkCopied ? 'Kopyalandı!' : 'Kopyala'}
                  </button>
                  <a
                    href={studentFormLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-sm"
                  >
                    <ExternalLink size={14} />
                    Önizle
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 text-amber-800 p-3 rounded-2xl">
                <Info size={14} className="shrink-0 mt-0.5 text-amber-500" />
                <p className="text-[11px] leading-relaxed font-medium">
                  İzin modülü <strong>kapalıyken</strong> bu linke giren öğrenciler formu görür ancak gönderemez. İzin başvurularını aktif etmek için aşağıdaki <em>İzin Modülü</em> bölümünden etkinleştirin.
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── Section: İzin Modülü Ayarları ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-500" size={16} />
                <h2 className="font-extrabold text-slate-800 text-sm">İzin Modülü</h2>
              </div>
              {!loadingLeave && (
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                  leaveSettings.enabled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {leaveSettings.enabled ? '● AKTİF' : '○ KAPALI'}
                </span>
              )}
            </div>

            <div className="px-6 py-5">
              {role !== 'admin' ? (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-2xl flex gap-3 text-xs">
                  <Lock size={16} className="shrink-0 text-amber-600" />
                  <div>
                    <span className="font-bold">Yetki Sınırı: </span>İzin ayarlarını yalnızca kurum yöneticileri değiştirebilir.
                  </div>
                </div>
              ) : loadingLeave ? (
                <div className="py-8 text-center">
                  <Loader2 size={24} className="text-blue-600 animate-spin mx-auto" />
                </div>
              ) : (
                <form onSubmit={handleSaveLeave} className="space-y-5">
                  {/* Toggle */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <div>
                      <p className="font-bold text-sm text-slate-800">İzin Başvuruları</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Kapalıyken "İzin Yönetimi" menüden gizlenir ve öğrenciler form gönderemez.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeaveSettings(s => ({ ...s, enabled: !s.enabled }))}
                      className="transition-all focus:outline-none ml-4"
                    >
                      {leaveSettings.enabled ? (
                        <ToggleRight size={44} className="text-emerald-500" />
                      ) : (
                        <ToggleLeft size={44} className="text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Assigned Teacher */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block">İzinlerden Sorumlu Yetkili</label>
                    <select
                      value={leaveSettings.assignedTeacherId}
                      onChange={e => setLeaveSettings(s => ({ ...s, assignedTeacherId: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-semibold"
                    >
                      <option value="">Seçilmedi (Tüm öğretmenler onaylayabilir)</option>
                      {teachers.map(t => (
                        <option key={t.id || t.email} value={t.id || t.email}>{t.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5 leading-normal">
                      Form açık olduğunda velilere gösterilecek sorumlu yetkilidir.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingLeave}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {savingLeave ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    İzin Ayarlarını Kaydet
                  </button>
                </form>
              )}
            </div>
          </motion.section>

          {/* ── Section: Genel Ayarlar ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.20 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Target className="text-purple-500" size={16} />
              <h2 className="font-extrabold text-slate-800 text-sm">Genel Ayarlar</h2>
            </div>
            <form onSubmit={handleSaveGeneral} className="px-6 py-5 space-y-5">
              {/* Weekly goal */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block">
                  Haftalık Hedef Rapor Sayısı
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={weeklyGoal}
                    onChange={e => setWeeklyGoal(Number(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none bg-slate-200 accent-blue-600"
                  />
                  <span className="w-12 text-center bg-blue-100 text-blue-800 font-extrabold text-sm rounded-xl px-2 py-1">
                    {weeklyGoal}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-2 leading-normal">
                  Haftalık Özet sayfasında öğrenci başına beklenen haftalık rapor hedefi.
                </p>
              </div>

              {/* Notifications toggle */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <div>
                  <p className="font-bold text-sm text-slate-800">Veli Bildirimleri</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Rapor girilince veliye WhatsApp bildirimi gönderilsin mi?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsEnabled(n => !n)}
                  className="transition-all focus:outline-none ml-4"
                >
                  {notificationsEnabled ? (
                    <ToggleRight size={44} className="text-emerald-500" />
                  ) : (
                    <ToggleLeft size={44} className="text-slate-300" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={savingGeneral}
                className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingGeneral ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Genel Ayarları Kaydet
              </button>
            </form>
          </motion.section>

          {/* ── Section: Hızlı Bağlantılar ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#0f172a] rounded-3xl border border-white/5 shadow-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-extrabold text-blue-200 text-xs uppercase tracking-wider">Hızlı Bağlantılar</h2>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { href: '/', label: 'Öğrenci Listesi', icon: User, color: 'text-blue-400' },
                { href: '/haftalik', label: 'Haftalık Özet', icon: Trophy, color: 'text-amber-400' },
                { href: '/tv', label: 'TV Ekranı', icon: Tv, color: 'text-cyan-400' },
                ...(leaveSettings.enabled ? [{ href: '/izinler', label: 'İzin Yönetimi', icon: Calendar, color: 'text-emerald-400' }] : []),
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 hover:bg-white/10 transition-all group"
                >
                  <link.icon size={16} className={link.color} />
                  <span className="text-white font-semibold text-sm flex-1">{link.label}</span>
                  <ChevronRight size={14} className="text-white/30 group-hover:text-white/60 transition-all" />
                </a>
              ))}
            </div>
          </motion.section>

        </div>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around py-2.5 px-2 z-40 shadow-lg">
        <a href="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600">
          <User size={18} />
          <span className="text-[10px] font-medium">Öğrenciler</span>
        </a>
        <a href="/haftalik" className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-500">
          <Trophy size={18} />
          <span className="text-[10px] font-medium">Haftalık</span>
        </a>
        <a href="/tv" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600">
          <Tv size={18} />
          <span className="text-[10px] font-medium">TV</span>
        </a>
        {leaveSettings.enabled && (
          <a href="/izinler" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600">
            <Calendar size={18} />
            <span className="text-[10px] font-medium">İzinler</span>
          </a>
        )}
        <a href="/ayarlar" className="flex flex-col items-center gap-1 text-blue-600 font-bold">
          <Settings size={18} />
          <span className="text-[10px]">Ayarlar</span>
        </a>
      </nav>

    </div>
  );
}
