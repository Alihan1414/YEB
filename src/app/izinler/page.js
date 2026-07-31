'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Check, X, Loader2, Search, Clock, FileText, User, Trophy, Tv,
  Phone, ToggleLeft, ToggleRight, Settings,
  ShieldCheck, AlertCircle, CheckCircle2, XCircle, Copy, ExternalLink, Link2
} from 'lucide-react';
import Sidebar, { MobileHeader } from '@/components/Sidebar';

export default function LeaveManagementPage() {
  const { user, role, institutionId, institutionName, loading: authLoading, logout } = useAuth();
  const [leaveEnabled] = useState(true); // this page IS leave management
  const router = useRouter();

  // Requests state
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected'

  // Settings state
  const [settings, setSettings] = useState({ enabled: true, assignedTeacherId: '' });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Actions loading state
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Link copy state
  const [linkCopied, setLinkCopied] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Fetch leave requests
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/leave?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        throw new Error(data.error || 'Talepler yüklenemedi.');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoadingRequests(false);
    }
  }, [institutionId]);

  // Fetch leave settings
  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error("Settings load error:", err);
    } finally {
      setLoadingSettings(false);
    }
  }, [institutionId]);

  // Fetch teachers for settings dropdown
  const fetchTeachers = useCallback(async () => {
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/admin/teachers?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.teachers) {
        setTeachers(data.teachers);
      }
    } catch (err) {
      console.error("Teachers load error:", err);
    }
  }, [institutionId]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchSettings();
      if (role === 'admin') {
        fetchTeachers();
      }
    }
  }, [user, role, fetchRequests, fetchSettings, fetchTeachers]);

  // Handle Approve/Reject action
  const handleUpdateStatus = async (id, status) => {
    setActionLoadingId(id);
    const responderName = user?.name || user?.email || 'Görevli Öğretmen';
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, respondedBy: responderName }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(status === 'approved' ? 'İzin talebi onaylandı.' : 'İzin talebi reddedildi.');
        fetchRequests();
      } else {
        throw new Error(data.error || 'İşlem başarısız.');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Save settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch('/api/admin/leave-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: instId,
          enabled: settings.enabled,
          assignedTeacherId: settings.assignedTeacherId
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('İzin ayarları başarıyla güncellendi.');
        fetchSettings();
      } else {
        throw new Error(data.error || 'Ayarlar kaydedilemedi.');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    // 1. Filter by tab status
    if (req.status !== activeTab) return false;
    // 2. Filter by search query
    if (searchQuery.trim() === '') return true;
    return (req.studentName || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (authLoading || (loadingRequests && requests.length === 0)) return (
    <div className="min-h-screen bg-[#eef5fc] flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans">
      
      <Sidebar leaveEnabled={true} />
      <MobileHeader title="İzin Yönetimi" />

      {/* Toast Notifications */}
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
            {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 md:pb-10 overflow-y-auto">
        
        {/* Header banner */}
        <div className="bg-white border-b border-slate-100 px-4 md:px-10 py-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="text-blue-600" size={24} />
                İzin Talepleri Yönetimi
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Kurumunuza ait öğrenci izin başvurularını onaylayabilir veya reddedebilirsiniz.
              </p>
            </div>
            
            {/* Öğrenci Başvuru Linki Kartı */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link2 size={16} className="text-blue-500 shrink-0 hidden sm:block" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Öğrenci İzin Başvuru Linki</p>
                <p className="text-blue-800 font-bold text-xs font-mono truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/izin/${institutionId || 'yamanevler'}` : `/izin/${institutionId || 'yamanevler'}`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={async () => {
                    const link = typeof window !== 'undefined'
                      ? `${window.location.origin}/izin/${institutionId || 'yamanevler'}`
                      : `/izin/${institutionId || 'yamanevler'}`;
                    try {
                      await navigator.clipboard.writeText(link);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    } catch { showToast('Kopyalanamadı.', 'error'); }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-sm ${
                    linkCopied ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {linkCopied ? <Check size={13} /> : <Copy size={13} />}
                  {linkCopied ? 'Kopyalandı!' : 'Kopyala'}
                </button>
                <a
                  href={`/izin/${institutionId || 'yamanevler'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-sm"
                >
                  <ExternalLink size={13} /> Önizle
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace content grid */}
        <div className="max-w-6xl mx-auto px-4 md:px-10 py-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Middle side: List and tabs */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Öğrenci adına göre ara..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium shadow-sm"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex bg-slate-200/60 p-1 rounded-2xl gap-1">
                {[
                  { id: 'pending', label: 'Bekleyenler', color: 'border-amber-500 text-amber-600', bg: 'bg-amber-500/10' },
                  { id: 'approved', label: 'Onaylananlar', color: 'border-emerald-500 text-emerald-600', bg: 'bg-emerald-500/10' },
                  { id: 'rejected', label: 'Reddedilenler', color: 'border-red-500 text-red-600', bg: 'bg-red-500/10' }
                ].map(tab => {
                  const count = requests.filter(r => r.status === tab.id).length;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all relative flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        active ? `${tab.bg} ${tab.color}` : 'bg-slate-300 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Leave Requests list */}
              <div className="space-y-4">
                {loadingRequests ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                    <Loader2 size={32} className="text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Yükleniyor...</p>
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-2">
                    <Calendar size={48} className="text-slate-300 mx-auto" />
                    <h3 className="font-extrabold text-slate-700">Talep Bulunamadı</h3>
                    <p className="text-slate-500 text-xs max-w-xs mx-auto">
                      Bu kategoride kayıtlı izin talebi bulunmuyor veya arama kriterlerinizle eşleşen sonuç yok.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map(req => (
                      <motion.div
                        key={req.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all"
                      >
                        {/* Info details */}
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                              <User size={18} />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-slate-800 leading-snug">{req.studentName}</h3>
                              <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                <Clock size={10} /> Başvuru: {new Date(req.created_at || Date.now()).toLocaleString('tr-TR')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              <div>
                                <span className="font-bold text-slate-800">Başlangıç:</span> {new Date(req.startDate).toLocaleDateString('tr-TR')} {req.startTime && `· ${req.startTime}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              <div>
                                <span className="font-bold text-slate-800">Bitiş:</span> {new Date(req.endDate).toLocaleDateString('tr-TR')} {req.endTime && `· ${req.endTime}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 md:col-span-2 border-t border-slate-200/50 pt-2 mt-1">
                              <Phone size={14} className="text-slate-400" />
                              <div>
                                <span className="font-bold text-slate-800">Veli Tel:</span> {req.parentPhone}
                              </div>
                            </div>
                          </div>

                          <div className="text-slate-700 text-xs bg-blue-50/30 border border-blue-100/50 rounded-2xl p-3">
                            <div className="font-bold text-blue-900 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                              <FileText size={10} /> İZİN GEREKÇESİ
                            </div>
                            <p className="italic leading-relaxed font-medium">"{req.reason}"</p>
                          </div>

                          {req.status !== 'pending' && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-2">
                              {req.status === 'approved' ? (
                                <CheckCircle2 size={12} className="text-emerald-500" />
                              ) : (
                                <XCircle size={12} className="text-red-500" />
                              )}
                              <span>
                                {req.respondedBy} tarafından {req.respondedAt ? new Date(req.respondedAt).toLocaleString('tr-TR') : ''} tarihinde yanıtlandı.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        {req.status === 'pending' && (
                          <div className="flex md:flex-col gap-2 shrink-0">
                            <button
                              disabled={actionLoadingId !== null}
                              onClick={() => handleUpdateStatus(req.id, 'approved')}
                              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              {actionLoadingId === req.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                              Onayla
                            </button>
                            <button
                              disabled={actionLoadingId !== null}
                              onClick={() => handleUpdateStatus(req.id, 'rejected')}
                              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                            >
                              {actionLoadingId === req.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <X size={14} />
                              )}
                              Reddet
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right side: Settings Panel (Visible to admin only) */}
            <div className="space-y-6">
              
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Settings className="text-slate-500" size={18} />
                  <h3 className="font-extrabold text-slate-800 text-sm">Kurum İzin Ayarları</h3>
                </div>

                {role !== 'admin' ? (
                  <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-2xl flex gap-3 text-xs">
                    <AlertCircle size={16} className="shrink-0 text-amber-600" />
                    <div>
                      <span className="font-bold">Yetki Sınırı:</span> İzin ayarlarını ve görevli öğretmen atamasını yalnızca kurum yöneticileri yapabilir.
                    </div>
                  </div>
                ) : loadingSettings ? (
                  <div className="py-8 text-center">
                    <Loader2 size={24} className="text-blue-600 animate-spin mx-auto" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveSettings} className="space-y-5">

                    {/* Assigned teacher */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-2 block">
                        İzinlerden Sorumlu Yetkili
                      </label>
                      <select
                        value={settings.assignedTeacherId}
                        onChange={e => setSettings(s => ({ ...s, assignedTeacherId: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-semibold"
                      >
                        <option value="">Seçilmedi (Tüm öğretmenler onaylayabilir)</option>
                        {teachers.map(t => (
                          <option key={t.id || t.email} value={t.id || t.email}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[9px] text-slate-400 font-medium mt-1.5 leading-normal">
                        Form açık olduğunda velilere izinlerin onaylanacağı yetkili olarak gösterilir.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {savingSettings ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={14} />
                      )}
                      Ayarları Kaydet
                    </button>
                  </form>
                )}
              </div>

              {/* Quick statistics */}
              <div className="bg-[#0f172a] rounded-3xl p-6 text-white shadow-md space-y-4">
                <h3 className="font-extrabold text-xs text-blue-200 uppercase tracking-wider">İzin İstatistikleri</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <span className="text-[10px] text-blue-200 font-medium uppercase">Toplam İzin</span>
                    <div className="text-2xl font-black mt-1">{requests.length}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <span className="text-[10px] text-amber-200 font-medium uppercase">Bekleyen</span>
                    <div className="text-2xl font-black mt-1 text-amber-300">
                      {requests.filter(r => r.status === 'pending').length}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <span className="text-[10px] text-emerald-200 font-medium uppercase">Onaylanan</span>
                    <div className="text-2xl font-black mt-1 text-emerald-300">
                      {requests.filter(r => r.status === 'approved').length}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <span className="text-[10px] text-red-200 font-medium uppercase">Reddedilen</span>
                    <div className="text-2xl font-black mt-1 text-red-300">
                      {requests.filter(r => r.status === 'rejected').length}
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

      </main>

      {/* Mobile Bottom Navigation */}
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
        <a href="/izinler" className="flex flex-col items-center gap-1 text-blue-600 font-bold">
          <Calendar size={18} />
          <span className="text-[10px]">İzinler</span>
        </a>
        <a href="/ayarlar" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600">
          <Settings size={18} />
          <span className="text-[10px] font-medium">Ayarlar</span>
        </a>
      </nav>
      
    </div>
  );
}
