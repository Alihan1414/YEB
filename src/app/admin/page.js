'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, User, Loader2,
  TrendingUp, LogOut, Building2, Check, X,
  Eye, EyeOff, Trash2, RefreshCw, Users,
  AlertTriangle, ChevronRight
} from 'lucide-react';

// Türkçe karakterleri latinize ederek slug oluştur
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
}

export default function AdminPage() {
  const { user, role, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [allUsers, setAllUsers]       = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [toast, setToast]             = useState(null);

  // Yeni kurum modal
  const [showModal, setShowModal]     = useState(false);
  const [instName, setInstName]       = useState('');
  const [instEmail, setInstEmail]     = useState('');
  const [instPassword, setInstPassword] = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [creating, setCreating]       = useState(false);

  // Silme onay modali
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { router.push('/login'); return; }
      if (role !== 'super_admin') { router.push('/'); return; }
      fetchUsers();
    }
  }, [user, role, authLoading]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const res  = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?key=${apiKey}`
      );
      const data = await res.json();
      const list = (data.documents || []).map(doc => {
        const f = doc.fields || {};
        return {
          id:              doc.name.split('/').pop(),
          name:            f.name?.stringValue            || '',
          email:           f.email?.stringValue           || '',
          role:            f.role?.stringValue            || 'teacher',
          institutionId:   f.institutionId?.stringValue   || 'yamanevler',
          institutionName: f.institutionName?.stringValue || 'Yamanevler Enderun Bilişim',
          disabled:        f.disabled?.booleanValue       || false,
        };
      });
      setAllUsers(list);
    } catch (e) {
      console.error(e);
      showToast('Veriler yüklenemedi.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Kurumları group'la (platform admini hariç)
  const institutions = Object.values(
    allUsers
      .filter(u => u.institutionId !== 'platform')
      .reduce((acc, u) => {
        const key = u.institutionId;
        if (!acc[key]) acc[key] = { id: key, name: u.institutionName, users: [], disabled: false };
        if (u.disabled) acc[key].disabled = true;
        acc[key].users.push(u);
        return acc;
      }, {})
  );

  // Yeni kurum oluştur
  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    if (!instName.trim() || !instEmail.trim() || !instPassword.trim()) {
      showToast('Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/create-institution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: instName.trim(),
          email: instEmail.trim(),
          password: instPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bilinmeyen bir hata oluştu.');
      }

      setInstName('');
      setInstEmail('');
      setInstPassword('');
      setShowModal(false);
      await fetchUsers();
      showToast(`"${instName.trim()}" kurumu başarıyla oluşturuldu!`);
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  // Kurumu sil (tüm kullanıcılarını devre dışı bırak)
  const handleDeleteInstitution = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/update-institution-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: deleteTarget.id,
          disabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kurum silinemedi.');
      }

      setDeleteTarget(null);
      await fetchUsers();
      showToast(`"${deleteTarget.name}" kurumu devre dışı bırakıldı.`);
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Kurumu yeniden aktifleştir
  const handleEnableInstitution = async (inst) => {
    try {
      const res = await fetch('/api/admin/update-institution-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: inst.id,
          disabled: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kurum aktifleştirilemedi.');
      }

      await fetchUsers();
      showToast(`"${inst.name}" kurumu yeniden aktifleştirildi.`);
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#eef5fc] flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef5fc] text-slate-800 font-sans">

      {/* ── Top Header ── */}
      <header className="bg-gradient-to-r from-[#06429c] via-[#053787] to-[#011c4d] text-white px-6 md:px-12 py-5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-md">
            <svg viewBox="0 0 100 100" className="w-full h-full text-[#06429c]" fill="currentColor">
              <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-black tracking-widest text-blue-200 uppercase">Platform Yönetimi</div>
            <div className="text-base font-extrabold text-white">Kurum Yönetici Paneli</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchUsers} title="Yenile"
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-all">
            <RefreshCw size={16} />
          </button>
          <button onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-red-500/30 border border-white/10 rounded-xl text-xs font-bold text-white/80 hover:text-white transition-all">
            <LogOut size={15} /> Çıkış
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-6">

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-sm ${
                toast.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              }`}
            >
              {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats + Add button row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">Kayıtlı Kurumlar</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Sistemi kullanan {institutions.length} kurum var. Aktif: {institutions.filter(i => !i.disabled).length}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[#06429c] text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={17} /> Yeni Kurum Ekle
          </button>
        </div>

        {/* Institutions Grid */}
        {loadingUsers ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="text-blue-600 animate-spin" />
          </div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Building2 size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-sm">Henüz kayıtlı kurum yok.</p>
            <p className="text-xs mt-1">Yukarıdaki butona tıklayarak ilk kurumu ekleyin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {institutions.map(inst => (
              <motion.div
                key={inst.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-3xl shadow-sm border overflow-hidden transition-all ${
                  inst.disabled ? 'border-slate-200 opacity-60' : 'border-slate-100 hover:shadow-md'
                }`}
              >
                {/* Card Header */}
                <div className={`px-6 py-5 flex items-center gap-4 ${inst.disabled ? 'bg-slate-50' : 'bg-gradient-to-r from-blue-50/60 to-indigo-50/20'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg shadow-sm ${
                    inst.disabled ? 'bg-slate-300 text-white' : 'bg-[#06429c] text-white'
                  }`}>
                    {(inst.name || inst.id)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-900 truncate">{inst.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold border border-blue-100">{inst.id}</code>
                      <span className="text-[10px] text-slate-400">{inst.users.length} kullanıcı</span>
                      {inst.disabled && (
                        <span className="text-[10px] bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-bold">Devre Dışı</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Users list */}
                <div className="px-6 py-3 space-y-2">
                  {inst.users.map(u => (
                    <div key={u.id} className="flex items-center gap-2 text-xs">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {(u.name || u.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-700 truncate block">{u.name || u.email}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.role === 'admin' || u.role === 'super_admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {u.role === 'admin' || u.role === 'super_admin' ? 'Yönetici' : 'Öğretmen'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 pt-3 border-t border-slate-50 flex items-center justify-between gap-3">
                  {inst.disabled ? (
                    <button
                      onClick={() => handleEnableInstitution(inst)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-all"
                    >
                      <Check size={13} /> Yeniden Aktifleştir
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteTarget({ id: inst.id, name: inst.name })}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={13} /> Kurumu Sil
                    </button>
                  )}
                  <div className="text-[10px] text-slate-400 text-right">
                    Giriş: <span className="font-mono text-slate-600">{inst.users[0]?.email || '—'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* ── Yeni Kurum Modal ── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !creating && setShowModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-[#06429c] to-[#1b63d6] p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-base">Yeni Kurum Ekle</h2>
                        <p className="text-blue-200 text-[11px] mt-0.5">Sisteme yeni bir kurum ekleyin</p>
                      </div>
                    </div>
                    <button onClick={() => !creating && setShowModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleCreateInstitution} className="p-6 space-y-5">

                  {/* Kurum İsmi */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                      1. Kurum İsmi
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Çınardere Erenler"
                      value={instName}
                      onChange={e => setInstName(e.target.value)}
                      required
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-300 transition-all"
                    />
                    {instName && (
                      <p className="text-[10px] text-blue-500 mt-1.5 font-mono">
                        Kurum ID: <strong>{slugify(instName)}</strong>
                      </p>
                    )}
                  </div>

                  {/* E-posta */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                      2. Kurum E-postası
                    </label>
                    <input
                      type="email"
                      placeholder="Örn: cinardere@erenler.com"
                      value={instEmail}
                      onChange={e => setInstEmail(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-300 transition-all"
                    />
                  </div>

                  {/* Şifre */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                      3. Kurum Şifresi
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        placeholder="En az 6 karakter"
                        value={instPassword}
                        onChange={e => setInstPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 pr-12 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-slate-300 transition-all"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 text-[11px] text-blue-700">
                    <p className="font-bold mb-1">ℹ️ Bu bilgilerle ne olur?</p>
                    <p className="leading-relaxed text-blue-600">
                      Belirlediğiniz <strong>e-posta ve şifre</strong> ile sisteme giriş yapan kişiler,
                      yalnızca <strong>{instName || 'bu kuruma'}</strong> ait öğrencileri ve raporları görebilir.
                      Diğer kurumlardan tamamen bağımsız çalışır.
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => !creating && setShowModal(false)}
                      className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 py-3 rounded-2xl bg-[#06429c] text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {creating ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Kurumu Oluştur</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Silme Onay Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deleting && setDeleteTarget(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
                <div className="text-center mb-5">
                  <div className="w-14 h-14 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={26} className="text-red-500" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">Kurumu Sil</h3>
                  <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                    <strong className="text-slate-700">"{deleteTarget.name}"</strong> kurumu devre dışı bırakılacak.
                    Bu kurumdaki kullanıcılar artık sisteme giriş yapamaz.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleDeleteInstitution}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {deleting ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={15} /> Sil</>}
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
