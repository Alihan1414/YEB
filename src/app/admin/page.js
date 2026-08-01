'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Shield, Plus, User, Loader2,
  TrendingUp, LogOut, Building2, Check, X,
  Eye, EyeOff, Trash2, RefreshCw, Users,
  AlertTriangle, Search, Edit3, UserCheck, ShieldAlert, CheckCircle,
  Palette, Image, Sparkles, Sliders, ToggleLeft, ToggleRight
} from 'lucide-react';

const COLORS = ['#06429c', '#059669', '#7c3aed', '#ea580c', '#e11d48', '#2563eb'];

const PRESET_COLORS = [
  { name: 'Enderun Lacivert', hex: '#06429c' },
  { name: 'Zümrüt Yeşil', hex: '#059669' },
  { name: 'Safir Mavi', hex: '#2563eb' },
  { name: 'Asil Mor', hex: '#7c3aed' },
  { name: 'Sıcak Turuncu', hex: '#ea580c' },
  { name: 'Yakut Kırmızı', hex: '#e11d48' },
  { name: 'Koyu Gece', hex: '#0f172a' },
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
}

export default function PlatformAdminPage() {
  const { user, role, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('stats');
  const [globalStats, setGlobalStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [searchInstQuery, setSearchInstQuery] = useState('');
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Institution Modal (Create / Edit)
  const [showInstModal, setShowInstModal] = useState(false);
  const [instModalMode, setInstModalMode] = useState('create'); // 'create' | 'edit'
  const [editingInstId, setEditingInstId] = useState('');
  const [instName, setInstName] = useState('');
  const [instEmail, setInstEmail] = useState('');
  const [instPassword, setInstPassword] = useState('');
  const [instLogoUrl, setInstLogoUrl] = useState('');
  const [instPrimaryColor, setInstPrimaryColor] = useState('#06429c');
  const [instModules, setInstModules] = useState({ ai: true, leave: true, tv: true, weekly: true });
  const [showPw, setShowPw] = useState(false);
  const [submittingInst, setSubmittingInst] = useState(false);

  // Manage User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalAction, setUserModalAction] = useState('create');
  const [editingUser, setEditingUser] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('teacher');
  const [userInstId, setUserInstId] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Delete Institution Modal
  const [deleteTargetInst, setDeleteTargetInst] = useState(null);
  const [wipeDataOption, setWipeDataOption] = useState(false);
  const [deletingInst, setDeletingInst] = useState(false);

  // Delete User Modal
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Masquerade
  const [masqueradeInst, setMasqueradeInst] = useState(null);
  const [masqStudents, setMasqStudents] = useState([]);
  const [masqReports, setMasqReports] = useState([]);
  const [masqLeaves, setMasqLeaves] = useState([]);
  const [loadingMasq, setLoadingMasq] = useState(false);
  const [masqSearch, setMasqSearch] = useState('');

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) { router.push('/login'); return; }
      if (role !== 'super_admin') { router.push('/'); return; }
    }
  }, [user, role, authLoading, router]);

  const fetchGlobalStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/global-stats', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setGlobalStats(data.stats);
    } catch {
      showToast('İstatistikler yüklenemedi.', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setAllUsers(data.users);
    } catch {
      showToast('Kullanıcılar yüklenemedi.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (user && role === 'super_admin') {
      fetchGlobalStats();
      fetchUsers();
    }
  }, [user, role, fetchGlobalStats, fetchUsers]);

  const openCreateInstModal = () => {
    setInstModalMode('create');
    setEditingInstId('');
    setInstName('');
    setInstEmail('');
    setInstPassword('');
    setInstLogoUrl('');
    setInstPrimaryColor('#06429c');
    setInstModules({ ai: true, leave: true, tv: true, weekly: true });
    setShowInstModal(true);
  };

  const openEditInstModal = (inst) => {
    setInstModalMode('edit');
    setEditingInstId(inst.id);
    setInstName(inst.name || '');
    setInstEmail(inst.email || '');
    setInstPassword('');
    setInstLogoUrl(inst.logoUrl || '');
    setInstPrimaryColor(inst.primaryColor || '#06429c');
    setInstModules(inst.enabledModules || { ai: true, leave: true, tv: true, weekly: true });
    setShowInstModal(true);
  };

  const startMasquerade = async (inst) => {
    setMasqueradeInst(inst);
    setActiveTab('masquerade');
    setLoadingMasq(true);
    setMasqStudents([]); setMasqReports([]); setMasqLeaves([]);
    try {
      const [sR, rR, lR] = await Promise.all([
        fetch(`/api/students?institutionId=${encodeURIComponent(inst.id)}`, { cache: 'no-store' }),
        fetch(`/api/students/reports?institutionId=${encodeURIComponent(inst.id)}`, { cache: 'no-store' }),
        fetch(`/api/leave?institutionId=${encodeURIComponent(inst.id)}`, { cache: 'no-store' }),
      ]);
      const [sD, rD, lD] = await Promise.all([sR.json(), rR.json(), lR.json()]);
      if (sD.success) setMasqStudents(sD.students || []);
      if (rD.success) setMasqReports(rD.reports || []);
      if (lD.success) setMasqLeaves(lD.requests || []);
    } catch {
      showToast('Kurum verileri yüklenemedi.', 'error');
    } finally {
      setLoadingMasq(false);
    }
  };

  const handleLogoPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setInstLogoUrl(event.target.result);
            showToast('Logo görseli panodan yapıştırıldı! 📋');
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    }
  };

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInstLogoUrl(event.target.result);
        showToast('Logo görseli dosyadan yüklendi!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInst = async (e) => {
    e.preventDefault();
    if (!instName.trim()) {
      showToast('Kurum adı zorunludur.', 'error'); return;
    }
    if (instModalMode === 'create' && (!instEmail.trim() || !instPassword.trim())) {
      showToast('Yönetici e-postası ve şifre zorunludur.', 'error'); return;
    }
    setSubmittingInst(true);
    try {
      const url = instModalMode === 'create' ? '/api/admin/create-institution' : '/api/admin/update-institution';
      const bodyPayload = instModalMode === 'create' ? {
        name: instName.trim(),
        email: instEmail.trim(),
        password: instPassword,
        logoUrl: instLogoUrl.trim(),
        primaryColor: instPrimaryColor,
        enabledModules: instModules
      } : {
        institutionId: editingInstId,
        name: instName.trim(),
        email: instEmail.trim(),
        logoUrl: instLogoUrl.trim(),
        primaryColor: instPrimaryColor,
        enabledModules: instModules
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowInstModal(false);
        showToast(instModalMode === 'create' ? 'Yeni kurum başarıyla oluşturuldu.' : 'Kurum markalama ve ayarları güncellendi.');
        fetchGlobalStats(); fetchUsers();
      } else throw new Error(data.error || 'İşlem gerçekleştirilemedi.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingInst(false);
    }
  };

  const handleDeleteInstConfirm = async () => {
    if (!deleteTargetInst) return;
    setDeletingInst(true);
    try {
      const res = await fetch('/api/admin/delete-institution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: deleteTargetInst.id, deleteData: wipeDataOption }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`"${deleteTargetInst.name}" kurumu sistemden kaldırıldı.`);
        setDeleteTargetInst(null);
        fetchGlobalStats(); fetchUsers();
      } else throw new Error(data.error || 'Silme işlemi başarısız.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingInst(false);
    }
  };

  const handleManageUser = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !userRole || !userInstId) {
      showToast('Lütfen tüm zorunlu alanları doldurun.', 'error'); return;
    }
    if (userModalAction === 'create' && !userPassword) {
      showToast('Şifre zorunludur.', 'error'); return;
    }
    setSubmittingUser(true);
    const selectedInst = globalStats?.institutions?.find(i => i.id === userInstId);
    const instNameVal = selectedInst ? selectedInst.name : userInstId;
    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: userModalAction,
          userId: editingUser?.id,
          name: userName.trim(),
          email: userEmail.trim(),
          password: userPassword || undefined,
          role: userRole,
          institutionId: userInstId,
          institutionName: instNameVal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(userModalAction === 'create' ? 'Kullanıcı eklendi.' : 'Kullanıcı güncellendi.');
        setShowUserModal(false); setEditingUser(null);
        setUserName(''); setUserEmail(''); setUserPassword(''); setUserInstId('');
        fetchUsers(); fetchGlobalStats();
      } else throw new Error(data.error || 'İşlem başarısız.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleEnableUser = async (targetUser) => {
    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable', userId: targetUser.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`"${targetUser.name || targetUser.email}" engeli kaldırıldı.`);
        fetchUsers(); fetchGlobalStats();
      } else throw new Error(data.error || 'İşlem başarısız');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setDeletingUser(true);
    try {
      const res = await fetch('/api/admin/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId: deleteTargetUser.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Kullanıcı devre dışı bırakıldı.');
        setDeleteTargetUser(null);
        fetchUsers(); fetchGlobalStats();
      } else throw new Error(data.error);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const filteredInsts = (globalStats?.institutions || []).filter(i =>
    !searchInstQuery.trim() ||
    i.name.toLowerCase().includes(searchInstQuery.toLowerCase()) ||
    i.id.toLowerCase().includes(searchInstQuery.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u =>
    !searchUserQuery.trim() ||
    u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    (u.institutionName || '').toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  const filteredMasq = masqStudents.filter(s =>
    !masqSearch.trim() ||
    s.name.toLowerCase().includes(masqSearch.toLowerCase()) ||
    s.surname.toLowerCase().includes(masqSearch.toLowerCase())
  );

  if (authLoading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">

      {/* HEADER */}
      <header className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white px-6 md:px-10 py-4 flex items-center justify-between shadow-2xl shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center p-2.5 shadow-lg text-white">
            <Shield size={22} />
          </div>
          <div>
            <div className="text-[9px] font-black tracking-widest text-blue-400 uppercase">Süper Yönetici Konsolu</div>
            <div className="text-base font-black text-white flex items-center gap-2">
              Sistem & Kurum Yönetim Merkezi
              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">White-Label Multi-Tenant</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-md"
          >
            Talebe Takip Paneline Dön
          </a>
          <button
            onClick={() => { fetchGlobalStats(); fetchUsers(); }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-all border border-slate-700"
            title="Yenile"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600/90 hover:bg-red-700 rounded-xl text-xs font-bold text-white transition-all"
          >
            <LogOut size={14} /> Çıkış
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800">
          <div className="p-5 space-y-5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Yönetim Menüsü</p>
            <nav className="space-y-1.5">
              {[
                { tab: 'stats', icon: TrendingUp, label: 'Global Özet' },
                { tab: 'institutions', icon: Building2, label: 'Kurumlar & Markalar' },
                { tab: 'users', icon: Users, label: 'Kullanıcı Hesapları' },
              ].map(({ tab, icon: Icon, label }) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setMasqueradeInst(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}

              {masqueradeInst && (
                <button
                  onClick={() => setActiveTab('masquerade')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    activeTab === 'masquerade'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-purple-300 hover:bg-purple-900/30 border border-purple-500/20'
                  }`}
                >
                  <span className="flex items-center gap-3"><UserCheck size={16} /> Kurum Taklidi</span>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                </button>
              )}
            </nav>
          </div>
          <div className="p-5 border-t border-slate-800">
            <div className="bg-slate-800 rounded-2xl p-3.5 flex items-center gap-3 border border-slate-700">
              <ShieldAlert size={18} className="text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-slate-400">Aktif Yönetici</p>
                <p className="text-[10px] font-bold text-white truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 space-y-6">

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className={`fixed top-5 right-5 z-[9999] px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 border ${
                  toast.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                {toast.type === 'error' ? <X size={15} /> : <Check size={15} />}
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── TAB: STATS ── */}
          {activeTab === 'stats' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Sistem Genel İstatistikleri</h1>
                <p className="text-slate-400 text-xs mt-0.5">Tüm kurumları kapsayan canlı platform özeti.</p>
              </div>

              {loadingStats ? (
                <div className="flex justify-center py-20"><Loader2 size={32} className="text-blue-600 animate-spin" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Toplam Kurum', val: globalStats?.totalInsts || 0, color: 'text-blue-700' },
                      { label: 'Öğretmen/Yetkili', val: globalStats?.totalUsers || 0, color: 'text-purple-700' },
                      { label: 'Öğrenci', val: globalStats?.totalStudents || 0, color: 'text-indigo-700' },
                      { label: 'Toplam Rapor', val: globalStats?.totalReports || 0, color: 'text-emerald-700' },
                      { label: 'Bekleyen İzin', val: globalStats?.totalPendingLeaves || 0, color: 'text-amber-600' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-3xl font-black ${color}`}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {(globalStats?.institutions?.length || 0) > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-xs font-extrabold text-slate-700 mb-4 uppercase tracking-wider">Kurum Öğrenci Dağılımı</h3>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={globalStats.institutions}>
                              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                              <Tooltip />
                              <Bar dataKey="studentCount" name="Öğrenci" fill="#06429c" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-xs font-extrabold text-slate-700 mb-4 uppercase tracking-wider">Rapor Aktivitesi</h3>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={globalStats.institutions.map(i => ({ name: i.name, value: i.reportCount || 1 }))}
                                cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value"
                              >
                                {globalStats.institutions.map((_, idx) => (
                                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── TAB: INSTITUTIONS ── */}
          {activeTab === 'institutions' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">Kurumlar ve Markalaştırma</h1>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {globalStats?.institutions?.length || 0} kurum kayıtlı · Tamamen bağımsız modüler yapı
                  </p>
                </div>
                <button
                  onClick={openCreateInstModal}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20 shrink-0"
                >
                  <Plus size={16} /> Yeni Kurum Ekle
                </button>
              </div>

              <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" placeholder="Kurum adına veya ID'ye göre ara..."
                  value={searchInstQuery} onChange={e => setSearchInstQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                />
              </div>

              {loadingStats ? (
                <div className="flex justify-center py-20"><Loader2 size={28} className="text-blue-600 animate-spin" /></div>
              ) : filteredInsts.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center">
                  <Building2 size={48} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="font-extrabold text-slate-600">Kurum bulunamadı</h3>
                  <p className="text-slate-400 text-xs mt-1">"Yeni Kurum Ekle" butonuna basarak ilk kurumunuzu oluşturun.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {filteredInsts.map(inst => {
                    const instColor = inst.primaryColor || '#06429c';
                    return (
                      <motion.div key={inst.id} layout
                        className={`bg-white rounded-3xl shadow-sm border overflow-hidden flex flex-col ${
                          inst.disabled ? 'border-slate-200 opacity-60' : 'border-slate-200/80 hover:shadow-md transition-shadow'
                        }`}
                      >
                        {/* Header Banner */}
                        <div
                          className="px-6 py-5 flex items-center justify-between text-white relative overflow-hidden"
                          style={{ backgroundColor: instColor }}
                        >
                          <div className="flex items-center gap-4 relative z-10">
                            {inst.logoUrl ? (
                              <img src={inst.logoUrl} alt={inst.name} className="w-12 h-12 rounded-2xl object-cover bg-white p-1 shadow-md shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white shadow-sm shrink-0 border border-white/30">
                                {(inst.name || inst.id)[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="font-black text-white text-lg truncate leading-snug">{inst.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-[9px] font-mono text-white/90 bg-black/20 px-2 py-0.5 rounded-full border border-white/20">{inst.id}</code>
                                {inst.disabled && <span className="text-[9px] bg-red-500/80 text-white border border-red-300/40 px-2 py-0.5 rounded-full font-bold">DEVRE DIŞI</span>}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => openEditInstModal(inst)}
                            title="Marka ve Ayarları Düzenle"
                            className="p-2 bg-white/15 hover:bg-white/30 text-white rounded-xl transition-all border border-white/20 shrink-0 relative z-10"
                          >
                            <Sliders size={16} />
                          </button>
                        </div>

                        {/* Counts */}
                        <div className="px-6 py-3.5 grid grid-cols-4 gap-1 border-b border-slate-100 text-center bg-slate-50/50">
                          {[
                            { label: 'Öğrenci', val: inst.studentCount || 0 },
                            { label: 'Rapor', val: inst.reportCount || 0 },
                            { label: 'Öğretmen', val: inst.userCount || 0 },
                            { label: 'İzin Talebi', val: inst.pendingLeaveCount || 0 },
                          ].map(({ label, val }) => (
                            <div key={label}>
                              <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider">{label}</span>
                              <span className="text-sm font-extrabold text-slate-800">{val}</span>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="px-6 py-4 flex items-center justify-between gap-3 mt-auto">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startMasquerade(inst)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold rounded-xl transition-all"
                            >
                              <UserCheck size={13} /> Canlı Yönet
                            </button>
                            <button
                              onClick={() => openEditInstModal(inst)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                            >
                              <Edit3 size={13} /> Düzenle
                            </button>
                          </div>
                          
                          <button
                            onClick={() => { setDeleteTargetInst(inst); setWipeDataOption(false); }}
                            className="flex items-center gap-1 px-2.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold rounded-xl transition-all"
                            title="Kurumu Sil"
                          >
                            <Trash2 size={13} /> Sil
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: USERS ── */}
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">Kullanıcı Hesap Yönetimi</h1>
                  <p className="text-slate-400 text-xs mt-0.5">Tüm kurumlardaki yönetici ve öğretmen hesapları.</p>
                </div>
                <button
                  onClick={() => {
                    setUserModalAction('create'); setEditingUser(null);
                    setUserName(''); setUserEmail(''); setUserPassword(''); setUserInstId('');
                    setShowUserModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20 shrink-0"
                >
                  <Plus size={16} /> Yeni Kullanıcı Ekle
                </button>
              </div>

              <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" placeholder="İsim, e-posta veya kurum adına göre ara..."
                  value={searchUserQuery} onChange={e => setSearchUserQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                />
              </div>

              {loadingUsers ? (
                <div className="flex justify-center py-20"><Loader2 size={28} className="text-blue-600 animate-spin" /></div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Kullanıcı', 'Kurum', 'Rol', 'Durum', ''].map(h => (
                            <th key={h} className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((usr, idx) => (
                          <tr key={`${usr.id || usr.email}-${idx}`} className={`text-xs ${usr.disabled ? 'opacity-50 bg-slate-50/50' : 'hover:bg-slate-50/50'}`}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {(usr.name || usr.email || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800">{usr.name || 'İsimsiz'}</p>
                                  <p className="text-[10px] text-slate-400">{usr.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-700">{usr.institutionName}</p>
                              <p className="text-[9px] font-mono text-slate-400">{usr.institutionId}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border ${
                                usr.role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-200' :
                                usr.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {usr.role === 'super_admin' ? 'Platform Yöneticisi' : usr.role === 'admin' ? 'Kurum Yöneticisi' : 'Öğretmen'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                usr.disabled ? 'bg-red-50 text-red-500 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              }`}>
                                {usr.disabled ? 'Pasif' : 'Aktif'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {usr.role !== 'super_admin' && (
                                <div className="flex justify-end gap-1.5">
                                  {usr.disabled ? (
                                    <button
                                      onClick={() => handleEnableUser(usr)}
                                      title="Engeli Kaldır (Aktifleştir)"
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                                    >
                                      <CheckCircle size={13} /> Engeli Kaldır
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingUser(usr);
                                          setUserName(usr.name || ''); setUserEmail(usr.email);
                                          setUserRole(usr.role); setUserInstId(usr.institutionId);
                                          setUserPassword(''); setUserModalAction('edit'); setShowUserModal(true);
                                        }}
                                        title="Kullanıcıyı Düzenle"
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-lg transition-all"
                                      ><Edit3 size={13} /></button>
                                      <button
                                        onClick={() => setDeleteTargetUser(usr)}
                                        title="Kullanıcıyı Devre Dışı Bırak / Engelle"
                                        className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 rounded-lg transition-all"
                                      ><Trash2 size={13} /></button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                      <div className="text-center py-16 text-slate-400">
                        <Users size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-semibold">Kullanıcı bulunamadı</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: MASQUERADE ── */}
          {activeTab === 'masquerade' && masqueradeInst && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-purple-900 text-white rounded-3xl p-6 border border-purple-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-purple-600 text-[9px] font-black uppercase tracking-widest animate-pulse">MASQUERADE MODU</span>
                  </div>
                  <h1 className="text-xl font-black">Görünüm: {masqueradeInst.name}</h1>
                  <p className="text-purple-300 text-xs font-mono mt-0.5">ID: {masqueradeInst.id}</p>
                </div>
                <button
                  onClick={() => { setMasqueradeInst(null); setActiveTab('institutions'); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-800 hover:bg-purple-700 rounded-xl text-xs font-bold border border-purple-700 transition-all"
                >
                  <X size={14} /> Görünümden Çık
                </button>
              </div>

              {loadingMasq ? (
                <div className="flex justify-center py-20"><Loader2 size={28} className="text-purple-600 animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-slate-800 text-sm">Öğrenciler ({masqStudents.length})</h3>
                        <div className="relative">
                          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text" placeholder="Ara..." value={masqSearch}
                            onChange={e => setMasqSearch(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[9px] font-black uppercase">
                              <th className="px-4 py-3">Adı Soyadı</th>
                              <th className="px-4 py-3">Sınıf</th>
                              <th className="px-4 py-3">Veli Tel</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredMasq.map(st => (
                              <tr key={st.id} className="hover:bg-slate-50/50 font-semibold text-slate-700">
                                <td className="px-4 py-3 font-bold text-slate-800">{st.name} {st.surname}</td>
                                <td className="px-4 py-3">{st.class}</td>
                                <td className="px-4 py-3 font-mono text-slate-500">{st.parent_phone || '—'}</td>
                              </tr>
                            ))}
                            {filteredMasq.length === 0 && (
                              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Öğrenci bulunamadı.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
                      <h3 className="font-extrabold text-slate-800 text-sm">İzin Talepleri ({masqLeaves.length})</h3>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {masqLeaves.map(l => (
                          <div key={l.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-slate-800">{l.studentName}</p>
                              <p className="text-[10px] text-slate-400">{l.startDate}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              l.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                              l.status === 'rejected' ? 'bg-red-50 text-red-600' :
                              'bg-amber-50 text-amber-600 animate-pulse'
                            }`}>
                              {l.status === 'approved' ? 'Onaylandı' : l.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                            </span>
                          </div>
                        ))}
                        {masqLeaves.length === 0 && <p className="text-xs text-slate-400 text-center py-4">İzin talebi yok.</p>}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
                      <h3 className="font-extrabold text-slate-800 text-sm">Son Raporlar ({masqReports.length})</h3>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {masqReports.slice(0, 10).map(r => (
                          <div key={r.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-800">{r.student_name}</span>
                              <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{r.category}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">{r.content}</p>
                          </div>
                        ))}
                        {masqReports.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Rapor kaydı yok.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* MODAL: KURUM EKLE / DÜZENLE (WITH BRANDING & MODULES) */}
      <AnimatePresence>
        {showInstModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !submittingInst && setShowInstModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9995] flex items-center justify-center p-4 overflow-y-auto"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-8">
                <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 text-white border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Building2 size={18} /></div>
                      <div>
                        <h2 className="font-extrabold text-base">
                          {instModalMode === 'create' ? 'Yeni Kurum Ekle' : 'Kurum Ayarları ve Markalama'}
                        </h2>
                        <p className="text-blue-300 text-[10px]">Logo, renk teması ve modül izinlerini yapılandırın.</p>
                      </div>
                    </div>
                    <button onClick={() => !submittingInst && setShowInstModal(false)} className="p-2 hover:bg-white/10 rounded-xl"><X size={16} /></button>
                  </div>
                </div>

                <form onSubmit={handleSaveInst} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                  {/* Kurum Adı */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Kurum Adı *</label>
                    <input type="text" placeholder="Örn: Gelişim Koleji" value={instName}
                      onChange={e => setInstName(e.target.value)} required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 font-semibold" />
                    {instName.trim() && instModalMode === 'create' && (
                      <p className="text-[9px] text-blue-500 mt-1 font-mono">Kurum Kodu (ID): <strong>{slugify(instName)}</strong></p>
                    )}
                  </div>

                  {/* Yönetici E-postası ve Şifre (Sadece Create modunda zorunlu) */}
                  {instModalMode === 'create' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Yönetici E-Postası *</label>
                        <input type="text" placeholder="yonetici@kurum" value={instEmail}
                          onChange={e => setInstEmail(e.target.value)} required
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Yönetici Şifresi *</label>
                        <input type="password" placeholder="En az 6 karakter" value={instPassword}
                          onChange={e => setInstPassword(e.target.value)} required minLength={6}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  )}

                  {/* LOGO & RENK MARKA AYARLARI */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                      <Palette size={14} className="text-blue-600" /> Kurumsal Markalaştırma (White-Label)
                    </div>

                    {/* Logo URL & Clipboard Paste & File Upload */}
                    <div onPaste={handleLogoPaste}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                          Logo Görseli (URL veya Panodan Yapıştır / Dosya Seç)
                        </label>
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          📋 Ctrl+V ile Görsel Yapıştırın
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Image size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Resim URL'si veya buraya tıklayıp Ctrl+V ile ekran görüntüsü yapıştırın"
                            value={instLogoUrl}
                            onChange={e => setInstLogoUrl(e.target.value)}
                            onPaste={handleLogoPaste}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <label className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1 shrink-0 border border-slate-300">
                          📁 Görsel Seç
                          <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                        </label>
                      </div>

                      {/* Live Preview Box */}
                      {instLogoUrl && (
                        <div className="mt-2.5 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-10 h-10 rounded-lg border border-slate-200 p-0.5 overflow-hidden flex items-center justify-center bg-slate-50 shrink-0">
                              <img src={instLogoUrl} alt="Logo Önizleme" className="w-full h-full object-contain" />
                            </div>
                            <div className="text-[10px] text-slate-600 font-semibold truncate">
                              Logo Önizleme Aktif ({instLogoUrl.startsWith('data:') ? 'Özel Görsel' : 'Harici URL'})
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInstLogoUrl('')}
                            className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50 shrink-0"
                          >
                            Kaldır
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Preset Colors */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Ana Tema Rengi</label>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c.hex} type="button" onClick={() => setInstPrimaryColor(c.hex)}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                            className={`w-7 h-7 rounded-xl transition-all flex items-center justify-center text-white ${
                              instPrimaryColor === c.hex ? 'ring-2 ring-offset-2 ring-blue-600 scale-110 shadow-md' : 'opacity-80 hover:opacity-100'
                            }`}
                          >
                            {instPrimaryColor === c.hex && <Check size={12} />}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={instPrimaryColor} onChange={e => setInstPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                        <span className="text-xs font-mono font-bold text-slate-600">{instPrimaryColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* MODÜL YETKİLERİ */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                      <Sparkles size={14} className="text-purple-600" /> Modül Yetkileri & Özellikler
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'ai', label: 'Sesli AI Raporlama' },
                        { key: 'leave', label: 'İzin Yönetimi' },
                        { key: 'tv', label: 'TV Ekranı Yayın' },
                        { key: 'weekly', label: 'Haftalık Özet' },
                      ].map(({ key, label }) => (
                        <button
                          key={key} type="button"
                          onClick={() => setInstModules({ ...instModules, [key]: !instModules[key] })}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                            instModules[key]
                              ? 'bg-purple-50 border-purple-200 text-purple-800'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}
                        >
                          <span>{label}</span>
                          {instModules[key] ? <ToggleRight size={18} className="text-purple-600" /> : <ToggleLeft size={18} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowInstModal(false)}
                      className="flex-1 py-3 border border-slate-200 rounded-2xl text-slate-500 font-bold text-xs hover:bg-slate-50">İptal</button>
                    <button type="submit" disabled={submittingInst}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-55">
                      {submittingInst ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      {instModalMode === 'create' ? 'Kurumu Kaydet' : 'Ayarları Kaydet'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL: KULLANICI EKLE / DÜZENLE */}
      <AnimatePresence>
        {showUserModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !submittingUser && setShowUserModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9995] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><User size={18} /></div>
                      <div>
                        <h2 className="font-extrabold text-base">{userModalAction === 'create' ? 'Yeni Kullanıcı Ekle' : 'Kullanıcıyı Düzenle'}</h2>
                        <p className="text-slate-300 text-[10px]">Sisteme öğretmen veya idareci ekleyin.</p>
                      </div>
                    </div>
                    <button onClick={() => !submittingUser && setShowUserModal(false)} className="p-2 hover:bg-white/20 rounded-xl"><X size={16} /></button>
                  </div>
                </div>
                <form onSubmit={handleManageUser} className="p-6 space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Adı Soyadı</label>
                    <input type="text" placeholder="Ahmet Yılmaz" value={userName}
                      onChange={e => setUserName(e.target.value)} required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 font-semibold" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">E-posta</label>
                    <input type="text" placeholder="ahmet@kurum veya ahmet@kurum.com" value={userEmail}
                      onChange={e => setUserEmail(e.target.value)} required disabled={userModalAction === 'edit'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60 font-semibold" />
                  </div>
                  {userModalAction === 'create' && (
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Şifre</label>
                      <input type="password" placeholder="En az 6 karakter" value={userPassword}
                        onChange={e => setUserPassword(e.target.value)} required minLength={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Rol</label>
                      <select value={userRole} onChange={e => setUserRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none">
                        <option value="teacher">Öğretmen</option>
                        <option value="admin">Kurum Yöneticisi</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Kurumu</label>
                      <select value={userInstId} onChange={e => setUserInstId(e.target.value)} required
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none">
                        <option value="">Seçiniz...</option>
                        {(globalStats?.institutions || []).map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowUserModal(false)}
                      className="flex-1 py-3 border border-slate-200 rounded-2xl text-slate-500 font-bold text-xs hover:bg-slate-50">İptal</button>
                    <button type="submit" disabled={submittingUser}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-55">
                      {submittingUser ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CONFIRM / DELETE INSTITUTION MODAL */}
      <AnimatePresence>
        {deleteTargetInst && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deletingInst && setDeleteTargetInst(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[9995] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-slate-100">
                <div className="text-center mb-5">
                  <div className="w-14 h-14 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="font-extrabold text-slate-900">Kurumu Sistemden Kaldır</h3>
                  <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                    <strong>"{deleteTargetInst.name}"</strong> kurumu ve yöneticileri sistemden tamamen kaldırılacaktır.
                  </p>
                  
                  <label className="flex items-center justify-center gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-left">
                    <input
                      type="checkbox" checked={wipeDataOption}
                      onChange={e => setWipeDataOption(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-[10px] font-bold text-slate-700 leading-tight">
                      Kuruma ait tüm öğrenci, rapor ve izin geçmişini de tamamen sil
                    </span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTargetInst(null)}
                    className="flex-1 py-3 border border-slate-200 rounded-2xl text-slate-500 font-bold text-xs hover:bg-slate-50">Vazgeç</button>
                  <button onClick={handleDeleteInstConfirm} disabled={deletingInst}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-55 shadow-lg shadow-red-900/20">
                    {deletingInst ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Kurumu Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CONFIRM: KULLANICI ENGELLe */}
      <AnimatePresence>
        {deleteTargetUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deletingUser && setDeleteTargetUser(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[9995] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-slate-100">
                <div className="text-center mb-5">
                  <div className="w-14 h-14 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="font-extrabold text-slate-900">Kullanıcıyı Devre Dışı Bırak</h3>
                  <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                    <strong>"{deleteTargetUser.name}"</strong> kullanıcısının sisteme girişi engellenecektir.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTargetUser(null)}
                    className="flex-1 py-3 border border-slate-200 rounded-2xl text-slate-500 font-bold text-xs hover:bg-slate-50">Vazgeç</button>
                  <button onClick={handleDeleteUser} disabled={deletingUser}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-55">
                    {deletingUser ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Engelle
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
